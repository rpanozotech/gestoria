'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

interface ServiceItem {
  id: string;
  icon: string;
  title: string;
  badge?: string;
  desc: string;
  price: string;
  category: 'impuestos' | 'subsidios' | 'llegada' | 'empresas' | 'vehiculos' | 'otros';
  requirements: string[];
  duration: string;
}

const SERVICES_DATA: ServiceItem[] = [
  {
    id: 'renta-mform',
    icon: 'receipt_long',
    title: 'Declaración de la Renta (M-Form / P-Form)',
    badge: 'Más Solicitado',
    desc: 'Maximizamos tu devolución en tu primer año o años completos. Aplicamos deducciones de mudanza, seguro de salud y vivienda.',
    price: 'Desde 89€',
    category: 'impuestos',
    requirements: ['Jaaropgaaf (Certificado anual nómina)', 'BSN', 'Fecha exacta de empadronamiento en Holanda'],
    duration: '24-48 horas',
  },
  {
    id: 'digid',
    icon: 'fingerprint',
    title: 'DigiD (Identidad Digital Holandesa)',
    badge: 'Esencial',
    desc: 'Solicitud, activación y desbloqueo de tu clave digital holandesa sin perderte con las cartas postales en neerlandés.',
    price: 'Desde 29€',
    category: 'llegada',
    requirements: ['BSN oficial', 'Dirección registrada en Países Bajos', 'Móvil holandés o internacional'],
    duration: '3-5 días (carta postal)',
  },
  {
    id: 'zorgtoeslag',
    icon: 'medical_services',
    title: 'Zorgtoeslag (Subsidio de Salud)',
    badge: 'Hasta 154€/mes',
    desc: 'Reclama el subsidio mensual del gobierno para recuperar la mayor parte del coste de tu seguro médico en Holanda.',
    price: 'Desde 45€',
    category: 'subsidios',
    requirements: ['Póliza de seguro médico activa en NL', 'Cuenta bancaria IBAN', 'Estimación de ingresos anuales'],
    duration: '2-4 semanas de resolución',
  },
  {
    id: 'seguro-medico',
    icon: 'health_and_safety',
    title: 'Seguro Médico Obligatorio',
    badge: 'Ahorro Garantizado',
    desc: 'Te asesoramos para elegir y darte de alta en la mejor póliza básica holandesa al precio más económico del mercado.',
    price: 'Desde 35€',
    category: 'llegada',
    requirements: ['BSN', 'Copia de pasaporte / DNI', 'Contrato laboral o de estudios'],
    duration: 'Mismo día',
  },
  {
    id: 'formulario-u1',
    icon: 'description',
    title: 'Formulario U1 (Exportar Paro)',
    badge: 'Trámite Rápido',
    desc: 'Certifica y traslada todos tus periodos cotizados en Países Bajos para cobrar el paro en España u otro país de la UE.',
    price: 'Desde 55€',
    category: 'otros',
    requirements: ['Últimas nóminas holandesas', 'Finiquito o carta de rescisión', 'BSN'],
    duration: '2-3 semanas (UWV)',
  },
  {
    id: 'desempleo-ww',
    icon: 'work_outline',
    title: 'Prestación por Desempleo WW (UWV)',
    badge: 'Soporte Completo',
    desc: 'Tramitación y defensa de tu solicitud de paro holandés ante el UWV tras finalizar o rescindir tu contrato de trabajo.',
    price: 'Desde 95€',
    category: 'subsidios',
    requirements: ['DigiD activo', 'Contrato de trabajo finalizado', 'Mínimo 26 semanas cotizadas'],
    duration: '4 semanas',
  },
  {
    id: 'autonomos-zzp',
    icon: 'storefront',
    title: 'Autónomos / ZZP (KvK & BTW)',
    badge: 'Emprendedores',
    desc: 'Alta integral en Cámara de Comercio (KvK), obtención de BTW-id, facturación e impuestos trimestrales sin complicaciones.',
    price: 'Desde 120€',
    category: 'empresas',
    requirements: ['BSN', 'Nombre comercial de tu actividad', 'Pasaporte o ID europeo'],
    duration: '48 horas',
  },
  {
    id: 'residencia-fiscal',
    icon: 'verified_user',
    title: 'Certificado de Residencia Fiscal',
    badge: 'Legal',
    desc: 'Obtención del certificado oficial ante Belastingdienst para evitar la doble tributación y validar tu estatus en Europa.',
    price: 'Desde 49€',
    category: 'impuestos',
    requirements: ['BSN', 'Datos del país de destino'],
    duration: '1-2 semanas',
  },
  {
    id: 'importacion-vehiculos',
    icon: 'directions_car',
    title: 'Importación de Vehículos (RDW & BPM)',
    badge: 'Gestión Integral',
    desc: 'Cambio de matrícula a placas neerlandesas, cálculo y solicitud de exención o liquidación del impuesto BPM.',
    price: 'Desde 149€',
    category: 'vehiculos',
    requirements: ['Ficha técnica del vehículo', 'Permiso de circulación original', 'Certificado de empadronamiento'],
    duration: '10-15 días',
  },
  {
    id: 'kinderopvangtoeslag',
    icon: 'child_care',
    title: 'Kinderopvangtoeslag & Subsidios Hijos',
    badge: 'Familias',
    desc: 'Gestión de ayudas estatales para guardería, Kindgebonden budget y prestaciones familiares en Países Bajos.',
    price: 'Desde 65€',
    category: 'subsidios',
    requirements: ['Contrato de la guardería holandesa (Kinderopvang)', 'Horas contratadas', 'Ingresos de ambos progenitores'],
    duration: '3-4 semanas',
  },
  {
    id: 'documentos-admin',
    icon: 'folder_shared',
    title: 'Documentos Administrativos & BSN',
    badge: 'Llegada',
    desc: 'Citas de empadronamiento en Gemeente, obtención de BSN, cartas oficiales y traducción de documentos legales.',
    price: 'Desde 39€',
    category: 'llegada',
    requirements: ['Contrato de alquiler o autorización', 'Pasaporte original'],
    duration: '24 horas',
  },
  {
    id: 'consulta-privada',
    icon: 'support_agent',
    title: 'Consulta Privada 1 a 1',
    badge: 'Videollamada / Presencial',
    desc: 'Sesión personalizada de 30 o 60 min con un asesor especialista para resolver todas tus dudas particulares sobre Holanda.',
    price: '49€ / sesión',
    category: 'otros',
    requirements: ['Tus preguntas preparadas'],
    duration: 'Inmediato (según agenda)',
  },
  {
    id: 'otros-tramites',
    icon: 'tune',
    title: 'Otros Trámites & Recursos Belastingdienst',
    badge: 'Personalizado',
    desc: 'Huurtoeslag (alquiler), recursos contra multas tributarias, revisión de cartas holandesas y trámites a medida.',
    price: 'A consultar',
    category: 'otros',
    requirements: ['Copia de la carta o notificación recibida'],
    duration: 'Según caso',
  },
];

