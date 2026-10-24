'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { activableConTeclado } from '@/lib/a11y';

// Normaliza una factura que llega de Postgres para la vista.
// `total` y el resto de importes son DECIMAL y el driver pg los devuelve
// como string ("266.20"), no como numero. La tabla hace toFixed(2), que
// fallaria en un string. `items` es una columna JSONB y llega como texto,
// no como array. Sin esto, cargar datos reales rompe la pantalla.
function formatInvoiceDate(value: unknown) {
  if (!value) return 'Pendiente';
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function normalizarFactura(inv: any) {
  let items: any[] = [];
  if (Array.isArray(inv.items)) {
    items = inv.items;
  } else if (typeof inv.items === 'string') {
    try {
      const parseado = JSON.parse(inv.items);
      items = Array.isArray(parseado) ? parseado : [];
    } catch {
      items = [];
    }
  }

  const numero = (v: any) => (v === null || v === undefined ? 0 : Number(v));

  return {
    ...inv,
    items,
    total: numero(inv.total),
    subtotal: numero(inv.subtotal),
    tax_amount: numero(inv.tax_amount),
    tax_rate: numero(inv.tax_rate),
  };
}

function normalizarPresupuesto(quote: any) {
  let items: any[] = [];
  if (Array.isArray(quote?.items)) items = quote.items;
  else if (typeof quote?.items === 'string') {
    try {
      const parsed = JSON.parse(quote.items);
      items = Array.isArray(parsed) ? parsed : [];
    } catch { items = []; }
  }
  return {
    ...quote,
    items,
    subtotal: Number(quote?.subtotal || 0),
    tax_amount: Number(quote?.tax_amount || 0),
    tax_rate: Number(quote?.tax_rate || 21),
    total: Number(quote?.total || 0),
  };
}

export default function CRMFacturacionPage() {
  const [tab, setTab] = useState<'facturas' | 'presupuestos'>('facturas');

  const [quotes, setQuotes] = useState<any[]>([]);

  const [invoices, setInvoices] = useState<any[]>([]);

  // Las facturas vienen del backend. Antes esta pagina usaba un array fijo
  // escrito en el codigo, asi que los botones de eliminar no tenian contra
  // que trabajar: el id '1' no existia en la base de datos.
  const [cargandoFacturas, setCargandoFacturas] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  const cargarFacturacion = async () => {
    setCargandoFacturas(true);
    setErrorCarga(null);
    try {
      const [invoicesResponse, quotesResponse] = await Promise.all([
        apiFetch('/invoices'),
        apiFetch('/quotes'),
      ]);
      const [invoicesData, quotesData] = await Promise.all([
        invoicesResponse.json().catch(() => ({})),
        quotesResponse.json().catch(() => ({})),
      ]);
      if (!invoicesResponse.ok) throw new Error(invoicesData?.error || 'No se pudieron cargar las facturas.');
      if (!quotesResponse.ok) throw new Error(quotesData?.error || 'No se pudieron cargar los presupuestos.');
      setInvoices(Array.isArray(invoicesData?.invoices) ? invoicesData.invoices.map(normalizarFactura) : []);
      setQuotes(Array.isArray(quotesData?.quotes) ? quotesData.quotes.map(normalizarPresupuesto) : []);
    } catch (error) {
      setErrorCarga(error instanceof Error ? error.message : 'No se pudo cargar la facturación desde PostgreSQL.');
    } finally {
      setCargandoFacturas(false);
    }
  };

  useEffect(() => {
    let cancelado = false;
    void cargarFacturacion();

    return () => {
      cancelado = true;
    };
  }, []);

  // Catálogo de Servicios y Trámites
  const [servicesCatalog, setServicesCatalog] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [companySettings, setCompanySettings] = useState<any>({ commercial_name: 'RP Asesoría', legal_name: '', description: '', address: '', city: '', country: 'Países Bajos', kvk: '', vat_id: '', iban: '', email: '', phone: '', footer_text: '' });

  useEffect(() => {
    apiFetch('/services').then((res) => res.ok ? res.json() : Promise.reject(new Error('services'))).then((data) => setServicesCatalog((data.services || []).map((service: any) => ({ id: String(service.id), title: service.title, category: service.category, defaultFee: Number(service.priceFinal ?? service.basePrice) || 0, taxRate: Number(service.btwRate ?? 0.21) * (Number(service.btwRate ?? 0.21) < 1 ? 100 : 1) })))).catch(() => setServicesCatalog([]));
  }, []);

  useEffect(() => {
    apiFetch('/clients').then((res) => res.ok ? res.json() : Promise.reject(new Error('clients'))).then((data) => setClients(Array.isArray(data.clients) ? data.clients : [])).catch(() => setClients([]));
  }, []);

  useEffect(() => {
    apiFetch('/company-settings').then((res) => res.ok ? res.json() : Promise.reject(new Error('company-settings'))).then((data) => setCompanySettings((current) => ({ ...current, ...(data.settings || {}) }))).catch(() => undefined);
  }, []);

  // Visualizador oficial de presupuestos y facturas
  const [selectedDoc, setSelectedDoc] = useState<{ type: 'quote' | 'invoice'; data: any } | null>(null);
  const [editingQuote, setEditingQuote] = useState<any | null>(null);
  const [editReason, setEditReason] = useState('');
  const openQuoteEditor = (quote: any) => setEditingQuote({ ...normalizarPresupuesto(quote), items: (quote.items || []).map((item: any) => ({ ...item, quantity: Number(item.quantity || 1), unit_price: Number(item.unit_price ?? item.unitPrice ?? item.total ?? 0), total: Number(item.total ?? 0) })) });
  const saveQuoteEdit = async () => {
    if (!editingQuote?.items?.length || editingQuote.items.some((item: any) => Number(item.quantity) <= 0 || Number(item.unit_price) <= 0)) { showToast('Cada línea debe tener cantidad y precio final mayor que cero.'); return; }
    const mode = ['enviado','pendiente','aceptado','convertido','pagado'].includes(editingQuote.status) ? 'revision' : undefined;
    const response = await apiFetch(`/quotes/${editingQuote.id}`, { method: 'PUT', body: JSON.stringify({ client_id: editingQuote.client_id, items: editingQuote.items.map((item: any) => ({ ...item, total: Number(item.quantity) * Number(item.unit_price), manual_price: true })), valid_until: editingQuote.valid_until || null, notes: editingQuote.notes || null, internal_notes: editingQuote.internal_notes || null, reason: editReason || null, mode }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { showToast(data.error || 'No se pudo guardar el presupuesto.'); return; }
    const updated = normalizarPresupuesto({ ...data.quote, client_name: editingQuote.client_name, client_bsn: editingQuote.client_bsn });
    setQuotes(current => current.map(q => q.id === updated.id ? updated : q)); setSelectedDoc({ type: 'quote', data: updated }); setEditingQuote(null); setEditReason(''); showToast(data.message || 'Presupuesto actualizado.');
  };
  const [emailSentToast, setEmailSentToast] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleExportCsv = () => {
    const isFacturas = tab === 'facturas';
    let csv = '\uFEFF';
    const dateStr = new Date().toISOString().slice(0, 10);

    if (isFacturas) {
      csv += '"Numero Factura";"Cliente";"BSN";"Concepto";"Base EUR";"BTW 21%";"Total EUR";"Estado";"Metodo Pago";"Vencimiento"\r\n';
      invoices.forEach((inv) => {
        const { subtotal, tax, total } = getDocTotals(inv);
        csv += `"${inv.code}";"${inv.client_name}";"${inv.client_bsn || ''}";"${inv.items?.[0]?.description || 'Servicios Gestoría'}";"${subtotal.toFixed(2)}";"${tax.toFixed(2)}";"${total.toFixed(2)}";"${inv.status}";"${inv.payment_method || '—'}";"${inv.due_date || ''}"\r\n`;
      });
    } else {
      csv += '"Numero Presupuesto";"Cliente";"BSN";"Concepto";"Base EUR";"BTW 21%";"Total EUR";"Estado";"Valido Hasta"\r\n';
      quotes.forEach((q) => {
        const { subtotal, tax, total } = getDocTotals(q);
        csv += `"${q.code}";"${q.client_name}";"${q.client_bsn || ''}";"${q.items?.[0]?.description || 'Servicios Gestoría'}";"${subtotal.toFixed(2)}";"${tax.toFixed(2)}";"${total.toFixed(2)}";"${q.status}";"${q.valid_until || ''}"\r\n`;
      });
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexusgest-${isFacturas ? 'facturas' : 'presupuestos'}-${dateStr}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    showToast(`¡${isFacturas ? 'Facturas' : 'Presupuestos'} exportados a CSV con éxito!`);
  };

  const getDocTotals = (doc: any) => {
    if (!doc) return { subtotal: 0, tax: 0, total: 0 };
    const total = parseFloat(doc.total || 0);
    const subtotal = doc.subtotal !== undefined
      ? parseFloat(doc.subtotal)
      : doc.amount !== undefined
      ? parseFloat(doc.amount)
      : Math.round((total / 1.21) * 100) / 100;
    const tax = doc.tax_amount !== undefined
      ? parseFloat(doc.tax_amount)
      : Math.round((total - subtotal) * 100) / 100;
    return { subtotal, tax, total };
  };

  const getDocItems = (doc: any) => {
    if (!doc) return [];
    if (doc.items && Array.isArray(doc.items) && doc.items.length > 0) {
      return doc.items.map((it: any) => {
        const quantity = Number(it.quantity || 1);
        const unitPrice = Number(it.unit_price ?? it.unitPrice ?? it.price ?? it.fee ?? 0);
        const total = Number(it.total ?? (quantity * unitPrice));
        return { description: it.description || it.title || doc.concept || 'Servicio Gestoría', quantity, unit_price: unitPrice, total: Math.round(total * 100) / 100, tax_rate: Number(it.tax_rate ?? doc.tax_rate ?? 21), tax_amount: Number(it.tax_amount ?? (total - total / (1 + Number(it.tax_rate ?? doc.tax_rate ?? 21) / 100))) };
      });
    }
    const { subtotal } = getDocTotals(doc);
    return [
      {
        description: doc.concept || doc.items?.[0]?.description || 'Servicios y Asesoría Fiscal',
        total: subtotal,
      },
    ];
  };

  // Modal para crear nuevo presupuesto (Multi-trámite)
  const [showNewQuoteModal, setShowNewQuoteModal] = useState(false);
  const [newQuoteClient, setNewQuoteClient] = useState('');
  const [selectedQuoteServiceIds, setSelectedQuoteServiceIds] = useState<string[]>([]);
  const [customQuoteFees, setCustomQuoteFees] = useState<{ [id: string]: number }>({});
  const [quoteQuantities, setQuoteQuantities] = useState<{ [id: string]: number }>({});
  const [quoteConcept, setQuoteConcept] = useState('');
  const [manualQuoteAmount, setManualQuoteAmount] = useState(0);
  const [isConceptManuallyEdited, setIsConceptManuallyEdited] = useState(false);
  const [quoteValidUntil, setQuoteValidUntil] = useState('');
  // La ficha transmite la identidad persistida, nunca el nombre (puede repetirse).
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('client');
    if (!requested || !clients.length) return;
    const client = clients.find((item) => String(item.id) === requested);
    if (!client) { setErrorCarga('El cliente solicitado no está disponible para esta operación.'); return; }
    setNewQuoteClient(String(client.id));
    setTab('presupuestos');
    if (new URLSearchParams(window.location.search).get('new') === '1') setShowNewQuoteModal(true);
  }, [clients]);


  // Helpers para presupuestos multi-trámite
  const getSelectedQuoteItems = () => {
    return servicesCatalog
      .filter((s) => selectedQuoteServiceIds.includes(s.id))
      .map((s) => ({
        id: s.id,
        title: s.title,
        category: s.category,
        fee: customQuoteFees[s.id] !== undefined ? customQuoteFees[s.id] : s.defaultFee,
        quantity: quoteQuantities[s.id] || 1,
        taxRate: s.taxRate ?? 21,
      }));
  };

  const selectedQuoteItems = getSelectedQuoteItems();
  const quoteTotal = Math.round((selectedQuoteItems.length ? selectedQuoteItems.reduce((acc, item) => acc + item.fee * item.quantity, 0) : manualQuoteAmount) * 100) / 100;
  const quoteTax = Math.round((selectedQuoteItems.length ? selectedQuoteItems.reduce((acc, item) => { const line = item.fee * item.quantity; return acc + (line - line / (1 + item.taxRate / 100)); }, 0) : (quoteTotal - quoteTotal / 1.21)) * 100) / 100;
  const quoteSubtotal = Math.round((quoteTotal - quoteTax) * 100) / 100;

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
  const handleQuantityChange = (serviceId: string, val: number) => {
    setQuoteQuantities((prev) => ({ ...prev, [serviceId]: Math.max(1, Math.floor(val) || 1) }));
  };

  const openQuoteModal = () => {
    const initialIds = selectedQuoteServiceIds.length > 0 ? selectedQuoteServiceIds : (servicesCatalog[0] ? [servicesCatalog[0].id] : []);
    setSelectedQuoteServiceIds(initialIds);
    setIsConceptManuallyEdited(false);
    const selectedTitles = servicesCatalog.filter((s) => initialIds.includes(s.id)).map((s) => s.title);
    setQuoteConcept(selectedTitles.join(' + '));
    setShowNewQuoteModal(true);
  };

  const handleCreateQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    const items = getSelectedQuoteItems();
    const client = clients.find((item) => String(item.id) === newQuoteClient);
    if (!client?.id) { showToast('Selecciona un cliente real de PostgreSQL.'); return; }
    if (items.length === 0 && !quoteConcept.trim()) { showToast('Selecciona un servicio o indica un concepto.'); return; }
    const response = await apiFetch('/quotes', { method: 'POST', body: JSON.stringify({ client_id: client.id, items: items.length ? items.map((item) => ({ service_id: item.id, description: item.title, quantity: item.quantity, unit_price: item.fee, manual_price: customQuoteFees[item.id] !== undefined })) : [{ description: quoteConcept.trim(), quantity: 1, unit_price: quoteTotal, manual_price: true }], valid_until: quoteValidUntil || null, notes: quoteConcept.trim() || null }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.quote?.id) { showToast(data.error || 'No se pudo crear el presupuesto.'); return; }
    setQuotes((current) => [normalizarPresupuesto({ ...data.quote, client_name: client.full_name, client_bsn: client.bsn }), ...current]);
    setShowNewQuoteModal(false); setTab('presupuestos'); showToast(`Presupuesto ${data.quote.code} creado.`);
  };

  const handleDeleteQuote = async (quote: any) => {
    if (['convertido', 'pagado'].includes(quote.status)) { showToast('No se puede eliminar un presupuesto convertido en factura o ya pagado.'); return; }
    if (!window.confirm(`¿Eliminar el presupuesto ${quote.code}? Esta acción no se puede deshacer.`)) return;
    try { const response = await apiFetch(`/quotes/${quote.id}`, { method: 'DELETE' }); const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.error || 'No se pudo eliminar el presupuesto.'); setQuotes((current) => current.filter((item) => item.id !== quote.id)); showToast('Presupuesto eliminado.'); } catch (error) { showToast(error instanceof Error ? error.message : 'No se pudo eliminar el presupuesto.'); }
  };

  // Convertir presupuesto a factura correlativa
  const handleConvertToInvoice = async (quote: any) => {
    let newInvoice: any = null;
    try {
      const response = await apiFetch(`/quotes/${quote.id}/convert`, { method: 'POST' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'No se pudo convertir el presupuesto.');
      newInvoice = normalizarFactura({ ...data.invoice, client_name: quote.client_name, client_bsn: quote.client_bsn });
    } catch (error) { showToast(error instanceof Error ? error.message : 'No se pudo convertir el presupuesto.'); return; }

    setInvoices((current) => [newInvoice, ...current]);
    // Actualizar estado del presupuesto a 'convertido'
    setQuotes((current) => current.map((q) => (q.id === quote.id ? { ...q, status: 'convertido' } : q)));
    setTab('facturas');
    if (process.env.NODE_ENV === 'production') await cargarFacturacion();
  };

  // Registro manual tras confirmar que el dinero ya se recibió. No es iDEAL.
  const handleMarkAsPaid = async (invoiceId: string) => {
    const payment_method = window.prompt('Método confirmado: escribe transferencia, efectivo u otro.', 'transferencia')?.trim().toLowerCase();
    if (!payment_method || !['transferencia', 'efectivo', 'otro'].includes(payment_method)) {
      if (payment_method) showToast('Método no válido. No se registró ningún cobro.');
      return null;
    }
    if (!window.confirm('Confirma que el dinero ya se recibió y se verificó fuera de esta aplicación. Esto cambiará el estado contable de la factura.')) return null;
    const payment_reference = window.prompt('Referencia bancaria o comprobante (opcional).', '') || '';
    try {
      const response = await apiFetch(`/invoices/${invoiceId}/pay`, {
        method: 'POST',
        body: JSON.stringify({ payment_method, payment_reference }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'No se pudo registrar el cobro.');
      const updated = normalizarFactura(data.invoice);
      setInvoices((current) => current.map((invoice) => invoice.id === invoiceId ? updated : invoice));
      showToast('Cobro manual registrado. No se procesó ningún pago en línea.');
      return updated;
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'No se pudo registrar el cobro.');
      return null;
    }
  };

  // Eliminar factura: llama al backend. El backend bloquea el borrado de
  // las pagadas por conservación fiscal y devuelve el motivo.
  const handleDeleteInvoice = async (invoiceId: string, code: string, status: string) => {
    if (status === 'pagada') {
      if (!confirm(`La factura ${code} está pagada.\n\nNo se puede eliminar: las facturas cobradas deben conservarse por obligación legal.\n\n¿Marcarla como "cancelada" en su lugar? Se conserva el registro.`)) {
        return;
      }
      try {
        const res = await apiFetch(`/invoices/${invoiceId}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'cancelada' }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          alert(data.error || 'No se pudo actualizar la factura.');
          return;
        }
        setInvoices(invoices.map((inv) => (inv.id === invoiceId ? { ...inv, status: 'cancelada' } : inv)));
      } catch {
        alert('Error de conexión al actualizar la factura.');
      }
      return;
    }

    if (!confirm(`¿Eliminar la factura ${code}?\n\nSe borrará definitivamente del servidor. Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      const res = await apiFetch(`/invoices/${invoiceId}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || 'No se pudo eliminar la factura.');
        return;
      }
      setInvoices(invoices.filter((inv) => inv.id !== invoiceId));
    } catch {
      alert('Error de conexión al eliminar la factura.');
    }
  };

  const billingSummary = invoices.reduce((summary, invoice) => {
    const total = Number(invoice.total || 0);
    summary.billed += total;
    if (invoice.status === 'pagada') summary.collected += total;
    else summary.pending += total;
    return summary;
  }, { billed: 0, collected: 0, pending: 0 });

  return (
    <div className="w-full flex-1 h-full max-h-[calc(100vh-4.6rem)] overflow-hidden flex flex-col gap-2.5">
      {/* Toast de Notificaciones */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-[200] bg-slate-900 text-white px-4 py-2 rounded-xl shadow-2xl flex items-center gap-3 border border-secondary/40 animate-in fade-in duration-200">
          <span className="material-symbols-outlined text-secondary text-base">check_circle</span>
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {cargandoFacturas && (
        <div className="flex items-center gap-2 text-xs text-outline shrink-0">
          <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
          Cargando facturas...
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-surface-container shrink-0">
        <div>
          <h1 className="text-base sm:text-lg font-bold tracking-tight text-on-surface">Presupuestos y Facturación</h1>
          <p className="text-[11px] text-on-surface-variant">
            Numeración correlativa legal PRE-2026 y FAC-2026 · precios finales IVA incluido
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            className="h-8 px-2.5 bg-surface-container-lowest border border-outline-variant text-on-surface hover:border-secondary hover:text-secondary text-xs font-semibold rounded-lg shadow-2xs transition-colors flex items-center gap-1"
            title="Descargar datos en CSV"
          >
            <span className="material-symbols-outlined text-[15px]">file_download</span>
            <span>Exportar CSV</span>
          </button>

          <Link
            href="/crm/backup"
            className="h-8 px-2.5 bg-surface-container-lowest border border-outline-variant text-on-surface hover:border-secondary hover:text-secondary text-xs font-semibold rounded-lg shadow-2xs transition-colors flex items-center gap-1"
            title="Ir al Centro de Copias de Seguridad"
          >
            <span className="material-symbols-outlined text-[15px] text-secondary">cloud_download</span>
            <span>Backup</span>
          </Link>

          <button type="button"
            onClick={openQuoteModal}
            className="h-8 px-3 bg-secondary text-white text-xs font-semibold rounded-lg shadow-2xs hover:bg-blue-700 transition-colors flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[15px]">add</span>
            <span>+ Nuevo Presupuesto</span>
          </button>
        </div>
      </div>

      {/* Tabs & Compact 3 KPIs in single row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
        <div className="flex border-b border-surface-container gap-4">
          <button type="button"
            onClick={() => setTab('facturas')}
            className={`pb-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              tab === 'facturas' ? 'border-secondary text-secondary' : 'border-transparent text-outline hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">receipt_long</span>
            <span>Facturas Oficiales ({invoices.length})</span>
          </button>
          <button type="button"
            onClick={() => setTab('presupuestos')}
            className={`pb-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              tab === 'presupuestos' ? 'border-secondary text-secondary' : 'border-transparent text-outline hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">description</span>
            <span>Presupuestos ({quotes.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-lg border border-surface-container bg-surface-container-lowest text-xs sm:text-sm flex items-center gap-2">
            <span className="text-xs text-on-surface-variant font-medium">Facturado:</span>
            <strong className="font-mono-data text-on-surface font-bold text-xs sm:text-sm">€ {Number(billingSummary.billed).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</strong>
          </div>
          <div className="px-3 py-1.5 rounded-lg border border-surface-container bg-surface-container-lowest text-xs sm:text-sm flex items-center gap-2">
            <span className="text-xs text-emerald-600 font-medium">Cobrado:</span>
            <strong className="font-mono-data text-emerald-600 font-bold text-xs sm:text-sm">€ {Number(billingSummary.collected).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</strong>
          </div>
          <div className="px-3 py-1.5 rounded-lg border border-surface-container bg-surface-container-lowest text-xs sm:text-sm flex items-center gap-2">
            <span className="text-xs text-amber-600 font-medium">Pendiente:</span>
            <strong className="font-mono-data text-amber-600 font-bold text-xs sm:text-sm">€ {Number(billingSummary.pending).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</strong>
          </div>
        </div>
      </div>

      {errorCarga && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-error/30 bg-error/5 px-3 py-2 text-xs text-error shrink-0">
          <span>{errorCarga}</span>
          <button type="button" onClick={() => void cargarFacturacion()} className="font-semibold underline">
            Reintentar
          </button>
        </div>
      )}

      {/* TAB FACTURAS CON SCROLL INTERNO */}
      {tab === 'facturas' && (
        <div className="flex-1 min-h-0 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-2xs overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-surface-container-low text-on-surface-variant font-bold uppercase tracking-wider border-b border-surface-container sticky top-0 z-10 text-xs">
                <tr>
                  <th scope="col" className="px-4 py-2.5">Nº Factura</th>
                  <th scope="col" className="px-4 py-2.5">Cliente / BSN</th>
                  <th scope="col" className="px-4 py-2.5">Concepto Principal</th>
                  <th scope="col" className="px-5 py-3">Estado de Pago</th>
                  <th scope="col" className="px-5 py-3">Vencimiento</th>
                  <th scope="col" className="px-5 py-3 text-right">Total (Inc. BTW)</th>
                  <th scope="col" className="px-5 py-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    onClick={() => setSelectedDoc({ type: 'invoice', data: inv })}
                    {...activableConTeclado(() => setSelectedDoc({ type: 'invoice', data: inv }))}
                    className="hover:bg-surface-container-low cursor-pointer transition-colors"
                    title="Pulsar o Enter para abrir la factura"
                  >
                    <td className="px-5 py-3.5 font-mono-data font-bold">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDoc({ type: 'invoice', data: inv });
                        }}
                        className="text-secondary hover:underline flex items-center gap-1.5 font-bold"
                        title="Abrir factura oficial"
                      >
                        <span className="material-symbols-outlined text-[15px]">description</span>
                        <span>{inv.code}</span>
                      </button>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-on-surface">{inv.client_name}</div>
                      <div className="text-xs text-outline font-mono-data">BSN: {inv.client_bsn}</div>
                    </td>
                    <td className="px-5 py-3.5 text-on-surface-variant font-medium">
                      {inv.items[0]?.description || 'Servicios Fiscales Gestoría'}
                    </td>
                    <td className="px-5 py-3.5">
                      {inv.status === 'pagada' ? (
                        <div>
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Pagada
                          </span>
                          <div className="text-xs text-outline font-mono-data mt-0.5">{inv.payment_reference}</div>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Pendiente de Cobro
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 font-mono-data text-outline">
                      {formatInvoiceDate(inv.due_date)}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono-data font-bold text-sm sm:text-base text-on-surface">
                      € {inv.total.toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedDoc({ type: 'invoice', data: inv })}
                          className="h-8 px-3 bg-surface-container border border-outline-variant hover:bg-surface-container-high text-on-surface rounded text-xs font-semibold transition-colors inline-flex items-center gap-1"
                          title="Ver detalle de factura"
                        >
                          <span className="material-symbols-outlined text-[15px] text-secondary">visibility</span>
                          <span>Ver Factura</span>
                        </button>
                        {inv.status !== 'pagada' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkAsPaid(inv.id);
                            }}
                            className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold transition-colors inline-flex items-center gap-1 shadow-sm"
                          >
                            <span className="material-symbols-outlined text-[15px]">credit_card</span>
                            <span>Registrar cobro</span>
                          </button>
                        )}
                        {/* Eliminar. En las pagadas el handler ofrece
                            "marcar como cancelada" en vez de borrar. */}
                        <button
                          type="button"
                          onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteInvoice(inv.id, inv.code, inv.status);
                            }}
                          className={`h-7 w-7 rounded transition-colors inline-flex items-center justify-center ${
                            inv.status === 'pagada'
                              ? 'text-outline hover:text-amber-700 hover:bg-amber-50'
                              : 'text-outline hover:text-error hover:bg-red-50'
                          }`}
                          aria-label={inv.status === 'pagada' ? `Marcar factura ${inv.code} como cancelada` : `Eliminar factura ${inv.code}`}
                        >
                          <span className="material-symbols-outlined text-[15px]">
                            {inv.status === 'pagada' ? 'event_busy' : 'delete'}
                          </span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB PRESUPUESTOS */}
      {tab === 'presupuestos' && (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-surface-container-low text-on-surface-variant font-bold uppercase tracking-wider border-b border-surface-container text-xs">
                <tr>
                  <th scope="col" className="px-5 py-3">Nº Presupuesto</th>
                  <th scope="col" className="px-5 py-3">Cliente</th>
                  <th scope="col" className="px-5 py-3">Detalle</th>
                  <th scope="col" className="px-5 py-3">Estado</th>
                  <th scope="col" className="px-5 py-3">Válido Hasta</th>
                  <th scope="col" className="px-5 py-3 text-right">Importe Total</th>
                  <th scope="col" className="px-5 py-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {quotes.map((q) => (
                  <tr
                    key={q.id}
                    onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDoc({ type: 'quote', data: q });
                        }}
                    {...activableConTeclado(() => setSelectedDoc({ type: 'quote', data: q }))}
                    className="hover:bg-surface-container-low cursor-pointer transition-colors"
                    title="Pulsar o Enter para abrir el presupuesto"
                  >
                    <td className="px-5 py-3.5 font-mono-data font-bold">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDoc({ type: 'quote', data: q });
                        }}
                        className="text-secondary hover:underline flex items-center gap-1.5 font-bold"
                        title="Abrir presupuesto oficial"
                      >
                        <span className="material-symbols-outlined text-[15px]">request_quote</span>
                        <span>{q.code}</span>
                      </button>
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
                              <span key={idx} className="inline-flex items-center gap-0.5 text-xs bg-surface-container px-2 py-0.5 rounded text-outline font-normal">
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
                        <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700">
                          Convertido a Factura
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700">
                          Enviado al Cliente
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 font-mono-data text-outline">
                      {q.valid_until}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono-data font-bold text-sm sm:text-base">
                      € {q.total.toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDoc({ type: 'quote', data: q });
                        }}
                          className="h-8 px-3 bg-surface-container border border-outline-variant hover:bg-surface-container-high text-on-surface rounded text-xs font-semibold transition-colors inline-flex items-center gap-1"
                          title="Ver detalle del presupuesto"
                        >
                          <span className="material-symbols-outlined text-[15px] text-secondary">visibility</span>
                          <span>Ver Presupuesto</span>
                        </button>
                        {q.status !== 'convertido' && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleConvertToInvoice(q); }}
                            className="h-8 px-3 bg-secondary hover:bg-blue-700 text-white rounded text-xs font-semibold transition-colors inline-flex items-center gap-1 shadow-sm"
                          >
                            <span className="material-symbols-outlined text-[14px]">transform</span>
                            <span>Convertir a Factura</span>
                          </button>
                        )}
                        {!['convertido', 'pagado'].includes(q.status) && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleDeleteQuote(q); }}
                            className="h-7 w-7 rounded text-outline hover:text-error hover:bg-red-50 inline-flex items-center justify-center"
                            aria-label={`Eliminar presupuesto ${q.code}`}
                            title="Eliminar presupuesto"
                          >
                            <span className="material-symbols-outlined text-[15px]">delete</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
                aria-label="Cerrar nuevo presupuesto"
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
                  <option value="">Selecciona un cliente</option>
                  {clients.map((client) => <option key={client.id} value={String(client.id)}>{client.full_name}</option>)}
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
                          <label className="sr-only" htmlFor={`quote-qty-${item.id}`}>Cantidad de {item.title}</label>
                          <input id={`quote-qty-${item.id}`} type="number" min="1" step="1" value={item.quantity} onChange={(e) => handleQuantityChange(item.id, Number(e.target.value))} className="w-12 h-7 px-1 border border-outline-variant rounded bg-surface text-center text-xs" aria-label={`Cantidad de ${item.title}`} />
                          <span className="text-[11px] text-outline font-mono-data">€</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
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
                {selectedQuoteServiceIds.length === 0 && <label className="mt-2 block text-xs font-semibold">Precio final del concepto manual (IVA incluido)<input type="number" min="0.01" step="0.01" value={manualQuoteAmount || ''} onChange={(e) => setManualQuoteAmount(Number(e.target.value) || 0)} className="mt-1 h-9 w-full rounded border border-outline-variant px-2" /></label>}
              </div>

              {/* Resumen Económico */}
              <div className="p-3.5 bg-surface-container-low rounded-xl font-mono-data text-xs space-y-1.5 border border-surface-container">
                <div className="flex justify-between font-bold text-sm text-secondary">
                  <span>Total presupuestado (IVA incluido):</span>
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
                disabled={(selectedQuoteServiceIds.length === 0 && !quoteConcept.trim()) || quoteTotal <= 0}
                className="h-9 px-5 bg-secondary text-white rounded-lg text-xs font-semibold hover:bg-blue-700 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">check</span>
                <span>Generar Presupuesto (€ {quoteTotal.toFixed(2)})</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL VISUALIZADOR OFICIAL DE FACTURA O PRESUPUESTO */}
      {editingQuote && (
        <div className="fixed inset-0 z-[140] bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-surface-container-lowest p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-surface-container pb-3"><div><h2 className="text-lg font-bold">{['enviado','pendiente','aceptado','convertido','pagado'].includes(editingQuote.status) ? 'Crear revisión de presupuesto' : 'Editar presupuesto'}</h2><p className="text-xs text-on-surface-variant">Los precios son finales e incluyen IVA.</p></div><button type="button" onClick={() => setEditingQuote(null)} aria-label="Cerrar editor" className="p-2"><span className="material-symbols-outlined">close</span></button></div>
            <div className="mt-4 space-y-3">{editingQuote.items.map((item: any, index: number) => <div key={index} className="grid gap-2 rounded-lg border border-outline-variant p-3 sm:grid-cols-[1fr_90px_120px_32px]"><input value={item.description} onChange={e=>setEditingQuote((q:any)=>({...q,items:q.items.map((x:any,i:number)=>i===index?{...x,description:e.target.value}:x)}))} className="h-9 rounded border border-outline-variant px-2 text-sm" aria-label="Descripción del servicio"/><input type="number" min="1" step="1" value={item.quantity} onChange={e=>setEditingQuote((q:any)=>({...q,items:q.items.map((x:any,i:number)=>i===index?{...x,quantity:Number(e.target.value)}:x)}))} className="h-9 rounded border border-outline-variant px-2 text-sm" aria-label="Cantidad"/><input type="number" min="0.01" step="0.01" value={item.unit_price} onChange={e=>setEditingQuote((q:any)=>({...q,items:q.items.map((x:any,i:number)=>i===index?{...x,unit_price:Number(e.target.value)}:x)}))} className="h-9 rounded border border-outline-variant px-2 text-sm" aria-label="Precio final unitario (IVA incluido)"/><button type="button" onClick={()=>setEditingQuote((q:any)=>({...q,items:q.items.filter((_:any,i:number)=>i!==index)}))} className="text-rose-600" aria-label="Eliminar línea"><span className="material-symbols-outlined">delete</span></button><p className="sm:col-span-4 text-right text-xs font-semibold text-secondary">Total línea: € {(Number(item.quantity||0)*Number(item.unit_price||0)).toFixed(2)} · IVA incluido</p></div>)}<button type="button" onClick={()=>setEditingQuote((q:any)=>({...q,items:[...q.items,{description:'Nuevo servicio',quantity:1,unit_price:0,total:0,manual_price:true}]}))} className="rounded border border-secondary px-3 py-2 text-xs font-semibold text-secondary">+ Añadir servicio</button><label className="block text-xs font-semibold">Fecha de validez<input type="date" value={editingQuote.valid_until || ''} onChange={e=>setEditingQuote((q:any)=>({...q,valid_until:e.target.value}))} className="mt-1 h-9 w-full rounded border border-outline-variant px-2"/></label><label className="block text-xs font-semibold">Notas para el cliente<textarea value={editingQuote.notes || ''} onChange={e=>setEditingQuote((q:any)=>({...q,notes:e.target.value}))} rows={2} className="mt-1 w-full rounded border border-outline-variant p-2"/></label><label className="block text-xs font-semibold">Notas internas<textarea value={editingQuote.internal_notes || ''} onChange={e=>setEditingQuote((q:any)=>({...q,internal_notes:e.target.value}))} rows={2} className="mt-1 w-full rounded border border-outline-variant p-2"/></label><label className="block text-xs font-semibold">Motivo de modificación (opcional)<input value={editReason} onChange={e=>setEditReason(e.target.value)} className="mt-1 h-9 w-full rounded border border-outline-variant px-2"/></label><div className="flex justify-end gap-2 border-t border-surface-container pt-4"><button type="button" onClick={()=>setEditingQuote(null)} className="rounded border border-outline-variant px-4 py-2 text-xs font-semibold">Cancelar</button><button type="button" onClick={saveQuoteEdit} className="rounded bg-secondary px-4 py-2 text-xs font-semibold text-white">Guardar {['enviado','pendiente','aceptado','convertido','pagado'].includes(editingQuote.status)?'revisión':'borrador'}</button></div></div>
          </div>
        </div>
      )}

      {selectedDoc && (
        <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="print-document bg-surface-container-lowest max-w-3xl w-full rounded-2xl border border-outline-variant shadow-2xl overflow-hidden flex flex-col my-auto animate-in zoom-in-95">
            {/* Barra de Herramientas Superior */}
            <div className="no-print bg-surface-container px-3 sm:px-6 py-2.5 sm:py-3 border-b border-surface-container-high flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded text-[10px] sm:text-xs font-bold font-mono-data uppercase ${
                    selectedDoc.type === 'invoice'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {selectedDoc.type === 'invoice' ? 'FACTURA (VERKOOPFACTUUR)' : 'PRESUPUESTO (OFFERTE)'}
                </span>
                <span className="font-mono-data font-bold text-xs sm:text-sm text-on-surface">
                  {selectedDoc.data.code}
                </span>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 ml-auto">
                {selectedDoc.type === 'quote' && <button type="button" onClick={() => openQuoteEditor(selectedDoc.data)} className="h-7 sm:h-8 px-2 sm:px-3 bg-amber-600 text-white rounded-lg text-[11px] sm:text-xs font-semibold flex items-center gap-1" title="Editar presupuesto o crear revisión"><span className="material-symbols-outlined text-[14px]">edit</span><span className="hidden sm:inline">Editar presupuesto</span></button>}
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="h-7 sm:h-8 px-2 sm:px-3 bg-surface border border-outline-variant hover:bg-surface-container text-on-surface rounded-lg text-[11px] sm:text-xs font-semibold flex items-center gap-1 sm:gap-1.5 transition-colors shadow-xs"
                  title="Imprimir documento o guardar como PDF"
                >
                  <span className="material-symbols-outlined text-[14px] sm:text-[15px]">print</span>
                  <span className="hidden sm:inline">Imprimir / PDF</span>
                  <span className="sm:hidden">PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEmailSentToast('Envío de email no está configurado. Configura Email transaccional antes de enviar documentos.');
                    setTimeout(() => setEmailSentToast(null), 5000);
                  }}
                  className="h-7 sm:h-8 px-2 sm:px-3 bg-secondary text-white hover:bg-blue-700 rounded-lg text-[11px] sm:text-xs font-semibold flex items-center gap-1 sm:gap-1.5 transition-colors shadow-xs"
                >
                  <span className="material-symbols-outlined text-[14px] sm:text-[15px]">send</span>
                  <span className="hidden sm:inline">Enviar por Email</span>
                  <span className="sm:hidden">Email</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedDoc(null)}
                  aria-label="Cerrar documento"
                  className="text-outline hover:text-on-surface p-1 sm:p-1.5 rounded-lg hover:bg-surface"
                >
                  <span className="material-symbols-outlined text-base sm:text-lg">close</span>
                </button>
              </div>
            </div>

            {/* Toast de notificación */}
            {emailSentToast && (
              <div className="bg-emerald-600 text-white text-xs px-6 py-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-base">check_circle</span>
                <span>{emailSentToast}</span>
              </div>
            )}

            {/* Hoja Documental (Diseño de Factura/Presupuesto Legal Neerlandés) */}
            <div className="p-8 sm:p-10 space-y-8 bg-surface-container-lowest text-xs text-on-surface">
              {/* Encabezado Corporativo y Legal */}
              <div className="flex flex-col sm:flex-row justify-between gap-6 pb-6 border-b border-surface-container">
                <div>
                  <div className="flex items-center gap-2">
                    {companySettings.logo_url ? <img src={companySettings.logo_url} alt="Logo de empresa" className="h-8 w-8 rounded-lg object-contain" /> : <div className="w-8 h-8 rounded-lg bg-secondary text-white font-bold flex items-center justify-center text-sm">RP</div>}
                    <span className="font-bold text-base tracking-tight text-on-surface">{companySettings.commercial_name || 'RP Asesoría'}</span>
                  </div>
                  <p className="text-[11px] text-on-surface-variant mt-1.5 leading-relaxed">
                    {companySettings.description || 'Información y acompañamiento administrativo'}<br />
                    {companySettings.address || 'Dirección pendiente'}{companySettings.city ? `, ${companySettings.city}` : ''}{companySettings.country ? `, ${companySettings.country}` : ''}<br />
                    KVK: {companySettings.kvk || '—'} · BTW-id: {companySettings.vat_id || '—'}<br />
                    IBAN: {companySettings.iban || '—'} · {companySettings.email || '—'} · {companySettings.phone || '—'}
                  </p>
                </div>

                <div className="text-left sm:text-right space-y-1">
                  <h2 className="text-2xl font-black font-mono-data text-on-surface tracking-tight">
                    {selectedDoc.data.code}
                  </h2>
                  <div className="text-[11px] text-outline font-mono-data">
                    Fecha de emisión: {new Date().toLocaleDateString('es-ES')}
                  </div>
                  <div className="text-[11px] text-outline font-mono-data">
                    {selectedDoc.type === 'invoice' ? 'Fecha de vencimiento: ' : 'Válido hasta: '}
                    <strong>{formatInvoiceDate(selectedDoc.data.due_date || selectedDoc.data.valid_until)}</strong>
                  </div>
                  <div className="pt-1">
                    {selectedDoc.type === 'invoice' ? (
                      selectedDoc.data.status === 'pagada' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase">
                          <span className="material-symbols-outlined text-[13px]">check_circle</span>
                          <span>Pago registrado</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-amber-100 text-amber-800 font-bold text-[10px] uppercase">
                          <span className="material-symbols-outlined text-[13px]">schedule</span>
                          <span>Pendiente de Pago</span>
                        </span>
                      )
                    ) : selectedDoc.data.status === 'convertido' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-100 text-blue-800 font-bold text-[10px] uppercase">
                        <span className="material-symbols-outlined text-[13px]">transform</span>
                        <span>Convertido a Factura</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase">
                        <span className="material-symbols-outlined text-[13px]">send</span>
                        <span>Enviado al Cliente</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Datos del Cliente */}
              <div className="p-4 bg-surface-container-low rounded-xl border border-surface-container">
                <span className="text-[10px] font-bold uppercase tracking-wider text-outline block mb-1.5">
                  {selectedDoc.type === 'invoice' ? 'Facturado a:' : 'Presupuestado para:'}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <h3 className="font-bold text-sm text-on-surface">
                      {selectedDoc.data.client_name || selectedDoc.data.full_name || 'Cliente'}
                    </h3>
                    <p className="text-xs text-on-surface-variant font-mono-data mt-0.5">
                      BSN Oficial: <strong>{selectedDoc.data.client_bsn || selectedDoc.data.bsn || 'No disponible'}</strong>
                    </p>
                  </div>
                  <div className="text-xs text-on-surface-variant space-y-0.5">
                    <p>{selectedDoc.data.address || 'Dirección no disponible'}</p>
                    <p>{selectedDoc.data.city || 'Ciudad no disponible'}, {companySettings.country || 'País no disponible'}</p>
                    <p className="text-outline">{selectedDoc.data.email || 'Email no disponible'}</p>
                  </div>
                </div>
              </div>

              {/* Tabla de Conceptos / Trámites */}
              <div className="border border-outline-variant/60 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-container-low text-outline font-semibold uppercase tracking-wider border-b border-surface-container">
                    <tr>
                      <th scope="col" className="px-4 py-2.5">Descripción del Trámite / Servicio</th>
                      <th scope="col" className="px-4 py-2.5 text-center">Cant.</th>
                      <th scope="col" className="px-4 py-2.5 text-right">Precio unitario</th>
                      <th scope="col" className="px-4 py-2.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container">
                    {getDocItems(selectedDoc.data).map((item: any, idx: number) => {
                      const itemTotal = Number(item.total || (Number(item.quantity || 1) * Number(item.unit_price || 0)));
                      return (
                        <tr key={idx} className="hover:bg-surface-container-low/50">
                          <td className="px-4 py-3 font-semibold text-on-surface">
                            {item.description}
                          </td>
                          <td className="px-4 py-3 text-center font-mono-data text-outline">
                            {Number(item.quantity || 1)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono-data">
                            € {Number(item.unit_price || itemTotal).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono-data font-bold text-on-surface">
                            € {itemTotal.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Resumen de Totales y Liquidación Fiscal */}
              <div className="flex flex-col sm:flex-row justify-between gap-6 pt-2">
                <div className="sm:max-w-xs space-y-2 text-[11px] text-outline">
                  <p className="font-semibold text-on-surface">Información de Pago & Fiscalidad:</p>
                  <p>
                    Los importes mostrados son precios finales con IVA incluido.
                  </p>
                  {selectedDoc.type === 'invoice' && selectedDoc.data.status === 'pagada' && (
                    <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-800 font-mono-data text-[10px] space-y-0.5">
                      <span className="font-bold block">Referencia de pago:</span>
                      <span>{selectedDoc.data.payment_reference || 'Referencia no disponible'}</span>
                    </div>
                  )}
                </div>

                <div className="w-full sm:w-64 p-4 rounded-xl bg-surface-container-low font-mono-data text-xs space-y-2 border border-surface-container">
                  <div className="flex justify-between font-bold text-sm text-secondary">
                    <span>Total (IVA incluido):</span>
                    <span>€ {getDocTotals(selectedDoc.data).total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pie de Acciones Inferior */}
            <div className="no-print bg-surface-container px-6 py-3 border-t border-surface-container-high flex items-center justify-between">
              <div className="text-[11px] text-outline">
                {companySettings.footer_text || `Documento legal emitido por ${companySettings.commercial_name || 'RP Asesoría'} · ${companySettings.country || 'Países Bajos'}`}
              </div>

              <div className="flex items-center gap-2">
                {selectedDoc.type === 'invoice' && selectedDoc.data.status !== 'pagada' && (
                  <button
                    type="button"
                    onClick={async () => {
                      const paidInvoice = await handleMarkAsPaid(selectedDoc.data.id);
                      if (paidInvoice) setSelectedDoc({ type: 'invoice', data: paidInvoice });
                    }}
                    className="h-8 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[15px]">credit_card</span>
                    <span>Registrar cobro recibido</span>
                  </button>
                )}

                {selectedDoc.type === 'quote' && selectedDoc.data.status !== 'convertido' && (
                  <button
                    type="button"
                    onClick={() => {
                      handleConvertToInvoice(selectedDoc.data);
                      setSelectedDoc(null);
                    }}
                    className="h-8 px-4 bg-secondary hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[15px]">transform</span>
                    <span>Convertir a Factura Oficial</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedDoc(null)}
                  className="h-8 px-4 border border-outline-variant hover:bg-surface-container-high rounded-lg text-xs font-semibold"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
