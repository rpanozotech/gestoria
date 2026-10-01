'use client';

import React, { useState, useEffect } from 'react';

export default function CRMFacturacionPage() {
  const [tab, setTab] = useState<'facturas' | 'presupuestos'>('facturas');

  const [quotes, setQuotes] = useState<any[]>([
    {
      id: '1',
      code: 'PRE-2026-0001',
      client_name: 'Carlos Mendoza Ruiz',
      client_bsn: '817293845',
      subtotal: 220.00,
      tax_amount: 46.20,
      total: 266.20,
      status: 'convertido',
      valid_until: '2026-10-30',
      items: [
        { description: 'Elaboración y Presentación Fiscal M-Form Belastingdienst', total: 180.00 },
        { description: 'Revisión documentación de ingresos en origen', total: 40.00 },
      ],
    },
    {
      id: '2',
      code: 'PRE-2026-0002',
      client_name: 'Elena Morales Castillo',
      client_bsn: '639102847',
      subtotal: 120.00,
      tax_amount: 25.20,
      total: 145.20,
      status: 'enviado',
      valid_until: '2026-11-15',
      items: [
        { description: 'Gestión Subsidio Alquiler (Huurtoeslag) + Notificación de Renta', total: 120.00 },
      ],
    },
  ]);

  const [invoices, setInvoices] = useState<any[]>([
    {
      id: '1',
      code: 'FAC-2026-0001',
      client_name: 'Carlos Mendoza Ruiz',
      client_bsn: '817293845',
      total: 266.20,
      status: 'pagada',
      payment_method: 'ideal',
      payment_reference: 'IDL-TRX-2026-89472',
      due_date: '2026-10-15',
      items: [
        { description: 'Elaboración y Presentación Fiscal M-Form Belastingdienst', total: 180.00 },
        { description: 'Revisión documentación de ingresos en origen', total: 40.00 },
      ],
    },
    {
      id: '2',
      code: 'FAC-2026-0002',
      client_name: 'Maria Popescu',
      client_bsn: '982145672',
      total: 102.85,
      status: 'emitida',
      payment_method: 'ideal',
      due_date: '2026-10-12',
      items: [
        { description: 'Gestión Solicitud Zorgtoeslag y Registro Belastingdienst', total: 85.00 },
      ],
    },
  ]);

  // Modal para crear nuevo presupuesto
  const [showNewQuoteModal, setShowNewQuoteModal] = useState(false);
  const [newQuoteClient, setNewQuoteClient] = useState('Maria Popescu');
  const [newQuoteDesc, setNewQuoteDesc] = useState('Declaración Fiscal M-Form 2026');
  const [newQuoteAmount, setNewQuoteAmount] = useState<number>(180);

  const handleCreateQuote = (e: React.FormEvent) => {
    e.preventDefault();
    const count = quotes.length + 1;
    const code = `PRE-2026-${String(count).padStart(4, '0')}`;
    const subtotal = newQuoteAmount;
    const tax_amount = Math.round(subtotal * 0.21 * 100) / 100;
    const total = Math.round((subtotal + tax_amount) * 100) / 100;

    const newQ = {
      id: String(Date.now()),
      code,
      client_name: newQuoteClient,
      client_bsn: '982145672',
      subtotal,
      tax_amount,
      total,
      status: 'enviado',
      valid_until: '2026-11-30',
      items: [{ description: newQuoteDesc, total: subtotal }],
    };

    setQuotes([newQ, ...quotes]);
    setShowNewQuoteModal(false);
    setTab('presupuestos');
  };

  // Convertir presupuesto a factura correlativa
  const handleConvertToInvoice = (quote: any) => {
    const nextNum = invoices.length + 1;
    const invoiceCode = `FAC-2026-${String(nextNum).padStart(4, '0')}`;

    const newInvoice = {
      id: String(Date.now()),
      code: invoiceCode,
      client_name: quote.client_name,
      client_bsn: quote.client_bsn,
      total: quote.total,
      status: 'emitida',
      payment_method: 'ideal',
      due_date: '2026-10-25',
      items: quote.items,
    };

    setInvoices([newInvoice, ...invoices]);
    // Actualizar estado del presupuesto a 'convertido'
    setQuotes(quotes.map((q) => (q.id === quote.id ? { ...q, status: 'convertido' } : q)));
    setTab('facturas');
  };

  // Registrar cobro iDEAL
  const handleMarkAsPaid = (invoiceId: string) => {
    setInvoices(
      invoices.map((inv) =>
        inv.id === invoiceId
          ? {
              ...inv,
              status: 'pagada',
              payment_reference: `IDL-PAY-${Math.floor(100000 + Math.random() * 900000)}`,
            }
          : inv
      )
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-surface-container">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-on-surface">Presupuestos y Facturación</h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Numeración correlativa legal PRE-2026 y FAC-2026 · IVA 21% BTW · Pasarela iDEAL
          </p>
        </div>

        <button
          onClick={() => setShowNewQuoteModal(true)}
          className="h-9 px-4 bg-secondary text-white text-xs font-semibold rounded-md shadow-sm hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          <span>+ Nuevo Presupuesto</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-surface-container gap-4">
        <button
          onClick={() => setTab('facturas')}
          className={`pb-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
            tab === 'facturas' ? 'border-secondary text-secondary' : 'border-transparent text-outline hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">receipt_long</span>
          <span>Facturas Oficiales ({invoices.length})</span>
        </button>
        <button
          onClick={() => setTab('presupuestos')}
          className={`pb-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
            tab === 'presupuestos' ? 'border-secondary text-secondary' : 'border-transparent text-outline hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">description</span>
          <span>Presupuestos ({quotes.length})</span>
        </button>
      </div>

      {/* TAB FACTURAS */}
      {tab === 'facturas' && (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-container-low text-outline font-semibold uppercase tracking-wider border-b border-surface-container">
              <tr>
                <th className="px-5 py-3">Nº Factura</th>
                <th className="px-5 py-3">Cliente / BSN</th>
                <th className="px-5 py-3">Concepto Principal</th>
                <th className="px-5 py-3">Estado de Pago</th>
                <th className="px-5 py-3">Vencimiento</th>
                <th className="px-5 py-3 text-right">Total (Inc. BTW)</th>
                <th className="px-5 py-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-surface-container-low transition-colors">
                  <td className="px-5 py-3.5 font-mono-data font-bold text-secondary">
                    {inv.code}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="font-semibold text-on-surface">{inv.client_name}</div>
                    <div className="text-[11px] text-outline font-mono-data">BSN: {inv.client_bsn}</div>
                  </td>
                  <td className="px-5 py-3.5 text-on-surface-variant font-medium">
                    {inv.items[0]?.description || 'Servicios Fiscales Gestoría'}
                  </td>
                  <td className="px-5 py-3.5">
                    {inv.status === 'pagada' ? (
                      <div>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Pagada (iDEAL)
                        </span>
                        <div className="text-[10px] text-outline font-mono-data mt-0.5">{inv.payment_reference}</div>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Pendiente de Cobro
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 font-mono-data text-outline">
                    {inv.due_date}
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono-data font-bold text-sm text-on-surface">
                    € {inv.total.toFixed(2)}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {inv.status !== 'pagada' && (
                      <button
                        onClick={() => handleMarkAsPaid(inv.id)}
                        className="h-7 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold transition-colors"
                      >
                        Registrar Cobro iDEAL
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB PRESUPUESTOS */}
      {tab === 'presupuestos' && (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-container-low text-outline font-semibold uppercase tracking-wider border-b border-surface-container">
              <tr>
                <th className="px-5 py-3">Nº Presupuesto</th>
                <th className="px-5 py-3">Cliente</th>
                <th className="px-5 py-3">Detalle</th>
                <th className="px-5 py-3">Estado</th>
                <th className="px-5 py-3">Válido Hasta</th>
                <th className="px-5 py-3 text-right">Importe Total</th>
                <th className="px-5 py-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {quotes.map((q) => (
                <tr key={q.id} className="hover:bg-surface-container-low transition-colors">
                  <td className="px-5 py-3.5 font-mono-data font-bold text-primary">
                    {q.code}
                  </td>
                  <td className="px-5 py-3.5 font-semibold text-on-surface">
                    {q.client_name}
                  </td>
                  <td className="px-5 py-3.5 text-on-surface-variant font-medium">
                    {q.items[0]?.description}
                  </td>
                  <td className="px-5 py-3.5">
                    {q.status === 'convertido' ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700">
                        Convertido a Factura
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                        Enviado al Cliente
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 font-mono-data text-outline">
                    {q.valid_until}
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono-data font-bold text-sm">
                    € {q.total.toFixed(2)}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {q.status !== 'convertido' && (
                      <button
                        onClick={() => handleConvertToInvoice(q)}
                        className="h-7 px-3 bg-secondary hover:bg-blue-700 text-white rounded text-[11px] font-semibold transition-colors inline-flex items-center gap-1 shadow-sm"
                      >
                        <span className="material-symbols-outlined text-[13px]">transform</span>
                        <span>Convertir a Factura</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Nuevo Presupuesto */}
      {showNewQuoteModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateQuote}
            className="bg-surface-container-lowest max-w-md w-full rounded-2xl border border-outline-variant shadow-2xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-surface-container">
              <h3 className="font-bold text-base text-on-surface">Crear Presupuesto PRE-2026</h3>
              <button type="button" onClick={() => setShowNewQuoteModal(false)} className="text-outline hover:text-on-surface">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-outline uppercase font-semibold mb-1">Cliente</label>
                <select
                  value={newQuoteClient}
                  onChange={(e) => setNewQuoteClient(e.target.value)}
                  className="w-full h-9 px-3 border border-outline-variant rounded bg-surface focus:border-secondary focus:outline-none"
                >
                  <option>Maria Popescu</option>
                  <option>Carlos Mendoza Ruiz</option>
                  <option>Elena Morales Castillo</option>
                  <option>Lars Van Dijk</option>
                </select>
              </div>

              <div>
                <label className="block text-outline uppercase font-semibold mb-1">Concepto / Servicio</label>
                <input
                  type="text"
                  required
                  value={newQuoteDesc}
                  onChange={(e) => setNewQuoteDesc(e.target.value)}
                  className="w-full h-9 px-3 border border-outline-variant rounded bg-surface focus:border-secondary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-outline uppercase font-semibold mb-1">Base Imponible (€)</label>
                <input
                  type="number"
                  required
                  value={newQuoteAmount}
                  onChange={(e) => setNewQuoteAmount(parseFloat(e.target.value) || 0)}
                  className="w-full h-9 px-3 border border-outline-variant rounded bg-surface font-mono-data font-semibold focus:border-secondary focus:outline-none"
                />
              </div>

              <div className="p-3 bg-surface-container-low rounded-lg font-mono-data text-xs space-y-1">
                <div className="flex justify-between text-outline">
                  <span>Base:</span>
                  <span>€ {newQuoteAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-outline">
                  <span>21% BTW (NL):</span>
                  <span>€ {(newQuoteAmount * 0.21).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-on-surface pt-1 border-t border-surface-container">
                  <span>Total Presupuesto:</span>
                  <span>€ {(newQuoteAmount * 1.21).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewQuoteModal(false)}
                className="h-9 px-4 border border-outline-variant rounded text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="h-9 px-5 bg-secondary text-white rounded text-xs font-semibold hover:bg-blue-700"
              >
                Generar Presupuesto
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
