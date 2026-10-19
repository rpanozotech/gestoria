'use client';
import Link from 'next/link';
import { useState } from 'react';

export default function NuevoClientePage() {
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', bsn: '' });
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const submit = (event: React.FormEvent) => { event.preventDefault(); localStorage.setItem('crm-demo-new-client', JSON.stringify({ ...form, id: `demo-${Date.now()}`, status: 'activo' })); setSaved(true); };
  return <div className="mx-auto max-w-3xl space-y-6 pb-10">
    <header className="border-b border-surface-container pb-5"><p className="text-[11px] font-bold tracking-[0.14em] text-secondary">CLIENTES</p><h1 className="mt-1 text-3xl font-bold text-on-surface">Nuevo cliente manual</h1><p className="mt-1 text-sm text-on-surface-variant">Completa los datos básicos para crear una ficha de cliente.</p></header>
    {saved && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">Cliente demo guardado en staging. No se ha enviado información real.</div>}
    <form onSubmit={submit} className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
      <div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-semibold text-on-surface">Nombre completo<input required value={form.full_name} onChange={(e) => update('full_name', e.target.value)} className="mt-1 h-11 w-full rounded-md border border-outline-variant bg-surface px-3 text-sm" /></label><label className="text-xs font-semibold text-on-surface">Email<input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} className="mt-1 h-11 w-full rounded-md border border-outline-variant bg-surface px-3 text-sm" /></label><label className="text-xs font-semibold text-on-surface">Teléfono<input value={form.phone} onChange={(e) => update('phone', e.target.value)} className="mt-1 h-11 w-full rounded-md border border-outline-variant bg-surface px-3 text-sm" /></label><label className="text-xs font-semibold text-on-surface">BSN<input inputMode="numeric" value={form.bsn} onChange={(e) => update('bsn', e.target.value)} className="mt-1 h-11 w-full rounded-md border border-outline-variant bg-surface px-3 text-sm" /></label></div>
      <div className="mt-6 flex flex-wrap gap-3"><button type="submit" className="min-h-11 rounded-md bg-secondary px-4 text-sm font-semibold text-white hover:bg-blue-700">Guardar cliente</button><Link href="/crm/clientes/alta-ia" className="inline-flex min-h-11 items-center rounded-md border border-secondary px-4 text-sm font-semibold text-secondary">Crear con IA</Link><Link href="/crm/clientes" className="inline-flex min-h-11 items-center rounded-md border border-outline-variant px-4 text-sm font-semibold text-on-surface-variant">Cancelar</Link></div>
    </form>
  </div>;
}
