'use client';

import Link from 'next/link';

export default function TareasPage() {
  return <div className="space-y-6 pb-10"><header className="border-b border-surface-container pb-5"><Link href="/crm" className="text-xs font-semibold text-secondary hover:underline">← Centro de gestión</Link><h1 className="mt-2 text-2xl font-bold text-on-surface">Mis tareas</h1><p className="mt-1 text-sm text-on-surface-variant">Seguimiento de acciones pendientes del equipo.</p></header><section className="rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest p-10 text-center"><h2 className="text-lg font-bold text-on-surface">No hay tareas registradas</h2><p className="mt-2 text-sm text-on-surface-variant">Las tareas se mostrarán aquí cuando estén asociadas a un cliente o expediente.</p><Link href="/crm/clientes" className="mt-4 inline-flex rounded-md border border-outline-variant px-4 py-2 text-xs font-semibold text-secondary">Abrir clientes</Link></section></div>;
}
