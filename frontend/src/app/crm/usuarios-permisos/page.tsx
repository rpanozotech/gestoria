'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import ConfigurationNav from '@/components/crm/ConfigurationNav';

type CurrentUser = { id?: string; email?: string; full_name?: string; role?: string };

const roles = [
  { name: 'Administrador', tone: 'bg-violet-50 text-violet-700', detail: 'Control total de configuración, usuarios, copias y operaciones.' , access: ['CRM completo', 'Configuración', 'Usuarios y permisos', 'Backups'] },
  { name: 'Gestor', tone: 'bg-blue-50 text-blue-700', detail: 'Gestiona clientes, agenda, expedientes, facturación y cobros.', access: ['Clientes y fichas', 'Agenda y tareas', 'Finanzas', 'Documentos'] },
  { name: 'Cliente', tone: 'bg-emerald-50 text-emerald-700', detail: 'Acceso limitado a su Portal Cliente y a sus propias solicitudes.', access: ['Portal Cliente', 'Citas propias', 'Documentos propios'] },
];

export default function UsersPermissionsPage() {
  const [user, setUser] = useState<CurrentUser>({});
  const [status, setStatus] = useState('Cargando…');
  const [error, setError] = useState('');
  useEffect(() => { apiFetch('/auth/me').then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error || 'No se pudo cargar el usuario.'); setUser(data.user || {}); setStatus('Acceso verificado'); }).catch((reason) => { setError(reason instanceof Error ? reason.message : 'No se pudo cargar el usuario.'); setStatus('Error'); }); }, []);
  const roleName = user.role === 'admin' ? 'Administrador' : user.role === 'gestor' ? 'Gestor' : user.role === 'cliente' ? 'Cliente' : 'Usuario';
  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-2 overflow-hidden">
      <header className="flex shrink-0 items-center justify-between border-b border-surface-container pb-2"><div><div className="flex items-center gap-2"><h1 className="text-xl font-bold tracking-tight text-on-surface">Configuración · Usuarios y permisos</h1><span className="rounded-full bg-secondary/10 px-2 py-0.5 text-[10px] font-bold text-secondary">Acceso seguro</span></div><p className="text-xs text-on-surface-variant">Consulta quién puede acceder al CRM y qué puede hacer cada rol.</p></div><span role="status" className="text-xs font-medium text-on-surface-variant">{status}</span></header>
      <ConfigurationNav />
      {error && <div role="alert" className="shrink-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{error}</div>}
      <div className="grid min-h-0 flex-1 gap-3 overflow-hidden lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section className="flex min-h-0 flex-col rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm"><div className="flex items-center gap-2 border-b border-surface-container pb-2"><span className="material-symbols-outlined text-[21px] text-secondary">account_circle</span><div><h2 className="text-sm font-bold text-on-surface">Tu acceso actual</h2><p className="text-xs text-on-surface-variant">Identidad de la sesión autenticada.</p></div></div><div className="mt-4 rounded-xl bg-surface-container-low p-4"><div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-lg font-bold text-white">{(user.full_name || 'U').slice(0, 1).toUpperCase()}</div><div className="min-w-0"><p className="truncate text-base font-bold text-on-surface">{user.full_name || 'Usuario autenticado'}</p><p className="truncate text-xs text-on-surface-variant">{user.email || '—'}</p></div></div><div className="mt-4 flex items-center justify-between border-t border-surface-container pt-3"><span className="text-xs text-on-surface-variant">Rol efectivo</span><span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">{roleName}</span></div></div><div className="mt-auto rounded-lg border border-secondary/20 bg-secondary/10 p-3 text-xs text-on-surface-variant"><strong className="text-on-surface">Credenciales:</strong> los usuarios de Portal Cliente se generan desde la ficha del cliente. Las contraseñas no se muestran en claro; puedes regenerarlas desde esa ficha.<Link href="/crm/cuenta" className="mt-2 inline-flex font-semibold text-secondary hover:underline">Gestionar contraseña y MFA →</Link></div></section>
        <section className="min-h-0 overflow-y-auto rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm"><div className="mb-3 flex items-center gap-2 border-b border-surface-container pb-2"><span className="material-symbols-outlined text-[21px] text-secondary">admin_panel_settings</span><div><h2 className="text-sm font-bold text-on-surface">Matriz de permisos</h2><p className="text-xs text-on-surface-variant">Permisos de referencia del sistema.</p></div></div><div className="grid gap-2">{roles.map((role) => <article key={role.name} className="rounded-xl border border-outline-variant bg-white p-3"><div className="flex items-center justify-between gap-3"><h3 className="text-sm font-bold text-on-surface">{role.name}</h3><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${role.tone}`}>{role.name === roleName ? 'Tu rol' : 'Rol disponible'}</span></div><p className="mt-1 text-xs text-on-surface-variant">{role.detail}</p><div className="mt-2 flex flex-wrap gap-1.5">{role.access.map((item) => <span key={item} className="rounded-md bg-surface-container-low px-2 py-1 text-[11px] font-medium text-on-surface-variant">{item}</span>)}</div></article>)}</div><div className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-900"><strong>Principio de seguridad:</strong> los cambios de permisos del equipo deben hacerse con una cuenta administradora y quedan sujetos a la sesión y a la política MFA.</div></section>
      </div>
    </div>
  );
}
