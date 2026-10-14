'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useLanguage } from '@/context/LanguageContext';
import { usePathname } from 'next/navigation';
import type { Language } from '@/lib/i18n';


export default function Navbar() {
  const pathname = usePathname();
  const { lang, setLang, t } = useLanguage();
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = lang === 'EN' ? [
    { href: '/', label: 'Home' },
    { href: '/como-funciona', label: 'How it works' },
    { href: '/servicios', label: 'Services' },
    { href: '/faq', label: 'FAQ' },
    { href: '/contacto', label: 'Contact' },
  ] : [
    { href: '/', label: 'Inicio' },
    { href: '/como-funciona', label: 'Cómo funciona' },
    { href: '/servicios', label: 'Servicios' },
    { href: '/faq', label: 'FAQ' },
    { href: '/contacto', label: 'Contacto' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-sm w-full">
      <div className="w-full px-4 sm:px-8 lg:px-12 xl:px-16">
        <div className="flex items-center gap-3 lg:gap-5 h-18 sm:h-20">

          {/* LOGO OFICIAL - RP GESTORÍA & ASESORÍA */}
          <Link href="/" className="flex items-center gap-2 sm:gap-3 shrink-0 group lg:w-[265px] xl:w-[280px]">
            <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl overflow-hidden shadow-sm border border-slate-200/90 group-hover:scale-105 transition-transform bg-slate-900 flex items-center justify-center shrink-0">
              <Image
                src="/logo.png"
                alt="RP Asesoría"
                width={44}
                height={44}
                className="object-cover w-full h-full"
                priority
              />
            </div>
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-1">
                <span className="font-heading font-extrabold text-base sm:text-lg tracking-tight text-slate-900 leading-none">
                  RP Asesoría
                </span>
              </div>
              <span className="hidden sm:block text-[9px] xl:text-[10px] text-slate-500 font-semibold tracking-wider uppercase mt-1 leading-none whitespace-nowrap">
                Tus trámites en Holanda, fáciles
              </span>
            </div>
          </Link>

          {/* NAV LINKS DESKTOP A PÁGINAS INDEPENDIENTES */}
          <nav aria-label="Navegación principal" className="hidden lg:flex flex-1 min-w-0 items-center justify-center gap-1.5 xl:gap-2">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-xs xl:text-xs font-semibold whitespace-nowrap transition-all py-2 border-b-2 ${
                    isActive
                      ? 'text-[#145DA0] border-blue-600 font-bold'
                      : 'text-slate-700 hover:text-[#145DA0] border-transparent hover:border-blue-200'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* ACCIONES Y BOTONES DE LA DERECHA */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">

            {/* SELECTOR DE IDIOMA */}
            <div className="relative">
              <button
                onClick={() => setLangMenuOpen(!langMenuOpen)}
                aria-expanded={langMenuOpen}
                aria-controls="language-menu"
                className="h-9 sm:h-10 px-2 sm:px-2.5 flex items-center gap-1 rounded-xl border border-slate-200/90 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors"
                aria-label={t('language_select')}
              >
                <span className="material-symbols-outlined text-[17px] text-slate-500">language</span>
                <span>{lang}</span>
                <span className="material-symbols-outlined text-[15px] text-slate-400">expand_more</span>
              </button>

              {langMenuOpen && (
                <div id="language-menu" role="menu" className="absolute right-0 mt-2 w-40 bg-white rounded-2xl shadow-2xl border border-slate-100 py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  {[
                    { code: 'ES', label: 'Español 🇪🇸' },
                    { code: 'EN', label: 'English 🇬🇧' },
                    { code: 'NL', label: 'Nederlands 🇳🇱' },
                  ].map((item) => (
                    <button
                      key={item.code}
                      onClick={() => {
                        setLang(item.code as Language);
                        setLangMenuOpen(false);
                      }}
                      className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between hover:bg-blue-50 transition-colors ${
                        lang === item.code ? 'font-bold text-[#145DA0] bg-blue-50/60' : 'text-slate-700'
                      }`}
                    >
                      <span>{item.label}</span>
                      {lang === item.code && <span className="material-symbols-outlined text-[15px] text-[#145DA0]">check</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* RESERVAR CITA BUTTON -> /reservar */}
            <Link
              href="/reservar"
              className="hidden md:inline-flex items-center gap-1.5 h-9 sm:h-10 px-2.5 xl:px-2.5 text-xs xl:text-sm font-bold text-blue-700 bg-blue-50 hover:bg-blue-100/90 rounded-xl transition-all border border-blue-200/80 shadow-sm shrink-0"
            >
              <span className="material-symbols-outlined text-[18px]">calendar_month</span>
              <span>{t('nav_book')}</span>
            </Link>

            {/* ÁREA CLIENTE BUTTON -> acceso al portal */}
            <Link
              href="/portal/login"
              className="hidden sm:inline-flex items-center gap-1.5 h-9 sm:h-10 px-2.5 xl:px-2.5 text-xs xl:text-sm font-bold text-white bg-slate-900 hover:bg-blue-600 rounded-xl shadow-md hover:shadow-blue-500/20 transition-all shrink-0"
            >
              <span className="material-symbols-outlined text-[18px]">account_circle</span>
              <span>{t('nav_portal')}</span>
            </Link>

            {/* BOTÓN HAMBURGUESA MOBILE */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-expanded={mobileMenuOpen}
              aria-controls="public-mobile-menu"
              className="lg:hidden h-9 w-9 sm:h-10 sm:w-10 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-700 transition-colors"
              aria-label={mobileMenuOpen ? t('close_menu') : t('open_menu')}
            >
              <span className="material-symbols-outlined text-[22px]">
                {mobileMenuOpen ? 'close' : 'menu'}
              </span>
            </button>

          </div>

        </div>

        {/* MENÚ MÓVIL DESPLEGABLE */}
        {mobileMenuOpen && (
          <div id="public-mobile-menu" role="navigation" aria-label="Navegación móvil" className="lg:hidden py-4 border-t border-slate-100 bg-white/95 backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="flex flex-col space-y-2 pb-3">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2 text-sm font-semibold rounded-xl transition-colors ${
                    pathname === link.href
                      ? 'bg-blue-50 text-[#145DA0] font-bold'
                      : 'text-slate-800 hover:bg-blue-50 hover:text-[#145DA0]'
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
                <span>{t('nav_book_mobile')}</span>
              </Link>
              <Link
                href="/portal/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-3 text-sm font-bold text-white bg-slate-900 rounded-xl flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">account_circle</span>
                <span>{t('nav_portal_mobile')}</span>
              </Link>
            </div>
          </div>
        )}

      </div>
    </header>
  );
}
