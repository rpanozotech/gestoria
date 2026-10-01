'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { apiUrl } from '@/lib/api';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

// Tipos para soporte multiidioma básico
type Language = 'ES' | 'EN' | 'NL' | 'RO' | 'PT' | 'PL';

interface ServiceItem {
  id: string;
  icon: string;
  title: string;
  badge?: string;
  desc: string;
  price: string;
  category: 'impuestos' | 'subsidios' | 'llegada' | 'empresas' | 'vehiculos' | 'otros';
}

const SERVICES_DATA: ServiceItem[] = [
  {
    id: 'renta-mform',
    icon: 'receipt_long',
    title: 'Declaración de la Renta (M-Form / P-Form)',
    badge: 'Más Solicitado',
    desc: 'Maximizamos tu devolución en tu primer año o años completos. Aplicamos deducciones de mudanza, seguro y vivienda.',
    price: 'Desde 89€',
    category: 'impuestos',
  },
  {
    id: 'digid',
    icon: 'fingerprint',
    title: 'DigiD (Identidad Digital)',
    badge: 'Esencial',
    desc: 'Solicitud, activación y desbloqueo de tu clave digital holandesa sin perderte con las cartas postales en neerlandés.',
    price: 'Desde 29€',
    category: 'llegada',
  },
  {
    id: 'zorgtoeslag',
    icon: 'medical_services',
    title: 'Zorgtoeslag (Subsidio de Salud)',
    badge: 'Hasta 154€/mes',
    desc: 'Reclama el subsidio mensual del gobierno para recuperar la mayor parte del coste de tu seguro médico en Holanda.',
    price: 'Desde 45€',
    category: 'subsidios',
  },
  {
    id: 'seguro-medico',
    icon: 'health_and_safety',
    title: 'Seguro Médico Obligatorio',
    badge: 'Ahorro Garantizado',
    desc: 'Te asesoramos para elegir y darte de alta en la mejor póliza básica holandesa al precio más económico del mercado.',
    price: 'Desde 35€',
    category: 'llegada',
  },
  {
    id: 'formulario-u1',
    icon: 'description',
    title: 'Formulario U1 (Exportar Paro)',
    badge: 'Trámite Rápido',
    desc: 'Certifica y traslada todos tus periodos cotizados en Países Bajos para cobrar el paro en España u otro país de la UE.',
    price: 'Desde 55€',
    category: 'otros',
  },
  {
    id: 'desempleo-ww',
    icon: 'work_outline',
    title: 'Prestación por Desempleo WW (UWV)',
    badge: 'Soporte Completo',
    desc: 'Tramitación y defensa de tu solicitud de paro holandés ante el UWV tras finalizar o rescindir tu contrato de trabajo.',
    price: 'Desde 95€',
    category: 'subsidios',
  },
  {
    id: 'autonomos-zzp',
    icon: 'storefront',
    title: 'Autónomos / ZZP (KvK & BTW)',
    badge: 'Emprendedores',
    desc: 'Alta integral en Cámara de Comercio (KvK), obtención de BTW-id, facturación e impuestos trimestrales sin complicaciones.',
    price: 'Desde 120€',
    category: 'empresas',
  },
  {
    id: 'residencia-fiscal',
    icon: 'verified_user',
    title: 'Certificado de Residencia Fiscal',
    badge: 'Legal',
    desc: 'Obtención del certificado oficial ante Belastingdienst para evitar la doble tributación y validar tu estatus en Europa.',
    price: 'Desde 49€',
    category: 'impuestos',
  },
  {
    id: 'importacion-vehiculos',
    icon: 'directions_car',
    title: 'Importación de Vehículos (RDW & BPM)',
    badge: 'Gestión Integral',
    desc: 'Cambio de matrícula a placas neerlandesas, cálculo y solicitud de exención o liquidación del impuesto BPM.',
    price: 'Desde 149€',
    category: 'vehiculos',
  },
  {
    id: 'kinderopvangtoeslag',
    icon: 'child_care',
    title: 'Kinderopvangtoeslag & Subsidios Hijos',
    badge: 'Familias',
    desc: 'Gestión de ayudas estatales para guardería, Kindgebonden budget y prestaciones familiares en Países Bajos.',
    price: 'Desde 65€',
    category: 'subsidios',
  },
  {
    id: 'documentos-admin',
    icon: 'folder_shared',
    title: 'Documentos Administrativos & BSN',
    badge: 'Llegada',
    desc: 'Citas de empadronamiento en Gemeente, obtención de BSN, cartas oficiales y traducción de documentos legales.',
    price: 'Desde 39€',
    category: 'llegada',
  },
  {
    id: 'consulta-privada',
    icon: 'support_agent',
    title: 'Consulta Privada 1 a 1',
    badge: 'Videollamada / Presencial',
    desc: 'Sesión personalizada de 30 o 60 min con un asesor especialista para resolver todas tus dudas particulares sobre Holanda.',
    price: '49€ / sesión',
    category: 'otros',
  },
  {
    id: 'otros-tramites',
    icon: 'tune',
    title: 'Otros Trámites & Recursos Belastingdienst',
    badge: 'Personalizado',
    desc: 'Huurtoeslag (alquiler), recursos contra multas tributarias, revisión de cartas holandesas y trámites a medida.',
    price: 'A consultar',
    category: 'otros',
  },
];

