'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';

type DebtDetail = { debt: Record<string, any>; payments: any[]; installments: any[]; documents: any[]; notes: any[]; history: any[] };
const money = (v: unknown) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(Number(v || 0));

export default function DebtDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<DebtDetail | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { let active = true; apiFetch('/finance/debts/' + encodeURIComponent(id)).then(async (r) => { const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || 'No se pudo cargar la deuda.'); if (active) setData(d); }).catch((e) => { if (active) setError(e instanceof Error ? e.message : 'Error cargando la deuda.'); }); return () => { active = false; }; }, [id]);
  if (error) return <main className="space-y-4 p-6"><p role="alert" className="text-red-700">{error}</p><Link className="text-blue-700 underline" href="/crm/deudas">Volver a deudas</Link></main>;
  if (!data) return <main className="p-6" role="status">Cargando deuda…</main>;
  const d = data.debt;
  const paid = Number(d.paid_total ?? d.paid_amount ?? 0);
  return <main className="h-full overflow-y-auto space-y-4 p-4 sm:p-6"><header><Link href="/crm/deudas" className="text-sm text-blue-700 underline">← Deudas</Link><h1 className="mt-2 text-2xl font-bold">{d.creditor}</h1><p className="text-sm text-slate-600">{d.client_name || 'Cliente'} · Referencia {d.reference} · {d.status}</p></header>
    <section className="grid gap-3 sm:grid-cols-3"><article className="rounded-xl border bg-white p-4"><span className="text-xs text-slate-500">Importe original</span><strong className="mt-1 block text-xl">{money(d.original_amount)}</strong></article><article className="rounded-xl border bg-white p-4"><span className="text-xs text-slate-500">Pagado registrado</span><strong className="mt-1 block text-xl">{money(paid)}</strong></article><article className="rounded-xl border bg-white p-4"><span className="text-xs text-slate-500">Saldo calculado</span><strong className="mt-1 block text-xl">{money(Math.max(0,Number(d.original_amount||0)-paid))}</strong></article></section>
    {[['Cuotas',data.installments],['Pagos registrados',data.payments],['Documentos',data.documents],['Notas',data.notes],['Historial',data.history]].map(([title,rows]:any)=><section key={title} className="rounded-xl border bg-white p-4"><h2 className="mb-3 text-lg font-bold">{title}</h2>{rows.length?<ul className="divide-y">{rows.map((row:any,index:number)=><li key={row.id||index} className="flex justify-between gap-3 py-2 text-sm"><span>{row.body||row.file_name||row.status||row.action||('Cuota '+(row.installment_number||''))}</span><span className="text-slate-600">{row.amount != null ? money(row.amount)+' · ' : ''}{row.due_date||row.paid_at||row.created_at||''}</span></li>)}</ul>:<p className="text-sm text-slate-500">No hay registros.</p>}</section>)}
  </main>;
}
