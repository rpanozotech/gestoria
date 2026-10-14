'use client';

const TOKEN_KEY = 'nexusgest_token';
const USER_KEY = 'nexusgest_user';

export interface SessionUser {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'gestor' | 'cliente';
  avatar_url?: string | null;
}

function readCookie(key: string): string | null {
  const value = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${key}=`))
    ?.slice(key.length + 1);
  return value ? decodeURIComponent(value) : null;
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const token = window.localStorage.getItem(TOKEN_KEY) || readCookie(TOKEN_KEY);
    // Versiones anteriores generaban tokens locales con timestamp. No son
    // JWT y el backend los rechaza; conviértelos al token demo estable.
    if (token?.startsWith('nexusgest_session_token_') || token?.startsWith('nexusgest_token_')) {
      return 'nexusgest_local_demo';
    }
    return token;
  } catch {
    return readCookie(TOKEN_KEY);
  }
}

export function getStoredUser(): SessionUser | null {
  if (typeof window === 'undefined') return null;
  let raw: string | null = null;
  try { raw = window.localStorage.getItem(USER_KEY); } catch {}
  raw = raw || readCookie(USER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as SessionUser; } catch { return null; }
}

export function saveSession(token: string, user: SessionUser): void {
  void token;
  try {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {}
}

export function clearSession(): void {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
  } catch {}

}
