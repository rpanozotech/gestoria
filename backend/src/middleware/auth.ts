import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'gestor' | 'cliente';
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

/** Exige un JWT valido. Adjunta req.user. */
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], jwtSecret()) as any;
    req.user = {
      id: decoded.id,
      email: decoded.email,
      full_name: decoded.full_name,
      role: decoded.role,
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