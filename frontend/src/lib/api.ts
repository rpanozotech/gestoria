import { getToken, clearSession } from './session';

/**
 * URL base del API para llamadas hechas desde el navegador.
 *
 * Importante: todo el frontend son componentes 'use client', asi que
 * process.env.NEXT_PUBLIC_* se inlina en tiempo de BUILD. Por eso no
 * apuntamos directamente al host interno de Docker (el navegador del
 * usuario no puede resolver `backend`) sino a una ruta same-origin que
 * el servidor de Next.js proxifica hacia el backend vía la red interna.
 * Ver el bloque `rewrites` en next.config.mjs.
 */
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '/api/backend';

/** Construye una URL de API a partir de la ruta (ej: '/appointments'). */
export const apiUrl = (path: string): string => `${API_BASE}${path}`;

/**
 * fetch con la cabecera Authorization y redirección al login si el token
 * expira o el backend responde 401.
 *
 * Usar esto en lugar de fetch(apiUrl(...)) en toda ruta interna del CRM.
 * Las rutas publicas (reserva de cita) pueden seguir usando fetch normal.
 */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const isFormData = typeof FormData !== 'undefined' && init.body instanceof FormData;

  const res = await fetch(apiUrl(path), {
    ...init,
    headers: {
      ...(init.body && !isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  });

  // 401 = token ausente, invalido o expirado. La sesion ya no sirve, asi que
  // se limpia y se manda al login en vez de dejar la UI con datos a medias.
  const isLocalDemo = process.env.NODE_ENV !== 'production' && token?.startsWith('nexusgest_local_demo');
  if (res.status === 401 && !isLocalDemo) {
    clearSession();
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
  }

  return res;
}
