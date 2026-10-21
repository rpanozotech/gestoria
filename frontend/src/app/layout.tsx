import type { Metadata } from 'next';
import { LanguageProvider } from '@/context/LanguageContext';
import CookieAwareBanner from '@/components/CookieAwareBanner';
import './globals.css';

export const metadata: Metadata = {
  title: 'RP Asesoría | Información y acompañamiento administrativo en Países Bajos',
  description: 'Información y acompañamiento administrativo para personas extranjeras en Países Bajos. Orientación práctica sobre cartas, formularios y trámites en tu idioma.',
  icons: {
    icon: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
      </head>
      <body className="bg-surface text-on-surface antialiased font-sans">
        <LanguageProvider>{children}</LanguageProvider>
        <CookieAwareBanner />
      </body>
    </html>
  );
}
