'use client';

/**
 * Gestion de la sesion del CRM.
 *
 * El token JWT se guarda en localStorage, no en cookies: las rutas del CRM
 * son client components ('use client'), asi que no hay servidor que lo
 * lea. Asumir el riesgo de XSS que implica localStorage; si alguna vez
 * estas rutas pasan a server components, mover a cookie httpOnly.
 */

const TOKEN_KEY = 'nexusgest_token';
const USER_KEY = 'nexusgest_user';

export interface SessionUser {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'gestor' | 'cliente';
  avatar_url?: string | null;
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): SessionUser | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export function saveSession(token: string, user: SessionUser): void {
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}