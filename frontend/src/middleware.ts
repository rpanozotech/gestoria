import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// En desarrollo se mantiene CRM por defecto, pero SURFACE permite levantar
// la web pública o el portal en otro proceso/puerto para probar el despliegue
// dividido igual que en Coolify.
const surface = process.env.SURFACE || (process.env.NODE_ENV !== 'production' ? 'crm' : 'public');

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isAsset = path.startsWith('/_next/') || path.startsWith('/favicon') || /\.(png|jpg|jpeg|svg|ico|webp|woff2?|mp4)$/.test(path);
  if (isAsset) return NextResponse.next();
  if (surface === 'public') {
    if (path === '/login' || path.startsWith('/crm') || path.startsWith('/portal') || path.startsWith('/api/ai')) return new NextResponse('Not Found', { status: 404 });
    // Solo abrir al público las rutas que la web realmente necesita. El backend conserva sus propias validaciones, roles y rate limits; GET /appointments sigue exigiendo gestor y POST solo acepta reservas públicas válidas.
    const publicBackendPaths = new Set([
      '/api/backend/services/public',
      '/api/backend/appointments',
      '/api/backend/appointments/availability',
      '/api/backend/service-requests',
      '/api/backend/withdrawals',
      '/api/backend/contact',
    ]);
    const isPublicBackendPath = publicBackendPaths.has(path)
      || path.startsWith('/api/backend/services/public/')
      || path.startsWith('/api/backend/public-content/');
    if (path.startsWith('/api/backend/') && !isPublicBackendPath) return new NextResponse('Not Found', { status: 404 });
  } else if (surface === 'crm') {
    if (path === '/') return NextResponse.redirect(new URL('/login', request.url));
    if (path.startsWith('/portal')) return new NextResponse('Not Found', { status: 404 });
  } else if (surface === 'portal') {
    if (path === '/') return NextResponse.redirect(new URL('/portal/login', request.url));
    if (path === '/login' || path.startsWith('/crm') || path.startsWith('/api/ai')) return new NextResponse('Not Found', { status: 404 });
  }
  return NextResponse.next();
}

export const config = { matcher: ['/((?!_next/static|_next/image).*)'] };
