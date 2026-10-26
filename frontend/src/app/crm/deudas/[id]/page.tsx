'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';

type DebtDetail = { debt: Record<string, any>; client?: Record<string, any>; payments: any[]; installments: any[]; documents: any[]; notes: any[]; history: any[] };
const money = (v: unknown) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(Number(v || 0));
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'CL';

export default function DebtDetailPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const [data, setData] = useState<DebtDetail | null>(null);
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState('');
  const [openPanel, setOpenPanel] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [savingPayment, setSavingPayment] = useState(false);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  useEffect(() => { let active = true; apiFetch('/finance/debts/' + encodeURIComponent(id)).then(async (r) => { const payload = await r.json().catch(() => ({})); if (!r.ok) throw new Error(payload.error || 'No se pudo cargar la deuda.'); if (active) setData(payload); if (payload.debt?.client_id) { apiFetch('/clients/' + encodeURIComponent(payload.debt.client_id)).then(async (clientResponse) => { const clientPayload = await clientResponse.json().catch(() => ({})); if (active && clientResponse.ok && clientPayload.client) setData((current) => current ? { ...current, client: clientPayload.client } : current); }).catch(() => undefined); } }).catch((e) => { if (active) setError(e instanceof Error ? e.message : 'Error cargando la deuda.'); }); return () => { active = false; }; }, [id]);
  useEffect(() => { if (searchParams.get('action') === 'payment') setShowPayment(true); }, [searchParams]);
  if (error) return <main className="space-y-4 p-6"><p role="alert" className="text-red-700">{error}</p><Link className="text-blue-700 underline" href="/crm/deudas">Volver a deudas</Link></main>;
  if (!data) return <main className="p-6" role="status">Cargando deuda…</main>;
  const d = data.debt;
  const client = data.client;
  const clientName = client?.full_name || d.client_name || 'Cliente';
  const clientHref = d.client_id ? `/crm/clientes/${d.client_id}` : '/crm/clientes';
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
  const registerPayment = async () => {
    const amount = Number(paymentAmount.replace(',', '.'));
    if (!Number.isFinite(amount) || amount <= 0) { setError('Introduce un importe de pago válido.'); return; }
    setSavingPayment(true); setError('');
    try {
      const response = await apiFetch(`/finance/debts/${encodeURIComponent(id)}/payments`, { method: 'POST', body: JSON.stringify({ amount }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'No se pudo registrar el pago.');
      const payment = payload.payment || { id: `payment-${Date.now()}`, amount, paid_at: new Date().toISOString().slice(0, 10), status: 'Registrado' };
      setData((current) => current ? { ...current, debt: { ...current.debt, paid_total: Number(current.debt.paid_total ?? current.debt.paid_amount ?? 0) + amount }, payments: [payment, ...current.payments] } : current);
      setPaymentAmount(''); setShowPayment(false);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo registrar el pago.'); }
    finally { setSavingPayment(false); }
  };
  return <main className="flex h-full min-h-0 flex-col gap-2 overflow-hidden bg-[#f5f8fc] p-3 text-[#13234b] sm:p-4">
    <header className="shrink-0">
      <div className="flex items-center gap-2 text-sm font-semibold text-blue-700"><Link href="/crm/deudas" className="inline-flex items-center gap-1 hover:underline"><span className="material-symbols-outlined text-base">arrow_back</span>Deudas</Link><span className="text-slate-300">/</span><Link href={clientHref} className="truncate hover:underline">{clientName}</Link></div>
      <section className="mt-1.5 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-blue-200 bg-blue-50 text-base font-extrabold text-blue-800">{initials(clientName)}</div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="truncate text-[17px] font-extrabold text-slate-900">{clientName}</h2><span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">{client?.status === 'activo' ? 'Activo' : client?.status || 'Cliente'}</span></div><p className="mt-0.5 text-xs text-slate-500">Ficha del cliente · Deuda con {d.creditor}</p></div></div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600"><span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px]">mail</span>{client?.email || 'Sin correo'}</span><span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px]">call</span>{client?.phone || 'Sin teléfono'}</span><Link href={clientHref} className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 font-bold text-blue-700 hover:bg-blue-100"><span className="material-symbols-outlined text-[16px]">person</span>Ver ficha 360°</Link></div>
        </div>
      </section>
      <div className="mt-1.5 flex flex-wrap items-start justify-between gap-2">
        <div><div className="flex items-center gap-2.5"><h1 className="text-xl font-bold text-slate-900">{d.creditor}</h1><span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">{d.status}</span></div><p className="mt-0.5 text-xs text-slate-600">Referencia {d.reference} · {d.plan_name || 'Plan de pago'}</p></div>
        <div className="flex items-center gap-2"><button type="button" onClick={() => setShowPayment(true)} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-3 py-2 text-xs font-bold text-white hover:bg-blue-800"><span className="material-symbols-outlined text-[17px]">payments</span>Registrar pago</button><button type="button" onClick={() => openSectionPanel('Cuotas')} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-right transition hover:border-blue-400 hover:bg-blue-50"><span className="block text-xs text-slate-500">Próximo vencimiento</span><strong className="text-xs text-slate-900">{d.next_due_date || d.due_date || 'Sin fecha'}</strong></button></div>
      </div>
    </header>
    <section className="grid shrink-0 gap-2 sm:grid-cols-4">
      <button type="button" onClick={() => openSectionPanel('Historial')} className="rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-blue-400 hover:bg-blue-50"><span className="text-xs font-semibold text-slate-500">Importe original</span><strong className="mt-0.5 block text-xl text-slate-900">{money(d.original_amount)}</strong><span className="mt-0.5 block text-xs text-blue-700">Ver historial →</span></button>
      <button type="button" onClick={() => openSectionPanel('Pagos registrados')} className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-left shadow-sm transition hover:border-emerald-400"><span className="text-xs font-semibold text-emerald-700">Pagado registrado</span><strong className="mt-0.5 block text-xl text-emerald-800">{money(paid)}</strong><span className="mt-0.5 block text-xs text-emerald-700">Ver pagos →</span></button>
      <button type="button" onClick={() => openSectionPanel('Cuotas')} className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-left shadow-sm transition hover:border-amber-400"><span className="text-xs font-semibold text-amber-700">Saldo pendiente</span><strong className="mt-0.5 block text-xl text-amber-900">{money(balance)}</strong><span className="mt-0.5 block text-xs text-amber-700">Ver cuotas →</span></button>
      <button type="button" onClick={() => openSectionPanel('Cuotas')} className="rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-blue-400 hover:bg-blue-50"><div className="flex items-center justify-between"><span className="text-xs font-semibold text-slate-500">Plan completado</span><strong className="text-sm text-slate-900">{progress}%</strong></div><div className="mt-2 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-blue-600" style={{ width: `${progress}%` }} /></div><span className="mt-1.5 block text-xs text-blue-700">Ver plan →</span></button>
    </section>
    <div className="min-h-0 flex-1 overflow-hidden">
      <div className="grid h-full min-h-0 gap-2.5 xl:auto-rows-fr xl:grid-cols-3 xl:grid-rows-2">
        {sections.map(({ title, icon, rows }) => <section key={title} ref={(node) => { sectionRefs.current[title] = node; }} className={`min-h-0 overflow-hidden rounded-xl border bg-white p-3 shadow-sm transition ${activeSection === title ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200'}`}><div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-2"><div className="flex items-center gap-2"><h2 className="flex items-center gap-1.5 text-sm font-bold text-slate-900"><span className="material-symbols-outlined text-[19px] text-blue-700">{icon}</span>{title}</h2><span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{rows.length}</span></div><button type="button" onClick={() => openSectionPanel(title)} className="text-xs font-semibold text-blue-700 hover:underline">Abrir →</button></div>{rows.length ? <ul className="min-h-0 overflow-y-auto divide-y divide-slate-100">{rows.map((row: any, index: number) => <li key={row.id || index} className="flex items-center justify-between gap-3 py-2 text-sm"><span className="min-w-0 truncate font-medium text-slate-800">{row.body || row.file_name || row.status || row.action || `Cuota ${row.installment_number || ''}`}</span><span className="shrink-0 text-right text-xs text-slate-500">{row.amount != null ? `${money(row.amount)} · ` : ''}{row.due_date || row.paid_at || row.created_at || ''}</span></li>)}</ul> : <div className="flex items-center gap-2 py-4 text-sm text-slate-500"><span className="material-symbols-outlined text-slate-300">inbox</span>No hay registros todavía.</div>}</section>)}
      </div>
    </div>
    {showPayment && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowPayment(false); }}><section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="payment-title"><div className="flex items-center justify-between"><h2 id="payment-title" className="flex items-center gap-2 text-lg font-bold text-slate-900"><span className="material-symbols-outlined text-blue-700">payments</span>Registrar pago</h2><button type="button" onClick={() => setShowPayment(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Cerrar"><span className="material-symbols-outlined">close</span></button></div><p className="mt-1 text-sm text-slate-500">{clientName} · {d.creditor}</p><label className="mt-4 block text-sm font-semibold text-slate-700">Importe<input autoFocus inputMode="decimal" value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} placeholder="0,00" className="mt-1 h-11 w-full rounded-lg border border-slate-300 px-3 text-base" /></label><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setShowPayment(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold">Cancelar</button><button type="button" onClick={() => void registerPayment()} disabled={savingPayment} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-60">{savingPayment ? 'Guardando…' : 'Guardar pago'}</button></div></section></div>}
    {panelSection && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpenPanel(null); }}>
      <section className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="debt-panel-title">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><div><h2 id="debt-panel-title" className="flex items-center gap-2 text-lg font-bold text-slate-900"><span className="material-symbols-outlined text-blue-700">{panelSection.icon}</span>{panelSection.title}</h2><p className="mt-1 text-sm text-slate-500">Información completa de {d.creditor} · {panelSection.rows.length} registros</p></div><button type="button" onClick={() => setOpenPanel(null)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Cerrar"><span className="material-symbols-outlined">close</span></button></div>
        <div className="max-h-[65vh] overflow-y-auto px-5 py-3">{panelSection.rows.length ? <ul className="divide-y divide-slate-100">{panelSection.rows.map((row: any, index: number) => <li key={row.id || index} className="flex items-center justify-between gap-5 py-4 text-sm"><span className="font-medium text-slate-800">{row.body || row.file_name || row.status || row.action || `Cuota ${row.installment_number || ''}`}</span><span className="shrink-0 text-right text-slate-500">{row.amount != null ? `${money(row.amount)} · ` : ''}{row.due_date || row.paid_at || row.created_at || ''}</span></li>)}</ul> : <div className="flex flex-col items-center gap-2 py-12 text-center text-sm text-slate-500"><span className="material-symbols-outlined text-4xl text-slate-300">inbox</span>No hay registros todavía.</div>}</div>
      </section>
    </div>}
  </main>;
}
