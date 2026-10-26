'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';

type Debt = { id: string; client_id: string; client_name?: string; creditor: string; reference: string; status: string; original_amount: number; paid_amount?: number; paid_total?: number; due_date?: string; plan_name?: string };
const creditorGroups = {
  'Administraciones públicas': ['Belastingdienst', 'CJIB', 'KVK', 'Agencia Tributaria', 'Seguridad Social', 'Ayuntamiento'],
  'Agencias de recobro': ['Intrum', 'Hoist Finance', 'EOS', 'Lindorff', 'Otra agencia de recobro'],
};
const money = (value: number) => '€ ' + value.toLocaleString('es-ES', { minimumFractionDigits: 2 });
const dateLabel = (value?: string) => value ? new Date(value).toLocaleDateString('es-NL') : '—';

function Badge({ value }: { value: string }) {
  const lower = (value || '').toLowerCase();
  const tone = lower.includes('pagad') ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : lower.includes('aplaz') ? 'border-violet-200 bg-violet-50 text-violet-700' : lower.includes('al día') ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-800';
  return <span className={'inline-flex rounded-full border px-2.5 py-0.5 text-xs font-bold ' + tone}>{value || 'Pendiente'}</span>;
}

function Metric({ label, value, icon, tone, detail }: { label: string; value: string; icon: string; tone: string; detail: string }) {
  return <article className="rounded-xl border border-outline-variant bg-surface-container-lowest px-3.5 py-2.5 shadow-2xs"><div className="flex items-center justify-between gap-2"><div><p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">{label}</p><p className={'mt-1 text-2xl font-bold font-mono-data ' + tone}>{value}</p><p className="mt-0.5 text-xs text-on-surface-variant">{detail}</p></div><span className={'material-symbols-outlined rounded-full p-2 text-[20px] ' + tone}>{icon}</span></div></article>;
}

