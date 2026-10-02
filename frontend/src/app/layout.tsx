import type { Metadata } from 'next';
import { LanguageProvider } from '@/context/LanguageContext';
import './globals.css';

export const metadata: Metadata = {
  title: 'RP Gestoría & Asesoría | Tus trámites en Holanda, mucho más fáciles',
  description: 'Gestoría integral y asesoría para jóvenes, expatriados y profesionales en Países Bajos. Declaración de la renta M-Form, DigiD, Zorgtoeslag, ZZP y más en tu idioma.',
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
      <body className="bg-surface text-on-surface antialiased font-sans">
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
