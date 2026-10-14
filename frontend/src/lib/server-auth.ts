import { NextResponse } from 'next/server';
import { validateManagerToken } from './server-auth-core';

function tokenDe(request: Request): string | null {
  const header = request.headers.get('authorization');
  if (header?.startsWith('Bearer ')) {
    const token = header.slice(7).trim();
    if (token) return token;
  }
  const cookie = request.headers.get('cookie') || '';
  for (const parte of cookie.split(';')) {
    const [nombre, ...resto] = parte.trim().split('=');
    if (nombre === 'nexusgest_token') {
      try {
        const valor = decodeURIComponent(resto.join('=')).trim();
        if (valor) return valor;
      } catch {
        return null;
      }
    }
  }
  return null;
}

export async function exigeSesionGestor(request: Request): Promise<NextResponse | null> {
  const token = tokenDe(request);
  if (!token) {
    return NextResponse.json({ error: 'No autorizado. Inicia sesión para usar la IA.' }, { status: 401 });
  }
  const check = await validateManagerToken(token);
  if (check.ok) return null;
  if (!("error" in check) || !("status" in check)) {
    return NextResponse.json({ error: 'No se pudo verificar la sesión.' }, { status: 401 });
  }
  return NextResponse.json({ error: check.error }, { status: check.status });
}
