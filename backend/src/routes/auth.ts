import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db/index.js';
import { tokenFromRequest } from '../middleware/auth.js';

const router = Router();

// Leido por peticion (no al cargar el modulo): los imports de ESM se evaluan
// antes de que dotenv.config() corra, asi que un top-level ignoraria el .env.
// Sin valor por defecto a proposito.
const jwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET no esta definido');
  }
  return secret;
};
const secureCookie = process.env.NODE_ENV === 'production' ? '; Secure' : '';
const setSessionCookie = (name: string, token: string, maxAge = 604800) => name + '=' + encodeURIComponent(token) + '; Path=/; Max-Age=' + maxAge + '; HttpOnly; SameSite=Strict' + secureCookie;
const clearSessionCookies = () => [
  'nexusgest_token=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict' + secureCookie,
  'nexusgest_portal_token=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict' + secureCookie,
];

// Iniciar Sesión (Gestor o Cliente)
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Debes proporcionar email y contraseña' });
    }

    const result = await query('SELECT * FROM users WHERE email = $1 AND is_active = true', [email.toLowerCase().trim()]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const user = result.rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
      },
      jwtSecret(),
      { expiresIn: '7d' }
    );

    res.setHeader('Set-Cookie', setSessionCookie('nexusgest_token', token));
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        avatar_url: user.avatar_url,
      },
    });
  } catch (error) {
    console.error('Error en /login:', error);
    res.status(500).json({ error: 'Error interno del servidor al autenticar' });
  }
});

// Acceso separado del portal: acepta el usuario visible al cliente o su email
// y solo emite un JWT con rol cliente y el client_id asociado.
router.post('/portal-login', async (req: Request, res: Response) => {
  try {
    const identifier = String(req.body?.identifier || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    if (!identifier || !password) return res.status(400).json({ error: 'Debes proporcionar usuario y contraseña' });

    const result = await query(
      `SELECT u.*, c.id AS client_id, c.portal_username
       FROM users u
       JOIN clients c ON c.user_id = u.id
       WHERE u.role = 'cliente' AND u.is_active = true
         AND (lower(u.email) = $1 OR lower(c.portal_username) = $1)
       LIMIT 1`,
      [identifier]
    );
    if (result.rows.length === 0 || !(await bcrypt.compare(password, result.rows[0].password_hash))) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    const user = result.rows[0];
    const token = jwt.sign(
      { id: user.id, email: user.email, full_name: user.full_name, role: 'cliente', client_id: user.client_id },
      jwtSecret(),
      { expiresIn: '7d' }
    );
    res.setHeader('Set-Cookie', setSessionCookie('nexusgest_portal_token', token));
    res.json({
      token,
      user: { id: user.id, client_id: user.client_id, email: user.email, full_name: user.full_name, role: 'cliente' },
    });
  } catch (error) {
    console.error('Error en /portal-login:', error);
    res.status(500).json({ error: 'Error interno al autenticar el portal' });
  }
});

// Sesión temporal exclusiva de QA staging.
// Desactivada por defecto y no disponible si QA_SESSION_ENABLED no es true.
const usedQaGrants = new Set<string>();
router.post('/qa-session', async (req: Request, res: Response) => {
  try {
    if (process.env.QA_SESSION_ENABLED !== 'true') return res.status(404).json({ error: 'No encontrado' });
    const grant = String(req.body?.grant || '');
    const role = String(req.body?.role || '');
    const origin = String(req.body?.origin || req.headers.origin || '');
    const expectedGrant = process.env.QA_SESSION_GRANT || '';
    const expectedOrigin = role === 'crm' ? process.env.QA_CRM_ORIGIN : process.env.QA_PORTAL_ORIGIN;
    if (!grant || !expectedGrant || grant !== expectedGrant || usedQaGrants.has(`${grant}:${role}`) || !expectedOrigin || origin !== expectedOrigin) {
      return res.status(403).json({ error: 'Sesión QA no autorizada' });
    }
    const emailByRole: Record<string, string | undefined> = {
      crm: process.env.QA_CRM_USER_EMAIL,
      'client-a': process.env.QA_CLIENT_A_EMAIL,
      'client-b': process.env.QA_CLIENT_B_EMAIL,
    };
    const email = emailByRole[role]?.toLowerCase().trim();
    if (!email || (role !== 'crm' && !['client-a', 'client-b'].includes(role))) return res.status(400).json({ error: 'Rol QA inválido' });
    const result = role === 'crm'
      ? await query(`SELECT * FROM users WHERE lower(email) = $1 AND is_active = true AND role IN ('admin', 'gestor') LIMIT 1`, [email])
      : await query(`SELECT u.*, c.id AS client_id FROM users u JOIN clients c ON c.user_id = u.id WHERE lower(u.email) = $1 AND u.role = 'cliente' AND u.is_active = true LIMIT 1`, [email]);
    if (!result.rows.length) return res.status(404).json({ error: 'Usuario QA no encontrado' });
    const user = result.rows[0];
    const payload = role === 'crm'
      ? { id: user.id, email: user.email, full_name: user.full_name, role: user.role }
      : { id: user.id, email: user.email, full_name: user.full_name, role: 'cliente', client_id: user.client_id };
    const token = jwt.sign(payload, jwtSecret(), { expiresIn: '20m' });
    usedQaGrants.add(`${grant}:${role}`);
    res.setHeader('Set-Cookie', setSessionCookie(role === 'crm' ? 'nexusgest_token' : 'nexusgest_portal_token', token, 1200));
    return res.json({ ok: true, role, expiresIn: 1200 });
  } catch (error) {
    console.error('Error en /qa-session:', error);
    return res.status(500).json({ error: 'Error interno de sesión QA' });
  }
});

// Obtener perfil actual
router.get('/me', async (req: Request, res: Response) => {
  const token = tokenFromRequest(req);
  if (!token) return res.status(401).json({ error: 'No autorizado' });
  try {
    const decoded = jwt.verify(token, jwtSecret()) as any;
    const result = await query('SELECT id, email, full_name, role, phone, avatar_url FROM users WHERE id = $1 AND is_active = true', [decoded.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json({ user: result.rows[0] });
  } catch (error) {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
});

router.post('/logout', (_req: Request, res: Response) => {
  res.setHeader('Set-Cookie', clearSessionCookies());
  res.json({ ok: true });
});

export default router;
