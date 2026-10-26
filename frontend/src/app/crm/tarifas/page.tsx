'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';

export interface ServicePriceItem {
  id: string;
  code: string;
  icon: string;
  title: string;
  category: 'impuestos' | 'subsidios' | 'llegada' | 'empresas' | 'vehiculos' | 'otros';
  basePrice: number;
  btwRate: number; // 0.21 o 0
  priceIncludesBtw?: boolean;
  badge: string;
  duration: string;
  active: boolean;
  desc: string;
}

const DEFAULT_SERVICES: ServicePriceItem[] = [
  {
    id: 'renta-mform',
    code: 'SRV-MFORM',
    icon: 'receipt_long',
    title: 'Declaración de la Renta (M-Form / P-Form)',
    category: 'impuestos',
    basePrice: 89,
    btwRate: 0.21,
    badge: 'Más Solicitado',
    duration: '24-48 horas',
    active: true,
    desc: 'Maximizamos la devolución en el primer año fiscal con deducciones de traslado y tramos proporcionales.',
  },
  {
    id: 'digid',
    code: 'SRV-DIGID',
    icon: 'fingerprint',
    title: 'DigiD (Identidad Digital)',
    category: 'llegada',
    basePrice: 29,
    btwRate: 0.21,
    badge: 'Esencial',
    duration: '3-5 días',
    active: true,
    desc: 'Solicitud, activación y desbloqueo de clave digital oficial sin pérdidas postales.',
  },
  {
    id: 'zorgtoeslag',
    code: 'SRV-ZORG',
    icon: 'medical_services',
    title: 'Zorgtoeslag (Subsidio de Salud)',
    category: 'subsidios',
    basePrice: 45,
    btwRate: 0.21,
    badge: 'Hasta 154€/mes',
    duration: '2-4 semanas',
    active: true,
    desc: 'Reclamación del subsidio mensual de seguro médico con carácter retroactivo.',
  },
  {
    id: 'seguro-medico',
    code: 'SRV-SEGURO',
    icon: 'health_and_safety',
    title: 'Seguro Médico Obligatorio',
    category: 'llegada',
    basePrice: 35,
    btwRate: 0.21,
    badge: 'Ahorro',
    duration: 'Mismo día',
    active: true,
    desc: 'Asesoría de póliza de salud básica holandesa al precio más competitivo.',
  },
  {
    id: 'formulario-u1',
    code: 'SRV-U1',
    icon: 'description',
    title: 'Formulario U1 (Exportar Paro)',
    category: 'otros',
    basePrice: 55,
    btwRate: 0.21,
    badge: 'Rápido',
    duration: '2-3 semanas',
    active: true,
    desc: 'Certificación y traslado de periodos cotizados en NL al paro de España o UE.',
  },
  {
    id: 'desempleo-ww',
    code: 'SRV-WW',
    icon: 'work_outline',
    title: 'Prestación por Desempleo WW (UWV)',
    category: 'subsidios',
    basePrice: 95,
    btwRate: 0.21,
    badge: 'Completo',
    duration: '4 semanas',
    active: true,
    desc: 'Tramitación y defensa de subsidio por despido o fin de contrato ante UWV.',
  },
  {
    id: 'autonomos-zzp',
    code: 'SRV-ZZP',
    icon: 'storefront',
    title: 'Autónomos / ZZP (KvK & BTW)',
    category: 'empresas',
    basePrice: 120,
    btwRate: 0.21,
    badge: 'Emprendedores',
    duration: '48 horas',
    active: true,
    desc: 'Alta en Cámara de Comercio KvK, BTW-id y configuración fiscal.',
  },
  {
    id: 'residencia-fiscal',
    code: 'SRV-RESIDENCIA',
    icon: 'verified_user',
    title: 'Certificado de Residencia Fiscal',
    category: 'impuestos',
    basePrice: 49,
    btwRate: 0.21,
    badge: 'Legal',
    duration: '1-2 semanas',
    active: true,
    desc: 'Acreditación oficial ante Belastingdienst para evitar doble imposición.',
  },
  {
    id: 'importacion-vehiculos',
    code: 'SRV-RDW-BPM',
    icon: 'directions_car',
    title: 'Importación de Vehículos (RDW & BPM)',
    category: 'vehiculos',
    basePrice: 149,
    btwRate: 0.21,
    badge: 'Gestión Integral',
    duration: '10-15 días',
    active: true,
    desc: 'Matriculación holandesa, exención o liquidación del impuesto BPM.',
  },
  {
    id: 'kinderopvangtoeslag',
    code: 'SRV-KINDER',
    icon: 'child_care',
    title: 'Kinderopvangtoeslag & Subsidios Hijos',
    category: 'subsidios',
    basePrice: 65,
    btwRate: 0.21,
    badge: 'Familias',
    duration: '3-4 semanas',
    active: true,
    desc: 'Ayudas estatales para guardería, Kindgebonden budget y prestaciones.',
  },
  {
    id: 'documentos-admin',
    code: 'SRV-ADMIN',
    icon: 'folder_shared',
    title: 'Documentos Administrativos & BSN',
    category: 'llegada',
    basePrice: 39,
    btwRate: 0.21,
    badge: 'Llegada',
    duration: '24 horas',
    active: true,
    desc: 'Citas de empadronamiento Gemeente, BSN y traducción de cartas.',
  },
  {
    id: 'consulta-privada',
    code: 'SRV-CONSULTA',
    icon: 'support_agent',
    title: 'Consulta Privada 1 a 1',
    category: 'otros',
    basePrice: 49,
    btwRate: 0.21,
    badge: 'Videollamada / Presencial',
    duration: 'Inmediato',
    active: true,
    desc: 'Sesión personalizada de 30 o 60 min con asesor especialista.',
  },
  {
    id: 'otros-tramites',
    code: 'SRV-OTROS',
    icon: 'tune',
    title: 'Otros Trámites & Recursos Belastingdienst',
    category: 'otros',
    basePrice: 75,
    btwRate: 0.21,
    badge: 'Personalizado',
    duration: 'Según caso',
    active: true,
    desc: 'Huurtoeslag, recursos contra multas y revisión de cartas holandesas.',
  },
];

