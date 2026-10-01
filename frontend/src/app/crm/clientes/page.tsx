'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function CRMClientesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'todos' | 'activos' | 'con_digid' | 'pendientes'>('todos');

  // Control de vista maximizada (por defecto FALSE para NO tapar la barra lateral izquierda)
  const [isMaximized, setIsMaximized] = useState(false);

  // Catálogo de Servicios y Trámites
  const [servicesCatalog, setServicesCatalog] = useState([
    { id: '1', title: 'Declaración Fiscal M-Form', category: 'Fiscalidad / Belastingdienst', defaultFee: 180.00 },
    { id: '2', title: 'Activación DigiD + Zorgtoeslag', category: 'Subsidios / Toeslagen', defaultFee: 85.00 },
    { id: '3', title: 'Solicitud Subsidio Huurtoeslag (Alquiler)', category: 'Subsidios / Toeslagen', defaultFee: 95.00 },
    { id: '4', title: 'Alta Eenmanszaak KVK y BTW-nummer', category: 'Empresas / KVK', defaultFee: 250.00 },
    { id: '5', title: 'Recurso Bezwaarschrift Belastingdienst', category: 'Legal / Recursos', defaultFee: 120.00 },
    { id: '6', title: 'Kindgebonden Budget (Ayuda Hijos)', category: 'Subsidios / Toeslagen', defaultFee: 80.00 },
    { id: '7', title: 'Cambio de Cuenta Bancaria Belastingdienst', category: 'Gestión Administrativa', defaultFee: 45.00 },
  ]);

  // Lista de clientes con sus datos, trámites, presupuestos, facturas y citas
  const [clients, setClients] = useState<any[]>([
    {
      id: '1',
      full_name: 'Maria Popescu',
      email: 'maria.popescu@gmail.com',
      phone: '+31 6 81239845',
      bsn: '982145672',
      id_document_number: 'RO9284102',
      city: 'Eindhoven',
      address: 'Strijpsestraat 142',
      iban: 'NL91INGB0001234567',
      digid_status: 'pendiente_activar',
      status: 'activo',
      notes: 'Requiere activación de DigiD y solicitud retroactiva de Zorgtoeslag.',
      dossiers: [
        {
          id: 'd1',
          code: 'EXP-2026-0041',
          title: 'Activación DigiD + Solicitud Zorgtoeslag 2026',
          category: 'Subsidios / Toeslagen',
          status: 'en_belastingdienst',
          progress_percentage: 65,
          fee: 85.00,
          deadline: '2026-10-15',
          description: 'Trámite de ayuda médica y código de activación ante Belastingdienst.',
        },
      ],
      quotes: [
        {
          id: 'q1',
          code: 'PRE-2026-0003',
          concept: 'Gestión Solicitud Zorgtoeslag y Registro',
          amount: 85.00,
          total: 102.85,
          status: 'enviado',
          valid_until: '2026-11-15',
        },
      ],
      invoices: [
        {
          id: 'i1',
          code: 'FAC-2026-0002',
          concept: 'Gestión Solicitud Zorgtoeslag y Registro',
          total: 102.85,
          status: 'emitida',
          due_date: '2026-10-12',
          payment_method: 'ideal',
        },
      ],
      appointments: [
        {
          id: 'a1',
          title: 'Seguimiento Telefónico Zorgtoeslag',
          date: '2026-10-10',
          time: '10:00',
          modality: 'llamada',
          status: 'confirmada',
          notes: 'Llamar para verificar código de carta física.',
        },
      ],
    },
    {
      id: '2',
      full_name: 'Carlos Mendoza Ruiz',
      email: 'carlos.mendoza@outlook.com',
      phone: '+34 654 321 987',
      bsn: '817293845',
      id_document_number: '48920184K',
      city: 'Amsterdam',
      address: 'Keizersgracht 321',
      iban: 'NL44ABNA0412345678',
      digid_status: 'activo',
      status: 'activo',
      notes: 'Llegada en 2025. Declaración Modelo M (M-Form). Deducción por traslado internacional.',
      dossiers: [
        {
          id: 'd2',
          code: 'EXP-2026-0042',
          title: 'Declaración Fiscal M-Form (Migración 2025)',
          category: 'Fiscalidad / Belastingdienst',
          status: 'en_proceso',
          progress_percentage: 40,
          fee: 180.00,
          deadline: '2026-11-01',
          description: 'Cálculo de deducción por traslado internacional y declaración ante Belastingdienst.',
        },
      ],
      quotes: [
        {
          id: 'q2',
          code: 'PRE-2026-0001',
          concept: 'Elaboración y Presentación Fiscal M-Form',
          amount: 220.00,
          total: 266.20,
          status: 'convertido',
          valid_until: '2026-10-30',
        },
      ],
      invoices: [
        {
          id: 'i2',
          code: 'FAC-2026-0001',
          concept: 'Elaboración y Presentación Fiscal M-Form',
          total: 266.20,
          status: 'pagada',
          due_date: '2026-10-15',
          payment_method: 'ideal',
        },
      ],
      appointments: [
        {
          id: 'a2',
          title: 'Revisión M-Form Carlos Mendoza',
          date: '2026-10-10',
          time: '11:30',
          modality: 'online_meet',
          status: 'confirmada',
          notes: 'Revisar certificado de retenciones de España.',
        },
      ],
    },
    {
      id: '3',
      full_name: 'Lars Van Dijk',
      email: 'lars.vandijk@techconsulting.nl',
      phone: '+31 6 49201948',
      bsn: '728194028',
      id_document_number: 'NL8273619',
      city: 'Rotterdam',
      address: 'Coolsingel 88',
      iban: 'NL02RABO0319284756',
      digid_status: 'activo',
      status: 'activo',
      notes: 'Alta como ZZP en KVK y declaración trimestral de BTW.',
      dossiers: [
        {
          id: 'd3',
          code: 'EXP-2026-0043',
          title: 'Alta Eenmanszaak KVK y BTW-nummer',
          category: 'Empresas / KVK',
          status: 'completado',
          progress_percentage: 100,
          fee: 250.00,
          deadline: '2026-09-28',
          description: 'Registro mercantil neerlandés y alta censal en Belastingdienst.',
        },
      ],
      quotes: [],
      invoices: [],
      appointments: [],
    },
    {
      id: '4',
      full_name: 'Elena Morales Castillo',
      email: 'elena.morales@hotmail.com',
      phone: '+34 611 223 344',
      bsn: '639102847',
      id_document_number: '51928374P',
      city: 'Utrecht',
      address: 'Oudegracht 120',
      iban: 'NL88BUNQ2019283746',
      digid_status: 'activo',
      status: 'activo',
      notes: 'Subsidio de alquiler Huurtoeslag y seguro de salud HollandZorg.',
      dossiers: [],
      quotes: [],
      invoices: [],
      appointments: [],
    },
  ]);

  // Sincronización con localStorage para persistir clientes añadidos por IA o formularios
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('nexusgest_clients');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setClients((prev) => {
              const map = new Map();
              prev.forEach((c) => map.set(String(c.id), c));
              parsed.forEach((c: any) => map.set(String(c.id), c));
              return Array.from(map.values());
            });
          }
        }
      } catch (err) {
        console.warn('Error al leer clientes de localStorage:', err);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && clients.length > 0) {
      try {
        localStorage.setItem('nexusgest_clients', JSON.stringify(clients));
      } catch (err) {
        console.warn('Error al guardar clientes en localStorage:', err);
      }
    }
  }, [clients]);

  // Cliente seleccionado para la Ficha 360°
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [active360Tab, setActive360Tab] = useState<'resumen' | 'personales' | 'facturacion' | 'citas' | 'ia'>('resumen');

  // Estados de edición de notas
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editedNotes, setEditedNotes] = useState('');

  // 1. MODAL NUEVO TRÁMITE (Desplegable + añadir nuevo servicio a catálogo)
  const [showAddDossierModal, setShowAddDossierModal] = useState(false);
  const [selectedCatalogServiceId, setSelectedCatalogServiceId] = useState(servicesCatalog[0].id);
  const [dossierTitle, setDossierTitle] = useState(servicesCatalog[0].title);
  const [dossierCategory, setDossierCategory] = useState(servicesCatalog[0].category);
  const [dossierFee, setDossierFee] = useState<number>(servicesCatalog[0].defaultFee);
  const [dossierDeadline, setDossierDeadline] = useState('2026-11-15');
  const [isNewServiceMode, setIsNewServiceMode] = useState(false);
  const [saveToCatalogToo, setSaveToCatalogToo] = useState(true);

  // 2. MODAL NUEVA CITA DIRECTA (Cliente bloqueado, llamada por defecto)
  const [showNewAptModal, setShowNewAptModal] = useState(false);
  const [aptTitle, setAptTitle] = useState('Consulta Telefónica Gestoría');
  const [aptDate, setAptDate] = useState('2026-10-15');
  const [aptTime, setAptTime] = useState('11:00');
  const [aptModality, setAptModality] = useState<'llamada' | 'presencial' | 'online_meet'>('llamada');

  // Visualizador oficial de presupuestos y facturas en Ficha 360°
  const [selectedDoc, setSelectedDoc] = useState<{ type: 'quote' | 'invoice'; data: any } | null>(null);
  const [emailSentToast, setEmailSentToast] = useState<string | null>(null);

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
      return doc.items.map((it: any) => ({
        description: it.description || it.title || doc.concept || 'Servicio Gestoría',
        total: parseFloat(it.total || it.fee || 0),
      }));
    }
    const { subtotal } = getDocTotals(doc);
    return [
      {
        description: doc.concept || doc.items?.[0]?.description || 'Servicios y Asesoría Fiscal',
        total: subtotal,
      },
    ];
  };

  // 3. MODAL NUEVO PRESUPUESTO DIRECTO (Multi-trámite)
  const [showNewQuoteModal, setShowNewQuoteModal] = useState(false);
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
    const initialIds = selectedQuoteServiceIds.length > 0 ? selectedQuoteServiceIds : [servicesCatalog[0]?.id || '1'];
    setSelectedQuoteServiceIds(initialIds);
    setIsConceptManuallyEdited(false);
    const selectedTitles = servicesCatalog.filter((s) => initialIds.includes(s.id)).map((s) => s.title);
    setQuoteConcept(selectedTitles.join(' + '));
    setShowNewQuoteModal(true);
  };

  // Actualizar campos al cambiar el desplegable de trámites
  const handleCatalogSelectChange = (serviceId: string) => {
    setSelectedCatalogServiceId(serviceId);
    if (serviceId === '__NEW__') {
      setIsNewServiceMode(true);
      setDossierTitle('');
      setDossierFee(100);
      setDossierCategory('Nuevo Servicio');
    } else {
      setIsNewServiceMode(false);
      const s = servicesCatalog.find((x) => x.id === serviceId);
      if (s) {
        setDossierTitle(s.title);
        setDossierCategory(s.category);
        setDossierFee(s.defaultFee);
      }
    }
  };

  // Guardar nuevo trámite
  const handleSaveDossier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || !dossierTitle.trim()) return;

    if (isNewServiceMode && saveToCatalogToo) {
      const newService = {
        id: String(Date.now()),
        title: dossierTitle,
        category: dossierCategory,
        defaultFee: dossierFee,
      };
      setServicesCatalog([...servicesCatalog, newService]);
    }

    const nextCount = (selectedClient.dossiers?.length || 0) + 1;
    const year = new Date().getFullYear();
    const newDossier = {
      id: String(Date.now()),
      code: `EXP-${year}-${String(nextCount).padStart(4, '0')}`,
      title: dossierTitle,
      category: dossierCategory,
      status: 'en_proceso',
      progress_percentage: 20,
      fee: dossierFee,
      deadline: dossierDeadline,
      description: `Trámite registrado para ${selectedClient.full_name}.`,
    };

    const updatedClient = {
      ...selectedClient,
      dossiers: [newDossier, ...(selectedClient.dossiers || [])],
    };

    setSelectedClient(updatedClient);
    setClients(clients.map((c) => (c.id === updatedClient.id ? updatedClient : c)));
    setShowAddDossierModal(false);
  };

  // Guardar nueva cita
  const handleSaveAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;

    const newApt = {
      id: String(Date.now()),
      title: aptTitle,
      date: aptDate,
      time: aptTime,
      modality: aptModality,
      status: 'confirmada',
      notes: `Cita con ${selectedClient.full_name} (${selectedClient.phone})`,
    };

    const updatedClient = {
      ...selectedClient,
      appointments: [newApt, ...(selectedClient.appointments || [])],
    };

    setSelectedClient(updatedClient);
    setClients(clients.map((c) => (c.id === updatedClient.id ? updatedClient : c)));
    setShowNewAptModal(false);
    setActive360Tab('citas');
  };

  // Guardar nuevo presupuesto multi-trámite
  const handleSaveQuote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;

    const items = getSelectedQuoteItems();
    if (items.length === 0 && !quoteConcept.trim()) return;

    const nextCount = (selectedClient.quotes?.length || 0) + 1;
    const year = new Date().getFullYear();
    const subtotal = quoteSubtotal;
    const tax = quoteTax;
    const total = quoteTotal;

    const newQuote = {
      id: String(Date.now()),
      code: `PRE-${year}-${String(nextCount).padStart(4, '0')}`,
      concept: quoteConcept.trim() || (items.length > 0 ? items.map((i) => i.title).join(' + ') : 'Trámites y Asesoría Gestoría'),
      amount: subtotal,
      tax_amount: tax,
      total: total,
      status: 'enviado',
      valid_until: quoteValidUntil,
      items: items.map((i) => ({ description: i.title, total: i.fee })),
    };

    const updatedClient = {
      ...selectedClient,
      quotes: [newQuote, ...(selectedClient.quotes || [])],
    };

    setSelectedClient(updatedClient);
    setClients(clients.map((c) => (c.id === updatedClient.id ? updatedClient : c)));
    setShowNewQuoteModal(false);
    setActive360Tab('facturacion');
  };

  // Convertir presupuesto a factura
  const handleConvertQuoteInFicha = (quote: any) => {
    const nextCount = (selectedClient.invoices?.length || 0) + 1;
    const year = new Date().getFullYear();
    const newInvoice = {
      id: String(Date.now()),
      code: `FAC-${year}-${String(nextCount).padStart(4, '0')}`,
      concept: quote.concept,
      total: quote.total,
      status: 'emitida',
      due_date: '2026-11-15',
      payment_method: 'ideal',
      items: quote.items || [{ description: quote.concept, total: quote.amount }],
    };

    const updatedQuotes = selectedClient.quotes.map((q: any) =>
      q.id === quote.id ? { ...q, status: 'convertido' } : q
    );

    const updatedClient = {
      ...selectedClient,
      quotes: updatedQuotes,
      invoices: [newInvoice, ...(selectedClient.invoices || [])],
    };

    setSelectedClient(updatedClient);
    setClients(clients.map((c) => (c.id === updatedClient.id ? updatedClient : c)));
  };

  // Guardar notas del cliente
  const handleSaveNotes = () => {
    if (!selectedClient) return;
    const updated = { ...selectedClient, notes: editedNotes };
    setSelectedClient(updated);
    setClients(clients.map((c) => (c.id === updated.id ? updated : c)));
    setIsEditingNotes(false);
  };

  const filteredClients = clients.filter((c) => {
    const matchesSearch =
      c.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.bsn?.includes(searchTerm) ||
      c.email?.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;
    if (filterStatus === 'activos') return c.status === 'activo';
    if (filterStatus === 'con_digid') return c.digid_status === 'activo';
    if (filterStatus === 'pendientes') return c.digid_status === 'pendiente_activar';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header & Controls del Directorio */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-surface-container">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-on-surface">Directorio de Clientes</h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Base de datos de residentes, BSN, trámites, facturación y ficha completa 360°.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-outline text-[18px]">search</span>
            <input
              type="text"
              placeholder="Buscar por nombre o BSN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 pl-9 pr-4 text-xs border border-outline-variant rounded-md bg-surface-container-lowest focus:border-secondary focus:outline-none w-56"
            />
          </div>

          <Link
            href="/crm/alta-ia"
            className="h-9 px-4 bg-secondary text-white text-xs font-semibold rounded-md shadow-sm hover:bg-blue-700 transition-colors flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">person_add</span>
            <span>+ Nuevo Cliente</span>
          </Link>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex border-b border-surface-container gap-2 text-xs font-semibold">
        <button
          onClick={() => setFilterStatus('todos')}
          className={`pb-2.5 px-3 border-b-2 transition-all ${
            filterStatus === 'todos' ? 'border-secondary text-secondary' : 'border-transparent text-outline hover:text-on-surface'
          }`}
        >
          Todos ({clients.length})
        </button>
        <button
          onClick={() => setFilterStatus('con_digid')}
          className={`pb-2.5 px-3 border-b-2 transition-all ${
            filterStatus === 'con_digid' ? 'border-secondary text-secondary' : 'border-transparent text-outline hover:text-on-surface'
          }`}
        >
          DigiD Activo
        </button>
        <button
          onClick={() => setFilterStatus('pendientes')}
          className={`pb-2.5 px-3 border-b-2 transition-all ${
            filterStatus === 'pendientes' ? 'border-secondary text-secondary' : 'border-transparent text-outline hover:text-on-surface'
          }`}
        >
          Pendientes DigiD
        </button>
      </div>

      {/* Grid: Clients Directory Table */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-container-low text-outline font-semibold uppercase tracking-wider border-b border-surface-container">
              <tr>
                <th className="px-5 py-3">Cliente / Contacto</th>
                <th className="px-5 py-3">BSN</th>
                <th className="px-5 py-3">Ciudad / Dirección</th>
                <th className="px-5 py-3">Estado DigiD</th>
                <th className="px-5 py-3 text-center">Trámites</th>
                <th className="px-5 py-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-surface-container-low transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="font-bold text-on-surface text-sm">{client.full_name}</div>
                    <div className="text-[11px] text-outline mt-0.5">{client.email} · {client.phone}</div>
                  </td>
                  <td className="px-5 py-3.5 font-mono-data font-bold text-secondary">
                    {client.bsn || '—'}
                  </td>
                  <td className="px-5 py-3.5 text-on-surface-variant">
                    <div className="font-semibold text-on-surface">{client.city || 'Países Bajos'}</div>
                    <div className="text-[11px] text-outline">{client.address || '—'}</div>
                  </td>
                  <td className="px-5 py-3.5">
                    {client.digid_status === 'activo' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> DigiD Activo
                      </span>
                    ) : client.digid_status === 'pendiente_activar' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Código Pendiente
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-surface-container text-outline">
                        Sin DigiD
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <span className="px-2 py-0.5 bg-surface-container-high rounded-full font-mono-data font-bold text-[11px]">
                      {client.dossiers?.length || 0}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => {
                        setSelectedClient(client);
                        setEditedNotes(client.notes || '');
                        setIsEditingNotes(false);
                        setActive360Tab('resumen');
                      }}
                      className="h-8 px-3.5 bg-secondary text-white text-xs font-semibold rounded hover:bg-blue-700 transition-colors inline-flex items-center gap-1.5 shadow-sm"
                    >
                      <span className="material-symbols-outlined text-[15px]">visibility</span>
                      <span>Ficha 360°</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* FICHA 360° DEL CLIENTE (RESPONSIVE: PANTALLA COMPLETA EN MÓVIL/TABLET) */}
      {/* ========================================================================= */}
      {selectedClient && (
        <div
          className={`fixed inset-y-0 right-0 ${
            isMaximized ? 'left-0 z-[100]' : 'left-0 lg:left-64 z-40'
          } bg-surface flex flex-col overflow-hidden shadow-2xl border-l border-surface-container-high transition-all`}
          style={{ top: 0, marginTop: 0, paddingTop: 0 }}
        >
          {/* Top Bar de la Ficha 360° */}
          <header className="min-h-16 py-2 px-4 sm:px-6 lg:px-8 bg-surface-container-lowest border-b border-surface-container-high flex flex-wrap items-center justify-between gap-3 shadow-sm shrink-0">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <button
                onClick={() => setSelectedClient(null)}
                className="h-8 sm:h-9 px-2.5 sm:px-3 border border-outline-variant bg-surface hover:bg-surface-container text-on-surface rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
                title="Cerrar y volver al listado"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                <span className="hidden sm:inline">Cerrar Ficha</span>
              </button>

              <div className="h-6 w-px bg-surface-container hidden sm:block"></div>

              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-primary-container text-white font-mono-data font-bold text-xs sm:text-sm flex items-center justify-center shadow-sm shrink-0">
                  {selectedClient.full_name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <h2 className="text-sm sm:text-base font-bold text-on-surface truncate max-w-[180px] sm:max-w-none">{selectedClient.full_name}</h2>
                    <span className="px-1.5 sm:px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded">
                      BSN: {selectedClient.bsn}
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-outline truncate">
                    {selectedClient.city} · {selectedClient.phone}
                  </p>
                </div>
              </div>
            </div>

            {/* BOTONES DE ACCIÓN DIRECTA */}
            <div className="flex items-center gap-1.5 sm:gap-2 ml-auto flex-wrap">
              {/* Botón Nueva Cita Directa */}
              <button
                onClick={() => {
                  setAptModality('llamada'); // Por defecto llamada
                  setAptTitle(`Consulta Telefónica con ${selectedClient.full_name}`);
                  setShowNewAptModal(true);
                }}
                className="h-8 sm:h-9 px-2.5 sm:px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold flex items-center gap-1 sm:gap-1.5 shadow-sm transition-colors"
              >
                <span className="material-symbols-outlined text-[15px] sm:text-[16px]">phone_in_talk</span>
                <span className="hidden md:inline">+ Agendar Cita</span>
                <span className="md:hidden">+ Cita</span>
              </button>

              {/* Botón Nuevo Presupuesto Directo */}
              <button
                onClick={openQuoteModal}
                className="h-8 sm:h-9 px-2.5 sm:px-3 bg-surface-container-lowest border border-outline-variant hover:bg-surface-container text-on-surface rounded-md text-xs font-semibold flex items-center gap-1 sm:gap-1.5 shadow-sm transition-colors"
              >
                <span className="material-symbols-outlined text-[15px] sm:text-[16px]">description</span>
                <span className="hidden md:inline">+ Crear Presupuesto</span>
                <span className="md:hidden">+ Presupuesto</span>
              </button>

              {/* Botón Nuevo Trámite Directo */}
              <button
                onClick={() => {
                  const first = servicesCatalog[0];
                  setSelectedCatalogServiceId(first.id);
                  setDossierTitle(first.title);
                  setDossierCategory(first.category);
                  setDossierFee(first.defaultFee);
                  setIsNewServiceMode(false);
                  setShowAddDossierModal(true);
                }}
                className="h-8 sm:h-9 px-2.5 sm:px-3 bg-secondary text-white rounded-md text-xs font-semibold flex items-center gap-1 sm:gap-1.5 shadow-sm hover:bg-blue-700 transition-colors"
              >
                <span className="material-symbols-outlined text-[15px] sm:text-[16px]">add_circle</span>
                <span className="hidden md:inline">+ Nuevo Trámite</span>
                <span className="md:hidden">+ Trámite</span>
              </button>

              {/* Botón Opcional Maximizar / Restaurar Barra Lateral (visible solo en desktop) */}
              <button
                onClick={() => setIsMaximized(!isMaximized)}
                className="hidden lg:flex h-9 w-9 border border-outline-variant hover:bg-surface-container text-outline hover:text-on-surface rounded-md items-center justify-center transition-colors ml-1"
                title={isMaximized ? "Mostrar barra lateral" : "Ocultar barra lateral (Pantalla completa total)"}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {isMaximized ? 'fullscreen_exit' : 'fullscreen'}
                </span>
              </button>
            </div>
          </header>

          {/* Sub-Tabs de Navegación de la Ficha 360° (Desplazables horizontalmente en móvil) */}
          <div className="bg-surface-container-low px-4 sm:px-6 lg:px-8 border-b border-surface-container flex gap-2 sm:gap-4 text-xs font-semibold shrink-0 overflow-x-auto whitespace-nowrap">
            <button
              onClick={() => setActive360Tab('resumen')}
              className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
                active360Tab === 'resumen' ? 'border-secondary text-secondary' : 'border-transparent text-outline hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">folder</span>
              <span>Trámites ({selectedClient.dossiers?.length || 0})</span>
            </button>
            <button
              onClick={() => setActive360Tab('facturacion')}
              className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
                active360Tab === 'facturacion' ? 'border-secondary text-secondary' : 'border-transparent text-outline hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">receipt_long</span>
              <span>Presupuestos & Facturas ({selectedClient.quotes?.length || 0} / {selectedClient.invoices?.length || 0})</span>
            </button>
            <button
              onClick={() => setActive360Tab('citas')}
              className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
                active360Tab === 'citas' ? 'border-secondary text-secondary' : 'border-transparent text-outline hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">calendar_month</span>
              <span>Citas ({selectedClient.appointments?.length || 0})</span>
            </button>
            <button
              onClick={() => setActive360Tab('personales')}
              className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
                active360Tab === 'personales' ? 'border-secondary text-secondary' : 'border-transparent text-outline hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">badge</span>
              <span>Datos Fiscales</span>
            </button>
            <button
              onClick={() => setActive360Tab('ia')}
              className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
                active360Tab === 'ia' ? 'border-secondary text-secondary' : 'border-transparent text-outline hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[16px] text-secondary">auto_awesome</span>
              <span>Historial IA</span>
            </button>
          </div>

          {/* Área Principal de Contenido de la Ficha 360° */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
            {/* TAB 1: TRÁMITES & EXPEDIENTES */}
            {active360Tab === 'resumen' && (
              <div className="space-y-6 max-w-5xl">
                {/* Notas del Gestor con edición en vivo */}
                <div className="p-4 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase text-outline">Notas Internas del Gestor:</span>
                    <button
                      onClick={() => setIsEditingNotes(!isEditingNotes)}
                      className="text-secondary font-semibold text-xs hover:underline flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[14px]">edit</span>
                      <span>{isEditingNotes ? 'Cancelar' : 'Editar Nota'}</span>
                    </button>
                  </div>

                  {isEditingNotes ? (
                    <div className="space-y-2 mt-2">
                      <textarea
                        rows={3}
                        value={editedNotes}
                        onChange={(e) => setEditedNotes(e.target.value)}
                        className="w-full p-3 border border-outline-variant rounded-md bg-surface text-xs focus:border-secondary focus:outline-none"
                      />
                      <button
                        onClick={handleSaveNotes}
                        className="h-8 px-4 bg-secondary text-white rounded text-xs font-semibold hover:bg-blue-700"
                      >
                        Guardar Nota
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-on-surface leading-relaxed">{selectedClient.notes || 'Sin notas registradas.'}</p>
                  )}
                </div>

                {/* Lista de Expedientes de este cliente */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-sm text-on-surface">Expedientes Activos del Cliente</h3>
                    <button
                      onClick={() => {
                        const first = servicesCatalog[0];
                        setSelectedCatalogServiceId(first.id);
                        setDossierTitle(first.title);
                        setDossierCategory(first.category);
                        setDossierFee(first.defaultFee);
                        setIsNewServiceMode(false);
                        setShowAddDossierModal(true);
                      }}
                      className="h-8 px-3 bg-secondary text-white text-xs font-semibold rounded hover:bg-blue-700 transition-colors flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[15px]">add</span>
                      <span>Añadir Trámite</span>
                    </button>
                  </div>

                  {selectedClient.dossiers && selectedClient.dossiers.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedClient.dossiers.map((dos: any) => (
                        <div
                          key={dos.id}
                          className="p-5 rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono-data font-bold text-secondary text-xs">{dos.code}</span>
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded uppercase">
                              {dos.status}
                            </span>
                          </div>

                          <div>
                            <h4 className="font-bold text-sm text-on-surface">{dos.title}</h4>
                            <p className="text-xs text-on-surface-variant mt-1">{dos.description}</p>
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px] text-outline font-mono-data">
                              <span>Progreso: {dos.progress_percentage}%</span>
                              <span>Plazo: {dos.deadline || 'Sin plazo'}</span>
                            </div>
                            <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden">
                              <div className="bg-secondary h-full rounded-full" style={{ width: `${dos.progress_percentage}%` }}></div>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-surface-container flex items-center justify-between text-xs">
                            <span className="text-outline">Tarifa:</span>
                            <span className="font-mono-data font-bold text-on-surface">€ {parseFloat(dos.fee).toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-surface-container-lowest rounded-xl border border-dashed border-outline-variant text-xs text-outline">
                      No hay trámites abiertos para este cliente todavía.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: PRESUPUESTOS & FACTURAS DE ESTE CLIENTE */}
            {active360Tab === 'facturacion' && (
              <div className="space-y-6 max-w-5xl">
                {/* Presupuestos */}
                <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-on-surface">Presupuestos de {selectedClient.full_name}</h3>
                      <p className="text-xs text-on-surface-variant">Generación con IVA/BTW 21% y conversión en 1 clic a factura.</p>
                    </div>
                    <button
                      onClick={openQuoteModal}
                      className="h-8 px-3 bg-secondary text-white text-xs font-semibold rounded hover:bg-blue-700 transition-colors flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[15px]">add</span>
                      <span>Crear Presupuesto</span>
                    </button>
                  </div>

                  {selectedClient.quotes && selectedClient.quotes.length > 0 ? (
                    <div className="divide-y divide-surface-container">
                      {selectedClient.quotes.map((q: any) => (
                        <div key={q.id} className="py-3 flex items-center justify-between text-xs">
                          <div className="flex-1 pr-4">
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedDoc({
                                  type: 'quote',
                                  data: {
                                    ...q,
                                    client_name: selectedClient.full_name,
                                    client_bsn: selectedClient.bsn,
                                    email: selectedClient.email,
                                    phone: selectedClient.phone,
                                    address: selectedClient.address,
                                    city: selectedClient.city,
                                  },
                                })
                              }
                              className="font-mono-data font-bold text-secondary text-xs hover:underline flex items-center gap-1.5"
                              title="Abrir presupuesto oficial"
                            >
                              <span className="material-symbols-outlined text-[14px]">request_quote</span>
                              <span>{q.code}</span>
                            </button>
                            <p className="font-semibold text-on-surface mt-0.5">{q.concept}</p>
                            {q.items && q.items.length > 1 && (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {q.items.map((it: any, idx: number) => (
                                  <span key={idx} className="inline-flex items-center gap-1 text-[10px] bg-surface-container px-2 py-0.5 rounded text-on-surface-variant font-medium">
                                    <span className="material-symbols-outlined text-[11px] text-secondary">check_circle</span>
                                    {it.description} (€{parseFloat(it.total).toFixed(2)})
                                  </span>
                                ))}
                              </div>
                            )}
                            <span className="text-[11px] text-outline font-mono-data mt-1 block">Válido hasta: {q.valid_until}</span>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <span className="font-mono-data font-bold text-sm text-on-surface block">
                                € {parseFloat(q.total).toFixed(2)}
                              </span>
                              <span className="text-[10px] text-outline font-semibold uppercase">{q.status}</span>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                setSelectedDoc({
                                  type: 'quote',
                                  data: {
                                    ...q,
                                    client_name: selectedClient.full_name,
                                    client_bsn: selectedClient.bsn,
                                    email: selectedClient.email,
                                    phone: selectedClient.phone,
                                    address: selectedClient.address,
                                    city: selectedClient.city,
                                  },
                                })
                              }
                              className="h-7 px-2.5 bg-surface-container border border-outline-variant hover:bg-surface-container-high rounded text-[11px] font-semibold flex items-center gap-1 text-on-surface transition-colors"
                              title="Ver detalle del presupuesto"
                            >
                              <span className="material-symbols-outlined text-[13px] text-secondary">visibility</span>
                              <span>Ver</span>
                            </button>

                            {q.status !== 'convertido' && (
                              <button
                                onClick={() => handleConvertQuoteInFicha(q)}
                                className="h-7 px-2.5 bg-secondary text-white rounded text-[11px] font-semibold hover:bg-blue-700 flex items-center gap-1 shadow-sm"
                              >
                                <span className="material-symbols-outlined text-[13px]">transform</span>
                                <span>Convertir a Factura</span>
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-outline py-2">No hay presupuestos emitidos aún.</p>
                  )}
                </div>

                {/* Facturas */}
                <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm space-y-4">
                  <h3 className="font-bold text-sm text-on-surface">Facturas Emitidas</h3>
                  {selectedClient.invoices && selectedClient.invoices.length > 0 ? (
                    <div className="divide-y divide-surface-container">
                      {selectedClient.invoices.map((inv: any) => (
                        <div key={inv.id} className="py-3 flex items-center justify-between text-xs">
                          <div>
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedDoc({
                                  type: 'invoice',
                                  data: {
                                    ...inv,
                                    client_name: selectedClient.full_name,
                                    client_bsn: selectedClient.bsn,
                                    email: selectedClient.email,
                                    phone: selectedClient.phone,
                                    address: selectedClient.address,
                                    city: selectedClient.city,
                                  },
                                })
                              }
                              className="font-mono-data font-bold text-secondary text-xs hover:underline flex items-center gap-1.5"
                              title="Abrir factura oficial"
                            >
                              <span className="material-symbols-outlined text-[14px]">description</span>
                              <span>{inv.code}</span>
                            </button>
                            <p className="font-semibold text-on-surface mt-0.5">{inv.concept}</p>
                            <span className="text-[11px] text-outline font-mono-data">Vencimiento: {inv.due_date}</span>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <span className="font-mono-data font-bold text-sm text-on-surface block">
                                € {parseFloat(inv.total).toFixed(2)}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                  inv.status === 'pagada' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                                }`}
                              >
                                {inv.status === 'pagada' ? 'PAGADA (iDEAL)' : 'PENDIENTE DE PAGO'}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                setSelectedDoc({
                                  type: 'invoice',
                                  data: {
                                    ...inv,
                                    client_name: selectedClient.full_name,
                                    client_bsn: selectedClient.bsn,
                                    email: selectedClient.email,
                                    phone: selectedClient.phone,
                                    address: selectedClient.address,
                                    city: selectedClient.city,
                                  },
                                })
                              }
                              className="h-7 px-2.5 bg-surface-container border border-outline-variant hover:bg-surface-container-high rounded text-[11px] font-semibold flex items-center gap-1 text-on-surface transition-colors"
                              title="Ver detalle de factura"
                            >
                              <span className="material-symbols-outlined text-[13px] text-secondary">visibility</span>
                              <span>Ver Factura</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-outline py-2">No hay facturas emitidas aún.</p>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: CITAS & AGENDA DE ESTE CLIENTE */}
            {active360Tab === 'citas' && (
              <div className="space-y-6 max-w-5xl">
                <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-on-surface">Citas y Llamadas con {selectedClient.full_name}</h3>
                      <p className="text-xs text-on-surface-variant">Llamada telefónica por defecto, o videollamada / reunión presencial.</p>
                    </div>
                    <button
                      onClick={() => {
                        setAptModality('llamada');
                        setAptTitle(`Consulta Telefónica con ${selectedClient.full_name}`);
                        setShowNewAptModal(true);
                      }}
                      className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded transition-colors flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[15px]">add</span>
                      <span>Agendar Cita</span>
                    </button>
                  </div>

                  {selectedClient.appointments && selectedClient.appointments.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {selectedClient.appointments.map((a: any) => (
                        <div key={a.id} className="p-4 rounded-xl border border-surface-container bg-surface space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-mono-data font-bold text-xs text-secondary">{a.date} · {a.time}</span>
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-bold text-[10px] rounded uppercase">
                              {a.status}
                            </span>
                          </div>
                          <h4 className="font-bold text-xs text-on-surface">{a.title}</h4>
                          <div className="flex items-center gap-2 pt-1 text-xs">
                            {a.modality === 'llamada' ? (
                              <a
                                href={`tel:${selectedClient.phone}`}
                                className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-2 py-1 rounded"
                              >
                                <span className="material-symbols-outlined text-[14px]">call</span>
                                <span>Llamar al {selectedClient.phone}</span>
                              </a>
                            ) : a.modality === 'online_meet' ? (
                              <span className="inline-flex items-center gap-1 text-indigo-700 font-semibold bg-indigo-50 px-2 py-1 rounded">
                                <span className="material-symbols-outlined text-[14px]">videocam</span>
                                <span>Videollamada</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-on-surface-variant font-semibold bg-surface-container px-2 py-1 rounded">
                                <span className="material-symbols-outlined text-[14px]">business</span>
                                <span>Solo Presencial</span>
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-outline py-2">No hay citas registradas para este cliente.</p>
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: DATOS FISCALES & PERSONALES */}
            {active360Tab === 'personales' && (
              <div className="max-w-4xl bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm space-y-6">
                <h3 className="font-bold text-sm text-on-surface">Datos Fiscales Neerlandeses y de Contacto</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3 bg-surface rounded border border-surface-container">
                    <span className="text-[10px] font-bold uppercase text-outline">BSN Oficial:</span>
                    <p className="font-mono-data font-bold text-sm text-secondary mt-1">{selectedClient.bsn}</p>
                  </div>
                  <div className="p-3 bg-surface rounded border border-surface-container">
                    <span className="text-[10px] font-bold uppercase text-outline">Documento / Pasaporte:</span>
                    <p className="font-mono-data font-bold text-sm text-on-surface mt-1">{selectedClient.id_document_number || 'RO9284102'}</p>
                  </div>
                  <div className="p-3 bg-surface rounded border border-surface-container">
                    <span className="text-[10px] font-bold uppercase text-outline">Teléfono de Contacto:</span>
                    <p className="font-semibold text-on-surface mt-1">{selectedClient.phone}</p>
                  </div>
                  <div className="p-3 bg-surface rounded border border-surface-container">
                    <span className="text-[10px] font-bold uppercase text-outline">Correo Electrónico:</span>
                    <p className="font-semibold text-on-surface mt-1">{selectedClient.email}</p>
                  </div>
                  <div className="p-3 bg-surface rounded border border-surface-container">
                    <span className="text-[10px] font-bold uppercase text-outline">Dirección en Países Bajos:</span>
                    <p className="font-semibold text-on-surface mt-1">{selectedClient.address || '—'}</p>
                  </div>
                  <div className="p-3 bg-surface rounded border border-surface-container">
                    <span className="text-[10px] font-bold uppercase text-outline">Cuenta Bancaria (IBAN):</span>
                    <p className="font-mono-data font-bold text-on-surface mt-1">{selectedClient.iban || 'NL91INGB0001234567'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: ACTIVIDAD IA */}
            {active360Tab === 'ia' && (
              <div className="max-w-4xl space-y-4">
                <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl flex items-start gap-3 text-xs">
                  <span className="material-symbols-outlined text-indigo-600 text-xl">auto_awesome</span>
                  <div>
                    <h5 className="font-bold text-indigo-950">Alta y Escaneo por Inteligencia Artificial</h5>
                    <p className="text-indigo-800 mt-0.5">
                      Expediente auditado y registrado con motor heurístico y OpenAI. 100% verificado por el gestor.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. MODAL NUEVO TRÁMITE (Desplegable + Precios + Guardar nuevo servicio) */}
      {/* ========================================================================= */}
      {showAddDossierModal && (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveDossier}
            className="bg-surface-container-lowest max-w-lg w-full rounded-2xl border border-outline-variant shadow-2xl p-6 space-y-4 animate-in zoom-in-95"
          >
            <div className="flex items-center justify-between pb-2 border-b border-surface-container">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">assignment_add</span>
                <h3 className="font-bold text-sm text-on-surface">
                  Abrir Trámite para {selectedClient?.full_name}
                </h3>
              </div>
              <button type="button" onClick={() => setShowAddDossierModal(false)} className="text-outline">
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* DESPLEGABLE DE TRÁMITES Y SERVICIOS */}
              <div>
                <label className="block text-outline uppercase font-semibold mb-1">
                  Selecciona Trámite del Catálogo:
                </label>
                <select
                  value={selectedCatalogServiceId}
                  onChange={(e) => handleCatalogSelectChange(e.target.value)}
                  className="w-full h-10 px-3 border border-outline-variant rounded-md bg-surface font-semibold text-on-surface focus:border-secondary focus:outline-none"
                >
                  {servicesCatalog.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title} — € {s.defaultFee.toFixed(2)} ({s.category})
                    </option>
                  ))}
                  <option value="__NEW__">+ Crear Nuevo Servicio Personalizado...</option>
                </select>
              </div>

              {/* Si es nuevo servicio o edición del nombre */}
              <div>
                <label className="block text-outline uppercase font-semibold mb-1">
                  Nombre del Trámite en Expediente:
                </label>
                <input
                  required
                  type="text"
                  value={dossierTitle}
                  onChange={(e) => setDossierTitle(e.target.value)}
                  className="w-full h-9 px-3 border border-outline-variant rounded bg-surface font-medium focus:border-secondary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-outline uppercase font-semibold mb-1">Categoría</label>
                  <input
                    type="text"
                    value={dossierCategory}
                    onChange={(e) => setDossierCategory(e.target.value)}
                    className="w-full h-9 px-3 border border-outline-variant rounded bg-surface focus:border-secondary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-outline uppercase font-semibold mb-1">Precio / Honorarios (€)</label>
                  <input
                    required
                    type="number"
                    value={dossierFee}
                    onChange={(e) => setDossierFee(parseFloat(e.target.value) || 0)}
                    className="w-full h-9 px-3 border border-outline-variant rounded bg-surface font-mono-data font-bold text-secondary focus:border-secondary focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-outline uppercase font-semibold mb-1">Plazo Objetivo / Vencimiento</label>
                <input
                  type="date"
                  value={dossierDeadline}
                  onChange={(e) => setDossierDeadline(e.target.value)}
                  className="w-full h-9 px-3 border border-outline-variant rounded bg-surface font-mono-data focus:border-secondary focus:outline-none"
                />
              </div>

              {/* Opción para guardar permanentemente en el catálogo */}
              {isNewServiceMode && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="saveCatalog"
                    checked={saveToCatalogToo}
                    onChange={(e) => setSaveToCatalogToo(e.target.checked)}
                    className="accent-secondary"
                  />
                  <label htmlFor="saveCatalog" className="text-blue-900 font-semibold text-[11px] cursor-pointer">
                    Guardar también este nuevo servicio en el catálogo para futuros clientes
                  </label>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-surface-container">
              <button
                type="button"
                onClick={() => setShowAddDossierModal(false)}
                className="h-8 px-3 border border-outline-variant rounded text-xs font-semibold hover:bg-surface-container"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="h-8 px-4 bg-secondary text-white rounded text-xs font-semibold hover:bg-blue-700 shadow-sm"
              >
                Guardar Trámite
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. MODAL NUEVA CITA DIRECTA (Cliente bloqueado, llamada por defecto) */}
      {/* ========================================================================= */}
      {showNewAptModal && (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveAppointment}
            className="bg-surface-container-lowest max-w-md w-full rounded-2xl border border-outline-variant shadow-2xl p-6 space-y-4 animate-in zoom-in-95"
          >
            <div className="flex items-center justify-between pb-2 border-b border-surface-container">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-600">event_available</span>
                <h3 className="font-bold text-sm text-on-surface">Nueva Cita con {selectedClient?.full_name}</h3>
              </div>
              <button type="button" onClick={() => setShowNewAptModal(false)} className="text-outline">
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Cliente bloqueado por defecto */}
              <div className="p-3 bg-surface-container-low rounded-lg border border-surface-container">
                <span className="text-[10px] font-bold uppercase text-outline">Cliente Asignado:</span>
                <p className="font-bold text-on-surface text-sm mt-0.5">{selectedClient?.full_name}</p>
                <p className="text-[11px] text-outline font-mono-data">{selectedClient?.phone} · BSN: {selectedClient?.bsn}</p>
              </div>

              {/* Selector de Modalidad (Llamada por defecto) */}
              <div>
                <label className="block text-outline uppercase font-semibold mb-1.5">
                  Modalidad de la Cita:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAptModality('llamada');
                      setAptTitle(`Consulta Telefónica con ${selectedClient?.full_name}`);
                    }}
                    className={`p-2 rounded-lg border text-center transition-all flex flex-col items-center gap-1 ${
                      aptModality === 'llamada'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold ring-2 ring-emerald-500/20'
                        : 'border-outline-variant bg-surface text-outline hover:bg-surface-container'
                    }`}
                  >
                    <span className="material-symbols-outlined text-base text-emerald-600">call</span>
                    <span className="text-[10px]">Llamada (Defecto)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAptModality('presencial');
                      setAptTitle(`Cita Presencial con ${selectedClient?.full_name}`);
                    }}
                    className={`p-2 rounded-lg border text-center transition-all flex flex-col items-center gap-1 ${
                      aptModality === 'presencial'
                        ? 'border-secondary bg-blue-50 text-secondary font-bold ring-2 ring-blue-500/20'
                        : 'border-outline-variant bg-surface text-outline hover:bg-surface-container'
                    }`}
                  >
                    <span className="material-symbols-outlined text-base text-secondary">business</span>
                    <span className="text-[10px]">Solo Presencial</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAptModality('online_meet');
                      setAptTitle(`Videollamada con ${selectedClient?.full_name}`);
                    }}
                    className={`p-2 rounded-lg border text-center transition-all flex flex-col items-center gap-1 ${
                      aptModality === 'online_meet'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-bold ring-2 ring-indigo-500/20'
                        : 'border-outline-variant bg-surface text-outline hover:bg-surface-container'
                    }`}
                  >
                    <span className="material-symbols-outlined text-base text-indigo-600">videocam</span>
                    <span className="text-[10px]">Videollamada</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-outline uppercase font-semibold mb-1">Motivo / Título de la Cita</label>
                <input
                  required
                  type="text"
                  value={aptTitle}
                  onChange={(e) => setAptTitle(e.target.value)}
                  className="w-full h-9 px-3 border border-outline-variant rounded bg-surface focus:border-secondary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-outline uppercase font-semibold mb-1">Fecha</label>
                  <input
                    required
                    type="date"
                    value={aptDate}
                    onChange={(e) => setAptDate(e.target.value)}
                    className="w-full h-9 px-3 border border-outline-variant rounded bg-surface font-mono-data focus:border-secondary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-outline uppercase font-semibold mb-1">Hora</label>
                  <input
                    required
                    type="time"
                    value={aptTime}
                    onChange={(e) => setAptTime(e.target.value)}
                    className="w-full h-9 px-3 border border-outline-variant rounded bg-surface font-mono-data focus:border-secondary focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-surface-container">
              <button
                type="button"
                onClick={() => setShowNewAptModal(false)}
                className="h-8 px-3 border border-outline-variant rounded text-xs font-semibold hover:bg-surface-container"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="h-8 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold shadow-sm"
              >
                Confirmar Cita ({aptModality === 'llamada' ? 'Llamada' : aptModality === 'presencial' ? 'Presencial' : 'Videollamada'})
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. MODAL NUEVO PRESUPUESTO DIRECTO (MULTI-TRÁMITE VINCULADO AL CATÁLOGO) */}
      {/* ========================================================================= */}
      {showNewQuoteModal && (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveQuote}
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
                    Cliente: <strong className="text-secondary">{selectedClient?.full_name}</strong> (BSN: {selectedClient?.bsn})
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
                          onChange={() => {}} // Manejado por onClick del contenedor
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
      {/* ========================================================================= */}
      {/* 4. MODAL VISUALIZADOR OFICIAL DE FACTURA O PRESUPUESTO */}
      {/* ========================================================================= */}
      {selectedDoc && (
        <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-surface-container-lowest max-w-3xl w-full rounded-2xl border border-outline-variant shadow-2xl overflow-hidden flex flex-col my-auto animate-in zoom-in-95">
            {/* Barra de Herramientas Superior */}
            <div className="bg-surface-container px-6 py-3 border-b border-surface-container-high flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span
                  className={`px-2.5 py-1 rounded text-xs font-bold font-mono-data uppercase ${
                    selectedDoc.type === 'invoice'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {selectedDoc.type === 'invoice' ? 'FACTURA OFICIAL (VERKOOPFACTUUR)' : 'PRESUPUESTO (OFFERTE)'}
                </span>
                <span className="font-mono-data font-bold text-sm text-on-surface">
                  {selectedDoc.data.code}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="h-8 px-3 bg-surface border border-outline-variant hover:bg-surface-container text-on-surface rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                  title="Imprimir documento o guardar como PDF"
                >
                  <span className="material-symbols-outlined text-[15px]">print</span>
                  <span>Imprimir / PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const email = selectedDoc.data.email || selectedClient?.email || 'el cliente';
                    setEmailSentToast(`Documento ${selectedDoc.data.code} enviado por correo electrónico a ${email}`);
                    setTimeout(() => setEmailSentToast(null), 4000);
                  }}
                  className="h-8 px-3 bg-secondary text-white hover:bg-blue-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <span className="material-symbols-outlined text-[15px]">send</span>
                  <span>Enviar por Email</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedDoc(null)}
                  className="text-outline hover:text-on-surface p-1.5 rounded-lg hover:bg-surface"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
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
                    <div className="w-8 h-8 rounded-lg bg-secondary text-white font-bold flex items-center justify-center text-sm">
                      NG
                    </div>
                    <span className="font-bold text-base tracking-tight text-on-surface">NexusGest Advies B.V.</span>
                  </div>
                  <p className="text-[11px] text-on-surface-variant mt-1.5 leading-relaxed">
                    Gestoría y Asesoría Fiscal en Países Bajos<br />
                    Keizersgracht 421, 1016 EK Amsterdam<br />
                    KVK: 84920194 · BTW-id: NL849201940B01<br />
                    IBAN: NL91 INGB 0001 2345 67 (ING Bank)
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
                    <strong>{selectedDoc.data.due_date || selectedDoc.data.valid_until || '2026-11-30'}</strong>
                  </div>
                  <div className="pt-1">
                    {selectedDoc.type === 'invoice' ? (
                      selectedDoc.data.status === 'pagada' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase">
                          <span className="material-symbols-outlined text-[13px]">check_circle</span>
                          <span>Pagada vía iDEAL</span>
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
                      {selectedDoc.data.client_name || selectedClient?.full_name || 'Maria Popescu'}
                    </h3>
                    <p className="text-xs text-on-surface-variant font-mono-data mt-0.5">
                      BSN Oficial: <strong>{selectedDoc.data.client_bsn || selectedClient?.bsn || '982145672'}</strong>
                    </p>
                  </div>
                  <div className="text-xs text-on-surface-variant space-y-0.5">
                    <p>{selectedDoc.data.address || selectedClient?.address || 'Strijpsestraat 142'}</p>
                    <p>{selectedDoc.data.city || selectedClient?.city || 'Eindhoven'}, Países Bajos</p>
                    <p className="text-outline">{selectedDoc.data.email || selectedClient?.email || 'cliente@nexusgest.nl'}</p>
                  </div>
                </div>
              </div>

              {/* Tabla de Conceptos / Trámites */}
              <div className="border border-outline-variant/60 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-container-low text-outline font-semibold uppercase tracking-wider border-b border-surface-container">
                    <tr>
                      <th className="px-4 py-2.5">Descripción del Trámite / Servicio</th>
                      <th className="px-4 py-2.5 text-center">Cant.</th>
                      <th className="px-4 py-2.5 text-right">Base (€)</th>
                      <th className="px-4 py-2.5 text-center">BTW</th>
                      <th className="px-4 py-2.5 text-right">Total (€)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container">
                    {getDocItems(selectedDoc.data).map((item: any, idx: number) => {
                      const itemBase = item.total || 0;
                      const itemBtw = Math.round(itemBase * 0.21 * 100) / 100;
                      const itemTotal = Math.round((itemBase + itemBtw) * 100) / 100;
                      return (
                        <tr key={idx} className="hover:bg-surface-container-low/50">
                          <td className="px-4 py-3 font-semibold text-on-surface">
                            {item.description}
                          </td>
                          <td className="px-4 py-3 text-center font-mono-data text-outline">
                            1
                          </td>
                          <td className="px-4 py-3 text-right font-mono-data">
                            € {itemBase.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-center font-mono-data text-outline">
                            21%
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
                    Tipo impositivo aplicado: 21% BTW según legislación tributaria de los Países Bajos (Belastingdienst).
                  </p>
                  {selectedDoc.type === 'invoice' && selectedDoc.data.status === 'pagada' && (
                    <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-800 font-mono-data text-[10px] space-y-0.5">
                      <span className="font-bold block">Referencia iDEAL:</span>
                      <span>{selectedDoc.data.payment_reference || 'IDL-TRX-2026-89472'}</span>
                    </div>
                  )}
                </div>

                <div className="w-full sm:w-64 p-4 rounded-xl bg-surface-container-low font-mono-data text-xs space-y-2 border border-surface-container">
                  <div className="flex justify-between text-outline">
                    <span>Base Imponible:</span>
                    <span>€ {getDocTotals(selectedDoc.data).subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-outline">
                    <span>21% BTW (IVA NL):</span>
                    <span>€ {getDocTotals(selectedDoc.data).tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm text-secondary pt-2 border-t border-surface-container">
                    <span>Total a {selectedDoc.type === 'invoice' ? 'Pagar' : 'Presupuestar'}:</span>
                    <span>€ {getDocTotals(selectedDoc.data).total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pie de Acciones Inferior */}
            <div className="bg-surface-container px-6 py-3 border-t border-surface-container-high flex items-center justify-between">
              <div className="text-[11px] text-outline">
                Documento legal emitido por NexusGest · Países Bajos
              </div>

              <div className="flex items-center gap-2">
                {selectedDoc.type === 'quote' && selectedDoc.data.status !== 'convertido' && (
                  <button
                    type="button"
                    onClick={() => {
                      handleConvertQuoteInFicha(selectedDoc.data);
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
