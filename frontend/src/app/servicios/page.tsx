'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import PublishedContent from '@/components/PublishedContent';
import { apiUrl } from '@/lib/api';

interface ServiceItem {
  id: string;
  icon: string;
  title: string;
  badge?: string;
  desc: string;
  price: string;
  visible?: boolean;
  category: 'impuestos' | 'subsidios' | 'llegada' | 'empresas' | 'vehiculos' | 'otros';
  requirements: string[];
  duration: string;
}

const SERVICES_DATA: ServiceItem[] = [];

export default function ServiciosPage() {
  const { lang } = useLanguage();
  const english = lang === 'EN';
  const [servicesList, setServicesList] = useState<ServiceItem[]>(SERVICES_DATA);
  const [activeCategory, setActiveCategory] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);

  useEffect(() => {
    fetch(apiUrl('/services/public'))
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('No se pudo cargar el catálogo')))
      .then((data) => setServicesList(Array.isArray(data.services) ? data.services.map((item: any) => ({
        id: item.id, title: item.title, category: item.category, icon: item.icon || 'receipt_long',
        price: `Desde ${Number(item.priceFinal ?? item.basePrice).toFixed(2)}€`, badge: item.badge || 'Servicio',
        duration: item.duration || 'Según caso', desc: item.desc || '', requirements: item.requirements || [],
        visible: item.visibleWeb !== false,
      })) : []))
      .catch(() => setServicesList([]));
  }, []);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formError, setFormError] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [legalConsent, setLegalConsent] = useState(false);

  const filtered = servicesList.filter((s) => {
    const matchesCategory = activeCategory === 'todos' || s.category === activeCategory;
    const matchesSearch = s.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          s.desc.toLowerCase().includes(searchQuery.toLowerCase());
    return (s.visible !== false) && matchesCategory && matchesSearch;
  });

  const recommendedPack = servicesList.find((service) => service.id === 'pack-aterrizaje');

  const handleStartProcess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService) return;
    if (!legalConsent) { setFormError('Debes aceptar la política de privacidad y las condiciones generales.'); return; }
    setFormError(''); setFormSubmitted(false);
    try {
      const response = await fetch(apiUrl('/service-requests'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ service_id: selectedService.id, full_name: clientName, email: clientEmail, phone: clientPhone, source: 'web', legal_consent: true, legal_terms_version: '2026-10-07' }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'No se pudo guardar la solicitud.');
      setFormSubmitted(true);
    } catch (error) { setFormError(error instanceof Error ? error.message : 'No se pudo guardar la solicitud.'); }
  };

  return (
    <div role="main" id="main-content" className="min-h-screen bg-bg text-text font-sans antialiased flex flex-col justify-between">
      <div>
        <Navbar />
        <PublishedContent pageKey="servicios" />

        {/* HERO SERVICIOS */}
        <section className="pt-16 pb-14 bg-bg border-b border-border">
          <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16 text-center">
            
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-muted border border-border text-text text-xs font-semibold mb-4">
              <span className="material-symbols-outlined text-[16px]">verified</span>
              {english ? 'Services & Paperwork Catalogue' : 'Catálogo de servicios y trámites'}
            </div>

            <h1 className="font-heading text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
              {english ? <>All your Dutch paperwork, <span className="text-primary">explained and stress-free</span></> : <>Todos los trámites en Holanda, <span className="text-primary">explicados y sin estrés</span></>}
            </h1>

            <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto mb-8">
              {english ? 'Guidance and administrative support in your language.' : 'Información y acompañamiento administrativo en tu idioma.'}
            </p>

            {/* BARRA DE BÚSQUEDA */}
            <div className="max-w-xl mx-auto relative">
              <span className="material-symbols-outlined absolute left-4 top-3.5 text-slate-400 text-[22px]">search</span>
              <input
                type="text"
                placeholder={english ? 'Search service (e.g. M-Form, DigiD, Zorgtoeslag, ZZP...)' : 'Buscar trámite (ej. M-Form, DigiD, Zorgtoeslag, ZZP...)'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-white rounded-2xl border border-slate-200 text-sm shadow-sm focus:ring-2 focus:ring-blue-600 outline-none"
              />
            </div>

          </div>
        </section>

        {/* CATEGORÍAS & GRID */}
        <section className="py-16">
          <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16">
            
            {/* PILLS DE FILTRADO */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 mb-12">
              {[
                { id: 'todos', label: english ? 'All services' : 'Todos los Servicios' },
                { id: 'impuestos', label: english ? 'Tax & Returns' : 'Impuestos & Renta' },
                { id: 'subsidios', label: english ? 'Benefits (Toeslagen)' : 'Subsidios (Toeslagen)' },
                { id: 'llegada', label: english ? 'Moving to the Netherlands' : 'Llegada a Holanda' },
                { id: 'empresas', label: english ? 'Self-employed ZZP' : 'Autónomos ZZP' },
                { id: 'vehiculos', label: english ? 'Vehicles & RDW' : 'Vehículos & RDW' },
                { id: 'otros', label: english ? 'Other services' : 'Otros Trámites' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveCategory(tab.id)}
                  aria-pressed={activeCategory === tab.id}
                  type="button"
                  className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all ${
                    activeCategory === tab.id
                      ? 'bg-primary text-white shadow-md shadow-[#145DA0]/20'
                      : 'bg-white text-text hover:bg-surface-muted border border-border'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* LISTADO DE TARJETAS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((srv) => (
                <div
                  key={srv.id}
                  className="bg-white rounded-2xl p-7 border border-border hover:border-[#145DA0] shadow-sm hover:shadow-xl transition-all duration-200 flex flex-col justify-between group"
                >
                  <div>
                    {/* ENCABEZADO */}
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors shadow-sm">
                        <span className="material-symbols-outlined text-[26px]">{srv.icon}</span>
                      </div>
                      {srv.badge && (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200/60">
                          {srv.badge}
                        </span>
                      )}
                    </div>

                    {/* TÍTULO Y DESCRIPCIÓN */}
                    <h3 className="font-heading font-bold text-lg text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
                      {srv.title}
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed mb-5">
                      {srv.desc}
                    </p>

                    {/* REQUISITOS CLAVE */}
                    <div className="bg-slate-50 rounded-xl p-3 mb-5 border border-slate-100 text-xs text-slate-600 space-y-1">
                      <p className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">{english ? 'Key requirements:' : 'Requisitos clave:'}</p>
                      {srv.requirements.map((req, idx) => (
                        <p key={idx} className="flex items-center gap-1.5">
                          <span className="text-blue-500 font-bold">•</span>
                          <span>{req}</span>
                        </p>
                      ))}
                    </div>
                  </div>

                  {/* PIE DE TARJETA */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">{english ? 'Estimated time' : 'Tiempo estimado'}</span>
                      <span className="text-xs font-semibold text-slate-700">{srv.duration}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-right"><span className="text-base font-extrabold text-slate-900 block">{srv.price}</span><span className="text-[10px] font-semibold text-emerald-600 block">{english ? 'VAT included' : 'IVA incluido'}</span></span>
                      <button
                        onClick={() => {
                          setSelectedService(srv);
                          setFormSubmitted(false);
                        }}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-[#0B1F33] hover:bg-primary transition-colors shadow-sm"
                      >
                        {english ? 'Start' : 'Empezar'}
                      </button>
                    </div>
                  </div>

                </div>
              ))}
            </div>

            {/* CALLOUT PACK RECIÉN LLEGADO */}
            {recommendedPack && <div className="mt-16 bg-gradient-to-r from-blue-900 via-slate-900 to-indigo-950 rounded-3xl p-8 sm:p-12 text-white shadow-xl flex flex-col lg:flex-row items-center justify-between gap-8">
              <div className="space-y-3 text-center lg:text-left">
                <span className="px-3 py-1 rounded-full bg-blue-500/30 text-blue-300 text-xs font-bold uppercase tracking-wider border border-blue-400/30">{recommendedPack.badge || 'Pack Recomendado'}</span>
                <h3 className="font-heading font-extrabold text-2xl sm:text-3xl">{recommendedPack.title}</h3>
                <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">{recommendedPack.desc}</p>
              </div>
              <div className="text-center shrink-0">
                <p className="text-xs text-slate-400 uppercase font-semibold">{english ? 'All-inclusive price' : 'Precio Todo Incluido'}</p>
                <p className="text-3xl font-extrabold text-emerald-400 mb-3">{recommendedPack.price}</p>
                <button type="button" onClick={() => { setSelectedService(recommendedPack); setFormSubmitted(false); }} className="inline-block px-7 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-sm shadow-md transition-all">{english ? 'Book pack' : 'Contratar Pack'}</button>
              </div>
            </div>}

          </div>
        </section>

        {/* MODAL INICIO TRÁMITE */}
        {selectedService && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-7 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[20px]">{selectedService.icon}</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">{selectedService.title}</h3>
                    <span className="text-xs font-bold text-blue-600">{selectedService.price}</span>
                  </div>
                </div>
                <button onClick={() => setSelectedService(null)} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl bg-slate-50 border border-slate-100 p-3"><p className="font-bold text-slate-700">Qué incluye</p><p className="mt-1 text-slate-600">Revisión del caso, orientación administrativa y gestión del trámite ante la autoridad correspondiente según la documentación aportada.</p></div>
                <div className="rounded-xl bg-slate-50 border border-slate-100 p-3"><p className="font-bold text-slate-700">Tiempo estimado</p><p className="mt-1 text-slate-600">{selectedService.duration}. El plazo puede variar según la autoridad y la documentación recibida.</p></div>
              </div>
              <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs text-slate-700"><p className="font-bold text-blue-900">Descripción del servicio</p><p className="mt-1 leading-relaxed">{selectedService.desc}</p>{selectedService.requirements.length > 0 && <><p className="mt-3 font-bold text-blue-900">Requisitos clave</p><ul className="mt-1 list-disc pl-4">{selectedService.requirements.map((requirement) => <li key={requirement}>{requirement}</li>)}</ul></>}</div>

              {formError && <p className="text-sm text-red-600 mb-3 mt-4">{formError}</p>}
              {formSubmitted ? (
                <div className="py-8 text-center space-y-3">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                    <span className="material-symbols-outlined text-[32px]">task_alt</span>
                  </div>
                  <h4 className="font-bold text-lg text-slate-900">¡Solicitud recibida!</h4>
                  <p className="text-xs text-slate-600">
                    Tu asesor asignado te contactará por WhatsApp para pedirte los documentos necesarios.
                  </p>
                  <div className="pt-2">
                    <Link
                      href="/portal"
                      className="inline-block px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-md"
                    >
                      Ir a mi Área de Cliente
                    </Link>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleStartProcess} className="space-y-3.5 pt-4">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Déjanos tus datos para iniciar el expediente en el sistema:
                  </p>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Nombre completo</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Juan Pérez"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
                    <input
                      type="email"
                      required
                      placeholder="juan@ejemplo.com"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">WhatsApp / Teléfono</label>
                    <input
                      type="tel"
                      required
                      placeholder="+31 6 ... o +34 6 ..."
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                  <label className="flex items-start gap-2 text-xs text-slate-600"><input type="checkbox" checked={legalConsent} onChange={(e) => setLegalConsent(e.target.checked)} className="mt-0.5" /><span>Acepto la <a href="/privacidad" target="_blank" className="text-primary underline">Política de privacidad</a> y las <a href="/condiciones" target="_blank" className="text-primary underline">Condiciones generales</a>.</span></label>
                  <div className="pt-2">
                    <button type="submit" className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-colors">
                      Enviar y Comenzar Trámite
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

      </div>
      <Footer />
    </div>
  );
}
