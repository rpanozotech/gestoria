'use client';

/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getToken, getStoredUser, saveSession, clearSession, SessionUser } from '@/lib/session';
import { apiFetch } from '@/lib/api';

type NavItem = { href: string; label: string; icon: string; badge?: string; badgeColor?: string };
type NavGroup = { label: string; leading?: NavItem; items: NavItem[]; collapsible?: boolean; featured?: boolean };

function NavLink({ item, pathname, collapsed, onClick, featured = false }: { item: NavItem; pathname: string; collapsed: boolean; onClick: () => void; featured?: boolean }) {
  const isExact = pathname === item.href && item.label !== 'Dashboard';
  const isDebtDetail = item.href === '/crm/deudas/1' && pathname.startsWith('/crm/deudas/') && pathname !== '/crm/deudas';
  const isClientDetail = item.href === '/crm/clientes/demo-client-1' && pathname.startsWith('/crm/clientes/') && pathname !== '/crm/clientes' && pathname !== '/crm/clientes/alta-ia' && pathname !== '/crm/clientes/nuevo' && pathname !== '/crm/clientes/importar';
  const isIntegrations = item.href === '/crm/integraciones' && (pathname === '/crm/integraciones' || pathname === '/crm/preferencias-avisos');
  const isFinance = item.href === '/crm/facturacion' && (pathname.startsWith('/crm/facturacion') || pathname.startsWith('/crm/deudas'));
  const isActive = isExact || isDebtDetail || isClientDetail || isIntegrations || isFinance;
  return (
    <Link
      href={item.href}
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      aria-current={isActive ? 'page' : undefined}
    className={`flex h-11 min-h-11 items-center justify-between rounded-[10px] px-3 py-1.5 text-[14px] transition-all ${
        isActive || featured
          ? 'bg-[#0568E8] text-white shadow-sm font-semibold'
          : 'text-white/85 hover:bg-white/10 hover:text-white font-medium'
      }`}
    >
      <span className="flex min-w-0 items-center gap-2.5">
        <span className={`material-symbols-outlined text-[20px] ${isActive || featured ? 'text-white' : 'text-white/75'}`}>{item.icon}</span>
        {!collapsed && <span className="truncate whitespace-nowrap">{item.label}</span>}
      </span>
      {!collapsed && item.badge && (
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-mono-data font-bold ${
            item.badgeColor
              ? item.badgeColor
              : isActive
              ? 'bg-white/20 text-white'
              : 'bg-white/10 text-white/80 border border-white/10'
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
  const [showNotifications, setShowNotifications] = useState(false);
  const unreadCount = 0;
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    INICIO: false,
    AGENDA: false,
    CLIENTES: false,
    FINANZAS: false,
    AUTOMATIZACIÓN: false,
    CONFIGURACIÓN: false,
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
    const activeGroup = pathname.startsWith('/crm/clientes/alta-ia') || pathname.startsWith('/crm/documentos-ia') || pathname.startsWith('/crm/chat-ia')
      ? 'AUTOMATIZACIÓN'
      : pathname.startsWith('/crm/facturacion') || pathname.startsWith('/crm/deudas') || pathname.startsWith('/crm/tarifas')
        ? 'FINANZAS'
        : pathname.startsWith('/crm/agenda') || pathname.startsWith('/crm/tareas')
          ? 'AGENDA'
          : pathname === '/crm' || pathname.startsWith('/crm/expedientes')
            ? 'INICIO'
            : pathname === '/crm/clientes' || pathname.startsWith('/crm/clientes/demo-client-1') || pathname.startsWith('/crm/contacto')
              ? 'CLIENTES'
              : pathname.startsWith('/crm/ajustes-datos-empresa') || pathname.startsWith('/crm/integraciones') || pathname.startsWith('/crm/asesor-portal') || pathname.startsWith('/crm/contenido') || pathname.startsWith('/crm/backup')
                ? 'CONFIGURACIÓN'
                : null;
    if (activeGroup) {
      setOpenGroups((groups) => ({
        ...Object.fromEntries(Object.keys(groups).map((key) => [key, key === activeGroup])),
        [activeGroup]: true,
      }));
    }
  }, [pathname]);

  // En ventanas bajas la navegación lateral puede desplazarse internamente,
  // pero la opción activa siempre debe quedar visible al cambiar de sección.
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      document.querySelector<HTMLElement>('#crm-sidebar a[aria-current="page"]')?.scrollIntoView({ block: 'nearest' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pathname, openGroups]);

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

  const navGroups: NavGroup[] = [
    { label: 'INICIO', leading: { href: '/crm', label: 'Inicio', icon: 'home' }, collapsible: true, items: [
      { href: '/crm/expedientes', label: 'Expedientes', icon: 'folder_open' },
    ] },
    { label: 'AGENDA', leading: { href: '/crm/agenda', label: 'Agenda', icon: 'calendar_month' }, collapsible: true, items: [
      { href: '/crm/tareas', label: 'Tareas', icon: 'check_circle' },
    ] },
    { label: 'CLIENTES', leading: { href: '/crm/clientes', label: 'Clientes', icon: 'groups', badge: clientCount === null ? undefined : String(clientCount) }, collapsible: true, items: [
      { href: '/crm/contacto?view=messages', label: 'Comunicación', icon: 'chat_bubble_outline' },
      { href: '/crm/contacto?view=web', label: 'Consultas web', icon: 'inbox' },
    ] },
    { label: 'FINANZAS', leading: { href: '/crm/facturacion', label: 'Finanzas', icon: 'account_balance_wallet' }, collapsible: true, items: [
      { href: '/crm/deudas', label: 'Cobros y deudas', icon: 'account_balance_wallet' },
      { href: '/crm/tarifas', label: 'Tarifas', icon: 'sell' },
    ] },
    { label: 'AUTOMATIZACIÓN', leading: { href: '/crm/clientes/alta-ia', label: 'Automatización', icon: 'auto_awesome' }, collapsible: true, items: [
      { href: '/crm/clientes/alta-ia', label: 'Alta con IA', icon: 'auto_awesome' },
      { href: '/crm/documentos-ia', label: 'Documentos IA', icon: 'description' },
      { href: '/crm/chat-ia', label: 'Chat IA', icon: 'chat_bubble_outline', badge: '● En vivo', badgeColor: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
    ] },
    { label: 'CONFIGURACIÓN', leading: { href: '/crm/ajustes-datos-empresa', label: 'Configuración', icon: 'settings' }, collapsible: true, items: [
      { href: '/crm/asesor-portal', label: 'Perfil del asesor', icon: 'badge' },
      { href: '/crm/integraciones', label: 'Integraciones', icon: 'hub' },
      { href: '/crm/contenido', label: 'CMS', icon: 'language' },
      { href: '/faq', label: 'Centro de ayuda', icon: 'help' },
    ] },
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
    <div className="crm-shell h-screen h-[100dvh] w-full bg-[#eef3fb] flex overflow-hidden">
      <title>RP Asesoría | CRM</title>
      {/* Sidebar fijo a la izquierda en desktop, desplegable como cajón en tablet/móvil */}
      <aside
        id="crm-sidebar"
        aria-label="Navegación principal del CRM"
        className={`crm-sidebar fixed left-0 top-0 h-full ${sidebarCollapsed ? 'w-[72px]' : 'w-[240px]'} bg-[#062653] border-r border-[#062653] z-50 flex flex-col justify-between transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {/* Brand header */}
          <div className={`brand-header h-[72px] min-h-[72px] shrink-0 ${sidebarCollapsed ? 'px-3' : 'px-4'} flex items-center justify-between border-b border-white/10 bg-[#062653]`}>
            <Link href="/crm" className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg overflow-hidden bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0 shadow-xs">
                <img src="/logo.png" alt="RP Gestoría" className="crm-brand-logo w-full h-full object-cover" />
              </div>
              <span className={`${sidebarCollapsed ? 'hidden' : 'inline-flex flex-col'} leading-tight min-w-0`}>
                <span className="font-headline-sm text-base font-bold text-white tracking-tight truncate">RP Asesoría</span>
                <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.06em] text-white/65 truncate">ASESORÍA &amp; GESTORÍA</span>
              </span>
            </Link>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSidebarCollapsed((value) => !value)}
                aria-label={sidebarCollapsed ? 'Expandir barra lateral' : 'Contraer barra lateral'}
                title={sidebarCollapsed ? 'Expandir barra lateral' : 'Contraer barra lateral'}
                className="hidden lg:flex min-h-7 min-w-7 items-center justify-center rounded-md text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined text-[18px] text-white/80">{sidebarCollapsed ? 'menu_open' : 'menu'}</span>
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

          <nav aria-label="Navegación principal" className="no-scrollbar flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overflow-x-hidden px-3 pb-2 pt-6">
            {navGroups.map((group) => {
              const leadingItem = group.leading;
              if (!leadingItem) return null;

              const isOpen = openGroups[group.label] ?? false;
              const isFinanceGroup = group.label === 'FINANZAS';
              const isActivePath = (href: string) => (
                href === '/crm'
                  ? pathname === '/crm'
                  : pathname === href || pathname.startsWith(`${href}/`)
              );
              const isGroupActive = group.label === 'INICIO'
                ? pathname === '/crm' || pathname.startsWith('/crm/expedientes')
                : group.label === 'AGENDA'
                  ? pathname.startsWith('/crm/agenda') || pathname.startsWith('/crm/tareas')
                  : group.label === 'CLIENTES'
                    ? pathname === '/crm/clientes' || pathname.startsWith('/crm/clientes/demo-client-1') || pathname.startsWith('/crm/contacto')
                    : isFinanceGroup
                      ? pathname.startsWith('/crm/facturacion') || pathname.startsWith('/crm/deudas') || pathname.startsWith('/crm/tarifas')
                      : group.label === 'AUTOMATIZACIÓN'
                        ? pathname.startsWith('/crm/clientes/alta-ia') || pathname.startsWith('/crm/documentos-ia') || pathname.startsWith('/crm/chat-ia')
                        : pathname.startsWith('/crm/ajustes-datos-empresa') || pathname.startsWith('/crm/integraciones') || pathname.startsWith('/crm/asesor-portal') || pathname.startsWith('/crm/contenido') || pathname.startsWith('/crm/backup')
                          || isActivePath(leadingItem.href) || group.items.some((item) => isActivePath(item.href));

              const toggleGroup = () => {
                setOpenGroups((groups) => Object.fromEntries(
                  Object.keys(groups).map((key) => [key, key === group.label ? !isOpen : false]),
                ));
              };

              return (
                <div key={group.label} className="relative">
                  <div className={`flex h-11 min-h-11 items-center overflow-hidden rounded-[10px] transition-all ${isGroupActive ? 'bg-[#0568E8] text-white shadow-sm' : 'text-white/85 hover:bg-white/10 hover:text-white'}`}>
                    <Link
                      href={leadingItem.href}
                      onClick={() => {
                        setOpenGroups((groups) => Object.fromEntries(
                          Object.keys(groups).map((key) => [key, key === group.label]),
                        ));
                        setMobileMenuOpen(false);
                      }}
                      aria-current={isGroupActive ? 'page' : undefined}
                      title={sidebarCollapsed ? leadingItem.label : undefined}
                      className="flex min-w-0 flex-1 items-center gap-2.5 px-3 py-1.5 text-[14px] font-semibold"
                    >
                      <span className={`material-symbols-outlined shrink-0 text-[20px] ${isGroupActive ? 'text-white' : 'text-white/75'}`}>
                        {leadingItem.icon}
                      </span>
                      {!sidebarCollapsed && <span className="truncate whitespace-nowrap">{leadingItem.label}</span>}
                      {!sidebarCollapsed && leadingItem.badge && (
                        <span className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-[11px] font-mono-data font-bold ${leadingItem.badgeColor || (isGroupActive ? 'bg-white/20 text-white' : 'bg-white/10 text-white/80 border border-white/10')}`}>
                          {leadingItem.badge}
                        </span>
                      )}
                    </Link>
                    <button
                      type="button"
                      onClick={toggleGroup}
                      aria-label={`${isOpen ? 'Cerrar' : 'Abrir'} módulo ${leadingItem.label}`}
                      aria-expanded={isOpen}
                      className="flex h-full w-9 shrink-0 items-center justify-center text-white/70 hover:bg-white/10 hover:text-white"
                    >
                      <span className="material-symbols-outlined text-[17px]" aria-hidden="true">
                        {isOpen ? 'expand_less' : 'expand_more'}
                      </span>
                    </button>
                  </div>

                  {isOpen && (
                    <div className={`${sidebarCollapsed ? 'absolute left-[calc(100%+8px)] top-0 z-[60] w-56 rounded-xl border border-white/10 bg-[#062653] p-2 shadow-2xl' : 'ml-3 mt-1 space-y-0.5 border-l border-white/20 pl-2'}`}>
                      {group.items.map((item) => (
                        <NavLink
                          key={`${group.label}-${item.label}`}
                          item={item}
                          pathname={pathname}
                          collapsed={false}
                          onClick={() => setMobileMenuOpen(false)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Footer Sidebar: System Status & Portal Cliente */}
        <div className="p-3 bg-[#062653] border-t border-white/10 space-y-2">
          {!sidebarCollapsed && pathname !== '/crm' && (
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
              className="text-white/70 hover:text-white font-medium transition-colors flex items-center gap-1"
            >
              <span>← Web Pública</span>
            </Link>
            <Link
              href="https://portal.rp-gestoria.tech/portal/login"
              className="text-white/70 hover:text-white font-medium transition-colors flex items-center gap-1"
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
      <div className={`${sidebarCollapsed ? 'lg:pl-[72px]' : 'lg:pl-[240px]'} pl-0 flex-1 flex flex-col h-full min-w-0 w-full transition-all overflow-hidden`}>
        {/* Top Header del CRM general */}
        <header className="crm-topbar h-[4.5rem] shrink-0 bg-white border-b border-[#e2e8f0] z-30 px-3 sm:px-6 lg:px-6 flex items-center justify-between gap-3 sm:gap-6 shadow-xs">
          {/* Botón Hamburguesa Móvil + Interactive Search Bar */}
          <div className="flex items-center gap-2 sm:gap-3 flex-1 max-w-[710px]">
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
              href={pathname.startsWith('/crm/facturacion') || pathname.startsWith('/crm/deudas') ? '/crm/facturacion' : pathname === '/crm/tareas' ? '/crm/agenda' : '/crm/clientes/alta-ia'}
              className="h-10 px-4 rounded-lg text-xs font-semibold flex items-center gap-2 bg-[#0969e8] hover:bg-[#0858c4] text-white transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-[17px]">{pathname.startsWith('/crm/facturacion') || pathname.startsWith('/crm/deudas') || pathname === '/crm/tareas' || pathname === '/crm' ? 'add' : 'auto_awesome'}</span>
              <span className="hidden sm:inline">{pathname.startsWith('/crm/facturacion') || pathname.startsWith('/crm/deudas') ? '+ Nuevo presupuesto' : pathname === '/crm/tareas' ? '+ Nuevo trámite' : pathname === '/crm' ? '+ Nuevo' : '+ Nuevo con IA'}</span>
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
        <main className={`crm-page ${pathname === '/crm/tareas' ? 'crm-tareas-main' : ''} flex-1 h-[calc(100dvh-4.5rem)] overflow-auto px-3 sm:px-5 lg:px-6 py-3 lg:py-5 flex flex-col`}>
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
