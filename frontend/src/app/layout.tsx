import type { Metadata } from 'next';
import { Inter, Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'NexusGest | Plataforma de Negocio & CRM Gestoría Inteligente',
  description: 'Gestoría integral, asesoría fiscal en Países Bajos, trámites Belastingdienst, DigiD, Toeslagen y pasarela iDEAL.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${inter.variable} ${jakarta.variable} ${jetbrains.variable}`}>
      <body className="bg-surface text-on-surface antialiased">
        {children}
      </body>
    </html>
  );
}
