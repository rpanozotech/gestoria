'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function NuevoClientePage() {
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', bsn: '' });
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const submit = (event: React.FormEvent) => { 
    event.preventDefault(); 
    localStorage.setItem('crm-demo-new-client', JSON.stringify({ ...form, id: `demo-${Date.now()}`, status: 'activo' })); 
    setSaved(true); 
  };

  return (
    <div className="w-full h-full max-h-[calc(100vh-4.6rem)] overflow-hidden flex flex-col gap-3">
      <header className="border-b border-surface-container pb-2 shrink-0">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-on-surface">Nuevo Cliente Manual</h1>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary/10 text-secondary">Directorio</span>
        </div>
        <p className="text-[11px] text-on-surface-variant">Completa los datos básicos para crear una ficha de cliente.</p>
      </header>

      {saved && (
        <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-800 shrink-0">
          Cliente demo guardado con éxito.
        </div>
      )}

      <form onSubmit={submit} className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm space-y-4 shrink-0">
        <div className="grid gap-3.5 sm:grid-cols-2">
          <label className="text-xs font-semibold text-on-surface">
            <span className="block text-[11px] font-semibold text-outline uppercase tracking-wider mb-1">Nombre completo *</span>
            <input required value={form.full_name} onChange={(e) => update('full_name', e.target.value)} className="h-9 w-full rounded-md border border-outline-variant bg-surface px-3 text-xs" />
          </label>
          <label className="text-xs font-semibold text-on-surface">
            <span className="block text-[11px] font-semibold text-outline uppercase tracking-wider mb-1">Email</span>
            <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} className="h-9 w-full rounded-md border border-outline-variant bg-surface px-3 text-xs" />
          </label>
          <label className="text-xs font-semibold text-on-surface">
            <span className="block text-[11px] font-semibold text-outline uppercase tracking-wider mb-1">Teléfono</span>
            <input value={form.phone} onChange={(e) => update('phone', e.target.value)} className="h-9 w-full rounded-md border border-outline-variant bg-surface px-3 text-xs" />
          </label>
          <label className="text-xs font-semibold text-on-surface">
            <span className="block text-[11px] font-semibold text-outline uppercase tracking-wider mb-1">BSN</span>
            <input inputMode="numeric" value={form.bsn} onChange={(e) => update('bsn', e.target.value)} className="h-9 w-full rounded-md border border-outline-variant bg-surface px-3 text-xs font-mono-data" />
          </label>
        </div>
        <div className="flex flex-wrap gap-2.5 pt-2 border-t border-surface-container">
          <button type="submit" className="h-9 rounded-md bg-secondary px-4 text-xs font-semibold text-white hover:bg-blue-700 transition-colors">
            Guardar cliente
          </button>
          <Link href="/crm/clientes/alta-ia" className="inline-flex h-9 items-center rounded-md border border-secondary px-3.5 text-xs font-semibold text-secondary hover:bg-blue-50 transition-colors">
            Crear con IA
          </Link>
          <Link href="/crm/clientes" className="inline-flex h-9 items-center rounded-md border border-outline-variant px-3.5 text-xs font-semibold text-on-surface-variant hover:bg-surface transition-colors">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
