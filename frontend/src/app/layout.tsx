import type { Metadata } from 'next';
import { Manrope, DM_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dmsans',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
});

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
    <html lang="es" className={`${manrope.variable} ${dmSans.variable} ${jetbrains.variable}`}>
      <body className="bg-surface text-on-surface antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
