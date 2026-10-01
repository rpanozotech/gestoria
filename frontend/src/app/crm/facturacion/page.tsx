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

  // Catálogo de Servicios y Trámites
  const [servicesCatalog] = useState([
    { id: '1', title: 'Declaración Fiscal M-Form', category: 'Fiscalidad / Belastingdienst', defaultFee: 180.00 },
    { id: '2', title: 'Activación DigiD + Zorgtoeslag', category: 'Subsidios / Toeslagen', defaultFee: 85.00 },
    { id: '3', title: 'Solicitud Subsidio Huurtoeslag (Alquiler)', category: 'Subsidios / Toeslagen', defaultFee: 95.00 },
    { id: '4', title: 'Alta Eenmanszaak KVK y BTW-nummer', category: 'Empresas / KVK', defaultFee: 250.00 },
    { id: '5', title: 'Recurso Bezwaarschrift Belastingdienst', category: 'Legal / Recursos', defaultFee: 120.00 },
    { id: '6', title: 'Kindgebonden Budget (Ayuda Hijos)', category: 'Subsidios / Toeslagen', defaultFee: 80.00 },
    { id: '7', title: 'Cambio de Cuenta Bancaria Belastingdienst', category: 'Gestión Administrativa', defaultFee: 45.00 },
  ]);

  // Modal para crear nuevo presupuesto (Multi-trámite)
  const [showNewQuoteModal, setShowNewQuoteModal] = useState(false);
  const [newQuoteClient, setNewQuoteClient] = useState('Maria Popescu');
  const [selectedQuoteServiceIds, setSelectedQuoteServiceIds] = useState<string[]>(['1']);
  const [customQuoteFees, setCustomQuoteFees] = useState<{ [id: string]: number }>({});
  const [quoteConcept, setQuoteConcept] = useState('Declaración Fiscal M-Form');
  const [isConceptManuallyEdited, setIsConceptManuallyEdited] = useState(false);
  const [quoteValidUntil, setQuoteValidUntil] = useState('2026-11-30');

  // Helpers para presupuestos multi-trámite
  const getSelectedQuoteItems = () => {
    return servicesCatalog
      .filter((s) => selectedQuoteServiceIds.includes(s.id))
      .map((s) => ({
        id: s.id,
        title: s.title,
        category: s.category,
        fee: customQuoteFees[s.id] !== undefined ? customQuoteFees[s.id] : s.defaultFee,
      }));
  };

  const quoteSubtotal = getSelectedQuoteItems().reduce((acc, item) => acc + item.fee, 0);
  const quoteTax = Math.round(quoteSubtotal * 0.21 * 100) / 100;
  const quoteTotal = Math.round((quoteSubtotal + quoteTax) * 100) / 100;

  const toggleQuoteService = (serviceId: string) => {
    let nextIds: string[];
    if (selectedQuoteServiceIds.includes(serviceId)) {
      nextIds = selectedQuoteServiceIds.filter((id) => id !== serviceId);
    } else {
      nextIds = [...selectedQuoteServiceIds, serviceId];
    }
    setSelectedQuoteServiceIds(nextIds);

    if (!isConceptManuallyEdited) {
      const selectedTitles = servicesCatalog
        .filter((s) => nextIds.includes(s.id))
        .map((s) => s.title);
      setQuoteConcept(selectedTitles.join(' + '));
    }
  };

  const handleSelectAllQuoteServices = () => {
    const allIds = servicesCatalog.map((s) => s.id);
    setSelectedQuoteServiceIds(allIds);
    if (!isConceptManuallyEdited) {
      setQuoteConcept(servicesCatalog.map((s) => s.title).join(' + '));
    }
  };

  const handleClearQuoteServices = () => {
    setSelectedQuoteServiceIds([]);
    if (!isConceptManuallyEdited) {
      setQuoteConcept('');
    }
  };

  const handleCustomFeeChange = (serviceId: string, val: number) => {
    setCustomQuoteFees((prev) => ({ ...prev, [serviceId]: val }));
  };

  const openQuoteModal = () => {
    const initialIds = selectedQuoteServiceIds.length > 0 ? selectedQuoteServiceIds : ['1'];
    setSelectedQuoteServiceIds(initialIds);
    setIsConceptManuallyEdited(false);
    const selectedTitles = servicesCatalog.filter((s) => initialIds.includes(s.id)).map((s) => s.title);
    setQuoteConcept(selectedTitles.join(' + '));
    setShowNewQuoteModal(true);
  };

  const handleCreateQuote = (e: React.FormEvent) => {
    e.preventDefault();
    const items = getSelectedQuoteItems();
    if (items.length === 0 && !quoteConcept.trim()) return;

    const count = quotes.length + 1;
    const code = `PRE-2026-${String(count).padStart(4, '0')}`;
    const subtotal = quoteSubtotal;
    const tax_amount = quoteTax;
    const total = quoteTotal;

    const clientBsnMap: Record<string, string> = {
      'Maria Popescu': '982145672',
      'Carlos Mendoza Ruiz': '817293845',
      'Elena Morales Castillo': '639102847',
      'Lars Van Dijk': '728194028',
    };

    const newQ = {
      id: String(Date.now()),
      code,
      client_name: newQuoteClient,
      client_bsn: clientBsnMap[newQuoteClient] || '982145672',
      subtotal,
      tax_amount,
      total,
      status: 'enviado',
      valid_until: quoteValidUntil,
      items: items.length > 0
        ? items.map((i) => ({ description: i.title, total: i.fee }))
        : [{ description: quoteConcept, total: subtotal }],
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
          onClick={openQuoteModal}
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
                    {q.items && q.items.length > 1 ? (
                      <div className="space-y-1">
                        <span className="font-semibold text-on-surface">
                          {q.items.length} trámites seleccionados
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {q.items.map((it: any, idx: number) => (
                            <span key={idx} className="inline-flex items-center gap-0.5 text-[10px] bg-surface-container px-1.5 py-0.5 rounded text-outline font-normal">
                              {it.description}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <span>{q.items?.[0]?.description || 'Servicios Gestoría'}</span>
                    )}
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

      {/* Modal Nuevo Presupuesto Multi-trámite */}
      {showNewQuoteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateQuote}
            className="bg-surface-container-lowest max-w-2xl w-full rounded-2xl border border-outline-variant shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-in zoom-in-95"
          >
            <div className="flex items-center justify-between pb-3 border-b border-surface-container">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-secondary flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">request_quote</span>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-on-surface">Crear Presupuesto PRE-2026</h3>
                  <p className="text-[11px] text-on-surface-variant">
                    Selección múltiple de trámites del catálogo con cálculo fiscal automático
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNewQuoteModal(false)}
                className="text-outline hover:text-on-surface p-1 rounded-md hover:bg-surface-container"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Cliente */}
              <div>
                <label className="block text-outline uppercase font-semibold mb-1">Cliente Destinatario</label>
                <select
                  value={newQuoteClient}
                  onChange={(e) => setNewQuoteClient(e.target.value)}
                  className="w-full h-9 px-3 border border-outline-variant rounded-lg bg-surface font-medium focus:border-secondary focus:outline-none"
                >
                  <option>Maria Popescu</option>
                  <option>Carlos Mendoza Ruiz</option>
                  <option>Elena Morales Castillo</option>
                  <option>Lars Van Dijk</option>
                </select>
              </div>

              {/* Selector Multi-trámite */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-outline uppercase font-semibold flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[15px] text-secondary">checklist</span>
                    <span>Trámites Disponibles ({selectedQuoteServiceIds.length} seleccionados)</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllQuoteServices}
                      className="text-[11px] text-secondary font-semibold hover:underline"
                    >
                      Seleccionar todos
                    </button>
                    <span className="text-outline">·</span>
                    <button
                      type="button"
                      onClick={handleClearQuoteServices}
                      className="text-[11px] text-outline font-semibold hover:underline"
                    >
                      Deseleccionar todos
                    </button>
                  </div>
                </div>

                {/* Grid de trámites del catálogo */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1 border border-outline-variant/60 rounded-xl bg-surface">
                  {servicesCatalog.map((s) => {
                    const isSelected = selectedQuoteServiceIds.includes(s.id);
                    return (
                      <div
                        key={s.id}
                        onClick={() => toggleQuoteService(s.id)}
                        className={`cursor-pointer p-2.5 rounded-lg border transition-all flex items-start gap-2.5 ${
                          isSelected
                            ? 'border-secondary bg-blue-50/70 dark:bg-blue-950/25 shadow-xs'
                            : 'border-surface-container bg-surface-container-lowest hover:border-outline-variant hover:bg-surface-container-low'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="mt-0.5 rounded text-secondary focus:ring-secondary cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold leading-tight text-xs ${isSelected ? 'text-secondary font-bold' : 'text-on-surface'}`}>
                            {s.title}
                          </p>
                          <div className="flex items-center justify-between mt-1 text-[10px]">
                            <span className="text-outline truncate">{s.category}</span>
                            <span className="font-mono-data font-bold text-on-surface">€ {s.defaultFee.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Trámites seleccionados con ajuste de honorarios */}
              {selectedQuoteServiceIds.length > 0 && (
                <div className="p-3 bg-surface-container-low/70 rounded-xl border border-surface-container space-y-2">
                  <span className="font-bold text-[11px] text-on-surface uppercase tracking-wider block">
                    Desglose de Trámites a Facturar ({selectedQuoteServiceIds.length}):
                  </span>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {getSelectedQuoteItems().map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-3 bg-surface-container-lowest p-2 rounded-lg border border-outline-variant/40"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="material-symbols-outlined text-[14px] text-emerald-600">check_circle</span>
                          <span className="font-medium text-xs text-on-surface truncate">{item.title}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-outline font-mono-data">€</span>
                          <input
                            type="number"
                            min="0"
                            step="5"
                            value={item.fee}
                            onChange={(e) => handleCustomFeeChange(item.id, parseFloat(e.target.value) || 0)}
                            className="w-20 h-7 px-2 border border-outline-variant rounded bg-surface font-mono-data font-bold text-right text-xs focus:border-secondary focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => toggleQuoteService(item.id)}
                            className="text-outline hover:text-red-500 p-1"
                            title="Quitar de este presupuesto"
                          >
                            <span className="material-symbols-outlined text-[15px]">close</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Concepto Vinculado */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-outline uppercase font-semibold">Concepto Global del Presupuesto</label>
                  {isConceptManuallyEdited && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsConceptManuallyEdited(false);
                        const titles = servicesCatalog
                          .filter((s) => selectedQuoteServiceIds.includes(s.id))
                          .map((s) => s.title);
                        setQuoteConcept(titles.join(' + '));
                      }}
                      className="text-[10px] text-secondary hover:underline flex items-center gap-0.5"
                    >
                      <span className="material-symbols-outlined text-[12px]">refresh</span>
                      <span>Restablecer desde trámites</span>
                    </button>
                  )}
                </div>
                <textarea
                  rows={2}
                  required
                  value={quoteConcept}
                  onChange={(e) => {
                    setQuoteConcept(e.target.value);
                    setIsConceptManuallyEdited(true);
                  }}
                  placeholder="Se genera automáticamente a partir de los trámites seleccionados..."
                  className="w-full p-2.5 border border-outline-variant rounded-lg bg-surface text-xs focus:border-secondary focus:outline-none"
                />
                <p className="text-[10px] text-outline mt-0.5">
                  Este concepto aparecerá en el desglose oficial del presupuesto y en la factura fiscal correlativa.
                </p>
              </div>

              {/* Resumen Económico */}
              <div className="p-3.5 bg-surface-container-low rounded-xl font-mono-data text-xs space-y-1.5 border border-surface-container">
                <div className="flex justify-between text-outline">
                  <span>Base Imponible ({selectedQuoteServiceIds.length} trámites):</span>
                  <span className="font-semibold text-on-surface">€ {quoteSubtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-outline">
                  <span>21% BTW (IVA Neerlandés):</span>
                  <span className="font-semibold text-on-surface">€ {quoteTax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-secondary pt-2 border-t border-surface-container">
                  <span>Total Presupuestado (BTW incl.):</span>
                  <span>€ {quoteTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Fecha de Validez */}
              <div>
                <label className="block text-outline uppercase font-semibold mb-1">Válido Hasta</label>
                <input
                  type="date"
                  value={quoteValidUntil}
                  onChange={(e) => setQuoteValidUntil(e.target.value)}
                  className="w-full h-9 px-3 border border-outline-variant rounded-lg bg-surface font-mono-data focus:border-secondary focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-surface-container">
              <button
                type="button"
                onClick={() => setShowNewQuoteModal(false)}
                className="h-9 px-4 border border-outline-variant rounded-lg text-xs font-semibold hover:bg-surface-container"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={selectedQuoteServiceIds.length === 0 && !quoteConcept.trim()}
                className="h-9 px-5 bg-secondary text-white rounded-lg text-xs font-semibold hover:bg-blue-700 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">check</span>
                <span>Generar Presupuesto (€ {quoteTotal.toFixed(2)})</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
