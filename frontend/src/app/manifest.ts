import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'RP Asesoría CRM',
    short_name: 'RP Asesoría',
    description: 'CRM interno de RP Asesoría',
    start_url: '/crm',
    scope: '/',
    display: 'standalone',
    background_color: '#f7f9fc',
    theme_color: '#12304a',
    lang: 'es',
    icons: [{ src: '/logo.png', sizes: '192x192', type: 'image/png', purpose: 'any' }, { src: '/logo.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }],
  };
}
