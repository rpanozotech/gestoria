'use client';

/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getToken, getStoredUser, saveSession, clearSession, SessionUser } from '@/lib/session';
import { apiFetch } from '@/lib/api';

export default function CRMLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(getStoredUser());
  const [checking, setChecking] = useState(true);
  // Clientes activos, para el contador del menu. null = aun no cargado,
  // para no mostrar un 0 que luego salta al valor real.
  const [activeClients, setActiveClients] = useState<number | null>(null);

  // Estados interactivos para Topbar y Responsive Drawer
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(3);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Guard de sesion: sin token valido no se entra al CRM.
  // El backend tambien protege sus rutas (401), pero sin esto se renderiza
  // la pantalla y luego cada fetch falla.
  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    setUser(getStoredUser());
    setChecking(false);
  }, [pathname, router]);

  // Contador de clientes del menu. Se recarga al cambiar de ruta para que
  // un alta o una desactivacion se reflejen sin recargar la pagina.
  useEffect(() => {
    if (!getToken()) return;

    apiFetch('/clients/count')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (typeof data?.activos === 'number') setActiveClients(data.activos);
      })
      .catch(() => {});
  }, [pathname]);

  // Cerrar menú móvil al navegar
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

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
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const navItems = [
    { href: '/crm', label: 'Dashboard', icon: 'grid_view' },
    { href: '/crm/tarifas', label: 'Tarifas & Precios Web', icon: 'price_change' },
    {
      href: '/crm/clientes',
      label: 'Clientes & Ficha 360',
      icon: 'group',
      ...(activeClients !== null ? { badge: String(activeClients) } : {}),
    },
    { href: '/crm/alta-ia', label: 'Alta IA & Escáner', icon: 'auto_awesome', highlight: true },
    { href: '/crm/facturacion', label: 'Presupuestos & Facturas', icon: 'receipt_long' },
    { href: '/crm/agenda', label: 'Agenda & Citas', icon: 'calendar_today' },
    { href: '/crm/documentos-ia', label: 'Asistente Documentos', icon: 'document_scanner' },
    { href: '/crm/chat-ia', label: 'Chat Asistente IA', icon: 'forum', highlight: true, badge: 'En vivo' },
    { href: '/crm/backup', label: 'Copia de Seguridad', icon: 'cloud_download' },
  ];

  const quickSearchResults = [
    { title: 'Descargar Copia de Seguridad Completa (JSON)', category: 'Backup', href: '/crm/backup' },
    { title: 'Exportar Clientes a CSV', category: 'Exportar', href: '/crm/backup' },
    { title: 'Exportar Facturación Oficial a CSV', category: 'Exportar', href: '/crm/backup' },
    { title: 'Tarifas Oficiales', category: 'Tarifas', href: '/crm/tarifas' },
  ].filter((item) => item.title.toLowerCase().includes(searchQuery.toLowerCase()));

  // Mientras se verifica la sesion no se renderiza el CRM: si no, se ve
  // un frame con la UI y los datos hardcodeados antes de redirigir.
  if (checking) {
    return (
      <div className="h-screen h-[100dvh] w-full bg-surface flex items-center justify-center">
        <span className="material-symbols-outlined text-[28px] text-outline animate-spin">progress_activity</span>
      </div>
    );
  }

  return (
    <div className="h-screen h-[100dvh] w-full bg-surface flex overflow-hidden">
      {/* Sidebar fijo a la izquierda en desktop, desplegable como cajón en tablet/móvil */}
      <aside
        id="crm-sidebar"
        aria-label="Navegación principal del CRM"
        className={`fixed left-0 top-0 h-full w-64 bg-surface-container-lowest border-r border-surface-container-high z-50 flex flex-col justify-between transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* Brand header */}
          <div className="h-16 px-6 flex items-center justify-between border-b border-surface-container">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-900 border border-slate-700 flex items-center justify-center shadow-sm">
                <img src="/logo.png" alt="RP Gestoría" className="w-full h-full object-cover" />
              </div>
              <span className="font-headline-sm text-base font-bold text-on-surface tracking-tight">RP Gestoría</span>
            </Link>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-mono-data text-[10px] font-semibold rounded border border-blue-200">
                CRM
              </span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Cerrar menú de navegación"
                className="lg:hidden p-1 rounded-md text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
          </div>

          <div className="px-4 py-3">
            <span className="px-2 text-[11px] font-semibold text-outline uppercase tracking-wider font-label-sm">
              Gestión & Operaciones
            </span>
          </div>

          {/* Navigation links */}
          <nav aria-label="Navegación principal" className="flex flex-col gap-1 px-3">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-md text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-secondary-container text-white shadow-sm'
                      : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className={`material-symbols-outlined text-[19px] ${item.highlight && !isActive ? 'text-secondary' : ''}`}>
                      {item.icon}
                    </span>
                    <span className="truncate whitespace-nowrap">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="shrink-0 whitespace-nowrap px-2 py-0.5 bg-surface-container-high text-on-surface text-[10px] font-mono-data rounded-full">
                      {item.badge}
                    </span>
                  )}
                  {item.highlight && !isActive && !item.badge && (
                    <span className="shrink-0 px-1.5 py-0.5 bg-secondary text-white text-[10px] font-bold rounded">
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

      {/* Backdrop oscuro para móvil y tablet */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden animate-in fade-in duration-200"
        />
      )}

      {/* Main Area (Responsive: pl-0 en móvil/tablet, lg:pl-64 en desktop, adaptado a pantalla completa) */}
      <div className="lg:pl-64 pl-0 flex-1 flex flex-col h-full min-w-0 w-full transition-all overflow-hidden">
        {/* Top Header del CRM general */}
        <header className="h-16 shrink-0 bg-surface/90 backdrop-blur-md border-b border-surface-container-high z-30 px-3 sm:px-6 lg:px-8 flex items-center justify-between gap-3 sm:gap-6">
          {/* Botón Hamburguesa Móvil + Interactive Search Bar */}
          <div className="flex items-center gap-2 sm:gap-3 flex-1 max-w-xl">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-expanded={mobileMenuOpen}
              aria-controls="crm-sidebar"
              aria-label="Abrir menú de navegación"
              className="lg:hidden p-2 -ml-1 rounded-lg text-on-surface hover:bg-surface-container transition-colors flex items-center justify-center shrink-0"
            >
              <span className="material-symbols-outlined text-[24px]">menu</span>
            </button>

            <button
              onClick={() => setShowSearchModal(true)}
              className="w-full h-9 px-3 bg-surface-container-lowest border border-outline-variant text-outline text-xs rounded-md flex items-center justify-between hover:border-secondary hover:text-on-surface transition-colors shadow-sm"
            >
              <div className="flex items-center gap-2 truncate">
                <span className="material-symbols-outlined text-[18px] shrink-0">search</span>
                <span className="truncate">Buscar cliente, BSN o trámite...</span>
              </div>
              <span className="hidden sm:inline px-1.5 py-0.5 bg-surface-container rounded text-[10px] font-mono-data shrink-0">
                Ctrl+K
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 relative shrink-0">
            <Link
              href="/crm/alta-ia"
              className="h-9 px-3 sm:px-3.5 bg-primary text-on-primary rounded-md text-xs font-semibold flex items-center gap-1.5 sm:gap-2 hover:bg-slate-800 transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px] text-secondary">auto_awesome</span>
              <span className="hidden sm:inline">+ Nuevo con IA</span>
              <span className="sm:hidden">Alta IA</span>
            </Link>

            {/* Notifications Button & Dropdown */}
            <div className="relative border-x border-surface-container px-2">
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setShowUserMenu(false);
                }}
                aria-label="Notificaciones"
                aria-expanded={showNotifications}
                aria-haspopup="menu"
                className="h-9 w-9 flex items-center justify-center rounded-md text-on-surface-variant hover:bg-surface-container relative transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">notifications</span>
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-3.5 w-3.5 bg-error text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Dropdown Notificaciones */}
              {showNotifications && (
                <div className="absolute right-0 top-11 w-80 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-xl p-4 space-y-3 z-50 animate-in fade-in">
                  <div className="flex items-center justify-between pb-2 border-b border-surface-container">
                    <span className="font-bold text-xs text-on-surface">Notificaciones ({unreadCount})</span>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={() => setUnreadCount(0)}
                          className="text-[10px] text-secondary font-semibold hover:underline"
                        >
                          Marcar leídas
                        </button>
                      )}
                      <span className="text-[10px] text-outline font-semibold cursor-pointer hover:underline" onClick={() => setShowNotifications(false)}>
                        Cerrar
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <Link
                      href="/crm/documentos-ia"
                      onClick={() => setShowNotifications(false)}
                      className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 block hover:bg-blue-100 transition-colors"
                    >
                      <span className="font-bold text-blue-900 block">Resolución Belastingdienst</span>
                      <span className="text-[11px] text-blue-800">Nueva carta de liquidación recibida para Cliente seleccionado.</span>
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
                      <span className="text-[11px] text-emerald-800">Videollamada M-Form con Cliente seleccionado a las 10:00.</span>
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
                aria-label={`Menú de usuario de ${user?.full_name || 'Gestor'}`}
                aria-expanded={showUserMenu}
                aria-haspopup="menu"
                className="flex items-center gap-3 hover:opacity-80 transition-opacity"
              >
                <div className="w-8 h-8 rounded-full bg-primary-container text-white font-mono-data font-bold text-xs flex items-center justify-center shadow-sm">
                  {(user?.full_name || 'G')
                    .split(' ')
                    .map((w) => w[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()}
                </div>
                <div className="hidden lg:flex flex-col text-left">
                  <span className="text-xs font-bold text-on-surface leading-tight">{user?.full_name || 'Gestor'}</span>
                  <span className="text-[10px] text-outline capitalize">{user?.role || 'gestor'}</span>
                </div>
                <span className="material-symbols-outlined text-[16px] text-outline">expand_more</span>
              </button>

              {/* Dropdown Usuario */}
              {showUserMenu && (
                <div className="absolute right-0 top-11 w-60 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-xl p-3 space-y-2 z-50 text-xs">
                  <div className="px-2 py-1.5 border-b border-surface-container">
                    <p className="font-bold text-on-surface">{user?.full_name || 'Gestor'}</p>
                    <p className="text-[11px] text-outline font-mono-data">{user?.email}</p>
                  </div>

                  <Link
                    href="/crm/backup"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-surface-container text-on-surface transition-colors font-semibold text-secondary"
                  >
                    <span className="material-symbols-outlined text-[16px] text-secondary">cloud_download</span>
                    <span>Copia de Seguridad & Exportar</span>
                  </Link>

                  <Link
                    href="/crm/tarifas"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-surface-container text-on-surface transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px] text-outline">price_change</span>
                    <span>Tarifas Oficiales</span>
                  </Link>

                  <Link
                    href="/portal"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-surface-container text-on-surface transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px] text-outline">visibility</span>
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
                        clearSession();
                        router.replace('/login');
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

        {/* Content View: Adaptado a pantalla completa sin scrollbar visible a la derecha */}
        <main className={`flex-1 h-[calc(100dvh-4rem)] overflow-x-hidden px-3 sm:px-6 lg:px-8 py-3 sm:py-4 bg-surface ${
          pathname === '/crm/documentos-ia' ? 'overflow-y-auto xl:overflow-hidden' : 'overflow-y-auto'
        }`}>
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
              <button type="button" aria-label="Cerrar búsqueda" onClick={() => setShowSearchModal(false)} className="min-h-11 min-w-11 text-outline hover:text-on-surface">
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
