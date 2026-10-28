'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const items = [
  { href: '/crm/ajustes-datos-empresa', label: 'Datos de empresa', icon: 'business' },
  { href: '/crm/ajustes-horarios', label: 'Horarios y disponibilidad', icon: 'calendar_month' },
  { href: '/crm/ajustes-sistema', label: 'Preferencias del sistema', icon: 'tune' },
  { href: '/crm/preferencias-avisos', label: 'Notificaciones', icon: 'notifications' },
  { href: '/crm/usuarios-permisos', label: 'Usuarios y permisos', icon: 'admin_panel_settings' },
  { href: '/crm/integraciones', label: 'Integraciones', icon: 'hub' },
  { href: '/crm/contenido', label: 'CMS', icon: 'language' },
  { href: '/faq', label: 'Centro de ayuda', icon: 'help' },
];

export default function ConfigurationNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Secciones de configuración" className="shrink-0 overflow-x-auto no-scrollbar border-b border-surface-container">
      <div className="flex min-w-max items-center gap-1 py-1">
        {items.map((item) => {
          const active = item.href === '/faq'
            ? false
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold transition-colors ${
                active
                  ? 'bg-secondary/10 text-secondary'
                  : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]" aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
