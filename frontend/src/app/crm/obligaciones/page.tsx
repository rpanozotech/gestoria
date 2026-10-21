'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';

type Obligation = {
  id: string;
  creditor: string;
  reference: string;
  status: string;
  original_amount: number;
  paid_total?: number;
  due_date?: string;
};

export default function ObligacionesPage() {
  const [items, setItems] = useState<Obligation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ creditor: '', reference: '', original_amount: '', due_date: '' });

  const load = async () => {
    setLoading(true);
    try {
      const r = await apiFetch('/finance/obligations');
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'No se pudieron cargar las obligaciones');
      setItems(data.obligations || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const r = await apiFetch('/finance/obligations', {
        method: 'POST',
        body: JSON.stringify({ ...form, original_amount: Number(form.original_amount) }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || 'No se pudo crear');
      setOpen(false);
      setForm({ creditor: '', reference: '', original_amount: '', due_date: '' });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (item: Obligation) => {
    if (!window.confirm(`¿Eliminar la obligación ${item.reference}?`)) return;
    const r = await apiFetch(`/finance/obligations/${item.id}`, { method: 'DELETE' });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) setError(data.error || 'No se pudo eliminar');
    else setItems((x) => x.filter((i) => i.id !== item.id));
  };

  return (
    <div className="w-full h-full max-h-[calc(100vh-4.6rem)] overflow-hidden flex flex-col gap-2.5">
      <header className="flex flex-wrap items-center justify-between gap-2 shrink-0 pb-1.5 border-b border-surface-container">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/crm/deudas" className="text-xs font-semibold text-secondary hover:underline flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">arrow_back</span>
              <span>Deudas y pagos</span>
            </Link>
            <span className="text-slate-300">/</span>
            <h1 className="text-xl font-bold tracking-tight text-on-surface">Obligaciones Propias</h1>
          </div>
          <p className="text-[11px] text-on-surface-variant">
            Deudas y pagos de RP Asesoría frente a proveedores y administraciones, separadas de las deudas de clientes.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="h-8 rounded-lg bg-secondary px-3.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-[15px]">add</span>
          <span>Nueva obligación</span>
        </button>
      </header>

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-800 shrink-0">
          {error}
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-2 pr-1">
        {loading ? (
          <div className="p-8 text-center text-xs text-on-surface-variant">Cargando obligaciones…</div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest p-10 text-center">
            <h2 className="font-bold text-sm text-on-surface">No hay obligaciones registradas</h2>
            <p className="mt-1 text-xs text-outline">Pulsa en &quot;+ Nueva obligación&quot; para registrar un pago propio.</p>
          </div>
        ) : (
          <div className="grid gap-2">
            {items.map((item) => (
              <article
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-3.5 shadow-2xs hover:border-secondary/40 transition-colors"
              >
                <div>
                  <p className="font-bold text-xs text-on-surface">{item.creditor}</p>
                  <p className="text-[11px] text-on-surface-variant mt-0.5">
                    Ref: <span className="font-mono-data font-semibold">{item.reference}</span> · Estado: {item.status} · Vencimiento: {item.due_date || 'Sin vencimiento'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <strong className="font-mono-data text-sm text-on-surface">
                    € {Number(item.original_amount || 0).toFixed(2)}
                  </strong>
                  <button
                    type="button"
                    onClick={() => remove(item)}
                    className="rounded-md p-1.5 text-outline hover:bg-red-50 hover:text-error transition-colors"
                    aria-label={`Eliminar obligación ${item.reference}`}
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form onSubmit={create} className="w-full max-w-lg space-y-3.5 rounded-2xl bg-surface-container-lowest p-6 shadow-2xl border border-outline-variant animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container">
              <h2 className="text-base font-bold text-on-surface">Nueva obligación propia</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar" className="text-outline hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <label className="block text-xs font-semibold text-on-surface">
              <span className="block text-[11px] font-semibold text-outline uppercase tracking-wider mb-1">Acreedor</span>
              <input required value={form.creditor} onChange={(e) => setForm({ ...form, creditor: e.target.value })} className="h-8 w-full rounded-md border border-outline-variant px-2.5 text-xs bg-surface" />
            </label>
            <label className="block text-xs font-semibold text-on-surface">
              <span className="block text-[11px] font-semibold text-outline uppercase tracking-wider mb-1">Referencia</span>
              <input required value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} className="h-8 w-full rounded-md border border-outline-variant px-2.5 text-xs bg-surface" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs font-semibold text-on-surface">
                <span className="block text-[11px] font-semibold text-outline uppercase tracking-wider mb-1">Importe (€)</span>
                <input required min="0.01" step="0.01" type="number" value={form.original_amount} onChange={(e) => setForm({ ...form, original_amount: e.target.value })} className="h-8 w-full rounded-md border border-outline-variant px-2.5 text-xs bg-surface font-mono-data" />
              </label>
              <label className="block text-xs font-semibold text-on-surface">
                <span className="block text-[11px] font-semibold text-outline uppercase tracking-wider mb-1">Vencimiento</span>
                <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="h-8 w-full rounded-md border border-outline-variant px-2.5 text-xs bg-surface" />
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-surface-container">
              <button type="button" onClick={() => setOpen(false)} className="rounded-md border border-outline-variant px-3 py-1.5 text-xs font-semibold text-on-surface hover:bg-surface">
                Cancelar
              </button>
              <button type="submit" disabled={busy} className="rounded-md bg-secondary px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50">
                {busy ? 'Guardando…' : 'Guardar obligación'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
