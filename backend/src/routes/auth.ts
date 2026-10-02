import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db/index.js';

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
    res.json({
      token,
      user: { id: user.id, client_id: user.client_id, email: user.email, full_name: user.full_name, role: 'cliente' },
    });
  } catch (error) {
    console.error('Error en /portal-login:', error);
    res.status(500).json({ error: 'Error interno al autenticar el portal' });
  }
});

// Obtener perfil actual
router.get('/me', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, jwtSecret()) as any;
    const result = await query('SELECT id, email, full_name, role, phone, avatar_url FROM users WHERE id = $1', [decoded.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json({ user: result.rows[0] });
  } catch (error) {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
});

export default router;
