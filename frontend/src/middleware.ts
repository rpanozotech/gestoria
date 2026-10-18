import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const surface = process.env.SURFACE || 'public';

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isAsset = path.startsWith('/_next/') || path.startsWith('/favicon') || /\.(png|jpg|jpeg|svg|ico|webp|woff2?|mp4)$/.test(path);
  if (isAsset) return NextResponse.next();
  if (surface === 'public') {
    if (path === '/login' || path.startsWith('/crm') || path.startsWith('/portal') || path.startsWith('/api/ai')) return new NextResponse('Not Found', { status: 404 });
    if (path.startsWith('/api/backend/') && !path.startsWith('/api/backend/services/public') && !path.startsWith('/api/backend/public-content')) return new NextResponse('Not Found', { status: 404 });
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
