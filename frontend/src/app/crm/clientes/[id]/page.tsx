'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';

type Tab = 'Resumen' | 'Expedientes' | 'Facturación' | 'Deudas y pagos' | 'Documentos' | 'Citas' | 'Mensajes' | 'Historial';

export default function ClienteFichaPage() {
  const params = useParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>('Resumen');
  const [notice, setNotice] = useState('');
  const [actionsDropdown, setActionsDropdown] = useState(false);

  const [clientData, setClientData] = useState({
    id: params.id || 'demo-client-1',
    name: 'Cliente demo A',
    initials: 'CD',
    status: 'Activo',
    type: 'Particular',
    responsible: 'Equipo gestor',
    email: 'cliente.demo@correo-ejemplo.es',
    phone: '+34 600 123 456',
    address: 'Calle Ficticia 123, 28001 Madrid',
    city: 'Madrid, España',
    language: 'Español',
    created_at: '10 abr 2024',
    last_activity: '12 ago 2026',
    internal_notes: 'Cliente recurrente. Prefiere comunicación por email.',
  });

  useEffect(() => {
    if (params.id && params.id !== 'demo-client-1') {
      apiFetch(`/clients/${params.id}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.client) {
            const c = data.client;
            setClientData((prev) => ({
              ...prev,
              name: c.full_name || prev.name,
              initials: (c.full_name || 'CD').split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase(),
              email: c.email || prev.email,
              phone: c.phone || prev.phone,
              address: c.address || prev.address,
              city: c.city || prev.city,
              type: c.type || prev.type,
              status: c.status || prev.status,
            }));
          }
        })
        .catch(() => {});
    }
  }, [params.id]);

  const kpis = [
    { label: 'Expedientes activos', value: '2', icon: 'folder_open', iconColor: 'text-[#0055D4]', tabTarget: 'Expedientes' as Tab },
    { label: 'Facturado este mes', value: '480 €', icon: 'bar_chart', iconColor: 'text-emerald-600', tabTarget: 'Facturación' as Tab },
    { label: 'Pendiente de cobro', value: '180 €', icon: 'schedule', iconColor: 'text-amber-500', tabTarget: 'Facturación' as Tab },
    { label: 'Deuda pendiente', value: '620 €', icon: 'euro', iconColor: 'text-rose-500', isDanger: true, tabTarget: 'Deudas y pagos' as Tab },
  ];

  const recentInvoices = [
    { number: 'FAC-2026-0087', date: '05 ago 2026', concept: 'Asesoría mensual', amount: '160,00 €', status: 'Pagada', statusColor: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { number: 'FAC-2026-0076', date: '05 jul 2026', concept: 'Asesoría mensual', amount: '160,00 €', status: 'Pagada', statusColor: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { number: 'FAC-2026-0064', date: '05 jun 2026', concept: 'Asesoría mensual', amount: '160,00 €', status: 'Pagada', statusColor: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { number: 'FAC-2026-0052', date: '05 may 2026', concept: 'Asesoría mensual', amount: '160,00 €', status: 'Pendiente', statusColor: 'bg-amber-50 text-amber-700 border-amber-200' },
    { number: 'FAC-2026-0043', date: '05 abr 2026', concept: 'Asesoría mensual', amount: '160,00 €', status: 'Pendiente', statusColor: 'bg-amber-50 text-amber-700 border-amber-200' },
  ];

  const recentDossiers = [
    { code: 'EXP-2026-0018', title: 'Modelo 100 - IRPF', status: 'En trámite', statusColor: 'bg-blue-50 text-blue-700 border-blue-200', date: '12 ago 2026' },
    { code: 'EXP-2026-0015', title: 'Modelo 303 - IVA', status: 'Finalizado', statusColor: 'bg-emerald-50 text-emerald-700 border-emerald-200', date: '28 jul 2026' },
    { code: 'EXP-2026-0012', title: 'Alta autónomo', status: 'Finalizado', statusColor: 'bg-emerald-50 text-emerald-700 border-emerald-200', date: '14 may 2026' },
  ];

  const recentActivities = [
    { id: 1, title: 'Factura FAC-2026-0087 marcada como pagada', subtitle: 'Pago registrado automáticamente.', date: '12 ago 2026 · 11:24', icon: 'receipt_long', iconBg: 'bg-blue-50 text-[#0055D4]' },
    { id: 2, title: 'Cita completada', subtitle: 'Revisión trimestral de documentación.', date: '10 ago 2026 · 16:30', icon: 'check_circle', iconBg: 'bg-emerald-50 text-emerald-600' },
    { id: 3, title: 'Mensaje enviado', subtitle: 'Recordatorio de documentación pendiente.', date: '05 ago 2026 · 09:12', icon: 'chat_bubble_outline', iconBg: 'bg-blue-50 text-blue-600' },
    { id: 4, title: 'Nuevo expediente creado', subtitle: 'EXP-2026-0018 · Modelo 100 - IRPF', date: '28 jul 2026 · 14:18', icon: 'folder_open', iconBg: 'bg-purple-50 text-purple-600' },
  ];

  const tabs: Tab[] = ['Resumen', 'Expedientes', 'Facturación', 'Deudas y pagos', 'Documentos', 'Citas', 'Mensajes', 'Historial'];

  return (
    <div className="crm-client-ficha w-full flex flex-col justify-between gap-2 h-full max-h-[calc(100vh-4.6rem)] overflow-hidden text-slate-800">
      {/* 1. Header Bar: Breadcrumb + Titulo + Acciones */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/crm/clientes" className="text-slate-500 hover:text-slate-800 font-semibold text-xs sm:text-sm transition-colors">
            ← Clientes
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-slate-600 font-medium text-xs sm:text-sm">{clientData.name}</span>
          <span className="text-slate-300 mx-1">·</span>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">Ficha 360° del cliente</h1>
          <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-300 font-mono-data text-xs font-bold">
            DATOS FICTICIOS DE STAGING
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setNotice('Editor de cliente abierto en modo staging.')}
            className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold flex items-center gap-1 transition-colors shadow-2xs"
          >
            <span className="material-symbols-outlined text-[15px]">edit</span>
            <span>Editar cliente</span>
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setActionsDropdown(!actionsDropdown)}
              className="px-3.5 py-1.5 rounded-lg bg-[#0055D4] hover:bg-[#0047b3] text-white text-xs sm:text-sm font-semibold flex items-center gap-1 transition-colors shadow-2xs"
            >
              <span>+ Nueva acción</span>
              <span className="material-symbols-outlined text-[16px]">expand_more</span>
            </button>

            {actionsDropdown && (
              <div className="absolute right-0 top-9 w-48 bg-white border border-slate-200 rounded-xl shadow-lg p-1.5 z-30 text-xs sm:text-sm">
                {['Crear expediente', 'Nueva factura / presupuesto', 'Registrar deuda', 'Programar cita'].map((act) => (
                  <button
                    key={act}
                    type="button"
                    onClick={() => {
                      setActionsDropdown(false);
                      setNotice(`Acción "${act}" iniciada.`);
                    }}
                    className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-slate-50 text-slate-700 font-medium transition-colors"
                  >
                    {act}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {notice && (
        <div className="px-3.5 py-2 rounded-lg bg-blue-50 border border-blue-200 text-xs sm:text-sm font-medium text-blue-800 flex items-center justify-between shrink-0">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice('')} className="text-blue-500 hover:text-blue-800 font-bold">✕</button>
        </div>
      )}

      {/* 2. Tarjeta Superior Resumen del Cliente */}
      <div className="bg-white rounded-xl border border-slate-200 px-3.5 py-2.5 shadow-2xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-2.5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-blue-100 text-[#0055D4] font-bold text-sm flex items-center justify-center shrink-0 border border-blue-200">
            {clientData.initials}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">{clientData.name}</h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                {clientData.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Tipo: <strong className="font-semibold text-slate-700">{clientData.type}</strong>
              <span className="mx-2 text-slate-300">|</span>
              Responsable: <strong className="font-semibold text-slate-700">{clientData.responsible}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs sm:text-sm text-slate-600 border-t lg:border-t-0 lg:border-x border-slate-200 pt-1 lg:pt-0 lg:px-4">
          <p className="flex items-center gap-1 text-[#0055D4]">
            <span className="material-symbols-outlined text-[16px] text-slate-400">mail</span>
            <span>{clientData.email}</span>
          </p>
          <p className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px] text-slate-400">phone</span>
            <span>{clientData.phone}</span>
          </p>
          <p className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px] text-slate-400">location_on</span>
            <span>{clientData.city}</span>
          </p>
        </div>

        <div className="text-xs text-slate-500 flex items-center gap-3 shrink-0">
          <span>Desde: <strong className="text-slate-800">{clientData.created_at}</strong></span>
          <span className="text-slate-300">|</span>
          <span>Últ. actividad: <strong className="text-slate-800">{clientData.last_activity}</strong></span>
        </div>
      </div>

      {/* 3. Fila de 4 KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 shrink-0">
        {kpis.map((kpi) => (
          <button
            key={kpi.label}
            type="button"
            onClick={() => setTab(kpi.tabTarget)}
            className="bg-white rounded-xl border border-slate-200 p-2.5 shadow-2xs hover:border-[#0055D4] transition-all text-left flex items-center justify-between"
          >
            <div className="flex items-center gap-2.5">
              <span className={`material-symbols-outlined text-[22px] ${kpi.iconColor}`}>{kpi.icon}</span>
              <div>
                <p className="text-xs text-slate-500 font-medium truncate">{kpi.label}</p>
                <p className={`text-lg sm:text-xl font-bold font-mono-data leading-tight ${kpi.isDanger ? 'text-rose-600' : 'text-slate-900'}`}>
                  {kpi.value}
                </p>
              </div>
            </div>
            <span className="material-symbols-outlined text-[16px] text-slate-300">chevron_right</span>
          </button>
        ))}
      </div>

      {/* 4. Tabs Strip */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-200 shrink-0">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 text-xs sm:text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
              tab === t
                ? 'border-[#0055D4] text-[#0055D4]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Resumen' ? (
      <>
      {/* 5. Main Area (Grid de 3 Columnas) - Altura flexible con overflow interno */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-2 overflow-hidden">
        {/* COLUMNA 1 (4 cols): Resumen + Servicios */}
        <div className="lg:col-span-4 h-full flex flex-col gap-2 overflow-y-auto pr-1">
          {/* Card Resumen del cliente */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 mb-1.5 pb-1 border-b border-slate-100 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-slate-500">person</span>
              Resumen del cliente
            </h3>
            <dl className="space-y-1.5 text-xs sm:text-sm">
              <div className="flex justify-between py-0.5 border-b border-slate-50">
                <dt className="text-slate-500">Nombre</dt>
                <dd className="font-semibold text-slate-800">{clientData.name}</dd>
              </div>
              <div className="flex justify-between py-0.5 border-b border-slate-50">
                <dt className="text-slate-500">Tipo</dt>
                <dd className="font-semibold text-slate-800">{clientData.type}</dd>
              </div>
              <div className="flex justify-between py-0.5 border-b border-slate-50">
                <dt className="text-slate-500">Email</dt>
                <dd className="font-medium text-[#0055D4] truncate max-w-[170px]">{clientData.email}</dd>
              </div>
              <div className="flex justify-between py-0.5 border-b border-slate-50">
                <dt className="text-slate-500">Teléfono</dt>
                <dd className="font-semibold text-slate-800">{clientData.phone}</dd>
              </div>
              <div className="flex justify-between py-0.5 border-b border-slate-50">
                <dt className="text-slate-500">Dirección</dt>
                <dd className="font-medium text-slate-700 truncate max-w-[170px]">{clientData.address}</dd>
              </div>
              <div className="pt-1.5">
                <dt className="text-slate-500 mb-0.5 text-xs">Notas internas</dt>
                <dd className="text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-200 text-xs sm:text-sm leading-snug">
                  {clientData.internal_notes}
                </dd>
              </div>
            </dl>
          </div>

          {/* Card Servicios activos */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 mb-1.5 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-slate-500">layers</span>
              Servicios activos
            </h3>
            <div className="flex flex-wrap gap-1.5">
              <span className="px-2.5 py-1 rounded-md bg-blue-50 text-[#0055D4] border border-blue-200 text-xs font-semibold">
                Asesoría fiscal
              </span>
              <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
                Asesoría contable
              </span>
              <span className="px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-xs font-semibold">
                Gestión laboral
              </span>
            </div>
          </div>
        </div>

        {/* COLUMNA 2 (5 cols): Facturación + Expedientes */}
        <div className="lg:col-span-5 h-full flex flex-col gap-2 overflow-y-auto pr-1">
          {/* Facturación reciente */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between bg-[#fafcff]">
              <span className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-slate-500">receipt_long</span>
                Facturación reciente
              </span>
              <button type="button" onClick={() => setTab('Facturación')} className="text-xs font-semibold text-[#0055D4] hover:underline">
                Ver toda →
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-[#f8fafc] text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="px-3 py-2">Número</th>
                    <th className="px-3 py-2">Fecha</th>
                    <th className="px-3 py-2 text-right">Importe</th>
                    <th className="px-3 py-2 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentInvoices.map((inv) => (
                    <tr key={inv.number} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-2 font-mono-data text-slate-800 font-semibold text-xs sm:text-sm">{inv.number}</td>
                      <td className="px-3 py-2 text-slate-600 text-xs sm:text-sm">{inv.date}</td>
                      <td className="px-3 py-2 text-right font-mono-data font-semibold text-slate-900 text-xs sm:text-sm">{inv.amount}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold border ${inv.statusColor}`}>
                          {inv.status === 'Pagada' ? '✓ Pagada' : '◷ Pendiente'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Expedientes recientes */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between bg-[#fafcff]">
              <span className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-slate-500">folder_open</span>
                Expedientes recientes
              </span>
              <button type="button" onClick={() => setTab('Expedientes')} className="text-xs font-semibold text-[#0055D4] hover:underline">
                Ver todos →
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <tbody className="divide-y divide-slate-100">
                  {recentDossiers.map((d) => (
                    <tr key={d.code} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-2 font-mono-data font-semibold text-slate-800 text-xs sm:text-sm">{d.code}</td>
                      <td className="px-3 py-2 text-slate-700 text-xs sm:text-sm">{d.title}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold border ${d.statusColor}`}>
                          {d.status === 'Finalizado' ? '✓ Finalizado' : d.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right text-slate-500 font-mono-data text-xs">{d.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* COLUMNA 3 (3 cols): Próxima acción + Deudas y pagos */}
        <div className="lg:col-span-3 h-full flex flex-col gap-2 overflow-y-auto pr-1">
          {/* Próxima acción */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 mb-1.5 pb-1 border-b border-slate-100 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-slate-500">task_alt</span>
              Próxima acción
            </h3>
            <p className="font-bold text-slate-900 text-xs sm:text-sm">Revisar documentación trimestral</p>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
              <span>15 sep 2026</span>
              <span className="px-1.5 py-0.2 rounded bg-blue-50 text-[#0055D4] font-semibold text-xs">Alta</span>
            </div>
            <p className="text-slate-600 text-xs mt-1 leading-snug">
              Solicitar y revisar facturas del Q3.
            </p>
            <button
              type="button"
              onClick={() => setNotice('Acción marcada como completada.')}
              className="w-full mt-2 py-1.5 rounded-lg border border-[#0055D4] text-[#0055D4] hover:bg-blue-50 font-semibold text-xs sm:text-sm transition-colors"
            >
              ✓ Marcar completada
            </button>
          </div>

          {/* Deudas y pagos */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs">
            <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-slate-100">
              <span className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-rose-500">payments</span>
                Deudas y pagos
              </span>
              <Link href="/crm/deudas" className="text-xs font-semibold text-[#0055D4] hover:underline">
                Ver todas →
              </Link>
            </div>
            <dl className="space-y-1.5 text-xs sm:text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500 text-xs">Acreedor</dt>
                <dd className="font-semibold text-slate-800 text-xs sm:text-sm">Agencia Tributaria</dd>
              </div>
              <div className="flex justify-between items-baseline">
                <dt className="text-slate-500 text-xs">Pendiente</dt>
                <dd className="font-mono-data font-bold text-rose-600 text-base sm:text-lg">620,00 €</dd>
              </div>
              <div className="flex justify-between text-xs">
                <dt className="text-slate-500">Vence</dt>
                <dd className="text-slate-700">15 nov 2026</dd>
              </div>
            </dl>
            <Link
              href="/crm/deudas/demo-client-1"
              className="w-full mt-2 py-1.5 rounded-lg border border-[#0055D4] text-[#0055D4] hover:bg-blue-50 font-semibold text-xs sm:text-sm block text-center transition-colors"
            >
              Ver detalle de la deuda →
            </Link>
          </div>
        </div>
      </div>

      {/* 6. Actividad reciente (Bottom Row Fijo) */}
      <div className="bg-white rounded-xl border border-slate-200 p-2.5 shadow-2xs shrink-0">
        <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-slate-100">
          <span className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-slate-500">history</span>
            Actividad reciente
          </span>
          <button type="button" onClick={() => setTab('Historial')} className="text-xs font-semibold text-[#0055D4] hover:underline">
            Ver todo el historial →
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-xs sm:text-sm">
          {recentActivities.map((act) => (
            <div key={act.id} className="p-2 rounded-lg bg-[#fafcff] border border-slate-200 flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${act.iconBg}`}>
                <span className="material-symbols-outlined text-[16px]">{act.icon}</span>
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-slate-900 text-xs sm:text-sm truncate leading-tight">{act.title}</p>
                <p className="text-xs font-mono-data text-slate-500 leading-tight">{act.date}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      </>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">{tab}</h2>
              <p className="mt-1 text-xs text-slate-500">Información vinculada a {clientData.name}.</p>
            </div>
            <button type="button" onClick={() => setNotice(`Nueva acción preparada en ${tab}.`)} className="rounded-lg bg-[#0055D4] px-3 py-2 text-xs font-semibold text-white hover:bg-[#0047b3]">+ Nueva acción</button>
          </div>
          {tab === 'Expedientes' && <div className="grid gap-2 sm:grid-cols-2">{recentDossiers.map((dossier) => <div key={dossier.code} className="rounded-lg border border-slate-200 p-3"><p className="font-mono-data text-xs font-bold text-[#0055D4]">{dossier.code}</p><p className="mt-1 text-sm font-semibold">{dossier.title}</p><p className="mt-1 text-xs text-slate-500">{dossier.status} · {dossier.date}</p></div>)}</div>}
          {tab === 'Facturación' && <div className="rounded-lg border border-slate-200 p-3 text-sm">{recentInvoices.length} facturas recientes disponibles. <Link href="/crm/facturacion" className="font-semibold text-[#0055D4] hover:underline">Abrir facturación →</Link></div>}
          {tab === 'Deudas y pagos' && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm">Saldo pendiente: <strong>620,00 €</strong>. <Link href="/crm/deudas/demo-client-1" className="font-semibold text-[#0055D4] hover:underline">Ver deuda →</Link></div>}
          {tab === 'Documentos' && <div className="rounded-lg border border-slate-200 p-3 text-sm">Documentos del cliente listos para revisar y clasificar.</div>}
          {tab === 'Citas' && <div className="rounded-lg border border-slate-200 p-3 text-sm">Próxima cita: 20 nov 2026 · 10:00. <Link href="/crm/agenda" className="font-semibold text-[#0055D4] hover:underline">Abrir agenda →</Link></div>}
          {tab === 'Mensajes' && <div className="rounded-lg border border-slate-200 p-3 text-sm">Mensajes recientes del cliente disponibles en el asistente.</div>}
          {tab === 'Historial' && <div className="space-y-2">{recentActivities.map((activity) => <div key={activity.id} className="rounded-lg border border-slate-200 p-3 text-sm"><strong>{activity.title}</strong><span className="ml-2 text-xs text-slate-500">{activity.date}</span></div>)}</div>}
        </div>
      )}
    </div>
  );
}
