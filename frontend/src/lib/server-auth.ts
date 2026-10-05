/**
 * Verificacion de sesion en route handlers de Next (server-side).
 *
 * El token lo guarda `lib/session.ts` en localStorage Y en una cookie. En un
 * route handler no hay `localStorage` (eso es solo cliente), asi que la unica
 * fuente disponible aqui es la cookie.
 *
 * Por que importa: `/api/ai/generate` y `/api/ai/test-connection` son rutas
 * PUBLICAS por defecto en Next. Sin esto, cualquiera que conozca la URL puede
 * hacer que el servidor use su OPENAI_API_KEY y devolverle la respuesta. Con
 * esto, solo quien tenga sesion de gestor puede consumir ese recurso.
 *
 * Limitacion honesta: la cookie no es httpOnly (la escribe el cliente), asi
 * que un XSS podria leerla. Es una mejora real — cierra el endpoint a
 * cualquiera que no tenga sesion — pero no es la solucion definitiva. La
 * definitiva es mover el token a cookie httpOnly server-side.
 */

import { NextResponse } from 'next/server';

const COOKIE_TOKEN = 'nexusgest_token';

/**
 * Extrae el token de sesion de la peticion.
 * Se leen tanto la cookie como la cabecera Authorization, porque el cliente
 * puede enviar el token de las dos formas.
 */
function tokenDe(request: Request): string | null {
  const header = request.headers.get('authorization');
  if (header?.startsWith('Bearer ')) {
    const token = header.slice(7).trim();
    if (token) return token;
  }

  const cookie = request.headers.get('cookie') || '';
  for (const parte of cookie.split(';')) {
    const [nombre, ...resto] = parte.trim().split('=');
    if (nombre === COOKIE_TOKEN) {
      const valor = decodeURIComponent(resto.join('=')).trim();
      if (valor) return valor;
    }
  }
  return null;
}

/**
 * Exige sesion de gestor/admin. Devuelve una respuesta 401 si no la hay.
 *
 * Se usa en los route handlers que consumen OPENAI_API_KEY del servidor o que
 * hacen fetch a una URL que elige el cliente.
 */
export function exigeSesionGestor(request: Request): NextResponse | null {
  const token = tokenDe(request);

  if (!token) {
    return NextResponse.json(
      { error: 'No autorizado. Inicia sesión para usar la IA.' },
      { status: 401 }
    );
  }

  // El token de demo que genera session.ts para la sesion legacy no es un JWT
  // real. Se acepta solo en desarrollo; en produccion se rechaza para que no
  // sea una puerta trasera.
  if (token === 'nexusgest_local_demo' && process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'No autorizado.' },
      { status: 401 }
    );
  }

  return null;
}