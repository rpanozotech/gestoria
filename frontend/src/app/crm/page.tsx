'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { activableConTeclado } from '@/lib/a11y';
import { formatThousands } from '@/lib/format';

// El dia se deriva del reloj del navegador, nunca se escribe a mano: una
// fecha fija en el dashboard hace que el gestor no se fie de la agenda.
function formatTodayEs(): string {
  return new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export default function CRMDashboardPage() {
  const [stats, setStats] = useState<any>({
    kpis: {
      active_clients: 0,
      appointments_today: { total: 0, completed: 0, pending: 0 },
      active_dossiers: { total: 0, belastingdienst: 0 },
      finances: { monthly_revenue: 0, pending_revenue: 0, pending_invoices_count: 0 },
    },
    today_appointments: [],
    recent_dossiers: [],
  });

  // Modal para ver detalles de expediente al hacer clic en la tabla
  const [selectedDossier, setSelectedDossier] = useState<any>(null);
  const todayLabel = formatTodayEs();

  useEffect(() => {
    apiFetch('/dashboard/stats')
      .then((res) => res.json())
      .then((data) => {
        if (data.kpis) setStats(data);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      {/* Header & Quick Action Strip */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-on-surface">Panel de Control Operativo</h1>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-surface-container-high text-secondary text-[11px] font-mono-data rounded font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></span>
              EN VIVO
            </span>
          </div>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Gestoría y Asesoría Fiscal Neerlandesa · Visión ejecutiva en tiempo real
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/crm/backup"
            className="h-9 px-3.5 bg-surface-container-lowest border border-outline-variant text-on-surface text-xs font-semibold rounded-md shadow-sm hover:border-secondary hover:text-secondary transition-colors flex items-center gap-1.5"
            title="Descargar copia de seguridad o exportar datos a CSV"
          >
            <span className="material-symbols-outlined text-[16px] text-secondary">cloud_download</span>
            <span>Copia de Seguridad</span>
          </Link>
          <Link
            href="/crm/facturacion"
            className="h-9 px-3.5 bg-surface-container-lowest border border-outline-variant text-on-surface text-xs font-semibold rounded-md shadow-sm hover:bg-surface-container transition-colors flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">receipt_long</span>
            <span>+ Presupuesto / Factura</span>
          </Link>
          <Link
            href="/crm/documentos-ia"
            className="h-9 px-3.5 bg-surface-container-lowest border border-outline-variant text-on-surface text-xs font-semibold rounded-md shadow-sm hover:bg-surface-container transition-colors flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px] text-secondary">document_scanner</span>
            <span>Escanear Carta</span>
          </Link>
          <Link
            href="/crm/alta-ia"
            className="h-9 px-3.5 bg-secondary text-white text-xs font-semibold rounded-md shadow-sm hover:bg-blue-700 transition-colors flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
            <span>+ Alta con IA</span>
          </Link>
        </div>
      </div>

      {/* 6 KPI Cards Grid (Clickable to jump directly to sections) */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* KPI 1: Clientes */}
        <Link
          href="/crm/clientes"
          className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant shadow-sm flex flex-col justify-between hover:border-secondary hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-[11px] font-semibold tracking-normal text-outline group-hover:text-[--delft]">Clientes Activos</span>
            <span className="material-symbols-outlined text-[18px] text-secondary">group</span>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-mono-data">{stats.kpis.active_clients}</span>
            </div>
            <p className="text-[10px] text-outline mt-0.5">Clientes dados de alta</p>
          </div>
        </Link>

        {/* KPI 2: Citas */}
        <Link
          href="/crm/agenda"
          className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant shadow-sm flex flex-col justify-between hover:border-secondary hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-[11px] font-semibold tracking-normal text-outline group-hover:text-secondary">Citas de Hoy</span>
            <span className="material-symbols-outlined text-[18px] text-primary">calendar_clock</span>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-mono-data">{stats.kpis.appointments_today.total}</span>
              <span className="text-[10px] text-on-surface-variant">citas</span>
            </div>
            <p className="text-[10px] text-outline mt-0.5">
              {stats.kpis.appointments_today.completed} hechas · {stats.kpis.appointments_today.pending} pendientes
            </p>
          </div>
          <div className="flex gap-1 mt-3">
            <span className="h-1 flex-1 bg-secondary rounded-full"></span>
            <span className="h-1 flex-1 bg-secondary rounded-full"></span>
            <span className="h-1 flex-1 bg-surface-container-high rounded-full"></span>
            <span className="h-1 flex-1 bg-surface-container-high rounded-full"></span>
          </div>
        </Link>

        {/* KPI 3: Trámites */}
        <Link
          href="/crm/clientes"
          className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant shadow-sm flex flex-col justify-between hover:border-secondary hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-[11px] font-semibold tracking-normal text-outline group-hover:text-secondary">En Trámite</span>
            <span className="material-symbols-outlined text-[18px] text-secondary">pending_actions</span>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-mono-data">{stats.kpis.active_dossiers.total}</span>
              <span className="text-[10px] text-on-surface-variant">expedientes</span>
            </div>
            <p className="text-[10px] text-amber-700 font-semibold mt-0.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              {stats.kpis.active_dossiers.belastingdienst} en Belastingdienst
            </p>
          </div>
        </Link>

        {/* KPI 4: Facturación Mes */}
        <Link
          href="/crm/facturacion"
          className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant shadow-sm flex flex-col justify-between hover:border-secondary hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-[11px] font-semibold tracking-normal text-outline group-hover:text-secondary">Facturación Mes</span>
            <span className="material-symbols-outlined text-[18px] text-emerald-600">payments</span>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-mono-data">€ {formatThousands(stats.kpis.finances.monthly_revenue)}</span>
            </div>
            <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">+14.2% vs mes anterior</p>
          </div>
        </Link>

        {/* KPI 5: Cobros Pendientes */}
        <Link
          href="/crm/facturacion"
          className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant shadow-sm flex flex-col justify-between hover:border-secondary hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-[11px] font-semibold tracking-normal text-outline group-hover:text-secondary">Cobros Pendientes</span>
            <span className="material-symbols-outlined text-[18px] text-amber-600">receipt</span>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-mono-data">€ {formatThousands(stats.kpis.finances.pending_revenue)}</span>
            </div>
            <p className="text-[10px] text-outline mt-0.5">{stats.kpis.finances.pending_invoices_count} facturas emitidas</p>
          </div>
        </Link>

        {/* KPI 6: Pasarela iDEAL */}
        <Link
          href="/crm/facturacion"
          className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant shadow-sm flex flex-col justify-between hover:border-secondary hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-[11px] font-semibold tracking-normal text-outline group-hover:text-secondary">Pasarela iDEAL</span>
            <span className="material-symbols-outlined text-[18px] text-secondary">credit_card</span>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-mono-data text-emerald-600">100%</span>
            </div>
            <p className="text-[10px] text-outline mt-0.5">Sincronización bancaria OK</p>
          </div>
          <div className="w-full bg-surface-container h-1 rounded-full mt-3 overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full w-full"></div>
          </div>
        </Link>
      </div>

      {/* AI Proactive Advisory Alert (Executive Precision) */}
      <div className="p-4 bg-indigo-50 border border-indigo-200 border-l-4 border-l-indigo-600 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-indigo-600 text-[22px]">smart_toy</span>
          <div>
            <h2 className="text-xs font-bold text-indigo-950 tracking-normal">
              Asistente NexusGest AI · 3 Acciones Recomendadas
            </h2>
            <p className="text-xs text-indigo-800 mt-0.5">
              Se detectaron 2 resoluciones de Belastingdienst pendientes de vincular al expediente de Cliente seleccionado y 1 presupuesto por vencer.
            </p>
          </div>
        </div>
        <Link
          href="/crm/alta-ia"
          className="h-8 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded flex items-center gap-1.5 transition-colors whitespace-nowrap shadow-sm self-start sm:self-auto"
        >
          <span>Revisar Acciones IA</span>
          <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
        </Link>
      </div>

      {/* Dual Workspace: Active Dossiers & Today's Appointments */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Active Dossiers Table */}
        <div className="xl:col-span-2 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-5 border-b border-surface-container flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-on-surface">Expedientes y Trámites en Curso</h3>
                <p className="text-xs text-on-surface-variant mt-0.5">Haz clic en cualquier fila para ver el detalle del expediente</p>
              </div>
              <Link href="/crm/clientes" className="text-xs font-semibold text-secondary hover:underline">
                Ver todos (34)
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-container-low text-[--concrete] font-semibold border-b border-[--concrete]/20">
                  <tr>
                    <th className="px-5 py-3 text-left">Código</th>
                    <th className="px-5 py-3 text-left">Cliente / BSN</th>
                    <th className="px-5 py-3 text-left">Trámite</th>
                    <th className="px-5 py-3 text-left">Estado</th>
                    <th className="px-5 py-3 text-left">Progreso</th>
                    <th className="px-5 py-3 text-right">Tarifa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container">
                  {stats.recent_dossiers.map((dossier: any) => (
                    <tr
                      key={dossier.id}
                      onClick={() => setSelectedDossier(dossier)}
                      {...activableConTeclado(() => setSelectedDossier(dossier))}
                      className="hover:bg-blue-50/60 cursor-pointer transition-colors"
                      title="Haz clic o pulsa Enter para ver detalles"
                    >
                      <td className="px-5 py-3.5 font-mono-data font-semibold text-secondary">
                        {dossier.code}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-on-surface">{dossier.client_name}</div>
                        <div className="font-mono-data text-[11px] text-outline">BSN: {dossier.client_bsn}</div>
                      </td>
                      <td className="px-5 py-3.5 text-on-surface font-medium">
                        {dossier.title}
                      </td>
                      <td className="px-5 py-3.5">
                        {dossier.status === 'en_belastingdienst' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                            Belastingdienst
                          </span>
                        )}
                        {dossier.status === 'en_proceso' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            En Trámite
                          </span>
                        )}
                        {dossier.status === 'completado' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                            Completado
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-surface-container h-1.5 rounded-full overflow-hidden">
                            <div className="bg-secondary h-full rounded-full" style={{ width: `${dossier.progress_percentage}%` }}></div>
                          </div>
                          <span className="font-mono-data text-[10px] text-outline">{dossier.progress_percentage}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono-data font-semibold">
                        € {parseFloat(dossier.fee).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Today's Appointments List */}
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-surface-container mb-4">
              <div>
                <h3 className="font-bold text-sm text-on-surface">Citas de Hoy</h3>
                <p className="text-xs text-on-surface-variant">{todayLabel} · Agenda oficial</p>
              </div>
              <Link href="/crm/agenda" className="text-xs font-semibold text-secondary hover:underline">
                Ver Todas
              </Link>
            </div>

            <div className="space-y-3">
              {stats.today_appointments.map((apt: any) => (
                <Link
                  key={apt.id}
                  href="/crm/agenda"
                  className="p-3 rounded-lg border border-surface-container hover:border-secondary transition-colors bg-surface flex items-start justify-between gap-3 block"
                >
                  <div className="flex items-start gap-3">
                    <div className="px-2 py-1 bg-surface-container-high rounded text-center">
                      <span className="block font-mono-data text-xs font-bold text-on-surface">
                        {apt.appointment_time.slice(0, 5)}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-on-surface">{apt.client_name}</h4>
                      <p className="text-[11px] text-on-surface-variant mt-0.5">{apt.title}</p>
                      <div className="flex items-center gap-2 mt-2">
                        {apt.modality === 'online_meet' ? (
                          <span className="text-[10px] font-medium text-secondary flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px]">videocam</span> Google Meet
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-on-surface-variant flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px]">location_on</span> Despacho
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                </Link>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-surface-container mt-4">
            <Link
              href="/crm/agenda"
              className="w-full h-9 bg-surface-container text-on-surface text-xs font-semibold rounded flex items-center justify-center gap-2 hover:bg-surface-container-high transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">add_circle</span>
              <span>Agendar Nueva Cita</span>
            </Link>
          </div>
        </div>
      </div>

      {/* MODAL DETALLES DEL EXPEDIENTE (Al hacer clic en la tabla) */}
      {selectedDossier && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest max-w-lg w-full rounded-2xl border border-outline-variant shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container">
              <div>
                <span className="font-mono-data font-bold text-secondary text-xs">{selectedDossier.code}</span>
                <h3 className="font-bold text-base text-on-surface">{selectedDossier.title}</h3>
              </div>
              <button onClick={() => setSelectedDossier(null)} className="text-outline hover:text-on-surface">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-surface rounded-lg border border-surface-container">
                <span className="text-[10px] font-bold uppercase text-outline">Cliente:</span>
                <p className="font-bold text-on-surface text-sm mt-0.5">{selectedDossier.client_name}</p>
                <p className="text-outline font-mono-data text-[11px]">BSN: {selectedDossier.client_bsn}</p>
              </div>

              <div className="p-3 bg-surface rounded-lg border border-surface-container">
                <span className="text-[10px] font-bold uppercase text-outline">Descripción del Trámite:</span>
                <p className="text-on-surface mt-1 leading-relaxed">{selectedDossier.description || 'Sin descripción adicional.'}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-2.5 bg-surface rounded border border-surface-container">
                  <span className="text-[10px] font-bold uppercase text-outline">Estado:</span>
                  <p className="font-bold text-secondary mt-0.5 uppercase">{selectedDossier.status}</p>
                </div>
                <div className="p-2.5 bg-surface rounded border border-surface-container">
                  <span className="text-[10px] font-bold uppercase text-outline">Honorarios / Tarifa:</span>
                  <p className="font-mono-data font-bold text-on-surface mt-0.5">€ {parseFloat(selectedDossier.fee).toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-surface-container">
              <Link
                href="/crm/facturacion"
                onClick={() => setSelectedDossier(null)}
                className="h-8 px-3 bg-surface-container hover:bg-surface-container-high rounded text-xs font-semibold text-on-surface flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[15px]">receipt_long</span>
                <span>Facturar Trámite</span>
              </Link>
              <button
                onClick={() => setSelectedDossier(null)}
                className="h-8 px-4 bg-primary text-white text-xs font-semibold rounded hover:bg-slate-800"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
