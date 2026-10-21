import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../db/index.js';

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'gestor' | 'cliente';
  client_id?: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

// Sin fallback a un valor por defecto: si el compose no inyecta JWT_SECRET
// (variable obligatoria via ${JWT_SECRET:?...}), arrancar sin secreto seria
// peor que fallar.
//
// Se lee en cada peticion, no al cargar el modulo: los imports de ESM se
// evaluan antes de que dotenv.config() corra en el cuerpo de index.ts, asi
// que leerlo aqui en el top-level ignoraria el .env local.
const jwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET no esta definido');
  }
  return secret;
};


export const tokenFromRequest = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7).trim() || null;
  const cookieHeader = req.headers.cookie || '';
  const cookieName = req.baseUrl.includes('/portal') ? 'nexusgest_portal_token' : 'nexusgest_token';
  const entry = cookieHeader.split(';').map((part) => part.trim()).find((part) => part.startsWith(cookieName + '='));
  if (!entry) return null;
  try { return decodeURIComponent(entry.slice(cookieName.length + 1)); } catch { return null; }
};

/** Exige un JWT valido. Adjunta req.user. */
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  const token = tokenFromRequest(req);
  if (!token) return res.status(401).json({ error: 'No autorizado' });

  let decoded: any;
  try {
    decoded = jwt.verify(token, jwtSecret()) as any;
  } catch {
    return res.status(401).json({ error: 'Token invalido o expirado' });
  }

  try {
    // JWTs remain valid until expiry after an account is deleted or disabled.
    // Resolve role/activity in PostgreSQL so reset and offboarding revoke sessions immediately.
    const result = await query('SELECT id, email, full_name, role, is_active FROM users WHERE id = $1', [decoded.id]);
    const user = result.rows[0];
    if (!user || !user.is_active || user.role !== decoded.role) {
      return res.status(401).json({ error: 'La sesión ya no está activa' });
    }
    let clientId: string | undefined;
    if (user.role === 'cliente') {
      const linked = await query('SELECT id FROM clients WHERE id = $1 AND user_id = $2', [decoded.client_id, user.id]);
      if (!decoded.client_id || !linked.rows.length) return res.status(401).json({ error: 'La cuenta ya no está vinculada a un cliente' });
      clientId = linked.rows[0].id;
    }
    req.user = { id: user.id, email: user.email, full_name: user.full_name, role: user.role, client_id: clientId };
    return next();
  } catch (error) {
    return next(error);
  }
};

/** Exige autenticacion y uno de los roles indicados. Usar tras requireAuth. */
export const requireRole =
  (...roles: AuthUser['role'][]) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autorizado' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'No tienes permisos para esta accion' });
    }
    next();
  };
