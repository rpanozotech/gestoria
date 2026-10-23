'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';

type DashboardData = {
  kpis: {
    active_clients: number;
    client_stats: { new_this_month: number; incomplete: number };
    appointments_today: { total: number; completed: number; pending: number };
    active_dossiers: { total: number; belastingdienst: number };
    finances: { monthly_revenue: number; pending_revenue: number; pending_invoices_count: number };
    debts?: { open_count: number; open_amount: number; overdue_count: number; overdue_amount: number };
  };
  monthly_finance?: Array<{ month: string; billed: number; collected: number }>;
  today_appointments: Array<{ id: string; client_name: string; title: string; appointment_time: string; status: string }>;
  recent_dossiers: Array<{ id: string; client_name: string; title: string; code: string; status: string }>;
};

const emptyData: DashboardData = {
  kpis: {
    active_clients: 0,
    client_stats: { new_this_month: 0, incomplete: 0 },
    appointments_today: { total: 0, completed: 0, pending: 0 },
    active_dossiers: { total: 0, belastingdienst: 0 },
    finances: { monthly_revenue: 0, pending_revenue: 0, pending_invoices_count: 0 },
  },
  today_appointments: [],
  recent_dossiers: [],
};
const euro = (value: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(Number.isFinite(value) ? value : 0);

export default function CRMDashboardPage() {
  const [data, setData] = useState<DashboardData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    apiFetch('/dashboard/stats')
      .then(async (response) => {
        if (!response.ok) throw new Error('No se pudieron cargar las métricas del CRM.');
        const result = await response.json();
        if (active) setData({ ...emptyData, ...result, kpis: { ...emptyData.kpis, ...result.kpis } });
      })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : 'Error cargando el dashboard.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const kpis = [
    { label: 'Clientes activos', value: String(data.kpis.active_clients), href: '/crm/clientes' },
    { label: 'Citas de hoy', value: String(data.kpis.appointments_today.total), href: '/crm/agenda' },
    { label: 'Expedientes activos', value: String(data.kpis.active_dossiers.total), href: '/crm/expedientes' },
    { label: 'Cobrado este mes', value: euro(data.kpis.finances.monthly_revenue), href: '/crm/facturacion' },
    { label: 'Pendiente de cobro', value: euro(data.kpis.finances.pending_revenue), href: '/crm/facturacion' },
    { label: 'Facturas pendientes', value: String(data.kpis.finances.pending_invoices_count), href: '/crm/facturacion' },
  ];

  return (
    <main className="crm-dashboard flex w-full h-full min-h-0 max-h-[calc(100vh-4.6rem)] flex-col overflow-hidden p-3 sm:p-5 space-y-4 text-slate-800" aria-busy={loading}>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-xs font-bold tracking-[0.14em] text-[#0055D4] uppercase">GESTIÓN DIARIA</p><h1 className="text-xl font-bold text-slate-900">Mi trabajo de hoy</h1></div>
        <Link href="/crm/agenda" className="rounded-lg bg-[#0055D4] px-4 py-2 text-sm font-semibold text-white">Abrir agenda</Link>
      </header>

      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {loading && <p className="text-sm text-slate-500" role="status">Cargando datos reales del CRM…</p>}

      <section aria-labelledby="metrics-heading" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 id="metrics-heading" className="mb-3 text-lg font-bold">Resumen basado en datos del CRM</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {kpis.map((item) => <Link key={item.label} href={item.href} className="rounded-lg border border-slate-200 bg-slate-50 p-3 hover:border-blue-400"><span className="block text-xs text-slate-600">{item.label}</span><strong className="mt-1 block text-xl font-bold text-slate-900">{loading ? '—' : item.value}</strong></Link>)}
        </div>
        <p className="mt-3 text-xs text-slate-500">Altas este mes: {data.kpis.client_stats.new_this_month} · Clientes incompletos: {data.kpis.client_stats.incomplete} · Citas pendientes hoy: {data.kpis.appointments_today.pending}</p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold">Deudas y cobros pendientes</h2><Link href="/crm/deudas" className="text-sm font-semibold text-blue-700">Gestionar deudas →</Link></div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-lg border bg-slate-50 p-3"><span className="block text-xs text-slate-600">Facturas por cobrar</span><strong className="block text-xl">{loading ? '—' : euro(data.kpis.finances.pending_revenue)}</strong><span className="text-xs text-slate-500">{data.kpis.finances.pending_invoices_count} facturas</span></div>
          <div className="rounded-lg border bg-slate-50 p-3"><span className="block text-xs text-slate-600">Deudas abiertas</span><strong className="block text-xl">{loading ? '—' : euro(data.kpis.debts?.open_amount ?? 0)}</strong><span className="text-xs text-slate-500">{data.kpis.debts?.open_count ?? 0} registros</span></div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3"><span className="block text-xs text-amber-800">Deudas vencidas</span><strong className="block text-xl text-amber-900">{loading ? '—' : euro(data.kpis.debts?.overdue_amount ?? 0)}</strong><span className="text-xs text-amber-800">{data.kpis.debts?.overdue_count ?? 0} vencidas</span></div>
          <div className="rounded-lg border bg-slate-50 p-3"><span className="block text-xs text-slate-600">Cobrado este mes</span><strong className="block text-xl">{loading ? '—' : euro(data.kpis.finances.monthly_revenue)}</strong><span className="text-xs text-slate-500">Según facturas pagadas</span></div>
        </div>
      </section>
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold">Facturación y cobros · últimos 6 meses</h2><Link href="/crm/facturacion" className="text-sm font-semibold text-blue-700">Ver facturación →</Link></div>
        {data.monthly_finance?.length ? <><div className="flex h-44 min-w-0 items-end gap-2 overflow-x-auto border-b border-slate-200 px-2">{data.monthly_finance.map((item) => { const peak = Math.max(1, ...data.monthly_finance!.flatMap((x) => [x.billed, x.collected])); return <div key={item.month} className="flex h-full min-w-16 flex-1 flex-col justify-end" title={item.month + ': facturado ' + euro(item.billed) + ', cobrado ' + euro(item.collected)}><div className="flex h-[85%] items-end justify-center gap-1"><div className="w-1/3 rounded-t bg-blue-600" style={{height: Math.max(2, item.billed / peak * 100) + '%'}}/><div className="w-1/3 rounded-t bg-emerald-500" style={{height: Math.max(2, item.collected / peak * 100) + '%'}}/></div><span className="mt-2 truncate text-center text-xs text-slate-600">{item.month}</span></div>; })}</div><div className="mt-3 flex gap-4 text-xs text-slate-600"><span><i className="mr-1 inline-block h-2.5 w-2.5 bg-blue-600"/>Facturado</span><span><i className="mr-1 inline-block h-2.5 w-2.5 bg-emerald-500"/>Cobrado</span></div></> : <p className="py-6 text-center text-sm text-slate-500">{loading ? 'Cargando serie mensual…' : 'Sin datos de facturación en el período.'}</p>}
      </section>
      <div className="grid min-h-0 gap-4 xl:grid-cols-2">
        <section aria-labelledby="appointments-heading" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between"><h2 id="appointments-heading" className="text-lg font-bold">Citas de hoy</h2><Link href="/crm/agenda" className="text-sm font-semibold text-blue-700">Ver agenda →</Link></div>
          {data.today_appointments.length ? <ul className="max-h-52 overflow-y-auto pr-1 divide-y divide-slate-100">{data.today_appointments.map((appointment) => <li key={appointment.id} className="flex items-start justify-between gap-3 py-3"><div><strong className="block text-sm">{appointment.client_name || 'Cliente'}</strong><span className="text-sm text-slate-600">{appointment.title}</span></div><span className="whitespace-nowrap text-sm font-semibold">{String(appointment.appointment_time).slice(0, 5)} · {appointment.status}</span></li>)}</ul> : <p className="py-6 text-center text-sm text-slate-500">No hay citas para hoy.</p>}
        </section>
        <section aria-labelledby="dossiers-heading" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between"><h2 id="dossiers-heading" className="text-lg font-bold">Expedientes recientes</h2><Link href="/crm/expedientes" className="text-sm font-semibold text-blue-700">Ver expedientes →</Link></div>
          {data.recent_dossiers.length ? <ul className="max-h-52 overflow-y-auto pr-1 divide-y divide-slate-100">{data.recent_dossiers.map((dossier) => <li key={dossier.id} className="flex items-start justify-between gap-3 py-3"><div><strong className="block text-sm">{dossier.title}</strong><span className="text-xs text-slate-600">{dossier.client_name} · {dossier.code}</span></div><span className="text-xs font-semibold">{dossier.status}</span></li>)}</ul> : <p className="py-6 text-center text-sm text-slate-500">No hay expedientes todavía.</p>}
        </section>
      </div>

    </main>
  );
}