export default function ServiciosPage() {
  const [servicesList, setServicesList] = useState<ServiceItem[]>(SERVICES_DATA);
  const [activeCategory, setActiveCategory] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');

  // Sincronizar con los precios modificados desde la terminal del gestor (/crm/tarifas)
  useEffect(() => {
    const syncPrices = () => {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('rpgestoria_service_prices');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const updated = SERVICES_DATA.map((base) => {
                const found = parsed.find((p: any) => p.id === base.id);
                if (found) {
                  return {
                    ...base,
                    price: `Desde ${found.basePrice}€`,
                    badge: found.badge || base.badge,
                  };
                }
                return base;
              });
              setServicesList(updated);
            }
          } catch {}
        }
      }
    };

    syncPrices();
    window.addEventListener('rpgestoria_prices_updated', syncPrices);
    return () => window.removeEventListener('rpgestoria_prices_updated', syncPrices);
  }, []);

  const filtered = servicesList.filter((s) => {
    const matchesCategory = activeCategory === 'todos' || s.category === activeCategory;
    const matchesSearch = s.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          s.desc.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleStartProcess = (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans antialiased flex flex-col justify-between">
      <div>
        <Navbar />

        {/* HERO SERVICIOS */}
        <section className="pt-16 pb-14 bg-gradient-to-b from-blue-50/50 via-white to-[#F8FAFC] border-b border-slate-100">
          <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16 text-center">
            
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100/70 border border-blue-200 text-blue-800 text-xs font-semibold mb-4">
              <span className="material-symbols-outlined text-[16px]">verified</span>
              <span>Catálogo Oficial de Servicios & Trámites</span>
            </div>

            <h1 className="font-heading text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
              Todos los trámites en Holanda, <span className="text-blue-600">explicados y sin estrés</span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto mb-8">
              Encuentra el trámite que necesitas con tarifas 100% transparentes, gestión ante organismos holandeses y atención en español.
            </p>

            {/* BARRA DE BÚSQUEDA */}
            <div className="max-w-xl mx-auto relative">
              <span className="material-symbols-outlined absolute left-4 top-3.5 text-slate-400 text-[22px]">search</span>
              <input
                type="text"
                placeholder="Buscar trámite (ej. M-Form, DigiD, Zorgtoeslag, ZZP...)"
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
                { id: 'todos', label: 'Todos los Servicios' },
                { id: 'impuestos', label: 'Impuestos & Renta' },
                { id: 'subsidios', label: 'Subsidios (Toeslagen)' },
                { id: 'llegada', label: 'Llegada a Holanda' },
                { id: 'empresas', label: 'Autónomos ZZP' },
                { id: 'vehiculos', label: 'Vehículos & RDW' },
                { id: 'otros', label: 'Otros Trámites' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveCategory(tab.id)}
                  className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all ${
                    activeCategory === tab.id
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200/80'
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
                  className="bg-white rounded-2xl p-7 border border-slate-200/80 hover:border-blue-300 shadow-sm hover:shadow-xl transition-all duration-200 flex flex-col justify-between group"
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
                      <p className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">Requisitos clave:</p>
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
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Tiempo estimado</span>
                      <span className="text-xs font-semibold text-slate-700">{srv.duration}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-base font-extrabold text-slate-900">{srv.price}</span>
                      <button
                        onClick={() => {
                          setSelectedService(srv);
                          setFormSubmitted(false);
                        }}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-blue-600 transition-colors shadow-sm"
                      >
                        Empezar
                      </button>
                    </div>
                  </div>

                </div>
              ))}
            </div>

            {/* CALLOUT PACK RECIÉN LLEGADO */}
            <div className="mt-16 bg-gradient-to-r from-blue-900 via-slate-900 to-indigo-950 rounded-3xl p-8 sm:p-12 text-white shadow-xl flex flex-col lg:flex-row items-center justify-between gap-8">
              <div className="space-y-3 text-center lg:text-left">
                <span className="px-3 py-1 rounded-full bg-blue-500/30 text-blue-300 text-xs font-bold uppercase tracking-wider border border-blue-400/30">
                  Pack Recomendado
                </span>
                <h3 className="font-heading font-extrabold text-2xl sm:text-3xl">
                  Pack “Aterrizaje en Holanda” (All-in-One)
                </h3>
                <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
                  Incluye: Asesoría de BSN + Alta en Seguro Médico Holandés + Activación de DigiD + Solicitud de Zorgtoeslag con tarifa reducida especial.
                </p>
              </div>

              <div className="text-center shrink-0">
                <p className="text-xs text-slate-400 uppercase font-semibold">Precio Todo Incluido</p>
                <p className="text-3xl font-extrabold text-emerald-400 mb-3">119 €</p>
                <Link
                  href="/reservar"
                  className="inline-block px-7 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-sm shadow-md transition-all"
                >
                  Contratar Pack
                </Link>
              </div>
            </div>

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
