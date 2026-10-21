'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';

type Tab = 'Resumen' | 'Pagos' | 'Plan de pagos' | 'Documentos' | 'Notas' | 'Historial';

export default function DeudaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>('Plan de pagos');
  const [notice, setNotice] = useState('');
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('155.00');

  const [debtData, setDebtData] = useState({
    id: id || 'demo-debt-1',
    client_name: 'Cliente demo A',
    initials: 'CD',
    nif: 'CLI-0001',
    client_type: 'Cliente particular',
    creditor: 'Belastingdienst',
    reference: 'DEMO-BEL-2026',
    status: 'Pagando',
    original_amount: 1240.0,
    paid_amount: 620.0,
    pending_amount: 620.0,
    next_due: '15 nov 2026',
    progress: 50,
    paid_installments: 4,
    total_installments: 8,
    private_note: 'Cliente ha solicitado fraccionamiento por dificultades temporales. Mantener seguimiento mensual.',
    created_at: '10 abr 2026',
    updated_at: '12 ago 2026',
    responsible: 'Usuario de prueba',
    tag: 'Fiscalidad',
    observations: '—',
  });

  const [installments] = useState([
    { cuota: '1 / 8', date: '15 may 2026', amount: '€ 155,00', status: 'Pagado', doc: 'Pago_01.pdf' },
    { cuota: '2 / 8', date: '15 jun 2026', amount: '€ 155,00', status: 'Pagado', doc: 'Pago_02.pdf' },
    { cuota: '3 / 8', date: '15 jul 2026', amount: '€ 155,00', status: 'Pagado', doc: 'Pago_03.pdf' },
    { cuota: '4 / 8', date: '15 ago 2026', amount: '€ 155,00', status: 'Pagado', doc: 'Pago_04.pdf' },
    { cuota: '5 / 8', date: '15 sep 2026', amount: '€ 155,00', status: 'Pendiente', doc: '—' },
    { cuota: '6 / 8', date: '15 oct 2026', amount: '€ 155,00', status: 'Pendiente', doc: '—' },
    { cuota: '7 / 8', date: '15 nov 2026', amount: '€ 155,00', status: 'Pendiente', doc: '—' },
    { cuota: '8 / 8', date: '15 dic 2026', amount: '€ 155,00', status: 'Pendiente', doc: '—' },
  ]);

  useEffect(() => {
    if (id && id !== 'demo-client-1') {
      apiFetch(`/finance/debts/${id}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.debt) {
            const d = data.debt;
            const orig = Number(d.original_amount || 1240);
            const paid = Number(d.paid_total ?? d.paid_amount ?? 620);
            setDebtData((prev) => ({
              ...prev,
              client_name: d.client_name || prev.client_name,
              creditor: d.creditor || prev.creditor,
              reference: d.reference || prev.reference,
              status: d.status || prev.status,
              original_amount: orig,
              paid_amount: paid,
              pending_amount: Math.max(0, orig - paid),
              progress: orig > 0 ? Math.round((paid / orig) * 100) : 50,
            }));
          }
        })
        .catch(() => {});
    }
  }, [id]);

  const handleRegisterPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(paymentAmount) || 155;
    setDebtData((prev) => {
      const newPaid = prev.paid_amount + amt;
      const newPending = Math.max(0, prev.original_amount - newPaid);
      return {
        ...prev,
        paid_amount: newPaid,
        pending_amount: newPending,
        progress: Math.min(100, Math.round((newPaid / prev.original_amount) * 100)),
        paid_installments: Math.min(prev.total_installments, prev.paid_installments + 1),
      };
    });
    setRegisterModalOpen(false);
    setNotice(`Pago de € ${amt.toFixed(2)} registrado con éxito.`);
  };

  const tabs: Tab[] = ['Resumen', 'Pagos', 'Plan de pagos', 'Documentos', 'Notas', 'Historial'];

  return (
    <div className="crm-debt-ficha w-full flex flex-col justify-between gap-2 h-full max-h-[calc(100vh-4.6rem)] overflow-hidden text-slate-800">
      {/* 1. Header Bar: Breadcrumb + Titulo + Volver */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/crm/deudas" className="text-slate-500 hover:text-slate-800 font-semibold text-xs transition-colors">
            ← Deudas y pagos
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-slate-600 font-medium text-xs">{debtData.client_name}</span>
          <span className="text-slate-300 mx-1">·</span>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">Ficha de deuda</h1>
          <span className="text-xs text-slate-400">Datos ficticios de staging para validar la interfaz.</span>
        </div>

        <Link
          href="/crm/deudas"
          className="px-3 py-1 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-[#0055D4] text-xs font-semibold flex items-center gap-1 transition-colors shadow-2xs self-start sm:self-auto"
        >
          <span>← Volver a Deudas y pagos</span>
        </Link>
      </div>

      {notice && (
        <div className="px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-xs font-medium text-blue-800 flex items-center justify-between shrink-0">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice('')} className="text-blue-500 hover:text-blue-800 font-bold">✕</button>
        </div>
      )}

      {/* 2. Tarjeta Superior Resumen de la Deuda */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs space-y-3 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          {/* Avatar + Cliente */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 text-[#0055D4] font-bold text-sm flex items-center justify-center shrink-0 border border-blue-200">
              {debtData.initials}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">{debtData.client_name}</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                NIF: <span className="font-mono-data font-semibold text-slate-700">{debtData.nif}</span>
                <span className="mx-2 text-slate-300">|</span>
                Tipo: <span className="text-slate-700 font-medium">{debtData.client_type}</span>
              </p>
            </div>
          </div>

          {/* Metadatos en linea */}
          <div className="flex items-center gap-4 text-xs sm:text-sm">
            <div>
              <span className="text-slate-500 text-xs block font-medium">Acreedor</span>
              <strong className="text-slate-900 font-bold text-xs sm:text-sm">{debtData.creditor}</strong>
            </div>
            <div>
              <span className="text-slate-500 text-xs block font-medium">Referencia</span>
              <strong className="text-slate-900 font-mono-data font-bold text-xs sm:text-sm">{debtData.reference}</strong>
            </div>
            <div>
              <span className="text-slate-500 text-xs block font-medium">Estado</span>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0055D4] border border-blue-200 text-xs font-semibold">
                {debtData.status}
              </span>
            </div>
          </div>
        </div>

        {/* 4 Indicadores Financieros */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          <div className="p-2.5 rounded-xl border border-slate-200 bg-[#fafcff] flex items-center gap-3">
            <span className="material-symbols-outlined text-[22px] text-[#0055D4]">database</span>
            <div>
              <p className="text-xs text-slate-500 font-medium">Importe original</p>
              <p className="text-base sm:text-lg font-bold font-mono-data text-slate-900 leading-tight">
                € {debtData.original_amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <div className="p-2.5 rounded-xl border border-slate-200 bg-[#fafcff] flex items-center gap-3">
            <span className="material-symbols-outlined text-[22px] text-emerald-600">check_circle</span>
            <div>
              <p className="text-xs text-slate-500 font-medium">Total pagado</p>
              <p className="text-base sm:text-lg font-bold font-mono-data text-emerald-600 leading-tight">
                € {debtData.paid_amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <div className="p-2.5 rounded-xl border border-slate-200 bg-[#fafcff] flex items-center gap-3">
            <span className="material-symbols-outlined text-[22px] text-rose-600">schedule</span>
            <div>
              <p className="text-xs text-slate-500 font-medium">Importe pendiente</p>
              <p className="text-base sm:text-lg font-bold font-mono-data text-rose-600 leading-tight">
                € {debtData.pending_amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <div className="p-2.5 rounded-xl border border-slate-200 bg-[#fafcff] flex items-center gap-3">
            <span className="material-symbols-outlined text-[22px] text-slate-600">calendar_today</span>
            <div>
              <p className="text-xs text-slate-500 font-medium">Próximo vencimiento</p>
              <p className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                {debtData.next_due}
              </p>
            </div>
          </div>
        </div>

        {/* Barra de progreso */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <span className="font-semibold text-slate-700">Progreso de pago</span>
            <div className="flex items-center gap-2">
              <strong className="text-slate-900 font-bold">{debtData.progress}%</strong>
              <span className="text-xs text-slate-500">
                ({debtData.paid_installments} de {debtData.total_installments} cuotas pagadas)
              </span>
            </div>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full rounded-full bg-[#0055D4]" style={{ width: `${debtData.progress}%` }} />
          </div>
        </div>
      </div>

      {/* 3. Tabs Strip */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-200 shrink-0">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-3.5 py-2 text-xs sm:text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
              tab === t
                ? 'border-[#0055D4] text-[#0055D4]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* 4. Grid Principal: 2 Columnas con scroll interno */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-2.5 overflow-hidden">
        {/* COLUMNA IZQUIERDA (8 cols): Plan de pagos con tabla scrollable interna */}
        <div className="lg:col-span-8 h-full flex flex-col bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between bg-[#fafcff] shrink-0">
            <div>
              <h3 className="text-sm font-bold text-slate-900">{tab}</h3>
              <p className="text-xs text-slate-500">{tab === 'Plan de pagos' ? 'Calendario de cuotas previsto para la deuda.' : `Información de ${tab.toLowerCase()} de la deuda.`}</p>
            </div>
            {tab === 'Plan de pagos' && <button
              type="button"
              onClick={() => setNotice('La vista de calendario se abrirá cuando el calendario esté conectado al expediente.')}
              className="px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-[#0055D4] text-xs font-semibold flex items-center gap-1.5 hover:bg-blue-100 transition-colors"
            >
              <span className="material-symbols-outlined text-[15px]">calendar_month</span>
              <span>Vista de calendario</span>
            </button>}
          </div>

          {tab === 'Plan de pagos' || tab === 'Pagos' ? <div className="flex-1 overflow-y-auto no-scrollbar">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-[#f8fafc] text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-2.5">Cuota</th>
                  <th className="px-4 py-2.5">Vencimiento</th>
                  <th className="px-4 py-2.5 text-right">Importe</th>
                  <th className="px-4 py-2.5 text-center">Estado</th>
                  <th className="px-4 py-2.5">Comprobante</th>
                  <th className="px-3 py-2.5 text-center w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {installments.map((item) => (
                  <tr key={item.cuota} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2.5 font-semibold text-slate-800">{item.cuota}</td>
                    <td className="px-4 py-2.5 text-slate-600">{item.date}</td>
                    <td className="px-4 py-2.5 text-right font-mono-data font-bold text-slate-900">{item.amount}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                          item.status === 'Pagado'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {item.status === 'Pagado' ? '✓ Pagado' : '◷ Pendiente'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      {item.doc !== '—' ? (
                        <span className="inline-flex items-center gap-1 text-[#0055D4] hover:underline cursor-pointer font-medium">
                          <span className="material-symbols-outlined text-[15px]">description</span>
                          {item.doc}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center text-slate-400">
                      <button
                        type="button"
                        onClick={() => setNotice(`Opciones para la cuota ${item.cuota}`)}
                        className="p-1 rounded hover:bg-slate-100 text-slate-500"
                        title="Opciones"
                      >
                        <span className="material-symbols-outlined text-[16px]">more_vert</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div> : <div className="flex-1 overflow-y-auto p-5">
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
              <p className="font-semibold text-slate-900">{tab}</p>
              <p className="mt-1">Esta sección ya está conectada a la pestaña seleccionada. Aquí se mostrarán los registros de {tab.toLowerCase()} asociados a esta deuda.</p>
              <button type="button" onClick={() => setNotice(`Acción de ${tab.toLowerCase()} preparada para esta deuda.`)} className="mt-4 rounded-lg bg-[#0055D4] px-3 py-2 text-xs font-semibold text-white hover:bg-[#0047b3]">Añadir registro</button>
            </div>
          </div>}
        </div>

        {/* COLUMNA DERECHA (4 cols): Acciones + Notas + Información adicional */}
        <div className="lg:col-span-4 h-full flex flex-col gap-2.5 overflow-y-auto no-scrollbar pr-1">
          {/* Card Acciones */}
          <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900 mb-2.5">Acciones Rápidas</h3>
            <div className="grid gap-2">
              <button
                type="button"
                onClick={() => setRegisterModalOpen(true)}
                className="w-full py-2.5 rounded-lg bg-[#0055D4] hover:bg-[#0047b3] text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-colors shadow-2xs"
              >
                <span className="font-mono text-sm font-bold">€</span>
                <span>Registrar pago</span>
              </button>

              <button
                type="button"
                onClick={() => setNotice('Formulario para crear aplazamiento listo.')}
                className="w-full py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[#0055D4] text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                <span>Crear aplazamiento</span>
              </button>

              <button
                type="button"
                onClick={() => setNotice('Selector de archivos listo para adjuntar comprobante.')}
                className="w-full py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[#0055D4] text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">attach_file</span>
                <span>Adjuntar comprobante</span>
              </button>

              <button
                type="button"
                onClick={() => setNotice('Editor de deuda disponible en staging.')}
                className="w-full py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[#0055D4] text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">edit</span>
                <span>Editar deuda</span>
              </button>
            </div>
          </div>

          {/* Card Notas privadas */}
          <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900 mb-2 pb-1.5 border-b border-slate-100 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-slate-500">description</span>
              Notas privadas
            </h3>
            <div className="bg-amber-50/80 border border-amber-200 rounded-lg p-2.5 text-xs sm:text-sm text-slate-800 leading-relaxed mb-2.5">
              {debtData.private_note}
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Equipo interno</span>
              <button
                type="button"
                onClick={() => setNotice('Nota guardada correctamente.')}
                className="px-3 py-1.5 rounded-lg bg-[#0055D4] hover:bg-[#0047b3] text-white text-xs font-semibold transition-colors shadow-2xs"
              >
                Guardar nota
              </button>
            </div>
          </div>

          {/* Card Información adicional */}
          <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900 mb-2 pb-1.5 border-b border-slate-100 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-slate-500">info</span>
              Información adicional
            </h3>
            <dl className="space-y-1.5 text-xs sm:text-sm">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <dt className="text-slate-500 font-medium">Alta</dt>
                <dd className="font-semibold text-slate-800">{debtData.created_at}</dd>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <dt className="text-slate-500 font-medium">Actualización</dt>
                <dd className="font-semibold text-slate-800">{debtData.updated_at}</dd>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <dt className="text-slate-500 font-medium">Responsable</dt>
                <dd className="font-semibold text-slate-800">{debtData.responsible}</dd>
              </div>
              <div className="flex justify-between items-center py-1">
                <dt className="text-slate-500 font-medium">Etiquetas</dt>
                <dd>
                  <span className="px-2 py-0.5 rounded-full bg-blue-50 text-[#0055D4] border border-blue-200 text-xs font-semibold">
                    {debtData.tag}
                  </span>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* Modal Registrar Pago */}
      {registerModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-4 border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#0055D4] text-[18px]">payments</span>
                Registrar pago de cuota
              </h3>
              <button
                type="button"
                onClick={() => setRegisterModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRegisterPaymentSubmit} className="space-y-3 mt-3 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-0.5 text-[11px]">Importe (€)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-900 font-mono-data font-semibold text-sm focus:outline-none focus:border-[#0055D4]"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-0.5 text-[11px]">Método</label>
                <select className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-[#0055D4]">
                  <option>Transferencia bancaria</option>
                  <option>Domiciliación SEPA</option>
                  <option>Tarjeta / iDEAL</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRegisterModalOpen(false)}
                  className="px-2.5 py-1 rounded border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1 rounded bg-[#0055D4] hover:bg-[#0047b3] text-white font-semibold shadow-xs"
                >
                  Confirmar pago
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