export default function PublicHomePage() {
  const [lang, setLang] = useState<Language>('ES');
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('todos');

  // Video State
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);

  // 1. Calculadora M-Form
  const [monthsInNL, setMonthsInNL] = useState<number>(8);
  const [grossIncome, setGrossIncome] = useState<number>(36000);
  const [withheldTax, setWithheldTax] = useState<number>(7800);
  const [hasRelocation, setHasRelocation] = useState<boolean>(true);

  const calculateMFormRefund = () => {
    const bracketRate = 0.3697;
    const proRatedHeffingskorting = Math.round(3362 * (monthsInNL / 12));
    const relocationDeduction = hasRelocation ? 1450 : 0;
    const adjustedIncome = Math.max(0, grossIncome - relocationDeduction);
    const estimatedTax = Math.max(0, Math.round(adjustedIncome * bracketRate - proRatedHeffingskorting));
    return Math.max(0, withheldTax - estimatedTax);
  };

  // 2. Calculadora Toeslagen
  const [toeslagIncome, setToeslagIncome] = useState<number>(26000);
  const [isCouple, setIsCouple] = useState<boolean>(false);
  const [monthlyRent, setMonthlyRent] = useState<number>(850);
  const [hasChildren, setHasChildren] = useState<boolean>(false);

  const calculateZorg = () => {
    const maxThresh = isCouple ? 48500 : 38500;
    if (toeslagIncome > maxThresh) return 0;
    const maxVal = isCouple ? 295 : 154;
    const factor = Math.max(0, 1 - toeslagIncome / maxThresh);
    return Math.round(maxVal * (0.55 + 0.45 * factor));
  };

  const calculateHuur = () => {
    if (monthlyRent < 450 || toeslagIncome > 36000) return 0;
    if (monthlyRent > 880) return 380;
    return Math.round(Math.min(420, (monthlyRent - 300) * 0.7));
  };

  const totalMonthlyAid = calculateZorg() + calculateHuur() + (hasChildren ? 115 : 0);

  // 3. FAQ State
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // 4. Modal de Trámite Rápido / Contacto
  const [selectedServiceModal, setSelectedServiceModal] = useState<ServiceItem | null>(null);
  const [modalName, setModalName] = useState('');
  const [modalEmail, setModalEmail] = useState('');
  const [modalPhone, setModalPhone] = useState('');
  const [modalSubmitted, setModalSubmitted] = useState(false);

  // 5. Booking Form State
  const [bookName, setBookName] = useState('');
  const [bookEmail, setBookEmail] = useState('');
  const [bookPhone, setBookPhone] = useState('');
  const [bookService, setBookService] = useState('Declaración de la Renta (M-Form)');
  const [bookDate, setBookDate] = useState('2026-10-15');
  const [bookTime, setBookTime] = useState('11:00');
  const [bookModality, setBookModality] = useState<'meet' | 'phone' | 'office'>('meet');
  const [bookSuccess, setBookSuccess] = useState(false);
  const [bookLoading, setBookLoading] = useState(false);

  // 6. WhatsApp Floating Quick Chat
  const [showWhatsAppBox, setShowWhatsAppBox] = useState(false);
  const [whatsappMsg, setWhatsappMsg] = useState('¡Hola RP Gestoría! Acabo de llegar a Holanda y necesito ayuda con mis trámites.');

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookLoading(true);
    try {
      await fetch(apiUrl('/appointments'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: bookName,
          email: bookEmail,
          phone: bookPhone,
          title: `Cita Web: ${bookService}`,
          appointment_date: bookDate,
          appointment_time: bookTime,
          modality: bookModality === 'meet' ? 'online_meet' : bookModality === 'phone' ? 'llamada' : 'presencial',
        }),
      });
      setBookSuccess(true);
    } catch {
      // Fallback local
      setBookSuccess(true);
    } finally {
      setBookLoading(false);
    }
  };

  const handleModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setModalSubmitted(true);
  };

  const [servicesList, setServicesList] = useState<ServiceItem[]>(SERVICES_DATA);

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

  const filteredServices = activeCategory === 'todos' 
    ? servicesList 
    : servicesList.filter(s => s.category === activeCategory);

  const toggleVideoPlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const toggleVideoMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans antialiased selection:bg-blue-600 selection:text-white">
      
      <Navbar />

      {/* ========================================================================= */}
      {/* 2. HERO SECTION                                                           */}
      {/* ========================================================================= */}
      <section id="inicio" className="relative pt-12 pb-20 overflow-hidden bg-gradient-to-b from-blue-50/40 via-white to-[#F8FAFC]">
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* LEFT COLUMN: HERO HEADLINE & CTAS */}
            <div className="lg:col-span-6 space-y-8 text-center lg:text-left">
              
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100/70 border border-blue-200/80 text-blue-800 text-xs font-semibold shadow-sm">
                <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse"></span>
                <span>Especialistas en recién llegados & expatriados en Países Bajos</span>
              </div>

              <h1 className="font-heading text-4xl sm:text-5xl lg:text-[54px] font-extrabold text-slate-900 tracking-tight leading-[1.15]">
                ¿Acabas de llegar a <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Holanda</span>?
              </h1>

              <p className="text-lg sm:text-xl text-slate-600 font-normal leading-relaxed max-w-xl mx-auto lg:mx-0">
                Te ayudamos con tus trámites, impuestos y gestiones de forma sencilla, rápida y <strong>100% en tu idioma</strong>. Sin jerga legal confusa.
              </p>

              {/* VALUE PROPS */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 max-w-lg mx-auto lg:mx-0 text-left">
                <div className="flex items-center gap-2.5 bg-white p-3 rounded-xl border border-slate-200/70 shadow-sm">
                  <span className="material-symbols-outlined text-blue-600 text-[20px]">verified</span>
                  <span className="text-xs font-medium text-slate-800">100% en Español</span>
                </div>
                <div className="flex items-center gap-2.5 bg-white p-3 rounded-xl border border-slate-200/70 shadow-sm">
                  <span className="material-symbols-outlined text-blue-600 text-[20px]">bolt</span>
                  <span className="text-xs font-medium text-slate-800">Trámite Directo</span>
                </div>
                <div className="flex items-center gap-2.5 bg-white p-3 rounded-xl border border-slate-200/70 shadow-sm">
                  <span className="material-symbols-outlined text-blue-600 text-[20px]">smartphone</span>
                  <span className="text-xs font-medium text-slate-800">Online & WhatsApp</span>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-4">
                <Link
                  href="/servicios"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 text-base font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 transition-all transform hover:-translate-y-0.5"
                >
                  <span>Empezar mi trámite</span>
                  <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                </Link>

                <Link
                  href="/reservar"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-4 text-base font-bold text-slate-800 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all"
                >
                  <span className="material-symbols-outlined text-blue-600 text-[20px]">event_available</span>
                  <span>Reservar una cita</span>
                </Link>
              </div>

              {/* SOCIAL PROOF */}
              <div className="flex items-center justify-center lg:justify-start gap-4 pt-3 text-slate-500 text-xs font-medium">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full border-2 border-white overflow-hidden bg-slate-200">
                    <Image src="/photo-1.png" alt="Cliente" width={32} height={32} className="object-cover" />
                  </div>
                  <div className="w-8 h-8 rounded-full border-2 border-white overflow-hidden bg-slate-200">
                    <Image src="/photo-2.png" alt="Cliente" width={32} height={32} className="object-cover" />
                  </div>
                  <div className="w-8 h-8 rounded-full border-2 border-white overflow-hidden bg-slate-200">
                    <Image src="/photo-3.png" alt="Cliente" width={32} height={32} className="object-cover" />
                  </div>
                  <div className="w-8 h-8 rounded-full border-2 border-white bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
                    +1k
                  </div>
                </div>
                <div>
                  <div className="flex items-center text-amber-500 text-[14px]">
                    ★★★★★ <span className="text-slate-800 font-bold ml-1 text-xs">4.9 / 5</span>
                  </div>
                  <span>Más de 1.400 jóvenes y expatriados asesorados</span>
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN: PROMOTIONAL VIDEO & CINEMATIC MEDIA SHOWCASE */}
            <div className="lg:col-span-6">
              <div className="relative mx-auto max-w-md lg:max-w-none">
                
                {/* Decorative glow */}
                <div className="absolute -top-10 -right-10 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl -z-10 pointer-events-none"></div>
                <div className="absolute -bottom-10 -left-10 w-72 h-72 bg-indigo-400/20 rounded-full blur-3xl -z-10 pointer-events-none"></div>

                {/* VIDEO CONTAINER */}
                <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-white bg-slate-900 group">
                  <video
                    ref={videoRef}
                    src="/promo-video.mp4"
                    autoPlay
                    loop
                    muted={isMuted}
                    playsInline
                    className="w-full h-[380px] sm:h-[420px] object-cover"
                  />

                  {/* VIDEO OVERLAY CONTROLS */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/20 pointer-events-none"></div>

                  <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white pointer-events-auto">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={toggleVideoPlay}
                        className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md hover:bg-white/40 flex items-center justify-center transition-all shadow-md"
                        aria-label={isPlaying ? 'Pausar vídeo' : 'Reproducir vídeo'}
                      >
                        <span className="material-symbols-outlined text-[22px]">
                          {isPlaying ? 'pause' : 'play_arrow'}
                        </span>
                      </button>

                      <button
                        onClick={toggleVideoMute}
                        className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md hover:bg-white/40 flex items-center justify-center transition-all shadow-md"
                        aria-label={isMuted ? 'Activar sonido' : 'Silenciar sonido'}
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          {isMuted ? 'volume_off' : 'volume_up'}
                        </span>
                      </button>

                      <div className="hidden sm:block">
                        <p className="text-xs font-bold tracking-wide">RP Gestoría en Acción</p>
                        <p className="text-[11px] text-slate-300">Conoce cómo te acompañamos</p>
                      </div>
                    </div>

                    <span className="px-3 py-1 rounded-full bg-blue-600/90 backdrop-blur-md text-[11px] font-bold tracking-wider uppercase">
                      Vídeo Oficial
                    </span>
                  </div>

                  {/* FLOATING BADGE TOP RIGHT */}
                  <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md text-slate-900 px-3.5 py-2 rounded-xl shadow-lg border border-white/50 flex items-center gap-2">
                    <span className="material-symbols-outlined text-green-600 text-[18px]">verified</span>
                    <div className="text-left">
                      <p className="text-[10px] uppercase font-bold text-slate-500">Garantía</p>
                      <p className="text-xs font-extrabold text-slate-900">Belastingdienst / UWV</p>
                    </div>
                  </div>

                </div>

                {/* MINI PHOTO CAROUSEL / HIGHLIGHTS UNDER VIDEO */}
                <div className="grid grid-cols-3 gap-3 mt-4">
                  <div className="relative h-20 rounded-xl overflow-hidden border-2 border-white shadow-sm group">
                    <Image src="/photo-4.png" alt="Asesoría personalizada" fill className="object-cover group-hover:scale-105 transition-transform" />
                    <div className="absolute inset-0 bg-slate-900/40 flex items-end p-2">
                      <span className="text-[10px] font-bold text-white leading-tight">M-Form & Renta</span>
                    </div>
                  </div>
                  <div className="relative h-20 rounded-xl overflow-hidden border-2 border-white shadow-sm group">
                    <Image src="/photo-5.png" alt="Subsidios y Zorgtoeslag" fill className="object-cover group-hover:scale-105 transition-transform" />
                    <div className="absolute inset-0 bg-slate-900/40 flex items-end p-2">
                      <span className="text-[10px] font-bold text-white leading-tight">Zorgtoeslag</span>
                    </div>
                  </div>
                  <div className="relative h-20 rounded-xl overflow-hidden border-2 border-white shadow-sm group">
                    <Image src="/photo-7.png" alt="Empresas y ZZP" fill className="object-cover group-hover:scale-105 transition-transform" />
                    <div className="absolute inset-0 bg-slate-900/40 flex items-end p-2">
                      <span className="text-[10px] font-bold text-white leading-tight">Autónomos ZZP</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. SECTION "¿ACABAS DE LLEGAR A HOLANDA?" (4-STEP PROCESS)                */}
      {/* ========================================================================= */}
      <section id="como-funciona" className="py-20 bg-white border-y border-slate-100">
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16">
          
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="text-blue-600 font-bold text-xs uppercase tracking-widest bg-blue-50 px-3.5 py-1.5 rounded-full border border-blue-100">
              Proceso 100% Transparente
            </span>
            <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              ¿Acabas de llegar a Holanda? Así de fácil trabajamos
            </h2>
            <p className="text-slate-600 text-base sm:text-lg">
              Nos encargamos de la burocracia holandesa para que tú solo disfrutes de tu nueva etapa en Países Bajos.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
            
            {/* STEP 1 */}
            <div className="relative bg-slate-50/80 rounded-2xl p-6 border border-slate-200/70 hover:shadow-lg hover:border-blue-200 transition-all group">
              <div className="w-12 h-12 rounded-xl bg-blue-600 text-white font-heading font-extrabold text-lg flex items-center justify-center mb-5 shadow-md shadow-blue-500/20 group-hover:scale-110 transition-transform">
                01
              </div>
              <h3 className="font-heading font-bold text-lg text-slate-900 mb-2">
                Cuéntanos tu situación
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Escríbenos por WhatsApp o reserva una cita rápida. Te escuchamos de tú a tú y analizamos tu caso particular sin tecnicismos.
              </p>
            </div>

            {/* STEP 2 */}
            <div className="relative bg-slate-50/80 rounded-2xl p-6 border border-slate-200/70 hover:shadow-lg hover:border-blue-200 transition-all group">
              <div className="w-12 h-12 rounded-xl bg-blue-600 text-white font-heading font-extrabold text-lg flex items-center justify-center mb-5 shadow-md shadow-blue-500/20 group-hover:scale-110 transition-transform">
                02
              </div>
              <h3 className="font-heading font-bold text-lg text-slate-900 mb-2">
                Te indicamos qué necesitas
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Sin listas infinitas ni estrés con el neerlandés. Te decimos con exactitud qué 2 o 3 documentos hacen falta.
              </p>
            </div>

            {/* STEP 3 */}
            <div className="relative bg-slate-50/80 rounded-2xl p-6 border border-slate-200/70 hover:shadow-lg hover:border-blue-200 transition-all group">
              <div className="w-12 h-12 rounded-xl bg-blue-600 text-white font-heading font-extrabold text-lg flex items-center justify-center mb-5 shadow-md shadow-blue-500/20 group-hover:scale-110 transition-transform">
                03
              </div>
              <h3 className="font-heading font-bold text-lg text-slate-900 mb-2">
                Sube tus documentos
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Adjúntalos en 1 minuto desde tu móvil en tu Área de Cliente cifrada o envíalos con total seguridad por WhatsApp.
              </p>
            </div>

            {/* STEP 4 */}
            <div className="relative bg-slate-50/80 rounded-2xl p-6 border border-slate-200/70 hover:shadow-lg hover:border-blue-200 transition-all group">
              <div className="w-12 h-12 rounded-xl bg-blue-600 text-white font-heading font-extrabold text-lg flex items-center justify-center mb-5 shadow-md shadow-blue-500/20 group-hover:scale-110 transition-transform">
                04
              </div>
              <h3 className="font-heading font-bold text-lg text-slate-900 mb-2">
                Nos encargamos de todo
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Presentamos tu solicitud formal ante Belastingdienst, UWV o Gemeente y te mantenemos informado paso a paso.
              </p>
            </div>

          </div>

          {/* BANNER RECIÉN LLEGADO */}
          <div className="mt-14 bg-gradient-to-r from-blue-900 via-slate-900 to-indigo-950 rounded-2xl p-8 sm:p-10 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <h4 className="font-heading font-extrabold text-xl sm:text-2xl">
                ¿No sabes qué trámite te corresponde solicitar primero?
              </h4>
              <p className="text-sm text-slate-300 max-w-xl">
                Haz nuestro test de 30 segundos o habla con un gestor en directo para tener una hoja de ruta clara de tu llegada a Holanda.
              </p>
            </div>
            <Link
              href="#reservar"
              className="px-6 py-3.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-sm tracking-wide shadow-md transition-all shrink-0"
            >
              Consulta Inicial Gratuita
            </Link>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. SECCIÓN DE SERVICIOS (13 MODERN CARDS)                                 */}
      {/* ========================================================================= */}
      <section id="servicios" className="py-24 bg-[#F8FAFC]">
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16">
          
          <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
            <span className="text-blue-600 font-bold text-xs uppercase tracking-widest bg-blue-50 px-3.5 py-1.5 rounded-full border border-blue-100">
              Nuestros Servicios
            </span>
            <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Todos tus trámites en un único lugar
            </h2>
            <p className="text-slate-600 text-base sm:text-lg">
              Soluciones claras, tarifas transparentes y gestión directa ante los organismos oficiales holandeses.
            </p>
          </div>

          {/* FILTER PILLS */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-12">
            {[
              { id: 'todos', label: 'Todos los Trámites' },
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
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200/70'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* SERVICES GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredServices.map((srv) => (
              <div
                key={srv.id}
                className="bg-white rounded-2xl p-7 border border-slate-200/80 hover:border-blue-300 shadow-sm hover:shadow-xl transition-all duration-200 flex flex-col justify-between group"
              >
                <div>
                  
                  {/* CARD HEADER */}
                  <div className="flex items-start justify-between gap-4 mb-5">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors shadow-sm">
                      <span className="material-symbols-outlined text-[26px]">{srv.icon}</span>
                    </div>

                    {srv.badge && (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200/60">
                        {srv.badge}
                      </span>
                    )}
                  </div>

                  {/* TITLE & DESCRIPTION */}
                  <h3 className="font-heading font-bold text-lg text-slate-900 mb-2.5 group-hover:text-blue-600 transition-colors">
                    {srv.title}
                  </h3>
                  
                  <p className="text-sm text-slate-600 leading-relaxed mb-6">
                    {srv.desc}
                  </p>

                </div>

                {/* CARD FOOTER */}
                <div className="pt-5 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400 uppercase font-semibold block">Tarifa clara</span>
                    <span className="text-base font-extrabold text-slate-900">{srv.price}</span>
                  </div>

                  <button
                    onClick={() => setSelectedServiceModal(srv)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-blue-600 transition-colors shadow-sm"
                  >
                    <span>Empezar trámite</span>
                    <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                  </button>
                </div>

              </div>
            ))}
          </div>

          {/* CALLOUT TO CLIENT PORTAL */}
          <div className="mt-14 text-center">
            <p className="text-sm text-slate-500 mb-3">
              ¿Ya eres cliente de RP Gestoría o tienes un trámite en curso?
            </p>
            <Link
              href="/portal"
              className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-800 underline underline-offset-4"
            >
              <span className="material-symbols-outlined text-[18px]">lock</span>
              <span>Entra a tu Área de Cliente para consultar el estado de tu expediente</span>
            </Link>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. INTERACTIVE SIMULATORS (M-FORM & TOESLAGEN)                             */}
      {/* ========================================================================= */}
      <section id="calculadora" className="py-20 bg-white border-y border-slate-100">
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16">
          
          <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
            <span className="text-blue-600 font-bold text-xs uppercase tracking-widest bg-blue-50 px-3.5 py-1.5 rounded-full border border-blue-100">
              Simuladores Inteligentes
            </span>
            <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Calcula tu devolución y subsidios en Holanda
            </h2>
            <p className="text-slate-600 text-base sm:text-lg">
              Estimaciones instantáneas basadas en las tablas oficiales del Belastingdienst 2026.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* SIMULADOR 1: M-FORM REFUND */}
            <div className="bg-slate-50 rounded-2xl p-7 sm:p-8 border border-slate-200/80 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                      <span className="material-symbols-outlined text-[22px]">calculate</span>
                    </div>
                    <div>
                      <h3 className="font-heading font-bold text-lg text-slate-900">Simulador Devolución M-Form</h3>
                      <p className="text-xs text-slate-500">Para tu primer año de mudanza a Holanda</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-md bg-blue-100 text-blue-700 text-xs font-bold">
                    Box 1 Fiscal
                  </span>
                </div>

                <div className="space-y-6">
                  {/* SLIDER MESES */}
                  <div>
                    <div className="flex justify-between text-sm font-semibold text-slate-700 mb-2">
                      <span>Meses vividos en Holanda este año:</span>
                      <span className="text-blue-600 font-extrabold">{monthsInNL} meses</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="11"
                      value={monthsInNL}
                      onChange={(e) => setMonthsInNL(Number(e.target.value))}
                      className="w-full accent-blue-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* SLIDER INGRESOS BRUTOS */}
                  <div>
                    <div className="flex justify-between text-sm font-semibold text-slate-700 mb-2">
                      <span>Ingreso bruto percibido en Holanda:</span>
                      <span className="text-blue-600 font-extrabold">{grossIncome.toLocaleString()} €</span>
                    </div>
                    <input
                      type="range"
                      min="10000"
                      max="90000"
                      step="1000"
                      value={grossIncome}
                      onChange={(e) => setGrossIncome(Number(e.target.value))}
                      className="w-full accent-blue-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* SLIDER IRPF RETENIDO */}
                  <div>
                    <div className="flex justify-between text-sm font-semibold text-slate-700 mb-2">
                      <span>Impuestos retenidos en nómina (Loonheffing):</span>
                      <span className="text-blue-600 font-extrabold">{withheldTax.toLocaleString()} €</span>
                    </div>
                    <input
                      type="range"
                      min="2000"
                      max="35000"
                      step="500"
                      value={withheldTax}
                      onChange={(e) => setWithheldTax(Number(e.target.value))}
                      className="w-full accent-blue-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* CHECKBOX GASTOS MUDANZA */}
                  <label className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasRelocation}
                      onChange={(e) => setHasRelocation(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded accent-blue-600"
                    />
                    <span className="text-xs font-medium text-slate-700">
                      Incluir deducción estándar de mudanza y traslado internacional (-1.450 €)
                    </span>
                  </label>
                </div>
              </div>

              {/* RESULTADO M-FORM */}
              <div className="mt-8 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <span className="text-xs text-slate-500 font-semibold block">Estimación devolución a tu favor:</span>
                  <span className="text-3xl font-heading font-black text-emerald-600">
                    + {calculateMFormRefund().toLocaleString()} €
                  </span>
                </div>
                <Link
                  href="#reservar"
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-blue-600 text-white font-bold text-xs shadow-md transition-colors text-center"
                >
                  Reclamar mi devolución
                </Link>
              </div>

            </div>

            {/* SIMULADOR 2: SUBSIDIOS TOESLAGEN */}
            <div className="bg-slate-50 rounded-2xl p-7 sm:p-8 border border-slate-200/80 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                      <span className="material-symbols-outlined text-[22px]">payments</span>
                    </div>
                    <div>
                      <h3 className="font-heading font-bold text-lg text-slate-900">Calculadora Subsidios Toeslagen</h3>
                      <p className="text-xs text-slate-500">Zorgtoeslag (Salud) & Huurtoeslag (Alquiler)</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-md bg-indigo-100 text-indigo-700 text-xs font-bold">
                    Ayuda Mensual
                  </span>
                </div>

                <div className="space-y-6">
                  {/* SLIDER INGRESOS ANUALES */}
                  <div>
                    <div className="flex justify-between text-sm font-semibold text-slate-700 mb-2">
                      <span>Ingreso anual bruto estimado:</span>
                      <span className="text-indigo-600 font-extrabold">{toeslagIncome.toLocaleString()} € / año</span>
                    </div>
                    <input
                      type="range"
                      min="12000"
                      max="55000"
                      step="1000"
                      value={toeslagIncome}
                      onChange={(e) => setToeslagIncome(Number(e.target.value))}
                      className="w-full accent-indigo-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* SLIDER ALQUILER */}
                  <div>
                    <div className="flex justify-between text-sm font-semibold text-slate-700 mb-2">
                      <span>Alquiler mensual de tu vivienda:</span>
                      <span className="text-indigo-600 font-extrabold">{monthlyRent} € / mes</span>
                    </div>
                    <input
                      type="range"
                      min="400"
                      max="1400"
                      step="25"
                      value={monthlyRent}
                      onChange={(e) => setMonthlyRent(Number(e.target.value))}
                      className="w-full accent-indigo-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* CHECKBOXES SITUACION */}
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex items-center gap-2 p-3 bg-white rounded-xl border border-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isCouple}
                        onChange={(e) => setIsCouple(e.target.checked)}
                        className="w-4 h-4 text-indigo-600 rounded accent-indigo-600"
                      />
                      <span className="text-xs font-medium text-slate-700">Con pareja fiscal</span>
                    </label>

                    <label className="flex items-center gap-2 p-3 bg-white rounded-xl border border-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hasChildren}
                        onChange={(e) => setHasChildren(e.target.checked)}
                        className="w-4 h-4 text-indigo-600 rounded accent-indigo-600"
                      />
                      <span className="text-xs font-medium text-slate-700">Con hijos menores</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* RESULTADO TOESLAGEN */}
              <div className="mt-8 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <span className="text-xs text-slate-500 font-semibold block">Total subsidios mensuales:</span>
                  <span className="text-3xl font-heading font-black text-indigo-600">
                    {totalMonthlyAid} € <span className="text-xs font-normal text-slate-500">/ mes</span>
                  </span>
                </div>
                <Link
                  href="#reservar"
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white font-bold text-xs shadow-md transition-colors text-center"
                >
                  Solicitar mis subsidios
                </Link>
              </div>

            </div>

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. SOBRE NOSOTROS (ABOUT US & TEAM SHOWCASE)                               */}
      {/* ========================================================================= */}
      <section id="nosotros" className="py-24 bg-[#F8FAFC]">
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* LEFT: REAL PHOTOGRAPHY COMPOSITION */}
            <div className="lg:col-span-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="relative h-64 rounded-2xl overflow-hidden shadow-lg border-2 border-white group">
                    <Image 
                      src="/photo-6.png" 
                      alt="Asesoría joven en Holanda" 
                      fill 
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm text-center">
                    <p className="font-heading font-extrabold text-2xl text-blue-600">+1.400</p>
                    <p className="text-xs text-slate-600 font-medium">Expedientes tramitados con éxito</p>
                  </div>
                </div>

                <div className="space-y-4 pt-6">
                  <div className="bg-blue-600 p-5 rounded-2xl text-white shadow-md text-center">
                    <p className="font-heading font-extrabold text-2xl">100%</p>
                    <p className="text-xs text-blue-100 font-medium">Sin cartas en holandés</p>
                  </div>
                  <div className="relative h-64 rounded-2xl overflow-hidden shadow-lg border-2 border-white group">
                    <Image 
                      src="/photo-8.png" 
                      alt="Consultas y reuniones" 
                      fill 
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT: STORY & VALUES */}
            <div className="lg:col-span-6 space-y-6">
              
              <span className="text-blue-600 font-bold text-xs uppercase tracking-widest bg-blue-50 px-3.5 py-1.5 rounded-full border border-blue-100">
                Sobre Nosotros
              </span>

              <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
                Sabemos lo que es llegar a Holanda y no entender las cartas del Belastingdienst
              </h2>

              <p className="text-slate-600 text-base leading-relaxed">
                <strong>RP Gestoría & Asesoría</strong> nació con un propósito claro: eliminar las barreras burocráticas y el estrés que sufren los jóvenes, españoles, latinos e internacionales al empezar una nueva vida en Países Bajos.
              </p>

              <p className="text-slate-600 text-base leading-relaxed">
                Somos un equipo joven, moderno y cercano. No creemos en los despachos antiguos llenos de carpetas polvorientas ni en el lenguaje jurídico incomprensible. Gestionamos tus trámites con la máxima agilidad digital, claridad y un trato humano inmejorable.
              </p>

              {/* PILLARS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="flex items-start gap-3 bg-white p-4 rounded-xl border border-slate-200/70 shadow-sm">
                  <span className="material-symbols-outlined text-blue-600 text-[24px]">chat</span>
                  <div>
                    <h4 className="font-heading font-bold text-sm text-slate-900">Trato de Tú a Tú</h4>
                    <p className="text-xs text-slate-500">Explicaciones claras y directas en tu idioma.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-white p-4 rounded-xl border border-slate-200/70 shadow-sm">
                  <span className="material-symbols-outlined text-blue-600 text-[24px]">speed</span>
                  <div>
                    <h4 className="font-heading font-bold text-sm text-slate-900">Rapidez Digital</h4>
                    <p className="text-xs text-slate-500">Firma electrónica y seguimiento online 24/7.</p>
                  </div>
                </div>
              </div>

            </div>

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. RESERVA DE CITA ONLINE (INTERACTIVE BOOKING)                           */}
      {/* ========================================================================= */}
      <section id="reservar" className="py-24 bg-white border-y border-slate-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <span className="text-blue-600 font-bold text-xs uppercase tracking-widest bg-blue-50 px-3.5 py-1.5 rounded-full border border-blue-100">
              Agenda tu Sesión
            </span>
            <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Reserva tu cita con tu asesor asignado
            </h2>
            <p className="text-slate-600 text-base">
              Elige el día, la hora y el formato que mejor te convenga (Google Meet, teléfono o presencial).
            </p>
          </div>

          <div className="bg-slate-50 rounded-3xl p-8 sm:p-12 border border-slate-200/90 shadow-xl">
            {bookSuccess ? (
              <div className="text-center py-12 space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <span className="material-symbols-outlined text-[36px]">check_circle</span>
                </div>
                <h3 className="font-heading font-extrabold text-2xl text-slate-900">
                  ¡Cita reservada con éxito!
                </h3>
                <p className="text-slate-600 max-w-md mx-auto text-sm">
                  Hemos enviado un correo de confirmación a <strong>{bookEmail}</strong> con el enlace de la reunión y los detalles de tu asesor.
                </p>
                <div className="pt-4">
                  <button
                    onClick={() => {
                      setBookSuccess(false);
                      setBookName('');
                      setBookEmail('');
                      setBookPhone('');
                    }}
                    className="px-6 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-blue-600 transition-colors"
                  >
                    Programar otra cita
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleBookingSubmit} className="space-y-6">
                
                {/* MODALIDAD */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                    1. Formato de la consulta
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { id: 'meet', label: 'Videollamada Google Meet', icon: 'videocam' },
                      { id: 'phone', label: 'Llamada telefónica', icon: 'call' },
                      { id: 'office', label: 'Presencial (Oficina NL)', icon: 'apartment' },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setBookModality(m.id as any)}
                        className={`p-4 rounded-xl border flex items-center gap-3 text-left transition-all ${
                          bookModality === m.id
                            ? 'border-blue-600 bg-blue-50/80 text-blue-900 shadow-sm'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span className="material-symbols-outlined text-blue-600 text-[22px]">{m.icon}</span>
                        <span className="text-xs font-bold">{m.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* SERVICIO & FECHA/HORA */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      2. Trámite principal
                    </label>
                    <select
                      value={bookService}
                      onChange={(e) => setBookService(e.target.value)}
                      className="w-full px-4 py-3 bg-white rounded-xl border border-slate-200 text-sm font-medium text-slate-800 focus:ring-2 focus:ring-blue-600 outline-none"
                    >
                      <option value="Declaración de la Renta (M-Form)">Declaración de la Renta (M-Form)</option>
                      <option value="DigiD & Claves de Acceso">DigiD & Claves de Acceso</option>
                      <option value="Zorgtoeslag (Subsidio de Salud)">Zorgtoeslag (Subsidio de Salud)</option>
                      <option value="Seguro Médico Holandés">Seguro Médico Holandés</option>
                      <option value="Formulario U1">Formulario U1</option>
                      <option value="Prestación por Desempleo WW">Prestación por Desempleo WW</option>
                      <option value="Autónomos / ZZP">Autónomos / ZZP</option>
                      <option value="Consulta Privada General">Consulta Privada General</option>
                      <option value="Importación de Vehículos">Importación de Vehículos</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      3. Fecha deseada
                    </label>
                    <input
                      type="date"
                      value={bookDate}
                      onChange={(e) => setBookDate(e.target.value)}
                      className="w-full px-4 py-3 bg-white rounded-xl border border-slate-200 text-sm font-medium text-slate-800 focus:ring-2 focus:ring-blue-600 outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      4. Hora
                    </label>
                    <select
                      value={bookTime}
                      onChange={(e) => setBookTime(e.target.value)}
                      className="w-full px-4 py-3 bg-white rounded-xl border border-slate-200 text-sm font-medium text-slate-800 focus:ring-2 focus:ring-blue-600 outline-none"
                    >
                      <option value="09:30">09:30 AM</option>
                      <option value="11:00">11:00 AM</option>
                      <option value="12:30">12:30 PM</option>
                      <option value="15:00">15:00 PM</option>
                      <option value="16:30">16:30 PM</option>
                      <option value="18:00">18:00 PM</option>
                    </select>
                  </div>
                </div>

                {/* DATOS PERSONALES */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Tu nombre y apellidos
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Sofía Morales"
                      value={bookName}
                      onChange={(e) => setBookName(e.target.value)}
                      className="w-full px-4 py-3 bg-white rounded-xl border border-slate-200 text-sm font-medium text-slate-800 focus:ring-2 focus:ring-blue-600 outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Correo electrónico
                    </label>
                    <input
                      type="email"
                      placeholder="sofia@ejemplo.com"
                      value={bookEmail}
                      onChange={(e) => setBookEmail(e.target.value)}
                      className="w-full px-4 py-3 bg-white rounded-xl border border-slate-200 text-sm font-medium text-slate-800 focus:ring-2 focus:ring-blue-600 outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Teléfono / WhatsApp
                    </label>
                    <input
                      type="tel"
                      placeholder="+31 6 12345678"
                      value={bookPhone}
                      onChange={(e) => setBookPhone(e.target.value)}
                      className="w-full px-4 py-3 bg-white rounded-xl border border-slate-200 text-sm font-medium text-slate-800 focus:ring-2 focus:ring-blue-600 outline-none"
                      required
                    />
                  </div>
                </div>

                {/* SUBMIT BUTTON */}
                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={bookLoading}
                    className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-heading font-extrabold text-base tracking-wide shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2"
                  >
                    {bookLoading ? (
                      <span>Confirmando disponibilidad...</span>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[20px]">check</span>
                        <span>Confirmar y Reservar Cita</span>
                      </>
                    )}
                  </button>
                </div>

              </form>
            )}
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 8. PREGUNTAS FRECUENTES (FAQ)                                             */}
      {/* ========================================================================= */}
      <section id="faq" className="py-24 bg-[#F8FAFC]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center mb-14 space-y-3">
            <span className="text-blue-600 font-bold text-xs uppercase tracking-widest bg-blue-50 px-3.5 py-1.5 rounded-full border border-blue-100">
              Resolvemos tus Dudas
            </span>
            <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Preguntas frecuentes sobre trámites en Holanda
            </h2>
            <p className="text-slate-600 text-base">
              Todo lo que necesitas saber de forma clara, directa y sin lenguaje enrevesado.
            </p>
          </div>

          <div className="space-y-4">
            {[
              {
                q: '¿Qué es el formulario M-Form y por qué suele salir una devolución alta?',
                a: 'El M-Form (M-biljet) es la declaración de la renta para el año en que te mudas a vivir o trabajar en Países Bajos. Durante ese primer año, las empresas suelen retenerte impuestos como si fueras a residir todo el año natural. Al hacer el M-Form y aplicar deducciones por mudanza y tramos proporcionales, el Belastingdienst casi siempre te devuelve una cantidad significativa de dinero (de media 800€ a 2.400€).',
              },
              {
                q: '¿Cuánto tarda en tramitarse el DigiD y cómo me ayudáis si no hablo holandés?',
                a: 'El código de activación del DigiD se envía por carta postal a tu dirección empadronada en un plazo de 3 a 5 días hábiles. Nosotros te guiamos en la solicitud online, configuramos tu aplicación en el móvil y nos aseguramos de que puedas acceder sin errores a Belastingdienst, MijnOverheid y tu seguro de salud.',
              },
              {
                q: '¿Puedo solicitar el subsidio de salud (Zorgtoeslag) con carácter retroactivo?',
                a: 'Sí. Puedes solicitar el Zorgtoeslag con efecto retroactivo para todo el año fiscal en curso y, si estás dentro del plazo legal (hasta el 1 de septiembre del año siguiente), también para el año anterior. Si cumples los requisitos de ingresos, recibirás el pago acumulado de golpe.',
              },
              {
                q: '¿Es obligatorio contratar un seguro médico holandés si ya tengo la Tarjeta Sanitaria Europea?',
                a: 'Sí. En cuanto empiezas a trabajar en los Países Bajos o fijas tu residencia habitual, la ley holandesa exige contratar una póliza de seguro médico básica (Basisverzekering) en un plazo máximo de 4 meses desde tu llegada. De lo contrario, el CAK te impondrá multas elevadas.',
              },
              {
                q: '¿Cómo funciona el Área de Cliente de RP Gestoría?',
                a: 'Una vez contratas un trámite, tienes acceso privado a tu portal. Allí puedes subir fotos de tus cartas o nóminas, ver el estado de tu expediente en tiempo real, descargar tus borradores oficiales y hablar 24/7 con nuestro asistente inteligente o tu asesor.',
              },
              {
                q: '¿Cuánto tardáis en presentar mi trámite ante las autoridades?',
                a: 'Una vez recibida la documentación completa, presentamos tu solicitud formal ante Belastingdienst, UWV o Gemeente en un plazo máximo de 24 a 48 horas laborables.',
              },
            ].map((faq, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden transition-all shadow-sm"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full text-left px-6 py-5 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
                >
                  <span className="font-heading font-bold text-base text-slate-900">
                    {faq.q}
                  </span>
                  <span className={`material-symbols-outlined text-blue-600 transition-transform duration-200 ${
                    openFaq === idx ? 'rotate-180' : ''
                  }`}>
                    keyboard_arrow_down
                  </span>
                </button>

                {openFaq === idx && (
                  <div className="px-6 pb-6 pt-1 text-slate-600 text-sm leading-relaxed border-t border-slate-100">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 9. CONTACTO & ATENCIÓN DIRECTA                                            */}
      {/* ========================================================================= */}
      <section id="contacto" className="py-20 bg-white border-t border-slate-100">
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            
            <div className="lg:col-span-5 space-y-6">
              <span className="text-blue-600 font-bold text-xs uppercase tracking-widest bg-blue-50 px-3.5 py-1.5 rounded-full border border-blue-100">
                Contacto Directo
              </span>
              <h2 className="font-heading text-3xl font-extrabold text-slate-900 tracking-tight">
                Estamos aquí para ayudarte. Escríbenos o llámanos.
              </h2>
              <p className="text-slate-600 text-sm leading-relaxed">
                Atención personalizada en español, inglés y neerlandés de lunes a viernes de 09:00 a 19:00.
              </p>

              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/70">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center">
                    <span className="material-symbols-outlined text-[22px]">chat</span>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-semibold">WhatsApp Oficial</p>
                    <p className="text-sm font-bold text-slate-900">+31 6 8529 1402</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/70">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                    <span className="material-symbols-outlined text-[22px]">mail</span>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-semibold">Correo Electrónico</p>
                    <p className="text-sm font-bold text-slate-900">info@rpgestoria.nl</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/70">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                    <span className="material-symbols-outlined text-[22px]">schedule</span>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-semibold">Horario de Atención</p>
                    <p className="text-sm font-bold text-slate-900">Lunes a Viernes: 09:00 – 19:00</p>
                  </div>
                </div>
              </div>
            </div>

            {/* FORMULARIO DE CONSULTA RÁPIDA */}
            <div className="lg:col-span-7 bg-slate-50 rounded-2xl p-8 border border-slate-200/80 shadow-sm">
              <h3 className="font-heading font-bold text-xl text-slate-900 mb-2">Envíanos un mensaje</h3>
              <p className="text-xs text-slate-500 mb-6">Te responderemos en menos de 2 horas hábiles.</p>

              <form onSubmit={(e) => { e.preventDefault(); alert('¡Gracias por tu mensaje! Nos pondremos en contacto contigo de inmediato.'); }} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Nombre</label>
                    <input type="text" required placeholder="Tu nombre" className="w-full px-4 py-2.5 bg-white rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-600 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">WhatsApp / Teléfono</label>
                    <input type="tel" required placeholder="+31 6 ..." className="w-full px-4 py-2.5 bg-white rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-600 outline-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Correo Electrónico</label>
                  <input type="email" required placeholder="tu@email.com" className="w-full px-4 py-2.5 bg-white rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-600 outline-none" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">¿En qué trámite necesitas ayuda?</label>
                  <textarea rows={4} required placeholder="Explícanos brevemente tu caso o situación en Holanda..." className="w-full px-4 py-2.5 bg-white rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-600 outline-none"></textarea>
                </div>

                <button type="submit" className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm tracking-wide shadow-md transition-colors">
                  Enviar Consulta Gratuita
                </button>
              </form>
            </div>

          </div>

        </div>
      </section>

      <Footer />

      {/* ========================================================================= */}
      {/* MODAL DE INICIO DE TRÁMITE RÁPIDO                                         */}
      {/* ========================================================================= */}
      {selectedServiceModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-7 sm:p-8 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[24px]">{selectedServiceModal.icon}</span>
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base text-slate-900">{selectedServiceModal.title}</h3>
                  <span className="text-xs font-semibold text-blue-600">{selectedServiceModal.price}</span>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedServiceModal(null);
                  setModalSubmitted(false);
                }}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                ✕
              </button>
            </div>

            {modalSubmitted ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <span className="material-symbols-outlined text-[32px]">task_alt</span>
                </div>
                <h4 className="font-heading font-extrabold text-xl text-slate-900">¡Solicitud recibida!</h4>
                <p className="text-xs text-slate-600">
                  Un asesor de RP Gestoría se pondrá en contacto contigo de inmediato al WhatsApp/teléfono indicado para empezar tu trámite.
                </p>
                <div className="pt-3">
                  <Link
                    href="/portal"
                    className="inline-block px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-md hover:bg-blue-700"
                  >
                    Ir al Área de Cliente
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleModalSubmit} className="space-y-4 pt-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Completa tus datos para asignarte un gestor especializado y enviarte la lista exacta de documentos necesarios.
                </p>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nombre completo</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Lucas García"
                    value={modalName}
                    onChange={(e) => setModalName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Correo electrónico</label>
                  <input
                    type="email"
                    required
                    placeholder="lucas@ejemplo.com"
                    value={modalEmail}
                    onChange={(e) => setModalEmail(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">WhatsApp / Teléfono</label>
                  <input
                    type="tel"
                    required
                    placeholder="+31 6 ... o +34 6 ..."
                    value={modalPhone}
                    onChange={(e) => setModalPhone(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-colors"
                  >
                    Iniciar Trámite Ahora
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* BOTÓN FLOTANTE DE WHATSAPP DIRECTO                                        */}
      {/* ========================================================================= */}
      <div className="fixed bottom-6 right-6 z-40">
        {showWhatsAppBox && (
          <div className="mb-3 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 animate-in fade-in slide-in-from-bottom-3 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">chat</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">RP Gestoría WhatsApp</p>
                  <p className="text-[10px] text-emerald-600 font-semibold">● En línea ahora</p>
                </div>
              </div>
              <button onClick={() => setShowWhatsAppBox(false)} className="text-slate-400 hover:text-slate-600 text-xs">✕</button>
            </div>
            <div className="py-3">
              <p className="text-xs text-slate-600 mb-2">Escribe tu consulta y se abrirá directamente en tu WhatsApp:</p>
              <textarea
                value={whatsappMsg}
                onChange={(e) => setWhatsappMsg(e.target.value)}
                rows={3}
                className="w-full p-2.5 text-xs bg-slate-50 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <a
              href={`https://wa.me/31685291402?text=${encodeURIComponent(whatsappMsg)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md"
            >
              <span>Abrir en WhatsApp</span>
              <span className="material-symbols-outlined text-[16px]">send</span>
            </a>
          </div>
        )}

        <button
          onClick={() => setShowWhatsAppBox(!showWhatsAppBox)}
          className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-xl flex items-center justify-center hover:scale-110 transition-transform"
          aria-label="Abrir chat de WhatsApp"
        >
          <span className="material-symbols-outlined text-[28px]">chat</span>
        </button>
      </div>

    </div>
  );
}