export default function DeudasPage() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [selected, setSelected] = useState<Debt | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<{ payments: any[]; installments: any[]; documents: any[]; notes: any[] } | null>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('Todos');
  const [creditor, setCreditor] = useState('Todos');
  const [detailTab, setDetailTab] = useState('Resumen');
  const [newDebtOpen, setNewDebtOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('transferencia');
  const [notice, setNotice] = useState('');
  const [newDebt, setNewDebt] = useState({
    client: '', creditor: '', reference: '', originalAmount: '', dueDate: '', installments: '1',
    frequency: 'No aplica', status: 'Pendiente', notes: '',
  });

  useEffect(() => {
    apiFetch('/finance/debts').then(async (response) => {
      const data = response.ok ? await response.json() : { debts: [] };
      const rows = data.debts || [];
      setDebts(rows);
      if (rows[0]) setSelected(rows[0]);
    }).catch(() => setNotice('No se pudieron cargar las deudas.'));
    apiFetch('/clients').then(async (response) => {
      const data = response.ok ? await response.json() : { clients: [] };
      setClients(Array.isArray(data.clients) ? data.clients : []);
    }).catch(() => setClients([]));
  }, []);

  useEffect(() => {
    if (!selected?.id) { setSelectedDetail(null); return; }
    let active = true;
    apiFetch('/finance/debts/' + encodeURIComponent(selected.id)).then(async (response) => {
      if (!response.ok) return;
      const detail = await response.json().catch(() => ({}));
      if (active) setSelectedDetail(detail);
    }).catch(() => { if (active) setSelectedDetail(null); });
    return () => { active = false; };
  }, [selected?.id]);

  const rows = useMemo(() => debts.filter((debt) => {
    const matchesText = (debt.client_name + ' ' + debt.creditor + ' ' + debt.reference).toLowerCase().includes(query.toLowerCase());
    const matchesStatus = status === 'Todos' || debt.status === status;
    const matchesCreditor = creditor === 'Todos' || debt.creditor === creditor;
    return matchesText && matchesStatus && matchesCreditor;
  }), [debts, query, status, creditor]);
  const totals = useMemo(() => rows.reduce((acc, debt) => { const original = Number(debt.original_amount || 0); const paid = Number(debt.paid_total ?? debt.paid_amount ?? 0); const pending = Math.max(0, original - paid); const due = debt.due_date ? new Date(`${debt.due_date}T00:00:00`) : null; const today = new Date(); today.setHours(0, 0, 0, 0); const limit = new Date(today); limit.setDate(limit.getDate() + 30); acc.pending += pending; acc.paid += paid; if ((debt.plan_name || '').toLowerCase().includes('cuota') || (debt.status || '').toLowerCase().includes('aplaz')) acc.plans += 1; if (due && due >= today && due <= limit && pending > 0) acc.upcoming += pending; return acc; }, { pending: 0, paid: 0, upcoming: 0, plans: 0 }), [rows]);
  const selectedPaid = selected ? Number(selected.paid_total ?? selected.paid_amount ?? 0) : 0;
  const selectedPending = selected ? Math.max(0, Number(selected.original_amount || 0) - selectedPaid) : 0;
  const progress = selected?.original_amount ? Math.round(selectedPaid / Number(selected.original_amount) * 100) : 0;
  const registerPayment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected) return;
    const amount = Number(paymentAmount);
    if (!amount || amount <= 0) { setNotice('Introduce un importe de pago válido.'); return; }
    const response = await apiFetch('/finance/debts/' + selected.id + '/payments', { method: 'POST', body: JSON.stringify({ amount, method: paymentMethod }) });
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      const paidTotal = selectedPaid + amount;
      const updated = { ...selected, paid_amount: paidTotal, paid_total: paidTotal, status: Number(data.outstanding) <= 0 ? 'pagado' : selected.status };
      setNotice(`Pago de ${money(amount)} registrado correctamente.`);
      setSelected(updated);
      setDebts((current) => current.map((debt) => debt.id === selected.id ? updated : debt));
      setPaymentAmount('');
      setPaymentModalOpen(false);
    } else setNotice(data.error || 'No se pudo registrar el pago.');
  };
  const createDebt = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amount = Number(newDebt.originalAmount);
    if (!newDebt.client || !newDebt.creditor.trim() || !newDebt.reference.trim() || !amount || amount <= 0 || !newDebt.dueDate) {
      setNotice('Completa cliente, acreedor, referencia, importe y vencimiento.');
      return;
    }
    const planName = Number(newDebt.installments) > 1 ? `${newDebt.installments} cuotas · ${newDebt.frequency}` : 'Pago único';
    try {
      const response = await apiFetch('/finance/debts', {
        method: 'POST',
        body: JSON.stringify({ client_id: newDebt.client, creditor: newDebt.creditor.trim(), reference: newDebt.reference.trim(), original_amount: amount, due_date: newDebt.dueDate, plan_name: planName, visible_to_client: true }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'No se pudo crear la deuda.');
      const client = clients.find((item) => item.id === newDebt.client);
      const created: Debt = { ...data.debt, client_name: client?.full_name || 'Cliente', paid_total: 0, paid_amount: 0 };
      setDebts((current) => [created, ...current]);
      setSelected(created);
      setDetailTab('Resumen');
      setNewDebtOpen(false);
      setNewDebt({ client: '', creditor: '', reference: '', originalAmount: '', dueDate: '', installments: '1', frequency: 'No aplica', status: 'Pendiente', notes: '' });
      setNotice('Deuda guardada en el CRM.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'No se pudo crear la deuda.');
    }
  };

  return (
    <div className="w-full flex-1 h-full max-h-[calc(100vh-4.6rem)] overflow-hidden flex flex-col gap-2.5 crm-debts-reference">
      <header className="flex flex-wrap items-center justify-between gap-2 shrink-0 pb-1 border-b border-surface-container">
        <div>
          <Link href="/crm/facturacion" className="mb-1 inline-flex items-center gap-1 text-xs font-bold text-secondary hover:underline">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Volver a Finanzas
          </Link>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-on-surface">Deudas y pagos</h1>
          <p className="text-xs text-on-surface-variant">Controla las deudas de tus clientes, registra pagos y gestiona aplazamientos.</p>
        </div>
        <button type="button" onClick={() => setNewDebtOpen(true)} className="h-9 rounded-lg bg-secondary px-3.5 text-xs sm:text-sm font-bold text-white shadow-2xs hover:bg-blue-700 transition-colors flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[17px]">add</span>
          <span>+ Nueva deuda</span>
        </button>
      </header>

      {notice && <div role="status" className="rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs sm:text-sm font-semibold text-blue-800 shrink-0">{notice}</div>}

      <section className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 shrink-0">
        <Metric label="Pendiente total" value={money(totals.pending)} icon="schedule" tone="text-rose-600" detail={rows.length + ' deudas abiertas'} />
        <Metric label="Pagado registrado" value={money(totals.paid)} icon="check_circle" tone="text-emerald-600" detail="Pagos registrados" />
        <Metric label="Próximos vencimientos" value={money(totals.upcoming)} icon="event" tone="text-secondary" detail="En los próximos 30 días" />
        <Metric label="Aplazamientos activos" value={String(totals.plans)} icon="description" tone="text-violet-600" detail="Planes en seguimiento" />
      </section>

      <section className="flex flex-wrap items-center gap-2.5 rounded-xl border border-outline-variant bg-surface-container-lowest p-2.5 shadow-2xs shrink-0">
        <div className="relative min-w-[220px] flex-1">
          <span className="material-symbols-outlined absolute left-3 top-2 text-[18px] text-on-surface-variant">search</span>
          <input aria-label="Buscar deuda" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por cliente, acreedor o referencia..." className="h-9 w-full rounded-lg border border-outline-variant bg-surface pl-9 pr-3 text-xs sm:text-sm outline-none focus:border-secondary" />
        </div>
        <select aria-label="Filtrar estado" value={status} onChange={(event) => setStatus(event.target.value)} className="h-9 rounded-lg border border-outline-variant bg-surface px-3 text-xs sm:text-sm font-medium">
          <option>Todos</option><option>Pagando</option><option>Aplazamiento aprobado</option><option>Pagado</option>
        </select>
        <select aria-label="Filtrar acreedor" value={creditor} onChange={(event) => setCreditor(event.target.value)} className="h-9 rounded-lg border border-outline-variant bg-surface px-3 text-xs sm:text-sm font-medium">
          <option>Todos</option>{Array.from(new Set(debts.map((debt) => debt.creditor))).map((item) => <option key={item}>{item}</option>)}
        </select>
        <button type="button" onClick={() => { setQuery(''); setStatus('Todos'); setCreditor('Todos'); }} className="h-9 rounded-lg border border-secondary px-3 text-xs sm:text-sm font-semibold text-secondary hover:bg-blue-50 transition-colors">
          Limpiar
        </button>
      </section>

      <div className="flex-1 min-h-0 grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_360px] overflow-hidden">
        <section className="min-w-0 overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-2xs flex flex-col h-full">
          <div className="flex items-center justify-between border-b border-surface-container px-4 py-2.5 shrink-0 bg-[#fafcff]">
            <div>
              <h2 className="text-sm font-bold text-on-surface">Deudas de clientes</h2>
              <p className="text-xs text-on-surface-variant">Mostrando {rows.length} resultados</p>
            </div>
            <button type="button" onClick={() => setNewDebtOpen(true)} className="rounded-lg border border-secondary px-2.5 py-1 text-xs font-bold text-secondary hover:bg-blue-50">
              Crear plan
            </button>
          </div>
          <div className="flex-1 overflow-y-auto overflow-x-auto no-scrollbar">
            <table className="w-full min-w-[580px] text-left text-xs sm:text-sm">
              <thead className="bg-surface-container-low text-xs font-bold uppercase tracking-wider text-on-surface-variant sticky top-0 z-10 border-b border-surface-container">
                <tr>
                  <th className="px-4 py-2.5">Cliente</th>
                  <th className="px-4 py-2.5">Acreedor</th>
                  <th className="px-4 py-2.5">Importe pendiente</th>
                  <th className="px-4 py-2.5">Estado</th>
                  <th className="px-4 py-2.5">Próximo vencimiento</th>
                  <th className="px-3 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {rows.map((debt) => {
                  const pending = Math.max(0, Number(debt.original_amount || 0) - Number(debt.paid_total ?? debt.paid_amount ?? 0));
                  const active = selected?.id === debt.id;
                  return (
                    <tr key={debt.id} onClick={() => { setSelected(debt); setDetailTab('Resumen'); }} className={'cursor-pointer transition hover:bg-blue-50/50 ' + (active ? 'bg-blue-50' : '')}>
                      <td className="px-4 py-2.5 font-semibold text-secondary">{debt.client_name || 'Cliente'}</td>
                      <td className="px-4 py-2.5">
                        <span className="font-semibold text-on-surface text-xs sm:text-sm block">{debt.creditor}</span>
                        <span className="block font-mono-data text-xs text-on-surface-variant">{debt.reference}</span>
                      </td>
                      <td className="px-4 py-2.5 font-mono-data font-bold text-on-surface text-sm sm:text-base">{money(pending)}</td>
                      <td className="px-4 py-2.5"><Badge value={debt.status} /></td>
                      <td className="px-4 py-2.5 text-on-surface-variant text-xs sm:text-sm">{dateLabel(debt.due_date)}</td>
                      <td className="px-3 py-2.5 text-right"><Link href={'/crm/deudas/' + debt.id} prefetch={false} onClick={(event) => event.stopPropagation()} className="inline-flex items-center gap-1 rounded-lg border border-outline-variant px-2.5 py-1.5 text-xs font-bold text-secondary hover:bg-blue-50" aria-label={`Abrir ficha de ${debt.client_name || 'cliente'}`}>Ficha nueva <span className="material-symbols-outlined text-[16px]">open_in_new</span></Link></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!rows.length && <div className="p-8 text-center text-sm text-on-surface-variant">No hay deudas que mostrar.</div>}
          </div>
        </section>

        {selected ? (
          <aside className="min-w-0 rounded-xl border border-outline-variant bg-surface-container-lowest shadow-2xs flex flex-col h-full overflow-hidden">
            <div className="flex items-start justify-between border-b border-surface-container p-3.5 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 font-bold text-primary text-xs sm:text-sm">CD</div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-on-surface">{selected.client_name || 'Cliente'}</h2>
                  <p className="text-xs text-on-surface-variant flex items-center gap-1.5 mt-0.5"><span>Deuda</span> · <Badge value={selected.status} /></p>
                </div>
              </div>
              <button type="button" aria-label="Cerrar detalle" onClick={() => setSelected(null)} className="text-2xl text-on-surface-variant leading-none">×</button>
            </div>
            <div className="flex border-b border-surface-container shrink-0 text-xs sm:text-sm">
              {['Resumen', 'Pagos', 'Documentos', 'Notas'].map((item) => (
                <button key={item} type="button" onClick={() => setDetailTab(item)} className={'flex-1 border-b-2 py-2 font-semibold ' + (detailTab === item ? 'border-secondary text-secondary' : 'border-transparent text-on-surface-variant')}>
                  {item}
                </button>
              ))}
            </div>
            <div className="flex-1 min-h-0 overflow-hidden p-3.5 space-y-3 text-xs sm:text-sm">
              {detailTab === 'Resumen' && (
                <>
                  <div className="rounded-xl border border-outline-variant p-3 space-y-2 bg-[#fafcff]">
                    <h3 className="text-xs sm:text-sm font-bold text-on-surface">Información general</h3>
                    <dl className="space-y-1.5 text-xs sm:text-sm">
                      <div className="flex justify-between"><dt className="text-on-surface-variant">Acreedor</dt><dd className="font-semibold text-on-surface">{selected.creditor}</dd></div>
                      <div className="flex justify-between"><dt className="text-on-surface-variant">Referencia</dt><dd className="font-mono-data font-semibold text-on-surface">{selected.reference}</dd></div>
                      <div className="flex justify-between"><dt className="text-on-surface-variant">Saldo pendiente</dt><dd className="font-mono-data font-bold text-rose-700 text-sm">{money(selectedPending)}</dd></div>
                    </dl>
                  </div>
                  <div className="rounded-xl border border-outline-variant p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs sm:text-sm font-bold text-on-surface">Plan de pagos</h3>
                      <span className="text-xs font-bold text-secondary">{progress}% completado</span>
                    </div>
                    <div className="h-2 rounded-full bg-surface-container overflow-hidden">
                      <div className="h-full bg-secondary" style={{ width: progress + '%' }} />
                    </div>
                  </div>
                </>
              )}
              {detailTab !== 'Resumen' && (() => {
                const rows = detailTab === 'Pagos' ? selectedDetail?.payments : detailTab === 'Documentos' ? selectedDetail?.documents : selectedDetail?.notes;
                return rows?.length ? <ul className="divide-y divide-slate-100 rounded-xl border border-outline-variant bg-white">{rows.map((row: any, index: number) => <li key={row.id || index} className="flex items-center justify-between gap-3 p-3"><span className="min-w-0 truncate font-medium">{row.body || row.file_name || row.status || 'Registro'}</span><span className="shrink-0 text-right text-xs text-on-surface-variant">{row.amount != null ? money(Number(row.amount)) + ' · ' : ''}{row.paid_at || row.created_at || ''}</span></li>)}</ul> : <div className="rounded-xl border border-dashed border-outline-variant p-6 text-center text-sm text-on-surface-variant">{selectedDetail ? `No hay ${detailTab.toLowerCase()} registrados.` : 'Cargando información…'}</div>;
              })()}
            </div>
            <div className="grid gap-2 border-t border-surface-container p-3 shrink-0">
              <button type="button" onClick={() => { setPaymentAmount(String(Math.max(0, selectedPending).toFixed(2))); setPaymentModalOpen(true); }} className="h-9 rounded-lg bg-secondary text-xs sm:text-sm font-bold text-white shadow-2xs hover:bg-blue-700 transition-colors">
                + Registrar pago
              </button>
              <Link href={'/crm/deudas/' + selected.id} prefetch={false} className="rounded-lg border border-outline-variant py-2 text-center text-xs sm:text-sm font-bold text-secondary hover:bg-slate-50 transition-colors">
                Abrir ficha completa →
              </Link>
            </div>
          </aside>
        ) : (
          <aside className="flex items-center justify-center rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest p-4 text-center text-xs sm:text-sm text-on-surface-variant">
            Selecciona una deuda para ver su detalle.
          </aside>
        )}
      </div>

    {paymentModalOpen && selected && <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4">
      <form onSubmit={registerPayment} className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 pb-3"><div><p className="text-[11px] font-bold tracking-wide text-secondary">FINANZAS · COBRO</p><h2 className="mt-1 text-lg font-bold">Registrar pago</h2><p className="mt-1 text-xs text-slate-500">{selected.client_name} · pendiente {money(selectedPending)}</p></div><button type="button" aria-label="Cerrar registro de pago" onClick={() => setPaymentModalOpen(false)} className="rounded-lg p-1 text-2xl text-slate-500 hover:bg-slate-100">×</button></div>
        <div className="mt-4 space-y-3"><label className="block text-xs font-bold text-slate-700">Importe del pago (€)<input required min="0.01" max={selectedPending || undefined} step="0.01" type="number" value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-outline-variant px-3 text-sm font-normal outline-none focus:border-secondary" /></label><label className="block text-xs font-bold text-slate-700">Método<select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-outline-variant bg-white px-3 text-sm font-normal outline-none focus:border-secondary"><option value="transferencia">Transferencia bancaria</option><option value="efectivo">Efectivo</option><option value="otro">Otro cobro verificado</option></select></label></div>
        <div className="mt-4 flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={() => setPaymentModalOpen(false)} className="rounded-lg border border-outline-variant px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancelar</button><button type="submit" className="rounded-lg bg-secondary px-5 py-2 text-sm font-bold text-white hover:bg-blue-700">Confirmar pago</button></div>
      </form>
    </div>}

    {newDebtOpen && <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/50 p-4">
      <form onSubmit={createDebt} className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div><p className="text-[11px] font-bold tracking-wide text-secondary">FINANZAS · NUEVO REGISTRO</p><h2 className="mt-1 text-xl font-bold">Nueva deuda</h2><p className="mt-1 text-sm text-on-surface-variant">Registra el origen, importe y plan de devolución.</p></div>
          <button type="button" aria-label="Cerrar nueva deuda" onClick={() => setNewDebtOpen(false)} className="rounded-lg p-1 text-2xl text-slate-500 hover:bg-slate-100">×</button>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-bold text-slate-700">Cliente registrado *<select required value={newDebt.client} onChange={(event) => setNewDebt((current) => ({ ...current, client: event.target.value }))} className="mt-1 h-10 w-full rounded-lg border border-outline-variant bg-white px-3 text-sm font-normal outline-none focus:border-secondary"><option value="">Selecciona un cliente</option>{clients.map((client) => { const name = client.full_name || client.name || client.client_name || 'Cliente sin nombre'; return <option key={client.id} value={client.id}>{name}</option>; })}</select></label>
          <label className="text-xs font-bold text-slate-700">Administración / agencia *<select required value={newDebt.creditor} onChange={(event) => setNewDebt((current) => ({ ...current, creditor: event.target.value }))} className="mt-1 h-10 w-full rounded-lg border border-outline-variant bg-white px-3 text-sm font-normal outline-none focus:border-secondary"><option value="">Selecciona un acreedor</option>{Object.entries(creditorGroups).map(([group, values]) => <optgroup key={group} label={group}>{values.map((value) => <option key={value} value={value}>{value}</option>)}</optgroup>)}<option value="Otro acreedor">Otro acreedor</option></select></label>
          <label className="text-xs font-bold text-slate-700">Referencia *<input required value={newDebt.reference} onChange={(event) => setNewDebt((current) => ({ ...current, reference: event.target.value }))} placeholder="Ej. AEAT-2026-001" className="mt-1 h-10 w-full rounded-lg border border-outline-variant px-3 text-sm font-normal outline-none focus:border-secondary" /></label>
          <label className="text-xs font-bold text-slate-700">Importe original (€) *<input required min="0.01" step="0.01" type="number" value={newDebt.originalAmount} onChange={(event) => setNewDebt((current) => ({ ...current, originalAmount: event.target.value }))} placeholder="0,00" className="mt-1 h-10 w-full rounded-lg border border-outline-variant px-3 text-sm font-normal outline-none focus:border-secondary" /></label>
          <label className="text-xs font-bold text-slate-700">Próximo vencimiento *<input required type="date" value={newDebt.dueDate} onChange={(event) => setNewDebt((current) => ({ ...current, dueDate: event.target.value }))} className="mt-1 h-10 w-full rounded-lg border border-outline-variant px-3 text-sm font-normal outline-none focus:border-secondary" /></label>
          <label className="text-xs font-bold text-slate-700">Estado<select value={newDebt.status} onChange={(event) => setNewDebt((current) => ({ ...current, status: event.target.value }))} className="mt-1 h-10 w-full rounded-lg border border-outline-variant bg-white px-3 text-sm font-normal outline-none focus:border-secondary"><option>Pendiente</option><option>Pagando</option><option>Aplazamiento aprobado</option><option>Pagado</option></select></label>
          <label className="text-xs font-bold text-slate-700">Número de cuotas<select value={newDebt.installments} onChange={(event) => setNewDebt((current) => ({ ...current, installments: event.target.value, frequency: event.target.value === '1' ? 'No aplica' : current.frequency === 'No aplica' ? 'Mensual' : current.frequency }))} className="mt-1 h-10 w-full rounded-lg border border-outline-variant bg-white px-3 text-sm font-normal outline-none focus:border-secondary">{[1, 2, 3, 4, 6, 8, 12, 24].map((number) => <option key={number} value={number}>{number === 1 ? 'Pago único' : number}</option>)}</select></label>
          <label className="text-xs font-bold text-slate-700">Frecuencia<select value={newDebt.frequency} disabled={newDebt.installments === '1'} onChange={(event) => setNewDebt((current) => ({ ...current, frequency: event.target.value }))} className="mt-1 h-10 w-full rounded-lg border border-outline-variant bg-white px-3 text-sm font-normal outline-none focus:border-secondary disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"><option>No aplica</option><option>Mensual</option><option>Quincenal</option><option>Trimestral</option></select><span className="mt-1 block text-[10px] font-normal text-slate-500">{newDebt.installments === '1' ? 'Un pago único no tiene periodicidad.' : 'Indica cada cuánto se genera una cuota.'}</span></label>
          <label className="text-xs font-bold text-slate-700 sm:col-span-2">Notas internas<textarea value={newDebt.notes} onChange={(event) => setNewDebt((current) => ({ ...current, notes: event.target.value }))} rows={3} placeholder="Acuerdos, observaciones o documentación pendiente..." className="mt-1 w-full rounded-lg border border-outline-variant p-3 text-sm font-normal outline-none focus:border-secondary" /></label>
        </div>
        <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-900">{newDebt.originalAmount && Number(newDebt.installments) === 1 ? `Pago único: ${money(Number(newDebt.originalAmount))} con un solo vencimiento${newDebt.dueDate ? ` el ${new Date(`${newDebt.dueDate}T00:00:00`).toLocaleDateString('es-ES')}` : ''}.` : newDebt.originalAmount && Number(newDebt.installments) > 1 ? `Plan estimado: ${money(Number(newDebt.originalAmount) / Number(newDebt.installments))} por cuota · ${newDebt.frequency.toLowerCase()}.` : 'Completa el importe y las cuotas para ver el resumen del plan.'}</div>
        <div className="mt-4 flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={() => setNewDebtOpen(false)} className="rounded-lg border border-outline-variant px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancelar</button><button type="submit" className="rounded-lg bg-secondary px-5 py-2 text-sm font-bold text-white hover:bg-blue-700">Crear deuda</button></div>
      </form>
    </div>}
    </div>
  );
}
