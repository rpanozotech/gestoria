'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function CRMLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { href: '/crm', label: 'Dashboard', icon: 'grid_view' },
    { href: '/crm/clientes', label: 'Clientes & Ficha 360', icon: 'group', badge: '148' },
    { href: '/crm/alta-ia', label: 'Alta IA & Escáner', icon: 'auto_awesome', highlight: true },
    { href: '/crm/facturacion', label: 'Presupuestos & Facturas', icon: 'receipt_long' },
    { href: '/crm/agenda', label: 'Agenda & Citas', icon: 'calendar_today' },
    { href: '/crm/documentos-ia', label: 'Asistente Documentos', icon: 'document_scanner' },
  ];

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
          <div className="flex-1 max-w-xl">
            <div className="relative flex items-center w-full">
              <span className="material-symbols-outlined absolute left-3 text-outline text-[20px] pointer-events-none">
                search
              </span>
              <input
                type="text"
                placeholder="Buscar cliente, BSN, factura o comando IA... (Cmd + K)"
                className="w-full h-9 pl-10 pr-4 bg-surface-container-lowest border border-outline-variant text-on-surface placeholder:text-outline text-xs rounded-md focus:border-secondary focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/crm/alta-ia"
              className="h-9 px-3.5 bg-primary text-on-primary rounded-md text-xs font-semibold flex items-center gap-2 hover:bg-slate-800 transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px] text-secondary">auto_awesome</span>
              <span>+ Nuevo con IA</span>
            </Link>

            <div className="flex items-center gap-1 border-x border-surface-container px-2">
              <button className="h-9 w-9 flex items-center justify-center rounded-md text-on-surface-variant hover:bg-surface-container relative">
                <span className="material-symbols-outlined text-[20px]">notifications</span>
                <span className="absolute top-1.5 right-1.5 h-3.5 w-3.5 bg-error text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  3
                </span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary-container text-white font-mono-data font-bold text-xs flex items-center justify-center shadow-sm">
                RP
              </div>
              <div className="hidden lg:flex flex-col text-left">
                <span className="text-xs font-bold text-on-surface leading-tight">Rony P.</span>
                <span className="text-[10px] text-outline">Gestor Principal / Admin</span>
              </div>
            </div>
          </div>
        </header>

        {/* Content View */}
        <main className="flex-1 p-8 pb-16 bg-surface">
          {children}
        </main>
      </div>
    </div>
  );
}
