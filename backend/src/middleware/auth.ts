import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

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
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const token = tokenFromRequest(req);
  if (!token) return res.status(401).json({ error: 'No autorizado' });

  try {
    const decoded = jwt.verify(token, jwtSecret()) as any;
    req.user = {
      id: decoded.id,
      email: decoded.email,
      full_name: decoded.full_name,
      role: decoded.role,
      client_id: decoded.client_id,
    };
    next();
  } catch {
    return res.status(401).json({ error: 'Token invalido o expirado' });
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
