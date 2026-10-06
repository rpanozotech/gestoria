/** @type {import('next').NextConfig} */

// Host interno del backend visto desde el servidor de Next.js (red de Docker).
// NO se usa desde el navegador: el usuario no puede resolver `backend`.
const BACKEND_ORIGIN = process.env.API_INTERNAL_URL || 'http://backend:5000';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Solo usar 'standalone' en producción (build). En dev rompe el servidor.
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
  reactStrictMode: true,
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
      ],
    }];
  },
  async rewrites() {
    return {
      // Proxy same-origin: el navegador pide /api/backend/* al servidor de Next,
      // que lo reenvía al backend real por la red interna.
      // Se antepone a las route handlers /api/ai/* porque Next da prioridad a
      // el sistema de archivos sobre las rewrites.
      beforeFiles: [
        {
          source: '/api/backend/health',
          destination: `${BACKEND_ORIGIN}/health`,
        },
        {
          source: '/api/backend/:path*',
          destination: `${BACKEND_ORIGIN}/api/:path*`,
        },
      ],
    };
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;
