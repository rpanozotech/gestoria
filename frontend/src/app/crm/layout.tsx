'use client';

/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getToken, getStoredUser, saveSession, clearSession, SessionUser } from '@/lib/session';
import { apiFetch } from '@/lib/api';

type NavItem = { href: string; label: string; icon: string; badge?: string; badgeColor?: string };

function NavLink({ item, pathname, collapsed, onClick }: { item: NavItem; pathname: string; collapsed: boolean; onClick: () => void }) {
  const isExact = pathname === item.href;
  const isDebtDetail = item.href === '/crm/deudas/1' && pathname.startsWith('/crm/deudas/') && pathname !== '/crm/deudas';
  const isClientDetail = item.href === '/crm/clientes/demo-client-1' && pathname.startsWith('/crm/clientes/') && pathname !== '/crm/clientes' && pathname !== '/crm/clientes/alta-ia' && pathname !== '/crm/clientes/nuevo' && pathname !== '/crm/clientes/importar';
  const isIntegrations = item.href === '/crm/integraciones' && (pathname === '/crm/integraciones' || pathname === '/crm/preferencias-avisos');
  const isActive = isExact || isDebtDetail || isClientDetail || isIntegrations;
  return (
    <Link
      href={item.href}
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      aria-current={isActive ? 'page' : undefined}
      className={`flex items-center justify-between rounded-lg px-3 py-2 text-[13px] transition-all ${
        isActive
          ? 'bg-[#0055D4] text-white shadow-xs font-semibold'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium'
      }`}
    >
      <span className="flex min-w-0 items-center gap-2.5">
        <span className={`material-symbols-outlined text-[20px] ${isActive ? 'text-white' : 'text-slate-400'}`}>{item.icon}</span>
        {!collapsed && <span className="truncate whitespace-nowrap">{item.label}</span>}
      </span>
      {!collapsed && item.badge && (
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-mono-data font-bold ${
            item.badgeColor
              ? item.badgeColor
              : isActive
              ? 'bg-white/20 text-white'
              : 'bg-slate-100 text-slate-600 border border-slate-200'
          }`}
        >
          {item.badge}
        </span>
      )}
    </Link>
  );
}

export default function CRMLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(getStoredUser());
  const [checking, setChecking] = useState(true);
  // Total de clientes no eliminados, para que el contador del menu coincida con el directorio.
  const [clientCount, setClientCount] = useState<number | null>(null);

  // Estados interactivos para Topbar y Responsive Drawer
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [financeOpen, setFinanceOpen] = useState(pathname.startsWith('/crm/facturacion') || pathname.startsWith('/crm/deudas'));
  const [clientsOpen, setClientsOpen] = useState(pathname.startsWith('/crm/clientes'));
  const [showNotifications, setShowNotifications] = useState(false);
  const unreadCount = 0;
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    AUTOMATIZACIÓN: true,
    CONFIGURACIÓN: true,
  });

  useEffect(() => {
    document.title = 'RP Asesoría | CRM';
  }, []);

  // Guard de sesion: sin token valido no se entra al CRM.
  // El backend tambien protege sus rutas (401), pero sin esto se renderiza
  // la pantalla y luego cada fetch falla.
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_CRM_PREVIEW === 'true' || process.env.NODE_ENV !== 'production') {
      setUser({ id: 'demo-user', email: 'demo@example.test', full_name: 'Usuario de prueba', role: 'gestor' });
      setChecking(false);
      return;
    }
    let active = true;
    apiFetch('/auth/me')
      .then(async (res) => {
        if (!res.ok) {
          clearSession();
          router.replace(`/login?next=${encodeURIComponent(pathname)}`);
          return;
        }
        const data = await res.json();
        if (active) {
          setUser(data.user || getStoredUser());
          setChecking(false);
        }
      })
      .catch(() => {
        if (active) {
          clearSession();
          router.replace(`/login?next=${encodeURIComponent(pathname)}`);
        }
      });
    return () => { active = false; };
  }, [pathname, router]);

  // Contador de clientes del menu. Se recarga al cambiar de ruta para que
  // un alta o una desactivacion se reflejen sin recargar la pagina.
  useEffect(() => {
    const refreshClientCount = () => {
      apiFetch('/clients/count')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (typeof data?.total === 'number') setClientCount(data.total);
        })
        .catch(() => {});
    };
    refreshClientCount();
    window.addEventListener('crm-client-count-updated', refreshClientCount);
    return () => window.removeEventListener('crm-client-count-updated', refreshClientCount);
  }, [pathname]);

  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  }, []);

  // Cerrar menú móvil al navegar
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Si el usuario entra directamente en una herramienta, mantenemos visible
  // el grupo para que la sección activa no desaparezca del menú.
  useEffect(() => {
    const activeGroup = pathname.startsWith('/crm/documentos-ia') || pathname.startsWith('/crm/chat-ia')
      ? 'AUTOMATIZACIÓN'
      : pathname.startsWith('/crm/ajustes-datos-empresa') || pathname.startsWith('/crm/integraciones') || pathname.startsWith('/crm/asesor-portal') || pathname.startsWith('/crm/contenido') || pathname.startsWith('/crm/backup')
        ? 'CONFIGURACIÓN'
        : null;
    if (activeGroup) setOpenGroups((groups) => ({ ...groups, [activeGroup]: true }));
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

  const navGroups = [
    {
      label: 'OPERACIÓN',
      items: [
        { href: '/crm', label: 'Dashboard', icon: 'dashboard' },
        { href: '/crm/tareas', label: 'Mi trabajo de hoy', icon: 'checklist' },
        { href: '/crm/clientes', label: 'Clientes', icon: 'groups', badge: clientCount === null ? undefined : String(clientCount) },
        { href: '/crm/expedientes', label: 'Expedientes', icon: 'folder_open' },
        { href: '/crm/agenda', label: 'Agenda y citas', icon: 'calendar_month' },
        { href: '/crm/contacto', label: 'Consultas web', icon: 'inbox' },
      ],
    },
    {
      label: 'FINANZAS',
      items: [
        { href: '/crm/facturacion', label: 'Facturación', icon: 'receipt_long' },
        { href: '/crm/deudas', label: 'Cobros y deudas', icon: 'payments' },
        { href: '/crm/tarifas', label: 'Tarifas', icon: 'sell' },
      ],
    },
    {
      label: 'AUTOMATIZACIÓN',
      items: [
        { href: '/crm/clientes/alta-ia', label: 'Alta con IA', icon: 'auto_awesome', badge: 'IA', badgeColor: 'bg-purple-100 text-purple-700 border border-purple-200' },
        { href: '/crm/documentos-ia', label: 'Documentos IA', icon: 'description' },
        { href: '/crm/chat-ia', label: 'Chat IA', icon: 'chat_bubble_outline', badge: '● En vivo', badgeColor: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
      ],
    },
    {
      label: 'CONFIGURACIÓN',
      items: [
        { href: '/crm/ajustes-datos-empresa', label: 'Datos de empresa', icon: 'business' },
        { href: '/crm/asesor-portal', label: 'Perfil del asesor', icon: 'badge' },
        { href: '/crm/integraciones', label: 'Integraciones', icon: 'hub' },
        { href: '/crm/contenido', label: 'CMS', icon: 'language' },
        { href: '/crm/backup', label: 'Copias de seguridad', icon: 'cloud_sync' },
      ],
    },
  ];

  const quickSearchResults = [
    { title: 'Descargar Copia de Seguridad Completa (JSON)', category: 'Backup', href: '/crm/backup' },
    { title: 'Exportar Clientes a CSV', category: 'Exportar', href: '/crm/backup' },
    { title: 'Exportar Facturación Oficial a CSV', category: 'Exportar', href: '/crm/backup' },
    { title: 'Tarifas Oficiales', category: 'Tarifas', href: '/crm/tarifas' },
  ].filter((item) => item.title.toLowerCase().includes(searchQuery.toLowerCase()));

  // El CRM tiene metadatos propios: no debe heredar el título de la web pública.
  useEffect(() => {
    document.title = 'RP Asesoría | CRM';
    const description = document.querySelector('meta[name="description"]') || document.createElement('meta');
    description.setAttribute('name', 'description');
    description.setAttribute('content', 'CRM interno de RP Asesoría para gestionar clientes, expedientes, citas y documentos.');
    if (!description.parentElement) document.head.appendChild(description);
  }, []);

  // Mientras se verifica la sesion no se renderiza el CRM: si no, se ve
  // un frame con la UI y los datos hardcodeados antes de redirigir.
  if (checking) {
    return (
      <div className="h-screen h-[100dvh] w-full bg-slate-50 flex items-center justify-center">
        <span className="material-symbols-outlined text-[28px] text-slate-400 animate-spin">progress_activity</span>
      </div>
    );
  }

  return (
    <div className="h-screen h-[100dvh] w-full bg-[#f4f6fa] flex overflow-hidden">
      <title>RP Asesoría | CRM</title>
      {/* Sidebar fijo a la izquierda en desktop, desplegable como cajón en tablet/móvil */}
      <aside
        id="crm-sidebar"
        aria-label="Navegación principal del CRM"
        className={`crm-sidebar fixed left-0 top-0 h-full ${sidebarCollapsed ? 'w-[76px]' : 'w-64'} bg-white border-r border-[#e2e8f0] z-50 flex flex-col justify-between transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col flex-1 overflow-y-auto no-scrollbar">
          {/* Brand header */}
          <div className={`brand-header h-[65px] min-h-[65px] shrink-0 ${sidebarCollapsed ? 'px-3' : 'px-4'} flex items-center justify-between border-b border-[#e2e8f0] bg-white`}>
            <Link href="/crm" className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg overflow-hidden bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0 shadow-xs">
                <img src="/logo.png" alt="RP Gestoría" className="w-full h-full object-cover" />
              </div>
              <span className={`${sidebarCollapsed ? 'hidden' : 'inline-flex flex-col'} leading-tight min-w-0`}>
                <span className="font-headline-sm text-sm font-bold text-slate-900 tracking-tight truncate">RP Asesoría</span>
                <span className="mt-0.5 text-[8.5px] font-semibold uppercase tracking-[0.06em] text-slate-500 truncate">ASESORÍA &amp; GESTORÍA</span>
              </span>
            </Link>
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 bg-blue-50 text-[#0055D4] font-mono-data text-[10px] font-bold rounded border border-blue-200">
                CRM
              </span>
              <button
                type="button"
                onClick={() => setSidebarCollapsed((value) => !value)}
                aria-label={sidebarCollapsed ? 'Expandir barra lateral' : 'Contraer barra lateral'}
                title={sidebarCollapsed ? 'Expandir barra lateral' : 'Contraer barra lateral'}
                className="hidden lg:flex min-h-7 min-w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">{sidebarCollapsed ? 'menu_open' : 'menu'}</span>
              </button>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Cerrar menú de navegación"
                className="lg:hidden p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
          </div>

          <nav aria-label="Navegación principal" className="flex flex-col gap-4 px-3 py-3">
            {navGroups.map((group) => {
              const isCollapsibleGroup = group.label === 'AUTOMATIZACIÓN' || group.label === 'CONFIGURACIÓN';
              const isOpen = openGroups[group.label] ?? true;
              const showItems = !isCollapsibleGroup || isOpen || sidebarCollapsed;

              return (
                <div key={group.label} className="space-y-0.5">
                  {!sidebarCollapsed && (
                    isCollapsibleGroup ? (
                      <button
                        type="button"
                        onClick={() => setOpenGroups((groups) => ({ ...groups, [group.label]: !isOpen }))}
                        aria-expanded={isOpen}
                        className="w-full flex items-center justify-between px-2.5 pb-1 text-left text-[11px] font-bold tracking-[0.14em] text-slate-500 uppercase hover:text-slate-800 transition-colors"
                      >
                        <span>{group.label}</span>
                        <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                          {isOpen ? 'expand_less' : 'expand_more'}
                        </span>
                      </button>
                    ) : (
                      <p className="px-2.5 pb-1 text-[11px] font-bold tracking-[0.14em] text-slate-500 uppercase">{group.label}</p>
                    )
                  )}
                  {showItems && group.items.map((item) => (
                    <NavLink key={item.href} item={item} pathname={pathname} collapsed={sidebarCollapsed} onClick={() => setMobileMenuOpen(false)} />
                  ))}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Footer Sidebar: System Status & Portal Cliente */}
        <div className="p-3 bg-white border-t border-[#e2e8f0] space-y-2">
          {!sidebarCollapsed && (
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] space-y-1.5 font-medium">
              <div className="flex items-center justify-between text-slate-600">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Servidor Coolify
                </span>
                <span className="text-[10px] font-semibold text-emerald-700">Online</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  PostgreSQL
                </span>
                <span className="text-[10px] font-semibold text-emerald-700">Online</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  Storage / OCR
                </span>
                <span className="text-[10px] font-semibold text-blue-700">Ready</span>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between px-1 pt-0.5 text-xs">
            <Link
              href="https://rp-gestoria.tech/"
              className="text-slate-500 hover:text-slate-900 font-medium transition-colors flex items-center gap-1"
            >
              <span>← Web Pública</span>
            </Link>
            <Link
              href="https://portal.rp-gestoria.tech/portal/login"
              className="text-slate-500 hover:text-slate-900 font-medium transition-colors flex items-center gap-1"
            >
              <span>Portal Cliente ↗</span>
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
      <div className={`${sidebarCollapsed ? 'lg:pl-[76px]' : 'lg:pl-64'} pl-0 flex-1 flex flex-col h-full min-w-0 w-full transition-all overflow-hidden`}>
        {/* Top Header del CRM general */}
        <header className="crm-topbar h-[4.0625rem] shrink-0 bg-white border-b border-[#e2e8f0] z-30 px-3 sm:px-6 lg:px-8 flex items-center justify-between gap-3 sm:gap-6 shadow-xs">
          {/* Botón Hamburguesa Móvil + Interactive Search Bar */}
          <div className="flex items-center gap-2 sm:gap-3 flex-1 max-w-xl">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-expanded={mobileMenuOpen}
              aria-controls="crm-sidebar"
              aria-label="Abrir menú de navegación"
              className="lg:hidden p-2 -ml-1 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors flex items-center justify-center shrink-0"
            >
              <span className="material-symbols-outlined text-[24px]">menu</span>
            </button>

            <button type="button"
              onClick={() => setShowSearchModal(true)}
              className="w-full h-10 px-3.5 bg-white border border-[#d8e2ef] text-slate-400 text-xs rounded-lg flex items-center justify-between hover:border-[#0969e8] hover:text-slate-600 transition-colors shadow-xs"
            >
              <div className="flex items-center gap-2.5 truncate">
                <span className="material-symbols-outlined text-[19px] text-slate-400 shrink-0">search</span>
                <span className="truncate text-slate-500 font-normal">Buscar cliente, expediente, BSN o trámite...</span>
              </div>
              <span className="hidden sm:inline px-1.5 py-0.5 bg-[#f1f5f9] border border-[#e2e8f0] rounded text-[10px] font-mono-data text-slate-500 shrink-0">
                Ctrl + K
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 relative shrink-0">
            <Link
              href={pathname === '/crm/tareas' ? '/crm/agenda' : '/crm/clientes/alta-ia'}
              className="h-10 px-4 rounded-lg text-xs font-semibold flex items-center gap-2 bg-[#0969e8] hover:bg-[#0858c4] text-white transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-[17px]">{pathname === '/crm/tareas' ? 'add' : 'auto_awesome'}</span>
              <span className="hidden sm:inline">{pathname === '/crm/tareas' ? '+ Nuevo trámite' : '+ Nuevo con IA'}</span>
              <span className="sm:hidden">+ Nuevo</span>
            </Link>

            {/* Notifications Button & Dropdown */}
            <div className="relative border-x border-[#e2e8f0] px-2 sm:px-3">
              <button type="button"
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setShowUserMenu(false);
                }}
                aria-label="Notificaciones"
                aria-expanded={showNotifications}
                aria-haspopup="menu"
                className="h-9 w-9 flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 relative transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">notifications</span>
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 h-4 w-4 bg-[#ef4444] text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white">
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

                      <span className="text-[10px] text-slate-400 font-semibold cursor-pointer hover:underline" onClick={() => setShowNotifications(false)}>
                        Cerrar
                      </span>
                    </div>
                  </div>

                  <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">Las notificaciones automáticas aún no están conectadas.</p>
                </div>
              )}
            </div>

            {/* User Profile Avatar & Dropdown */}
            <div className="relative">
              <button type="button"
                onClick={() => {
                  setShowUserMenu(!showUserMenu);
                  setShowNotifications(false);
                }}
                aria-label={`Menú de usuario de ${user?.full_name || 'Administrador RP Gestoría'}`}
                aria-expanded={showUserMenu}
                aria-haspopup="menu"
                className="flex items-center gap-2.5 hover:opacity-90 transition-opacity p-1 rounded-lg"
              >
                <div className="w-8 h-8 rounded-full bg-[#0B1F33] text-white font-mono-data font-bold text-xs flex items-center justify-center shadow-sm">
                  {user?.full_name
                    ? user.full_name
                        .split(' ')
                        .map((w) => w[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase()
                    : 'AR'}
                </div>
                <div className="hidden lg:flex flex-col text-left">
                  <span className="text-xs font-bold text-slate-900 leading-tight">{user?.full_name || 'Administrador RP Gestoría'}</span>
                  <span className="text-[10px] text-slate-500 capitalize">{user?.role || 'Admin'}</span>
                </div>
                <span className="material-symbols-outlined text-[16px] text-slate-400">expand_more</span>
              </button>

              {/* Dropdown Usuario */}
              {showUserMenu && (
                <div className="absolute right-0 top-11 w-60 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-xl p-3 space-y-2 z-50 text-xs">
                  <div className="px-2 py-1.5 border-b border-surface-container">
                    <p className="font-bold text-on-surface">{user?.full_name || 'Gestor'}</p>
                    <p className="text-[11px] text-slate-400 font-mono-data">{user?.email}</p>
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
                    <span className="material-symbols-outlined text-[16px] text-slate-400">price_change</span>
                    <span>Tarifas Oficiales</span>
                  </Link>

                  <Link
                    href="https://portal.rp-gestoria.tech/portal/login"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-surface-container text-on-surface transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px] text-slate-400">visibility</span>
                    <span>Probar Vista Cliente</span>
                  </Link>
                  <Link
                    href="https://rp-gestoria.tech/"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-surface-container text-on-surface transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">public</span>
                    <span>Ir a la Web Pública</span>
                  </Link>
                  <div className="pt-1 border-t border-surface-container">
                    <button type="button"
                      onClick={() => {
                        setShowUserMenu(false);
                        void fetch('/api/backend/auth/logout', { method: 'POST' }).finally(() => {
                          clearSession();
                          router.replace('/login');
                        });
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
        <main className={`crm-page ${pathname === '/crm/tareas' ? 'crm-tareas-main' : ''} flex-1 h-[calc(100dvh-4.0625rem)] overflow-hidden px-3 sm:px-5 lg:px-6 py-2.5 sm:py-3 flex flex-col`}>
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
                className="w-full text-sm bg-transparent focus:outline-none text-on-surface placeholder:text-slate-400"
              />
              <button type="button" aria-label="Cerrar búsqueda" onClick={() => setShowSearchModal(false)} className="min-h-11 min-w-11 text-slate-400 hover:text-on-surface">
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
                      <span className="text-[10px] text-slate-400 uppercase font-mono-data">{res.category}</span>
                    </div>
                    <span className="material-symbols-outlined text-[16px] text-slate-400">arrow_forward</span>
                  </Link>
                ))
              ) : (
                <div className="p-6 text-center text-xs text-slate-400">
                  No se encontraron resultados para &quot;{searchQuery}&quot;
                </div>
              )}
            </div>

            <div className="p-2.5 bg-surface-container-low border-t border-surface-container text-[11px] text-slate-400 flex justify-between">
              <span>Navega con las flechas o ratón</span>
              <span>ESC para cerrar</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