export default function TerminalTarifasPage() {
  const [services, setServices] = useState<ServicePriceItem[]>(DEFAULT_SERVICES);
  const [activeCategory, setActiveCategory] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempPrice, setTempPrice] = useState<number>(0);
  const [tempBadge, setTempBadge] = useState<string>('');
  const [tempTitle, setTempTitle] = useState<string>('');
  const [tempDesc, setTempDesc] = useState<string>('');
  const [tempDuration, setTempDuration] = useState<string>('');
  const [saveToast, setSaveToast] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [priceHistory, setPriceHistory] = useState<{ date: string; description: string; changes: number }[]>([]);

  // Formulario nuevo servicio
  const [newTitle, setNewTitle] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newCategory, setNewCategory] = useState<'impuestos' | 'subsidios' | 'llegada' | 'empresas' | 'vehiculos' | 'otros'>('impuestos');
  const [newPrice, setNewPrice] = useState(60);
  const [newBadge, setNewBadge] = useState('Nuevo');
  const [newDesc, setNewDesc] = useState('');

  // El catálogo siempre procede de PostgreSQL.
  useEffect(() => {
    try {
      const saved = localStorage.getItem('nexusgest_tariff_history');
      if (saved) setPriceHistory(JSON.parse(saved));
    } catch { /* historial local no bloquea el catálogo */ }
    apiFetch('/services')
      .then(async (response) => {
        if (!response.ok) throw new Error('No se pudo cargar el catálogo.');
        const data = await response.json();
        if (Array.isArray(data.services)) {
          const normalized = data.services.map((raw: any, index: number): ServicePriceItem => {
            const fallback = DEFAULT_SERVICES[index] || DEFAULT_SERVICES[DEFAULT_SERVICES.length - 1];
            const rawCategory = String(raw.category || fallback.category).toLowerCase();
            const category = (['impuestos', 'subsidios', 'llegada', 'empresas', 'vehiculos', 'otros'].includes(rawCategory)
              ? rawCategory
              : fallback.category) as ServicePriceItem['category'];
            return {
              ...fallback,
              ...raw,
              id: String(raw.id || fallback.id),
              code: String(raw.code || fallback.code),
              title: String(raw.title || fallback.title),
              category,
              basePrice: Number(raw.basePrice ?? raw.priceFinal ?? fallback.basePrice) || 0,
              btwRate: Number(raw.btwRate ?? 0.21),
              priceIncludesBtw: raw.priceIncludesBtw !== false,
              active: raw.active !== false,
              badge: String(raw.badge || fallback.badge),
              duration: String(raw.duration || fallback.duration),
              desc: String(raw.desc || raw.description || fallback.desc),
            };
          });
          setServices(normalized);
        }
      })
      .catch((error) => window.alert(error instanceof Error ? error.message : 'No se pudo cargar el catálogo.'));
  }, []);

  // Guardar exclusivamente en PostgreSQL.
  const persistServices = async (updated: ServicePriceItem[], description = 'Catálogo actualizado') => {
    try {
      const response = await apiFetch('/services/bulk', {
        method: 'PUT',
        body: JSON.stringify({ services: updated }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'No se pudo guardar el catálogo.');
      setServices(Array.isArray(data.services) && data.services.length > 0 ? data.services : updated);
      const changes = updated.reduce((total, item, index) => total + (item.basePrice !== services[index]?.basePrice ? 1 : 0), 0);
      const entry = { date: new Date().toLocaleString('es-ES'), description, changes };
      setPriceHistory((current) => {
        const next = [entry, ...current].slice(0, 20);
        localStorage.setItem('nexusgest_tariff_history', JSON.stringify(next));
        return next;
      });
      setSaveToast(true);
      setTimeout(() => setSaveToast(false), 3000);
    } catch (error) {
      setSaveToast(false);
      window.alert(error instanceof Error ? error.message : 'No se pudo guardar el catálogo.');
    }
  };

  const handleStartEdit = (srv: ServicePriceItem) => {
    setEditingId(srv.id);
    setTempPrice(srv.basePrice);
    setTempBadge(srv.badge);
    setTempTitle(srv.title);
    setTempDesc(srv.desc);
    setTempDuration(srv.duration);
  };

  const handleSaveEdit = async (id: string) => {
    const updated = services.map((s) => {
      if (s.id === id) {
        return {
          ...s,
          basePrice: Number(tempPrice),
          badge: tempBadge,
          title: tempTitle.trim() || s.title,
          desc: tempDesc.trim(),
          duration: tempDuration.trim() || s.duration,
        };
      }
      return s;
    });
    await persistServices(updated, `Servicio editado: ${tempTitle.trim() || id}`);
    setEditingId(null);
  };

  const handleToggleActive = async (id: string) => {
    const updated = services.map((s) => (s.id === id ? { ...s, active: !s.active } : s));
    await persistServices(updated, `Servicio ${updated.find((item) => item.id === id)?.active ? 'activado' : 'desactivado'}`);
  };

  const handleApplyBulkDiscount = async (percentage: number) => {
    const direction = percentage > 0 ? 'incrementar' : 'reducir';
    const confirmed = confirm(`Vas a ${direction} todas las tarifas un ${Math.abs(percentage)}%.\n\nAfectará a ${services.length} servicios y se publicará en la web.\n\n¿Quieres continuar?`);
    if (!confirmed) return;
    const updated = services.map((s) => ({
      ...s,
      basePrice: Math.round(s.basePrice * (1 + percentage / 100)),
    }));
    await persistServices(updated, `${direction === 'incrementar' ? 'Incremento' : 'Descuento'} global del ${Math.abs(percentage)}%`);
  };

  const handleResetDefaults = async () => {
    if (confirm('¿Estás seguro de que deseas restablecer todas las tarifas a los valores estándar oficiales?')) {
      await persistServices(DEFAULT_SERVICES, 'Restablecimiento de tarifas estándar');
    }
  };

  const handleCreateNewService = async (e: React.FormEvent) => {
    e.preventDefault();
    const newSrv: ServicePriceItem = {
      id: `srv-${Date.now()}`,
      code: newCode || `SRV-${Date.now().toString().slice(-4)}`,
      icon: 'stars',
      title: newTitle,
      category: newCategory,
      basePrice: Number(newPrice),
      btwRate: 0.21,
      badge: newBadge,
      duration: '24-48h',
      active: true,
      desc: newDesc || 'Trámite especializado gestionado por el equipo de RP Asesoría.',
    };
    await persistServices([...services, newSrv], `Nuevo servicio: ${newTitle}`);
    setShowAddModal(false);
    setNewTitle('');
    setNewCode('');
    setNewDesc('');
  };

  const filtered = services.filter((s) => {
    const matchesCategory = activeCategory === 'todos' || s.category === activeCategory;
    const matchesSearch =
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const activeServicesCount = services.filter((s) => s.active).length;
  const avgPrice = Math.round(
    services.reduce((acc, curr) => acc + curr.basePrice, 0) / Math.max(1, services.length)
  );

  return (
    <div className="w-full flex-1 h-full max-h-[calc(100vh-4.6rem)] overflow-hidden flex flex-col gap-2.5">
      
      {/* TOAST DE SINCRONIZACIÓN */}
      {saveToast && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-600 text-white px-4 py-2 rounded-xl shadow-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-2 border border-emerald-400">
          <span className="material-symbols-outlined text-[18px]">sync</span>
          <span>¡Tarifas actualizadas y sincronizadas en la web pública y el portal!</span>
        </div>
      )}

      {/* HEADER DE LA TERMINAL DE PRECIOS */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2 border-b border-surface-container shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md bg-blue-100 text-blue-800 text-[10px] font-mono-data font-bold uppercase tracking-wider border border-blue-200">
              Terminal Gestor
            </span>
            <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Sincronización Web en Vivo
            </span>
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight mt-1">
            Gestión de Tarifas & Precios de Servicios
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Modifica las tarifas oficiales en tiempo real. Los cambios guardados se usan en el catálogo de la web pública y en nuevos presupuestos de facturación.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-secondary text-white rounded-lg text-xs font-bold hover:bg-secondary/90 transition-all flex items-center gap-1.5 shadow-sm"
          >
            <span className="material-symbols-outlined text-[17px]">add_circle</span>
            <span>Nuevo Trámite</span>
          </button>
          
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3 py-2 bg-surface-container text-on-surface-variant hover:text-on-surface rounded-lg text-xs font-semibold hover:bg-surface-container-high transition-all"
            title="Restablecer valores originales"
          >
            Restablecer
          </button>
        </div>
      </div>

      {/* TARJETAS DE ESTADÍSTICAS & AJUSTES RÁPIDOS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 shrink-0">
        <div className="bg-surface-container-lowest p-3 rounded-xl border border-surface-container shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] text-on-surface-variant uppercase font-semibold">Trámites en Catálogo</span>
            <p className="text-xl font-black font-heading text-on-surface mt-0.5">{services.length}</p>
            <span className="text-[10px] text-emerald-600 font-semibold">{activeServicesCount} activos en la web</span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">inventory_2</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-3 rounded-xl border border-surface-container shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] text-on-surface-variant uppercase font-semibold">Ticket Medio Final</span>
            <p className="text-xl font-black font-heading text-on-surface mt-0.5">{avgPrice} €</p>
            <span className="text-[10px] text-emerald-600 font-semibold">IVA incluido</span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">euro</span>
          </div>
        </div>

        {/* BOTONES DE AJUSTE GLOBAL */}
        <div className="sm:col-span-2 bg-surface-container-lowest p-3 rounded-xl border border-surface-container shadow-2xs flex flex-col justify-between gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-on-surface">Ajustes Masivos de Campaña</span>
            <span className="text-[10px] text-on-surface-variant">Aplica a todos los servicios</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button type="button"
              onClick={() => handleApplyBulkDiscount(10)}
              className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-[11px] font-bold transition-colors text-center"
            >
              +10% Temporada Renta
            </button>
            <button type="button"
              onClick={() => handleApplyBulkDiscount(-10)}
              className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-bold transition-colors text-center"
            >
              -10% Promo Expat
            </button>
            <button type="button"
              onClick={() => handleApplyBulkDiscount(-15)}
              className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-[11px] font-bold transition-colors text-center"
            >
              -15% Black Friday
            </button>
          </div>
        </div>
      </div>

      {/* FILTROS & BUSCADOR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 shrink-0">
        {/* BUSCADOR */}
        <div className="relative flex-1 max-w-md">
          <span className="material-symbols-outlined absolute left-3 top-2 text-on-surface-variant text-[16px]">search</span>
          <input
            type="text"
            placeholder="Buscar por nombre o código (ej. M-Form, ZZP, SRV-DIGID)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-surface-container-lowest rounded-lg border border-surface-container text-xs outline-none focus:ring-1 focus:ring-secondary text-on-surface"
          />
        </div>

        {/* CATEGORÍAS */}
        <div className="flex flex-wrap gap-1">
          {[
            { id: 'todos', label: 'Todos' },
            { id: 'impuestos', label: 'Impuestos' },
            { id: 'subsidios', label: 'Subsidios' },
            { id: 'llegada', label: 'Llegada' },
            { id: 'empresas', label: 'Autónomos ZZP' },
            { id: 'vehiculos', label: 'Vehículos' },
            { id: 'otros', label: 'Otros' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveCategory(tab.id)}
              aria-pressed={activeCategory === tab.id}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                activeCategory === tab.id
                  ? 'bg-secondary text-white font-bold shadow-2xs'
                  : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container border border-surface-container'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setShowHistory((value) => !value)} className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-surface-container bg-surface-container-lowest text-xs font-semibold text-on-surface-variant hover:text-secondary">
          <span className="material-symbols-outlined text-[15px]">history</span>
          Historial ({priceHistory.length})
        </button>
      </div>

      {showHistory && (
        <section className="rounded-xl border border-blue-100 bg-blue-50/40 p-3 shrink-0" aria-label="Historial de cambios de tarifas">
          <div className="flex items-center justify-between mb-2"><h2 className="text-xs font-bold text-on-surface">Cambios recientes del catálogo</h2><span className="text-[10px] text-on-surface-variant">Guardado en este navegador</span></div>
          {priceHistory.length === 0 ? <p className="text-xs text-on-surface-variant">Todavía no hay cambios registrados.</p> : <div className="space-y-1.5 max-h-28 overflow-y-auto">{priceHistory.map((entry, index) => <div key={`${entry.date}-${index}`} className="flex items-center justify-between gap-3 text-xs"><span className="text-on-surface">{entry.description}</span><span className="text-on-surface-variant whitespace-nowrap">{entry.date} · {entry.changes} precios</span></div>)}</div>}
        </section>
      )}

      {/* TABLA PRINCIPAL DE TARIFAS (FLEX Y SCROLL INTERNO) */}
      <div className="flex-1 min-h-0 bg-surface-container-lowest rounded-xl border border-surface-container overflow-hidden shadow-2xs flex flex-col">
        <div className="flex-1 overflow-y-auto overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-surface-container text-[10.5px] font-bold text-on-surface-variant uppercase tracking-wider sticky top-0 z-10">
                <th scope="col" className="py-2.5 px-3.5">Código / Icono</th>
                <th scope="col" className="py-2.5 px-3.5">Trámite & Categoría</th>
                <th scope="col" className="py-3.5 px-4">Plazo</th>
                <th scope="col" className="py-3.5 px-4">Etiqueta / Badge</th>
                <th scope="col" className="py-3.5 px-4">Precio final (IVA incluido)</th>
                <th scope="col" className="py-3.5 px-4 text-center">Estado Web</th>
                <th scope="col" className="py-3.5 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container text-xs">
              {filtered.map((srv) => {
                const isEditing = editingId === srv.id;

                return (
                  <tr
                    key={srv.id}
                    className={`hover:bg-surface-container-low/60 transition-colors ${
                      !srv.active ? 'opacity-50 bg-slate-50/50' : ''
                    }`}
                  >
                    {/* CÓDIGO & ICONO */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-secondary">
                          <span className="material-symbols-outlined text-[18px]">{srv.icon}</span>
                        </div>
                        <span className="font-mono-data font-bold text-[11px] text-on-surface-variant">
                          {srv.code}
                        </span>
                      </div>
                    </td>

                    {/* NOMBRE & CATEGORÍA */}
                    <td className="py-3 px-4">
                      <div>
                        {isEditing ? (
                          <div className="space-y-1.5 min-w-[220px]">
                            <input type="text" value={tempTitle} onChange={(e) => setTempTitle(e.target.value)} aria-label="Nombre del servicio" className="w-full px-2 py-1 bg-surface-container-high rounded border border-secondary text-xs font-bold outline-none" />
                            <textarea value={tempDesc} onChange={(e) => setTempDesc(e.target.value)} aria-label="Descripción del servicio" rows={2} className="w-full px-2 py-1 bg-surface-container-high rounded border border-surface-container text-[11px] outline-none" />
                          </div>
                        ) : (
                          <><p className="font-bold text-on-surface text-sm">{srv.title}</p><p className="text-[11px] text-on-surface-variant line-clamp-1">{srv.desc}</p></>
                        )}
                      </div>
                    </td>

                    {/* PLAZO */}
                    <td className="py-3 px-4 whitespace-nowrap text-on-surface-variant">
                      {isEditing ? <input type="text" value={tempDuration} onChange={(e) => setTempDuration(e.target.value)} aria-label="Duración del servicio" className="w-28 px-2 py-1 bg-surface-container-high rounded border border-surface-container text-[11px] outline-none" /> : <span className="px-2 py-0.5 bg-surface-container rounded text-[11px] font-medium">{srv.duration}</span>}
                    </td>

                    {/* BADGE / ETIQUETA */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {isEditing ? (
                        <input
                          type="text"
                          value={tempBadge}
                          onChange={(e) => setTempBadge(e.target.value)}
                          className="px-2 py-1 bg-surface-container-high rounded border border-surface-container text-xs font-bold outline-none w-28"
                        />
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          {srv.badge}
                        </span>
                      )}
                    </td>

                    {/* PRECIO BASE */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={tempPrice}
                            onChange={(e) => setTempPrice(Number(e.target.value))}
                            className="w-20 px-2 py-1 bg-surface-container-high rounded border border-secondary text-sm font-extrabold text-on-surface outline-none"
                            autoFocus
                          />
                          <span className="font-bold text-xs">€</span>
                        </div>
                      ) : (
                        <span className="font-heading font-extrabold text-sm text-on-surface">
                          {srv.basePrice.toFixed(2)} €
                        </span>
                      )}
                    </td>

                    {/* ESTADO ACTIVO/INACTIVO */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(srv.id)}
                        aria-pressed={srv.active}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all ${
                          srv.active
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-slate-200 text-slate-600 border border-slate-300'
                        }`}
                        title="Activar / Desactivar en la web pública"
                      >
                        {srv.active ? '● Visible' : '○ Oculto'}
                      </button>
                    </td>

                    {/* ACCIONES */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(srv)}
                        className={`px-3 py-1.5 rounded-lg text-on-surface font-semibold text-xs flex items-center gap-1.5 ml-auto transition-colors ${
                          isEditing ? 'bg-secondary/10 text-secondary' : 'bg-surface-container hover:bg-surface-container-high'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[15px] text-secondary">edit</span>
                        <span>{isEditing ? 'Editando…' : 'Editar Servicio'}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* PANEL FLOTANTE DE EDICIÓN */}
      {editingId && (
        <div className="fixed inset-0 z-[70] bg-slate-950/35 backdrop-blur-[1px]" role="presentation">
          <aside className="absolute inset-y-0 right-0 w-full max-w-md bg-surface-container-lowest border-l border-surface-container shadow-2xl flex flex-col animate-in slide-in-from-right duration-200" role="dialog" aria-modal="true" aria-labelledby="edit-service-panel-title">
            <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-surface-container">
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold text-secondary">Catálogo de servicios</p>
                <h2 id="edit-service-panel-title" className="mt-1 text-lg font-extrabold text-on-surface">Editar servicio</h2>
                <p className="mt-1 text-xs text-on-surface-variant">Los cambios se sincronizan con la web pública y la facturación.</p>
              </div>
              <button type="button" aria-label="Cerrar edición del servicio" onClick={() => setEditingId(null)} className="w-8 h-8 rounded-lg text-on-surface-variant hover:bg-surface-container flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="rounded-xl bg-surface-container-low border border-surface-container px-3 py-2 mb-5">
                <span className="text-[10px] uppercase tracking-wider text-outline">Código</span>
                <p className="font-mono-data text-sm font-bold text-on-surface">{services.find((s) => s.id === editingId)?.code}</p>
              </div>
              <div className="space-y-4">
                <label className="block text-xs font-bold text-on-surface">
                  Nombre del servicio
                  <input type="text" value={tempTitle} onChange={(e) => setTempTitle(e.target.value)} className="mt-1 w-full h-10 px-3 rounded-lg border border-surface-container-high bg-surface-container-lowest text-sm font-semibold outline-none focus:ring-2 focus:ring-secondary" />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-xs font-bold text-on-surface">
                    Precio final (€)
                    <input type="number" min="0" step="0.01" value={tempPrice} onChange={(e) => setTempPrice(Number(e.target.value))} className="mt-1 w-full h-10 px-3 rounded-lg border border-surface-container-high bg-surface-container-lowest text-sm font-bold outline-none focus:ring-2 focus:ring-secondary" />
                  </label>
                  <label className="block text-xs font-bold text-on-surface">
                    Plazo
                    <input type="text" value={tempDuration} onChange={(e) => setTempDuration(e.target.value)} className="mt-1 w-full h-10 px-3 rounded-lg border border-surface-container-high bg-surface-container-lowest text-sm outline-none focus:ring-2 focus:ring-secondary" />
                  </label>
                </div>
                <label className="block text-xs font-bold text-on-surface">
                  Etiqueta / badge
                  <input type="text" value={tempBadge} onChange={(e) => setTempBadge(e.target.value)} className="mt-1 w-full h-10 px-3 rounded-lg border border-surface-container-high bg-surface-container-lowest text-sm outline-none focus:ring-2 focus:ring-secondary" />
                </label>
                <label className="block text-xs font-bold text-on-surface">
                  Descripción pública
                  <textarea rows={6} value={tempDesc} onChange={(e) => setTempDesc(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-lg border border-surface-container-high bg-surface-container-lowest text-sm leading-5 outline-none focus:ring-2 focus:ring-secondary resize-none" />
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-surface-container bg-surface-container-low">
              <button type="button" onClick={() => setEditingId(null)} className="px-4 py-2 rounded-lg border border-outline-variant text-xs font-semibold text-on-surface hover:bg-surface-container">Cancelar</button>
              <button type="button" onClick={() => editingId && handleSaveEdit(editingId)} className="px-4 py-2 rounded-lg bg-secondary text-white text-xs font-bold hover:bg-secondary/90 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">save</span>
                Guardar cambios
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* MODAL CREAR NUEVO TRÁMITE */}
      {showAddModal && (
        <div className="fixed inset-0 z-[70] bg-slate-950/35 backdrop-blur-[1px]" role="presentation">
          <div className="absolute inset-y-0 right-0 w-full max-w-md bg-surface-container-lowest border-l border-surface-container shadow-2xl flex flex-col animate-in slide-in-from-right duration-200" role="dialog" aria-modal="true" aria-labelledby="new-service-dialog-title">
            <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-surface-container">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-secondary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[21px]">add_circle</span>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-bold text-secondary">Catálogo de servicios</p>
                  <h3 id="new-service-dialog-title" className="mt-1 font-heading font-extrabold text-lg text-on-surface">Nuevo trámite</h3>
                  <p className="mt-1 text-xs text-on-surface-variant">Se publicará en la web y quedará disponible para presupuestos.</p>
                </div>
              </div>
              <button type="button" aria-label="Cerrar nuevo trámite" onClick={() => setShowAddModal(false)} className="w-8 h-8 rounded-lg text-on-surface-variant hover:bg-surface-container flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form data-new-service-form onSubmit={handleCreateNewService} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div className="rounded-xl bg-blue-50 border border-blue-100 px-3 py-2 text-xs text-blue-900">
                <span className="font-bold">Consejo:</span> utiliza un nombre claro y un precio final que ya incluya el IVA.
              </div>
              <div>
                <label className="block text-xs font-bold text-on-surface">
                  Nombre del trámite <span className="text-red-500">*</span>
                  <input
                    type="text"
                    required
                    placeholder="Ej. 30% ruling para expatriados"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="mt-1 w-full h-10 px-3 rounded-lg border border-surface-container-high bg-surface-container-lowest text-sm outline-none focus:ring-2 focus:ring-secondary text-on-surface"
                  />
                </label>
              </div>
              <div>
                <label className="block text-xs font-bold text-on-surface">
                  Código único <span className="text-outline font-normal">(opcional)</span>
                  <input
                    type="text"
                    placeholder="Ej. SRV-30RULING"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    className="mt-1 w-full h-10 px-3 rounded-lg border border-surface-container-high bg-surface-container-lowest text-sm outline-none focus:ring-2 focus:ring-secondary text-on-surface font-mono-data"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs font-bold text-on-surface">
                  Categoría
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="mt-1 w-full h-10 px-3 rounded-lg border border-surface-container-high bg-surface-container-lowest text-sm outline-none focus:ring-2 focus:ring-secondary text-on-surface"
                  >
                    <option value="impuestos">Impuestos</option>
                    <option value="subsidios">Subsidios</option>
                    <option value="llegada">Llegada</option>
                    <option value="empresas">Autónomos ZZP</option>
                    <option value="vehiculos">Vehículos</option>
                    <option value="otros">Otros</option>
                  </select>
                </label>
                <label className="block text-xs font-bold text-on-surface">
                  Precio final IVA incluido (€)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={newPrice}
                    onChange={(e) => setNewPrice(Number(e.target.value))}
                    className="mt-1 w-full h-10 px-3 rounded-lg border border-surface-container-high bg-surface-container-lowest text-sm outline-none focus:ring-2 focus:ring-secondary text-on-surface font-bold"
                  />
                </label>
              </div>
              <label className="block text-xs font-bold text-on-surface">
                Etiqueta / badge <span className="text-outline font-normal">(opcional)</span>
                  <input
                    type="text"
                    value={newBadge}
                    onChange={(e) => setNewBadge(e.target.value)}
                    className="mt-1 w-full h-10 px-3 rounded-lg border border-surface-container-high bg-surface-container-lowest text-sm outline-none focus:ring-2 focus:ring-secondary text-on-surface"
                  />
              </label>

              <label className="block text-xs font-bold text-on-surface">
                Descripción pública <span className="text-outline font-normal">(opcional)</span>
                <textarea
                  rows={6}
                  placeholder="Detalle explicativo del trámite para el cliente..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-surface-container-high bg-surface-container-lowest text-sm leading-5 outline-none focus:ring-2 focus:ring-secondary text-on-surface resize-none"
                ></textarea>
              </label>

              <div className="h-2" />
            </form>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-surface-container bg-surface-container-low">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg border border-outline-variant text-xs font-semibold text-on-surface hover:bg-surface-container"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => document.querySelector<HTMLFormElement>('form[data-new-service-form]')?.requestSubmit()}
                  className="px-4 py-2 rounded-lg bg-secondary text-white text-xs font-bold hover:bg-secondary/90 shadow-sm flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">publish</span>
                  Publicar trámite
                </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
