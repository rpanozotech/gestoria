'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export default function CRMLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  // Estados interactivos para Topbar
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Atajo de teclado Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearchModal((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setShowSearchModal(false);
        setShowNotifications(false);
        setShowUserMenu(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const navItems = [
    { href: '/crm', label: 'Dashboard', icon: 'grid_view' },
    { href: '/crm/clientes', label: 'Clientes & Ficha 360', icon: 'group', badge: '148' },
    { href: '/crm/alta-ia', label: 'Alta IA & Escáner', icon: 'auto_awesome', highlight: true },
    { href: '/crm/facturacion', label: 'Presupuestos & Facturas', icon: 'receipt_long' },
    { href: '/crm/agenda', label: 'Agenda & Citas', icon: 'calendar_today' },
    { href: '/crm/documentos-ia', label: 'Asistente Documentos', icon: 'document_scanner' },
  ];

  const quickSearchResults = [
    { title: 'Maria Popescu (BSN: 982145672)', category: 'Cliente', href: '/crm/clientes' },
    { title: 'Carlos Mendoza Ruiz (BSN: 817293845)', category: 'Cliente', href: '/crm/clientes' },
    { title: 'EXP-2026-0041: Activación DigiD + Zorgtoeslag', category: 'Expediente', href: '/crm' },
    { title: 'EXP-2026-0042: M-Form 2025 Belastingdienst', category: 'Expediente', href: '/crm' },
    { title: 'FAC-2026-0001: € 266,20 (Pagada iDEAL)', category: 'Factura', href: '/crm/facturacion' },
    { title: 'FAC-2026-0002: € 102,85 (Emitida)', category: 'Factura', href: '/crm/facturacion' },
  ].filter((item) => item.title.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="min-h-screen bg-surface flex">
      {/* Sidebar fijo */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-surface-container-lowest border-r border-surface-container-high z-50 flex flex-col justify-between">
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* Brand header */}
          <div className="h-16 px-6 flex items-center justify-between border-b border-surface-container">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary-container text-white flex items-center justify-center font-bold text-sm shadow-sm">
                NG
              </div>
              <span className="font-headline-sm text-base font-bold text-on-surface tracking-tight">NexusGest</span>
            </Link>
            <span className="px-2 py-0.5 bg-surface-container text-on-surface-variant font-mono-data text-[10px] font-semibold rounded">
              v2.4 Pro
            </span>
          </div>

          <div className="px-4 py-3">
            <span className="px-2 text-[11px] font-semibold text-outline uppercase tracking-wider font-label-sm">
              Gestión & Operaciones
            </span>
          </div>

          {/* Navigation links */}
          <nav className="flex flex-col gap-1 px-3">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-md text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-secondary-container text-white shadow-sm'
                      : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`material-symbols-outlined text-[19px] ${item.highlight && !isActive ? 'text-secondary' : ''}`}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="px-2 py-0.5 bg-surface-container-high text-on-surface text-[10px] font-mono-data rounded-full">
                      {item.badge}
                    </span>
                  )}
                  {item.highlight && !isActive && (
                    <span className="px-1.5 py-0.5 bg-secondary text-white text-[10px] font-bold rounded">
                      IA
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer Sidebar: System Status */}
        <div className="p-4 bg-surface-container-low border-t border-surface-container-high flex flex-col gap-3">
          <div className="p-3 bg-surface-container-lowest rounded-lg border border-surface-container text-xs space-y-1.5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-outline">Servidor Coolify</span>
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>
            <div className="flex items-center justify-between font-mono-data text-[11px] text-on-surface-variant">
              <span>PostgreSQL</span>
              <span className="text-emerald-600 font-semibold">Online</span>
            </div>
            <div className="flex items-center justify-between font-mono-data text-[11px] text-on-surface-variant">
              <span>Storage / OCR</span>
              <span className="text-secondary font-semibold">Ready</span>
            </div>
          </div>

          <div className="flex items-center justify-between px-2 text-xs">
            <Link href="/" className="text-outline hover:text-secondary flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px]">arrow_back</span>
              <span>Web Pública</span>
            </Link>
            <Link href="/portal" className="text-secondary hover:underline">
              Portal Cliente
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Area */}
      <div className="pl-64 flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 h-16 bg-surface/90 backdrop-blur-md border-b border-surface-container-high z-40 px-8 flex items-center justify-between gap-6">
          {/* Interactive Search Bar / Command Palette trigger */}
          <div className="flex-1 max-w-xl">
            <button
              onClick={() => setShowSearchModal(true)}
              className="w-full h-9 px-3 bg-surface-container-lowest border border-outline-variant text-outline text-xs rounded-md flex items-center justify-between hover:border-secondary hover:text-on-surface transition-colors shadow-sm"
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">search</span>
                <span>Buscar cliente, BSN, factura o trámite...</span>
              </div>
              <span className="px-1.5 py-0.5 bg-surface-container rounded text-[10px] font-mono-data">Ctrl+K</span>
            </button>
          </div>

          <div className="flex items-center gap-4 relative">
            <Link
              href="/crm/alta-ia"
              className="h-9 px-3.5 bg-primary text-on-primary rounded-md text-xs font-semibold flex items-center gap-2 hover:bg-slate-800 transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px] text-secondary">auto_awesome</span>
              <span>+ Nuevo con IA</span>
            </Link>

            {/* Notifications Button & Dropdown */}
            <div className="relative border-x border-surface-container px-2">
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setShowUserMenu(false);
                }}
                className="h-9 w-9 flex items-center justify-center rounded-md text-on-surface-variant hover:bg-surface-container relative transition-colors"
                title="Notificaciones"
              >
                <span className="material-symbols-outlined text-[20px]">notifications</span>
                <span className="absolute top-1.5 right-1.5 h-3.5 w-3.5 bg-error text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  3
                </span>
              </button>

              {/* Dropdown Notificaciones */}
              {showNotifications && (
                <div className="absolute right-0 top-11 w-80 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-xl p-4 space-y-3 z-50 animate-in fade-in">
                  <div className="flex items-center justify-between pb-2 border-b border-surface-container">
                    <span className="font-bold text-xs text-on-surface">Notificaciones (3)</span>
                    <span className="text-[10px] text-secondary font-semibold cursor-pointer hover:underline" onClick={() => setShowNotifications(false)}>
                      Cerrar
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <Link
                      href="/crm/documentos-ia"
                      onClick={() => setShowNotifications(false)}
                      className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 block hover:bg-blue-100 transition-colors"
                    >
                      <span className="font-bold text-blue-900 block">Resolución Belastingdienst</span>
                      <span className="text-[11px] text-blue-800">Nueva carta de liquidación recibida para Maria Popescu.</span>
                    </Link>

                    <Link
                      href="/crm/facturacion"
                      onClick={() => setShowNotifications(false)}
                      className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 block hover:bg-amber-100 transition-colors"
                    >
                      <span className="font-bold text-amber-900 block">Presupuesto por Vencer</span>
                      <span className="text-[11px] text-amber-800">PRE-2026-0002 vence en 3 días.</span>
                    </Link>

                    <Link
                      href="/crm/agenda"
                      onClick={() => setShowNotifications(false)}
                      className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 block hover:bg-emerald-100 transition-colors"
                    >
                      <span className="font-bold text-emerald-900 block">Cita Confirmada</span>
                      <span className="text-[11px] text-emerald-800">Videollamada M-Form con Carlos Mendoza a las 10:00.</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Avatar & Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowUserMenu(!showUserMenu);
                  setShowNotifications(false);
                }}
                className="flex items-center gap-3 hover:opacity-80 transition-opacity"
              >
                <div className="w-8 h-8 rounded-full bg-primary-container text-white font-mono-data font-bold text-xs flex items-center justify-center shadow-sm">
                  RP
                </div>
                <div className="hidden lg:flex flex-col text-left">
                  <span className="text-xs font-bold text-on-surface leading-tight">Rony P.</span>
                  <span className="text-[10px] text-outline">Gestor Principal / Admin</span>
                </div>
                <span className="material-symbols-outlined text-[16px] text-outline">expand_more</span>
              </button>

              {/* Dropdown Usuario */}
              {showUserMenu && (
                <div className="absolute right-0 top-11 w-56 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-xl p-3 space-y-2 z-50 text-xs">
                  <div className="px-2 py-1.5 border-b border-surface-container">
                    <p className="font-bold text-on-surface">Rony P.</p>
                    <p className="text-[11px] text-outline font-mono-data">admin@nexusgest.nl</p>
                  </div>
                  <Link
                    href="/portal"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-surface-container text-on-surface transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px] text-secondary">visibility</span>
                    <span>Probar Vista Cliente</span>
                  </Link>
                  <Link
                    href="/"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-surface-container text-on-surface transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">public</span>
                    <span>Ir a la Web Pública</span>
                  </Link>
                  <div className="pt-1 border-t border-surface-container">
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        router.push('/');
                      }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-error hover:bg-red-50 transition-colors text-left"
                    >
                      <span className="material-symbols-outlined text-[16px]">logout</span>
                      <span>Cerrar Sesión</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content View */}
        <main className="flex-1 p-8 pb-16 bg-surface">
          {children}
        </main>
      </div>

      {/* QUICK COMMAND PALETTE / SEARCH MODAL (Ctrl + K) */}
      {showSearchModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center pt-20 p-4">
          <div className="bg-surface-container-lowest max-w-lg w-full rounded-2xl border border-outline-variant shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-surface-container flex items-center gap-3">
              <span className="material-symbols-outlined text-secondary text-xl">search</span>
              <input
                autoFocus
                type="text"
                placeholder="Escribe para buscar cliente, BSN o trámite..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-sm bg-transparent focus:outline-none text-on-surface placeholder:text-outline"
              />
              <button onClick={() => setShowSearchModal(false)} className="text-outline hover:text-on-surface">
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto p-2 divide-y divide-surface-container">
              {quickSearchResults.length > 0 ? (
                quickSearchResults.map((res, i) => (
                  <Link
                    key={i}
                    href={res.href}
                    onClick={() => setShowSearchModal(false)}
                    className="p-3 hover:bg-surface-container rounded-lg flex items-center justify-between text-xs transition-colors block"
                  >
                    <div>
                      <p className="font-semibold text-on-surface">{res.title}</p>
                      <span className="text-[10px] text-outline uppercase font-mono-data">{res.category}</span>
                    </div>
                    <span className="material-symbols-outlined text-[16px] text-outline">arrow_forward</span>
                  </Link>
                ))
              ) : (
                <div className="p-6 text-center text-xs text-outline">
                  No se encontraron resultados para &quot;{searchQuery}&quot;
                </div>
              )}
            </div>

            <div className="p-2.5 bg-surface-container-low border-t border-surface-container text-[11px] text-outline flex justify-between">
              <span>Navega con las flechas o ratón</span>
              <span>ESC para cerrar</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
