'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';

type DebtDetail = { debt: Record<string, any>; payments: any[]; installments: any[]; documents: any[]; notes: any[]; history: any[] };
const money = (v: unknown) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(Number(v || 0));

export default function DebtDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<DebtDetail | null>(null);
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState('');
  const [openPanel, setOpenPanel] = useState<string | null>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  useEffect(() => { let active = true; apiFetch('/finance/debts/' + encodeURIComponent(id)).then(async (r) => { const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || 'No se pudo cargar la deuda.'); if (active) setData(d); }).catch((e) => { if (active) setError(e instanceof Error ? e.message : 'Error cargando la deuda.'); }); return () => { active = false; }; }, [id]);
  if (error) return <main className="space-y-4 p-6"><p role="alert" className="text-red-700">{error}</p><Link className="text-blue-700 underline" href="/crm/deudas">Volver a deudas</Link></main>;
  if (!data) return <main className="p-6" role="status">Cargando deuda…</main>;
  const d = data.debt;
  const paid = Number(d.paid_total ?? d.paid_amount ?? 0);
  const balance = Math.max(0, Number(d.original_amount || 0) - paid);
  const progress = Number(d.original_amount || 0) > 0 ? Math.min(100, Math.round((paid / Number(d.original_amount)) * 100)) : 0;
  const sections = [
    { title: 'Cuotas', icon: 'event_repeat', rows: data.installments },
    { title: 'Pagos registrados', icon: 'payments', rows: data.payments },
    { title: 'Documentos', icon: 'description', rows: data.documents },
    { title: 'Notas', icon: 'sticky_note_2', rows: data.notes },
    { title: 'Historial', icon: 'history', rows: data.history },
  ];
  const focusSection = (title: string) => {
    setActiveSection(title);
    window.requestAnimationFrame(() => sectionRefs.current[title]?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };
  const openSectionPanel = (title: string) => {
    setActiveSection(title);
    setOpenPanel(title);
  };
  const panelSection = sections.find((section) => section.title === openPanel);
  return <main className="flex h-full min-h-0 flex-col gap-4 overflow-hidden p-4 sm:p-6">
    <header className="shrink-0">
      <Link href="/crm/deudas" className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:underline"><span className="material-symbols-outlined text-base">arrow_back</span>Deudas</Link>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div><div className="flex items-center gap-3"><h1 className="text-2xl font-bold text-slate-900">{d.creditor}</h1><span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">{d.status}</span></div><p className="mt-1 text-sm text-slate-600">{d.client_name || 'Cliente'} · Referencia {d.reference}</p></div>
        <button type="button" onClick={() => openSectionPanel('Cuotas')} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-right transition hover:border-blue-400 hover:bg-blue-50"><span className="block text-xs text-slate-500">Próximo vencimiento</span><strong className="text-sm text-slate-900">{d.next_due_date || d.due_date || 'Sin fecha'}</strong></button>
      </div>
    </header>
    <section className="grid shrink-0 gap-3 sm:grid-cols-4">
      <button type="button" onClick={() => openSectionPanel('Historial')} className="rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-400 hover:bg-blue-50"><span className="text-xs font-semibold text-slate-500">Importe original</span><strong className="mt-1 block text-xl text-slate-900">{money(d.original_amount)}</strong><span className="mt-1 block text-xs text-blue-700">Ver historial →</span></button>
      <button type="button" onClick={() => openSectionPanel('Pagos registrados')} className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-left shadow-sm transition hover:border-emerald-400"><span className="text-xs font-semibold text-emerald-700">Pagado registrado</span><strong className="mt-1 block text-xl text-emerald-800">{money(paid)}</strong><span className="mt-1 block text-xs text-emerald-700">Ver pagos →</span></button>
      <button type="button" onClick={() => openSectionPanel('Cuotas')} className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-left shadow-sm transition hover:border-amber-400"><span className="text-xs font-semibold text-amber-700">Saldo pendiente</span><strong className="mt-1 block text-xl text-amber-900">{money(balance)}</strong><span className="mt-1 block text-xs text-amber-700">Ver cuotas →</span></button>
      <button type="button" onClick={() => openSectionPanel('Cuotas')} className="rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-400 hover:bg-blue-50"><div className="flex items-center justify-between"><span className="text-xs font-semibold text-slate-500">Plan completado</span><strong className="text-sm text-slate-900">{progress}%</strong></div><div className="mt-3 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-blue-600" style={{ width: `${progress}%` }} /></div><span className="mt-2 block text-xs text-blue-700">Ver plan →</span></button>
    </section>
    <div className="min-h-0 flex-1 overflow-y-auto pr-1">
      <div className="grid gap-4 xl:grid-cols-2">
        {sections.map(({ title, icon, rows }) => <section key={title} ref={(node) => { sectionRefs.current[title] = node; }} className={`rounded-xl border bg-white p-4 shadow-sm transition ${activeSection === title ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200'}`}><div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-3"><h2 className="flex items-center gap-2 text-base font-bold text-slate-900"><span className="material-symbols-outlined text-blue-700">{icon}</span>{title}</h2><span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{rows.length}</span></div>{rows.length ? <ul className="divide-y divide-slate-100">{rows.map((row: any, index: number) => <li key={row.id || index} className="flex items-center justify-between gap-4 py-3 text-sm"><span className="min-w-0 truncate font-medium text-slate-800">{row.body || row.file_name || row.status || row.action || `Cuota ${row.installment_number || ''}`}</span><span className="shrink-0 text-right text-xs text-slate-500">{row.amount != null ? `${money(row.amount)} · ` : ''}{row.due_date || row.paid_at || row.created_at || ''}</span></li>)}</ul> : <div className="flex items-center gap-3 py-5 text-sm text-slate-500"><span className="material-symbols-outlined text-slate-300">inbox</span>No hay registros todavía.</div>}</section>)}
      </div>
    </div>
    {panelSection && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpenPanel(null); }}>
      <section className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="debt-panel-title">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><div><h2 id="debt-panel-title" className="flex items-center gap-2 text-lg font-bold text-slate-900"><span className="material-symbols-outlined text-blue-700">{panelSection.icon}</span>{panelSection.title}</h2><p className="mt-1 text-sm text-slate-500">Información completa de {d.creditor} · {panelSection.rows.length} registros</p></div><button type="button" onClick={() => setOpenPanel(null)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Cerrar"><span className="material-symbols-outlined">close</span></button></div>
        <div className="max-h-[65vh] overflow-y-auto px-5 py-3">{panelSection.rows.length ? <ul className="divide-y divide-slate-100">{panelSection.rows.map((row: any, index: number) => <li key={row.id || index} className="flex items-center justify-between gap-5 py-4 text-sm"><span className="font-medium text-slate-800">{row.body || row.file_name || row.status || row.action || `Cuota ${row.installment_number || ''}`}</span><span className="shrink-0 text-right text-slate-500">{row.amount != null ? `${money(row.amount)} · ` : ''}{row.due_date || row.paid_at || row.created_at || ''}</span></li>)}</ul> : <div className="flex flex-col items-center gap-2 py-12 text-center text-sm text-slate-500"><span className="material-symbols-outlined text-4xl text-slate-300">inbox</span>No hay registros todavía.</div>}</div>
      </section>
    </div>}
  </main>;
}
