/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // Clave para imágenes Docker ligeras en Coolify
  reactStrictMode: true,
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
