'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function CRMDashboardPage() {
  const [taskFilter, setTaskFilter] = useState<'todas' | 'urgentes' | 'en_espera' | 'completadas'>('todas');

  const todayTasks = [
    {
      id: '1',
      type: 'Alta',
      typeColor: 'bg-blue-50 text-[#0055D4] border-blue-200',
      client: 'QA HTTPS 1791063326',
      code: 'WEB-1791063326998',
      service: 'Autónomos / ZZP (KvK & BTW)',
      status: 'En seguimiento',
      statusColor: 'bg-blue-50 text-blue-700 border-blue-200',
      priority: 'en espera',
      priorityColor: 'bg-amber-50 text-amber-700 border-amber-200',
      responsible: 'Equipo gestor',
      filterTag: 'en_espera',
    },
    {
      id: '2',
      type: 'Alta',
      typeColor: 'bg-blue-50 text-[#0055D4] border-blue-200',
      client: 'Cliente Prueba RP',
      code: 'WEB-1791044034875',
      service: 'DigiD (Identidad Digital)',
      status: 'En seguimiento',
      statusColor: 'bg-blue-50 text-blue-700 border-blue-200',
      priority: 'en espera',
      priorityColor: 'bg-amber-50 text-amber-700 border-amber-200',
      responsible: 'Equipo gestor',
      filterTag: 'en_espera',
    },
    {
      id: '3',
      type: 'Alta',
      typeColor: 'bg-blue-50 text-[#0055D4] border-blue-200',
      client: 'A SALLA',
      code: 'EXP-2026-0001',
      service: 'Consulta Privada 1 a 1',
      status: 'En seguimiento',
      statusColor: 'bg-blue-50 text-blue-700 border-blue-200',
      priority: 'en espera',
      priorityColor: 'bg-amber-50 text-amber-700 border-amber-200',
      responsible: 'Equipo gestor',
      filterTag: 'en_espera',
    },
  ];

  const filteredTasks = todayTasks.filter((t) => {
    if (taskFilter === 'todas') return true;
    if (taskFilter === 'en_espera') return t.filterTag === 'en_espera';
    if (taskFilter === 'urgentes') return t.priority === 'alta';
    if (taskFilter === 'completadas') return t.status === 'Completada';
    return true;
  });

  const kpis = [
    {
      label: 'Facturado este mes',
      href: '/crm/facturacion',
      value: '2.480 €',
      trend: '↑ +12% vs. mes anterior',
      trendColor: 'text-emerald-600',
    },
    {
      label: 'Cobrado',
      href: '/crm/deudas',
      value: '1.920 €',
      trend: '↑ +18% vs. mes anterior',
      trendColor: 'text-emerald-600',
    },
    {
      label: 'Pendiente de cobro',
      href: '/crm/deudas',
      value: '560 €',
      trend: '↑ +5% vs. mes anterior',
      trendColor: 'text-amber-600',
    },
    {
      label: 'Facturas emitidas',
      href: '/crm/facturacion',
      value: '8',
      trend: '↑ +33% vs. mes anterior',
      trendColor: 'text-emerald-600',
    },
  ];

  const topClients = [
    { rank: 1, name: 'Empresa Delta S.L.', billed: '750 €', collected: '600 €', pending: '150 €', count: 2 },
    { rank: 2, name: 'Consultoría Norte', billed: '520 €', collected: '520 €', pending: '0 €', count: 2 },
    { rank: 3, name: 'Autónomo Sur', billed: '420 €', collected: '300 €', pending: '120 €', count: 1 },
    { rank: 4, name: 'Innovatech B.V.', billed: '310 €', collected: '200 €', pending: '110 €', count: 1 },
    { rank: 5, name: 'Servicios Atlas', billed: '280 €', collected: '280 €', pending: '0 €', count: 1 },
  ];

  const chartMonths = [
    { month: 'Ene', billedHeight: 65, billedVal: '1.800 €', collectedHeight: 58, collectedVal: '1.600 €' },
    { month: 'Feb', billedHeight: 78, billedVal: '2.100 €', collectedHeight: 72, collectedVal: '1.950 €' },
    { month: 'Mar', billedHeight: 72, billedVal: '1.950 €', collectedHeight: 64, collectedVal: '1.700 €' },
    { month: 'Abr', billedHeight: 88, billedVal: '2.300 €', collectedHeight: 80, collectedVal: '2.100 €' },
    { month: 'May', billedHeight: 82, billedVal: '2.200 €', collectedHeight: 70, collectedVal: '1.850 €' },
    { month: 'Jun', billedHeight: 96, billedVal: '2.480 €', collectedHeight: 76, collectedVal: '1.920 €' },
  ];

  return (
    <div className="crm-dashboard w-full flex flex-col justify-between gap-3 h-full max-h-[calc(100vh-4.6rem)] overflow-y-auto lg:overflow-y-hidden text-slate-800">
      {/* 1. BLOQUE SUPERIOR: Mi trabajo de hoy */}
      <section className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 shadow-2xs shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2.5">
          <div>
            <p className="text-xs font-bold tracking-[0.14em] text-[#0055D4] uppercase">GESTIÓN DIARIA</p>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-tight">Mi trabajo de hoy</h1>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setTaskFilter('todas')}
              className={`px-3 py-1 rounded-md text-xs sm:text-sm font-semibold transition-colors ${
                taskFilter === 'todas'
                  ? 'bg-[#0055D4] text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              Todas
            </button>
            <button
              type="button"
              onClick={() => setTaskFilter('urgentes')}
              className={`px-3 py-1 rounded-md text-xs sm:text-sm font-semibold transition-colors ${
                taskFilter === 'urgentes'
                  ? 'bg-[#0055D4] text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              Urgentes
            </button>
            <button
              type="button"
              onClick={() => setTaskFilter('en_espera')}
              className={`px-3 py-1 rounded-md text-xs sm:text-sm font-semibold transition-colors ${
                taskFilter === 'en_espera'
                  ? 'bg-[#0055D4] text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              En espera
            </button>
            <button
              type="button"
              onClick={() => setTaskFilter('completadas')}
              className={`px-3 py-1 rounded-md text-xs sm:text-sm font-semibold transition-colors ${
                taskFilter === 'completadas'
                  ? 'bg-[#0055D4] text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              Completadas
            </button>
            <Link
              href="/crm/tareas"
              className="text-xs sm:text-sm font-semibold text-[#0055D4] hover:underline ml-2 transition-colors whitespace-nowrap"
            >
              Ver todas →
            </Link>
          </div>
        </div>

        {/* Tabla compacta de tareas de hoy */}
        <div className="overflow-x-auto rounded-lg border border-slate-100">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[#f8fafc] text-xs font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-3.5 py-2">Tipo</th>
                <th className="px-3.5 py-2">Cliente / Expediente</th>
                <th className="px-3.5 py-2">Trámite</th>
                <th className="px-3.5 py-2">Estado</th>
                <th className="px-3.5 py-2">Prioridad</th>
                <th className="px-3.5 py-2">Responsable</th>
                <th className="px-3 py-2 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTasks.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-3.5 py-2">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold border ${t.typeColor}`}>
                      {t.type}
                    </span>
                  </td>
                  <td className="px-3.5 py-2">
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-900 leading-snug">{t.client}</span>
                      <span className="text-xs font-mono-data text-slate-500">{t.code}</span>
                    </div>
                  </td>
                  <td className="px-3.5 py-2 text-slate-700 font-medium">{t.service}</td>
                  <td className="px-3.5 py-2">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${t.statusColor}`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-3.5 py-2">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border ${t.priorityColor}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                      {t.priority}
                    </span>
                  </td>
                  <td className="px-3.5 py-2 text-slate-600">{t.responsible}</td>
                  <td className="px-3 py-2 text-right">
                    <Link
                      href="/crm/tareas"
                      className="inline-flex items-center justify-center h-6 w-6 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                      title="Gestionar trámite"
                    >
                      <span className="material-symbols-outlined text-[17px]">chevron_right</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 2. BLOQUE CENTRAL: Facturación y rendimiento por cliente */}
      <section className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 shadow-2xs flex-1 min-h-0 flex flex-col justify-between">
        <div>
          <div className="mb-2.5">
            <p className="text-xs font-bold tracking-[0.14em] text-[#0055D4] uppercase">RENDIMIENTO</p>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-tight">
              Facturación y rendimiento por cliente
            </h2>
          </div>

          {/* 4 KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-3">
            {kpis.map((kpi) => (
              <Link key={kpi.label} href={kpi.href} className="p-2.5 rounded-lg border border-slate-200 bg-[#fafcff] flex flex-col justify-between hover:border-[#0055D4] hover:bg-blue-50/30 transition-colors">
                <span className="text-xs font-medium text-slate-600 truncate">{kpi.label}</span>
                <span className="text-xl sm:text-2xl font-bold font-mono-data text-slate-900 my-0.5">{kpi.value}</span>
                <span className={`text-xs font-semibold ${kpi.trendColor}`}>{kpi.trend}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* 2 Columnas: Top clientes por facturación & Facturación mensual gráfica */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1 min-h-0">
          {/* Top clientes (7 columnas) */}
          <div className="lg:col-span-7 rounded-lg border border-slate-200 flex flex-col min-h-0 overflow-hidden">
            <div className="px-3 py-2 bg-[#f8fafc] border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs sm:text-sm font-bold text-slate-800">Top clientes por facturación (este mes)</span>
              <Link href="/crm/facturacion" className="text-xs font-semibold text-[#0055D4] hover:underline">
                Ver todos →
              </Link>
            </div>
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-[#f8fafc] text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="px-3 py-1.5 w-6">#</th>
                    <th className="px-3 py-1.5">Cliente</th>
                    <th className="px-3 py-1.5 text-right">Facturado</th>
                    <th className="px-3 py-1.5 text-right">Cobrado</th>
                    <th className="px-3 py-1.5 text-right">Pendiente</th>
                    <th className="px-3 py-1.5 text-center">Facturas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {topClients.map((c) => (
                    <tr key={c.rank} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-1.5 text-slate-400 font-mono-data text-xs font-bold">{c.rank}</td>
                      <td className="px-3 py-1.5 font-semibold text-slate-800">{c.name}</td>
                      <td className="px-3 py-1.5 text-right font-mono-data text-slate-900 font-semibold">{c.billed}</td>
                      <td className="px-3 py-1.5 text-right font-mono-data text-emerald-600 font-semibold">{c.collected}</td>
                      <td className="px-3 py-1.5 text-right font-mono-data text-amber-600 font-semibold">{c.pending}</td>
                      <td className="px-3 py-1.5 text-center font-mono-data text-slate-600">{c.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Gráfico de Barras Mensual (5 columnas) */}
          <div className="lg:col-span-5 rounded-lg border border-slate-200 p-3 flex flex-col justify-between bg-[#fafcff]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs sm:text-sm font-bold text-slate-800">Facturación mensual (últimos 6 meses)</span>
              <div className="flex items-center gap-3 text-xs font-semibold text-slate-600">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#145DA0]"></span> Facturado
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#60A5FA]"></span> Cobrado
                </span>
              </div>
            </div>

            {/* Visual Dual-Bar Chart */}
            <div className="flex-1 flex items-end justify-between gap-2 pt-2 pb-1 px-1 border-b border-slate-200 min-h-[90px]">
              {chartMonths.map((m) => (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group relative">
                  <div className="flex items-end gap-1 w-full justify-center h-full">
                    <div
                      style={{ height: `${m.billedHeight}%` }}
                      className="w-3 sm:w-3.5 bg-[#145DA0] rounded-t-xs transition-all group-hover:brightness-110"
                      title={`Facturado: ${m.billedVal}`}
                    ></div>
                    <div
                      style={{ height: `${m.collectedHeight}%` }}
                      className="w-3 sm:w-3.5 bg-[#60A5FA] rounded-t-xs transition-all group-hover:brightness-110"
                      title={`Cobrado: ${m.collectedVal}`}
                    ></div>
                  </div>
                  <span className="text-xs font-semibold text-slate-600 mt-1">{m.month}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2 text-xs text-slate-600">
              <span>Promedio mensual: <strong className="font-mono-data text-slate-900">2.138 €</strong></span>
              <span className="text-emerald-700 font-semibold">Tasa de cobro: 84%</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. BLOQUE INFERIOR: Panel de Control Operativo */}
      <footer className="bg-white rounded-xl border border-slate-200 px-3 sm:px-4 py-2.5 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5 text-left w-full sm:w-auto">
          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-[#0055D4] shrink-0">
            <span className="material-symbols-outlined text-[19px]">tune</span>
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">Panel de Control Operativo</h3>
            <p className="text-xs text-slate-500 leading-tight">Acciones directas sobre la plataforma y servicios</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
          <Link
            href="/crm/backup"
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <span className="material-symbols-outlined text-[16px] text-slate-500">cloud_download</span>
            <span>Copia de Seguridad</span>
          </Link>

          <Link
            href="/crm/facturacion"
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <span className="material-symbols-outlined text-[16px] text-slate-500">receipt_long</span>
            <span>+ Presupuesto / Factura</span>
          </Link>

          <Link
            href="/crm/documentos-ia"
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <span className="material-symbols-outlined text-[16px] text-blue-600">document_scanner</span>
            <span>Escanear Carta</span>
          </Link>

          <Link
            href="/crm/clientes/alta-ia"
            className="px-3.5 py-1.5 rounded-lg bg-[#0055D4] hover:bg-[#0047b3] text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
            <span>+ Alta con IA</span>
          </Link>
        </div>
      </footer>
    </div>
  );
}
