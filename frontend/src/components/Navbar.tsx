'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

type Language = 'ES' | 'EN' | 'NL' | 'RO' | 'PT' | 'PL';

export default function Navbar() {
  const pathname = usePathname();
  const [lang, setLang] = useState<Language>('ES');
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: '/', label: 'Inicio' },
    { href: '/como-funciona', label: 'Cómo funciona' },
    { href: '/servicios', label: 'Servicios' },
    { href: '/calculadora', label: 'Calculadora' },
    { href: '/nosotros', label: 'Sobre nosotros' },
    { href: '/faq', label: 'FAQ' },
    { href: '/contacto', label: 'Contacto' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-sm w-full">
      <div className="w-full px-4 sm:px-8 lg:px-12 xl:px-16">
        <div className="flex items-center justify-between h-18 sm:h-20">
          
          {/* LOGO OFICIAL - RP GESTORÍA & ASESORÍA */}
          <Link href="/" className="flex items-center gap-3 shrink-0 group">
            <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl overflow-hidden shadow-sm border border-slate-200/90 group-hover:scale-105 transition-transform bg-slate-900 flex items-center justify-center shrink-0">
              <Image 
                src="/logo.png" 
                alt="RP Gestoría & Asesoría" 
                width={44} 
                height={44} 
                className="object-cover w-full h-full"
                priority
              />
            </div>
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-1.5">
                <span className="font-heading font-extrabold text-lg sm:text-xl tracking-tight text-slate-900 leading-none">
                  RP Gestoría
                </span>
                <span className="font-heading font-extrabold text-lg sm:text-xl tracking-tight text-blue-600 leading-none">
                  & Asesoría
                </span>
              </div>
              <span className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase mt-1 leading-none">
                Tus trámites en Holanda, fáciles
              </span>
            </div>
          </Link>

          {/* NAV LINKS DESKTOP A PÁGINAS INDEPENDIENTES */}
          <nav className="hidden lg:flex items-center gap-5 xl:gap-8">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-sm font-semibold transition-all py-2 border-b-2 ${
                    isActive
                      ? 'text-blue-600 border-blue-600 font-bold'
                      : 'text-slate-700 hover:text-blue-600 border-transparent hover:border-blue-200'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* ACCIONES Y BOTONES DE LA DERECHA */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* SELECTOR DE IDIOMA */}
            <div className="relative">
              <button
                onClick={() => setLangMenuOpen(!langMenuOpen)}
                className="h-9 sm:h-10 px-2.5 sm:px-3 flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors"
                aria-label="Seleccionar idioma"
              >
                <span className="material-symbols-outlined text-[17px] text-slate-500">language</span>
                <span>{lang}</span>
                <span className="material-symbols-outlined text-[15px] text-slate-400">expand_more</span>
              </button>

              {langMenuOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-white rounded-2xl shadow-2xl border border-slate-100 py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  {[
                    { code: 'ES', label: 'Español 🇪🇸' },
                    { code: 'EN', label: 'English 🇬🇧' },
                    { code: 'NL', label: 'Nederlands 🇳🇱' },
                    { code: 'RO', label: 'Română 🇷🇴' },
                    { code: 'PT', label: 'Português 🇵🇹' },
                    { code: 'PL', label: 'Polski 🇵🇱' },
                  ].map((item) => (
                    <button
                      key={item.code}
                      onClick={() => {
                        setLang(item.code as Language);
                        setLangMenuOpen(false);
                      }}
                      className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between hover:bg-blue-50 transition-colors ${
                        lang === item.code ? 'font-bold text-blue-600 bg-blue-50/60' : 'text-slate-700'
                      }`}
                    >
                      <span>{item.label}</span>
                      {lang === item.code && <span className="material-symbols-outlined text-[15px] text-blue-600">check</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* RESERVAR CITA BUTTON -> /reservar */}
            <Link
              href="/reservar"
              className="hidden md:inline-flex items-center gap-2 h-9 sm:h-10 px-3.5 sm:px-4 text-xs sm:text-sm font-bold text-blue-700 bg-blue-50 hover:bg-blue-100/90 rounded-xl transition-all border border-blue-200/80 shadow-sm shrink-0"
            >
              <span className="material-symbols-outlined text-[18px]">calendar_month</span>
              <span>Reservar Cita</span>
            </Link>

            {/* ÁREA CLIENTE BUTTON -> /portal */}
            <Link
              href="/portal"
              className="inline-flex items-center gap-2 h-9 sm:h-10 px-3.5 sm:px-4 text-xs sm:text-sm font-bold text-white bg-slate-900 hover:bg-blue-600 rounded-xl shadow-md hover:shadow-blue-500/20 transition-all shrink-0"
            >
              <span className="material-symbols-outlined text-[18px]">account_circle</span>
              <span>Área Cliente</span>
            </Link>

            {/* BOTÓN HAMBURGUESA MOBILE */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden h-9 w-9 sm:h-10 sm:w-10 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-700 transition-colors"
              aria-label="Abrir menú de navegación"
            >
              <span className="material-symbols-outlined text-[22px]">
                {mobileMenuOpen ? 'close' : 'menu'}
              </span>
            </button>

          </div>

        </div>

        {/* MENÚ MÓVIL DESPLEGABLE */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-slate-100 bg-white/95 backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="flex flex-col space-y-2 pb-3">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2 text-sm font-semibold rounded-xl transition-colors ${
                    pathname === link.href
                      ? 'bg-blue-50 text-blue-600 font-bold'
                      : 'text-slate-800 hover:bg-blue-50 hover:text-blue-600'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row gap-2.5">
              <Link
                href="/reservar"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-3 text-sm font-bold text-blue-700 bg-blue-50 rounded-xl border border-blue-200 flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">calendar_month</span>
                <span>Reservar una Cita</span>
              </Link>
              <Link
                href="/portal"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-3 text-sm font-bold text-white bg-slate-900 rounded-xl flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">account_circle</span>
                <span>Acceso Área Cliente</span>
              </Link>
            </div>
          </div>
        )}

      </div>
    </header>
  );
}
