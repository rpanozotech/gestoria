/** @type {import('next').NextConfig} */

// Host interno del backend visto desde el servidor de Next.js (red de Docker).
// NO se usa desde el navegador: el usuario no puede resolver `backend`.
const BACKEND_ORIGIN = process.env.API_INTERNAL_URL || 'http://backend:5000';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Solo usar 'standalone' en producción (build). En dev rompe el servidor.
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    return {
      // Proxy same-origin: el navegador pide /api/backend/* al servidor de Next,
      // que lo reenvía al backend real por la red interna.
      // Se antepone a las route handlers /api/ai/* porque Next da prioridad a
      // el sistema de archivos sobre las rewrites.
      beforeFiles: [
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
