'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function PublicHomePage() {
  // Selector de perfil de cliente
  const [selectedAudience, setSelectedAudience] = useState<'expats' | 'zzp' | 'empleados' | 'familias'>('expats');

  // Modo de simulador: M-Form o Subsidios Toeslagen
  const [simMode, setSimMode] = useState<'mform' | 'toeslagen'>('mform');

  // 1. Estado Calculadora M-Form
  const [monthsInNL, setMonthsInNL] = useState<number>(8);
  const [grossIncome, setGrossIncome] = useState<number>(38000);
  const [withheldTax, setWithheldTax] = useState<number>(8500);
  const [hasRelocationExpenses, setHasRelocationExpenses] = useState<boolean>(true);

  // Estimación M-Form inteligente
  const calculateRefund = () => {
    const annualEquivalent = (grossIncome / Math.max(1, monthsInNL)) * 12;
    const actualBracketRate = 0.3697; // Tarifa Box 1 Países Bajos
    const proRatedHeffingskorting = Math.round(3362 * (monthsInNL / 12));
    const relocationDeduction = hasRelocationExpenses ? 1450 : 0;
    const adjustedIncome = Math.max(0, grossIncome - relocationDeduction);
    const estimatedRealTax = Math.max(0, Math.round(adjustedIncome * actualBracketRate - proRatedHeffingskorting));
    const estimatedRefund = Math.max(0, withheldTax - estimatedRealTax);
    return estimatedRefund;
  };

  // 2. Estado Estimador Subsidios Toeslagen
  const [toeslagIncome, setToeslagIncome] = useState<number>(27000);
  const [isCouple, setIsCouple] = useState<boolean>(false);
  const [hasRent, setHasRent] = useState<boolean>(true);
  const [monthlyRent, setMonthlyRent] = useState<number>(850);
  const [childrenCount, setChildrenCount] = useState<number>(0);

  // Cálculo estimativo de subsidios
  const calculateZorgtoeslag = () => {
    const maxThreshold = isCouple ? 48500 : 38500;
    if (toeslagIncome > maxThreshold) return 0;
    const maxZorg = isCouple ? 295 : 154;
    const factor = Math.max(0, 1 - toeslagIncome / maxThreshold);
    return Math.round(maxZorg * (0.5 + 0.5 * factor));
  };

  const calculateHuurtoeslag = () => {
    if (!hasRent || monthlyRent < 450 || toeslagIncome > 35000) return 0;
    if (monthlyRent > 880) return 395;
    return Math.round(Math.min(450, (monthlyRent - 250) * 0.72));
  };

  const calculateKindtoeslag = () => {
    if (childrenCount === 0 || toeslagIncome > 55000) return 0;
    return childrenCount * 115;
  };

  const totalMonthlySubsidies = calculateZorgtoeslag() + calculateHuurtoeslag() + calculateKindtoeslag();
  const totalAnnualSubsidies = totalMonthlySubsidies * 12;

  // 3. FAQ interactivo
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const toggleFaq = (idx: number) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  // 4. Reserva de citas online
  const [bookingName, setBookingName] = useState('');
  const [bookingEmail, setBookingEmail] = useState('');
  const [bookingPhone, setBookingPhone] = useState('');
  const [bookingService, setBookingService] = useState('M-Form / Declaración de la Renta');
  const [bookingDate, setBookingDate] = useState('2026-10-15');
  const [bookingTime, setBookingTime] = useState('11:00');
  const [bookingModality, setBookingModality] = useState<'online_meet' | 'llamada' | 'presencial'>('online_meet');
  const [bookingSuccess, setBookingSuccess] = useState(false);

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('http://localhost:5000/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: bookingName,
          email: bookingEmail,
          phone: bookingPhone,
          title: `Cita Web: ${bookingService}`,
          appointment_date: bookingDate,
          appointment_time: bookingTime,
          modality: bookingModality,
        }),
      });
      setBookingSuccess(true);
    } catch {
      setBookingSuccess(true);
    }
  };

  // 5. Modal flotante de WhatsApp
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-blue-600 selection:text-white font-sans antialiased">
      {/* ========================================================================= */}
      {/* BARRA SUPERIOR DE ALERTA / NOVEDADES FISCALES 2026 */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-950 text-white text-xs py-2 px-4 border-b border-indigo-800/40">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 truncate">
            <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold text-[10px] tracking-wide border border-blue-400/30 shrink-0">
              CAMPANA FISCAL 2026
            </span>
            <span className="text-slate-200 truncate">
              Abierto plazo oficial para la presentación de <strong>M-Form</strong> y regularización de <strong>Zorgtoeslag</strong>.
            </span>
          </div>
          <div className="hidden md:flex items-center gap-6 shrink-0 text-slate-300">
            <span className="flex items-center gap-1.5 text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Asesores disponibles en español
            </span>
            <a href="tel:+31681239845" className="hover:text-white font-mono-data text-[11px] transition-colors">
              +31 6 8123 9845
            </a>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* NAVBAR PRINCIPAL CON GLASSMORPHISM */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 lg:px-12 h-16 sm:h-20 flex items-center justify-between transition-all">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-blue-500 text-white flex items-center justify-center font-bold text-base shadow-md group-hover:scale-105 transition-transform">
              NG
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-lg sm:text-xl tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors">
                NexusGest
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
                Países Bajos
              </span>
            </div>
          </Link>
          <span className="hidden sm:inline-flex items-center gap-1 ml-2 px-2.5 py-0.8 text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/70 rounded-full">
            <span>🇳🇱</span>
            <span>Gestoría Oficial</span>
          </span>
        </div>

        {/* Enlaces de Navegación */}
        <nav className="hidden lg:flex items-center gap-7 text-xs font-semibold text-slate-600">
          <a href="#perfiles" className="hover:text-blue-600 transition-colors">Tu Situación</a>
          <a href="#servicios" className="hover:text-blue-600 transition-colors">Servicios</a>
          <a href="#simulador" className="hover:text-blue-600 transition-colors flex items-center gap-1">
            <span>Simulador IA</span>
            <span className="px-1.5 py-0.2 bg-blue-100 text-blue-700 text-[9px] font-bold rounded">GRATIS</span>
          </a>
          <a href="#testimonios" className="hover:text-blue-600 transition-colors">Casos de Éxito</a>
          <a href="#como-funciona" className="hover:text-blue-600 transition-colors">Cómo Funciona</a>
          <a href="#faq" className="hover:text-blue-600 transition-colors">Preguntas Frecuentes</a>
        </nav>

        {/* Acciones del Header */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/portal"
            className="h-9 sm:h-10 px-3 sm:px-4 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 hover:border-blue-400"
            title="Acceso al Portal del Cliente"
          >
            <span className="material-symbols-outlined text-[18px] text-blue-600">person</span>
            <span>Mijn NexusGest</span>
          </Link>

          <a
            href="#reservar"
            className="h-9 sm:h-10 px-3.5 sm:px-5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 hover:shadow-md"
          >
            <span className="material-symbols-outlined text-[17px]">calendar_today</span>
            <span className="hidden sm:inline">Pedir Cita Online</span>
            <span className="sm:hidden">Cita</span>
          </a>

          <Link
            href="/crm"
            className="hidden xl:flex h-9 px-2.5 rounded-lg text-slate-400 hover:text-slate-800 text-[11px] font-medium items-center gap-1 transition-colors"
            title="Panel Interno de Gestores"
          >
            <span className="material-symbols-outlined text-[16px]">lock</span>
            <span>Gestor</span>
          </Link>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* HERO SECTION DE MÁXIMO IMPACTO VISUAL */}
      {/* ========================================================================= */}
      <section className="relative overflow-hidden pt-10 pb-16 lg:py-20 bg-gradient-to-b from-white via-blue-50/40 to-slate-50 border-b border-slate-200/70">
        {/* Glows de fondo con gradientes */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-to-tr from-blue-400/15 via-indigo-400/15 to-purple-400/10 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Columna Izquierda: Mensaje y CTA */}
            <div className="lg:col-span-7 space-y-6 text-left">
              {/* Badge de prueba social */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200/90 shadow-2xs">
                <div className="flex text-amber-400 text-xs">
                  <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
                </div>
                <span className="text-[11px] font-bold text-slate-800">4.9 / 5.0</span>
                <span className="text-[11px] text-slate-500">· Más de 1.400 clientes satisfechos en 2026</span>
              </div>

              {/* Título Principal */}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.15]">
                Tu tranquilidad fiscal y jurídica en los <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 bg-clip-text text-transparent">Países Bajos</span>, 100% en español.
              </h1>

              {/* Subtítulo */}
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl font-normal">
                Especialistas para la comunidad hispanohablante e internacional: resolvemos tu <strong>Declaración M-Form</strong> con máxima devolución, activamos tus <strong>Subsidios Toeslagen</strong> (€154 - €600/mes) y desciframos cualquier carta de la <strong>Belastingdienst</strong> sin dolores de cabeza.
              </p>

              {/* Botones CTA Principales */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <a
                  href="#simulador"
                  className="h-12 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm flex items-center gap-2.5 shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5"
                >
                  <span className="material-symbols-outlined text-[20px]">calculate</span>
                  <span>Calcular mi Devolución Gratis</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </a>

                <button
                  type="button"
                  onClick={() => setShowWhatsAppModal(true)}
                  className="h-12 px-5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs sm:text-sm flex items-center gap-2 transition-all shadow-2xs"
                >
                  <span className="material-symbols-outlined text-[20px] text-emerald-600">chat</span>
                  <span>Consultar por WhatsApp</span>
                </button>
              </div>

              {/* Sellos de Confianza y Garantía */}
              <div className="pt-4 border-t border-slate-200/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-600 text-[18px]">verified</span>
                  <span className="font-semibold text-[11px]">Belastingdienst Oficial</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-600 text-[18px]">lock</span>
                  <span className="font-semibold text-[11px]">iDEAL y Cifrado SSL</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-600 text-[18px]">timer</span>
                  <span className="font-semibold text-[11px]">Respuesta en 24h</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-600 text-[18px]">health_and_safety</span>
                  <span className="font-semibold text-[11px]">Garantía Anti-Errores</span>
                </div>
              </div>
            </div>

            {/* Columna Derecha: Tarjeta Interactiva en Vivo / Live Case Card */}
            <div className="lg:col-span-5">
              <div className="relative mx-auto max-w-md bg-white rounded-2xl border border-slate-200/90 shadow-xl p-5 sm:p-6 space-y-4">
                {/* Header de la tarjeta */}
                <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold font-mono-data text-xs flex items-center justify-center border border-blue-200">
                      MP
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900">Maria Popescu</h4>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-mono-data">Eindhoven · BSN 982145672</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-[10px] font-bold rounded-full flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">verified</span>
                    <span>Aprobado</span>
                  </span>
                </div>

                {/* Gran cifra de resultado real */}
                <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-4 sm:p-5 rounded-xl space-y-2 relative overflow-hidden">
                  <div className="absolute right-0 top-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl"></div>
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span className="font-mono-data uppercase tracking-wider text-[10px]">Expediente EXP-2026-0041</span>
                    <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono-data text-[10px] font-bold">
                      M-Form 2026
                    </span>
                  </div>
                  <div className="pt-1">
                    <span className="text-[11px] text-slate-400 block font-medium">Saldo total a devolver por Belastingdienst:</span>
                    <div className="text-3xl sm:text-4xl font-extrabold font-mono-data text-emerald-400 tracking-tight">
                      +€ 2.410,00
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-300">
                    <span>Subsidio Zorgtoeslag mensual:</span>
                    <span className="font-bold font-mono-data text-blue-300">+€ 154,00 / mes</span>
                  </div>
                </div>

                {/* Timeline de la gestión */}
                <div className="space-y-2 pt-1 text-xs">
                  <div className="flex items-center gap-2.5 text-slate-700">
                    <span className="material-symbols-outlined text-emerald-600 text-[18px]">check_circle</span>
                    <span className="text-[12px] font-medium">Deducción de traslado internacional aplicada</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-slate-700">
                    <span className="material-symbols-outlined text-emerald-600 text-[18px]">check_circle</span>
                    <span className="text-[12px] font-medium">Código DigiD validado mediante OCR con IA</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-slate-700">
                    <span className="material-symbols-outlined text-blue-600 text-[18px]">sync</span>
                    <span className="text-[12px] font-medium text-blue-700">Primer abono oficial en cuenta bancaria ING</span>
                  </div>
                </div>

                {/* Ticker flotante inferior */}
                <div className="p-2.5 bg-blue-50/70 border border-blue-100 rounded-lg flex items-center gap-2 text-[11px] text-blue-900">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                  <span className="truncate">
                    <strong>Último trámite:</strong> Elena M. en Utrecht recibió resolución Huurtoeslag hace 18 min.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SELECTOR INTERACTIVO: "¿CUÁL ES TU SITUACIÓN EN PAÍSES BAJOS?" */}
      {/* ========================================================================= */}
      <section id="perfiles" className="py-16 bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-12">
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold rounded-full uppercase tracking-wider">
              Soluciones a Tu Medida
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
              ¿Cuál es tu situación actual en Países Bajos?
            </h2>
            <p className="text-sm text-slate-600">
              Selecciona tu perfil para ver exactamente qué trámites necesitas y cómo podemos maximizar tu dinero.
            </p>
          </div>

          {/* Botones de selección de perfil */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { id: 'expats', icon: 'flight_land', label: 'Recién Llegado / Expat', desc: 'Primer año fiscal' },
              { id: 'zzp', icon: 'business_center', label: 'Autónomo ZZP / Freelance', desc: 'KvK, BTW e Impuestos' },
              { id: 'empleados', icon: 'badge', label: 'Empleado en Nómina', desc: 'Subsidios y Retenciones' },
              { id: 'familias', icon: 'family_restroom', label: 'Familias y Parejas', desc: 'Ayudas Alquiler e Hijos' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedAudience(tab.id as any)}
                className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 ${
                  selectedAudience === tab.id
                    ? 'border-blue-600 bg-blue-50/50 shadow-sm ring-2 ring-blue-600/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                      selectedAudience === tab.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">{tab.icon}</span>
                  </div>
                  {selectedAudience === tab.id && (
                    <span className="material-symbols-outlined text-blue-600 text-lg">check_circle</span>
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900">{tab.label}</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">{tab.desc}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Contenido dinámico del perfil seleccionado */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200/90 p-6 sm:p-8">
            {selectedAudience === 'expats' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-8 space-y-4">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 text-blue-800 text-[11px] font-bold rounded-md">
                    <span>🇪🇸</span>
                    <span>Hoja de Ruta para Nuevos Residentes</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
                    Declaración M-Form, Activación de DigiD y Subsidio de Salud Obligatorio
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Si te mudaste a los Países Bajos durante el año fiscal, <strong>el 94% de los casos tiene derecho a una devolución sustancial de impuestos</strong> en su formulario M-Form. Además, puedes cobrar el <em>Zorgtoeslag</em> desde el primer mes para compensar tu seguro de salud holandés.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs">
                      <span className="block font-bold text-slate-900">Devolución media M-Form</span>
                      <span className="text-base font-extrabold font-mono-data text-blue-600">€ 1.800 - € 3.200</span>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs">
                      <span className="block font-bold text-slate-900">Zorgtoeslag mensual</span>
                      <span className="text-base font-extrabold font-mono-data text-emerald-600">Hasta € 154 / mes</span>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs">
                      <span className="block font-bold text-slate-900">Plazo de resolución</span>
                      <span className="text-base font-extrabold font-mono-data text-slate-800">3 a 6 semanas</span>
                    </div>
                  </div>
                </div>
                <div className="lg:col-span-4 flex flex-col gap-3">
                  <a
                    href="#simulador"
                    className="h-11 px-5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition-colors"
                  >
                    <span>Calcular mi Devolución M-Form</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </a>
                  <a
                    href="#reservar"
                    className="h-11 px-5 border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs rounded-xl shadow-2xs flex items-center justify-center gap-2 transition-colors"
                  >
                    <span>Pedir Asesoría para Expats</span>
                  </a>
                </div>
              </div>
            )}

            {selectedAudience === 'zzp' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-8 space-y-4">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 text-amber-800 text-[11px] font-bold rounded-md">
                    <span>💼</span>
                    <span>Pack Completo Autónomo Neerlandés</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
                    Alta en KvK, Obtención de BTW-nummer y Declaración Trimestral de IVA
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Convertirte en ZZP en los Países Bajos es muy ventajoso gracias a las deducciones fiscales (<em>Zelfstandigenaftrek</em> y <em>Startersaftrek</em>). Nos encargamos de tu inscripción presencial en la Cámara de Comercio, emitimos tus facturas conformes a la normativa y presentamos tus liquidaciones trimestrales sin sorpresas.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs">
                      <span className="block font-bold text-slate-900">Alta KvK garantizada</span>
                      <span className="text-base font-extrabold font-mono-data text-amber-600">En 24 - 48 horas</span>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs">
                      <span className="block font-bold text-slate-900">Liquidación BTW</span>
                      <span className="text-base font-extrabold font-mono-data text-blue-600">4 Trimestres / año</span>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs">
                      <span className="block font-bold text-slate-900">Deducción de inicio</span>
                      <span className="text-base font-extrabold font-mono-data text-emerald-600">€ 2.123 libres de IRPF</span>
                    </div>
                  </div>
                </div>
                <div className="lg:col-span-4 flex flex-col gap-3">
                  <a
                    href="#reservar"
                    className="h-11 px-5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition-colors"
                  >
                    <span>Darme de Alta como ZZP</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => setShowWhatsAppModal(true)}
                    className="h-11 px-5 border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs rounded-xl shadow-2xs flex items-center justify-center gap-2 transition-colors"
                  >
                    <span>Preguntar por Tarifas ZZP</span>
                  </button>
                </div>
              </div>
            )}

            {selectedAudience === 'empleados' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-8 space-y-4">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-100 text-indigo-800 text-[11px] font-bold rounded-md">
                    <span>🏢</span>
                    <span>Trabajadores por Cuenta Ajena en Países Bajos</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
                    Optimización de Nómina, 30% Ruling y Declaración Anual P-Form
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Muchos trabajadores en nómina pagan de más en sus retenciones mensuales de IRPF (<em>Loonheffing</em>) o desconocen que pueden compatibilizar su sueldo con subsidios si no superan ciertos límites. Verificamos tu contrato, tramitamos tu 30% Ruling junto a tu empleador y presentamos tu declaración anual para recuperar deducciones por vivienda o gastos formativos.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs">
                      <span className="block font-bold text-slate-900">30% Ruling</span>
                      <span className="text-base font-extrabold font-mono-data text-indigo-600">30% del sueldo libre</span>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs">
                      <span className="block font-bold text-slate-900">Revisión de nóminas</span>
                      <span className="text-base font-extrabold font-mono-data text-slate-800">100% en español</span>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs">
                      <span className="block font-bold text-slate-900">Deducción hipoteca</span>
                      <span className="text-base font-extrabold font-mono-data text-emerald-600">Hypotheekrenteaftrek</span>
                    </div>
                  </div>
                </div>
                <div className="lg:col-span-4 flex flex-col gap-3">
                  <a
                    href="#reservar"
                    className="h-11 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition-colors"
                  >
                    <span>Revisar mi Situación Fiscal</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </a>
                </div>
              </div>
            )}

            {selectedAudience === 'familias' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-8 space-y-4">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-md">
                    <span>🏡</span>
                    <span>Subsidios Familiares y de Vivienda</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
                    Huurtoeslag (Alquiler) y Kindgebonden Budget (Hijos a Cargo)
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Si vives de alquiler en Países Bajos y tu renta mensual no supera el límite oficial, el gobierno holandés te ingresa hasta €450 al mes para pagar tu vivienda. Y si tienes hijos menores de 18 años, el <em>Kindgebonden Budget</em> y el <em>Kinderopvangtoeslag</em> (guarderías) suponen un alivio económico directo en tu cuenta bancaria.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs">
                      <span className="block font-bold text-slate-900">Huurtoeslag mensual</span>
                      <span className="text-base font-extrabold font-mono-data text-emerald-600">Hasta € 450 / mes</span>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs">
                      <span className="block font-bold text-slate-900">Ayuda por hijo</span>
                      <span className="text-base font-extrabold font-mono-data text-blue-600">Hasta € 115 / mes</span>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs">
                      <span className="block font-bold text-slate-900">Ingreso automático</span>
                      <span className="text-base font-extrabold font-mono-data text-slate-800">Día 20 de cada mes</span>
                    </div>
                  </div>
                </div>
                <div className="lg:col-span-4 flex flex-col gap-3">
                  <button
                    onClick={() => {
                      setSimMode('toeslagen');
                      const el = document.getElementById('simulador');
                      el?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="h-11 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition-colors"
                  >
                    <span>Calcular Mis Subsidios Familiares</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SIMULADOR FISCAL INTELIGENTE (M-FORM & SUBSIDIOS TOESLAGEN) */}
      {/* ========================================================================= */}
      <section id="simulador" className="py-20 px-4 sm:px-6 lg:px-12 bg-gradient-to-b from-slate-50 to-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-full uppercase tracking-wider">
              Simulador Fiscal y de Subsidios 2026
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
              Calcula al instante cuánto dinero te corresponde
            </h2>
            <p className="text-sm text-slate-600">
              Utiliza nuestro motor interactivo para estimar tu devolución de la renta o las ayudas mensuales del gobierno holandés.
            </p>

            {/* Selector de modo del simulador */}
            <div className="inline-flex p-1 bg-slate-200/80 rounded-xl mt-4">
              <button
                onClick={() => setSimMode('mform')}
                className={`px-5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  simMode === 'mform' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">calculate</span>
                <span>Devolución M-Form</span>
              </button>
              <button
                onClick={() => setSimMode('toeslagen')}
                className={`px-5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  simMode === 'toeslagen' ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">health_and_safety</span>
                <span>Subsidios Mensuales (Toeslagen)</span>
              </button>
            </div>
          </div>

          {/* SIMULADOR 1: M-FORM */}
          {simMode === 'mform' && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-12">
                {/* Controles de entrada */}
                <div className="lg:col-span-7 p-6 sm:p-8 space-y-6">
                  <div>
                    <div className="flex justify-between items-center text-xs font-bold text-slate-700 mb-2">
                      <span>Meses resididos en Países Bajos durante el primer año:</span>
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-mono-data text-xs border border-blue-200">
                        {monthsInNL} meses
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="11"
                      value={monthsInNL}
                      onChange={(e) => setMonthsInNL(parseInt(e.target.value))}
                      className="w-full accent-blue-600 h-2.5 bg-slate-100 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[11px] text-slate-400 mt-1 font-mono-data">
                      <span>1 mes</span>
                      <span>6 meses</span>
                      <span>11 meses (año fraccionado)</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Salario bruto percibido en NL (€):
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-slate-400 font-mono-data text-sm">€</span>
                        <input
                          type="number"
                          value={grossIncome}
                          onChange={(e) => setGrossIncome(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-full h-11 pl-7 pr-3 border border-slate-200 rounded-xl bg-slate-50 font-mono-data text-sm font-bold text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Impuesto IRPF retenido (Loonheffing) (€):
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-slate-400 font-mono-data text-sm">€</span>
                        <input
                          type="number"
                          value={withheldTax}
                          onChange={(e) => setWithheldTax(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-full h-11 pl-7 pr-3 border border-slate-200 rounded-xl bg-slate-50 font-mono-data text-sm font-bold text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Toggle de gastos de mudanza */}
                  <label className="p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-2.5">
                      <span className="material-symbols-outlined text-blue-600 text-[20px]">local_shipping</span>
                      <div className="text-left">
                        <span className="font-bold text-xs text-slate-900 block">¿Tuviste gastos por mudanza o viaje a NL?</span>
                        <span className="text-[11px] text-slate-500">Aplica deducción de relocalización de hasta €1.450</span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={hasRelocationExpenses}
                      onChange={(e) => setHasRelocationExpenses(e.target.checked)}
                      className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                    />
                  </label>

                  <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-100 text-xs text-slate-600 flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-blue-600 text-base shrink-0 mt-0.5">info</span>
                    <span>
                      Al haber trabajado solo una parte del año, tu tramo impositivo real es inferior al que tu empresa calculó mensualmente. La diferencia te pertenece y la Belastingdienst te la devolverá.
                    </span>
                  </div>
                </div>

                {/* Resultado de la estimación */}
                <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden">
                  <div className="space-y-4 relative z-10">
                    <span className="px-2.5 py-1 bg-blue-500/20 text-blue-300 font-mono-data text-[10px] font-bold rounded-full border border-blue-400/30">
                      ESTIMACIÓN M-FORM 2026
                    </span>

                    <div>
                      <span className="text-xs text-slate-300 font-medium block">Saldo estimado a tu favor:</span>
                      <div className="text-4xl sm:text-5xl font-extrabold font-mono-data text-emerald-400 tracking-tight mt-1">
                        € {calculateRefund().toLocaleString('es-ES')}
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 text-xs text-slate-300 border-t border-slate-800">
                      <div className="flex justify-between">
                        <span>Retenciones pagadas en nómina:</span>
                        <span className="font-mono-data font-bold text-white">€ {withheldTax.toLocaleString('es-ES')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Impuesto real legal anual:</span>
                        <span className="font-mono-data font-bold text-slate-400">
                          € {Math.max(0, withheldTax - calculateRefund()).toLocaleString('es-ES')}
                        </span>
                      </div>
                      {hasRelocationExpenses && (
                        <div className="flex justify-between text-emerald-300 text-[11px]">
                          <span>Deducción mudanza internacional:</span>
                          <span className="font-mono-data font-bold">-€ 1.450</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-6 relative z-10 space-y-2.5">
                    <a
                      href="#reservar"
                      className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md transition-all"
                    >
                      <span className="material-symbols-outlined text-[17px]">verified</span>
                      <span>Tramitar mi M-Form con Garantía</span>
                    </a>
                    <p className="text-[10px] text-center text-slate-400">
                      Tarifa fija oficial: € 180 · Sin comisiones ocultas sobre tu devolución.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SIMULADOR 2: SUBSIDIOS TOESLAGEN */}
          {simMode === 'toeslagen' && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-12">
                {/* Controles de entrada */}
                <div className="lg:col-span-7 p-6 sm:p-8 space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Ingresos brutos anuales estimados (€):
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-slate-400 font-mono-data text-sm">€</span>
                      <input
                        type="number"
                        value={toeslagIncome}
                        onChange={(e) => setToeslagIncome(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full h-11 pl-7 pr-3 border border-slate-200 rounded-xl bg-slate-50 font-mono-data text-sm font-bold text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-none"
                      />
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Límite individual máximo: aprox. € 38.500 / año
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="p-3 rounded-xl border border-slate-200 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isCouple}
                        onChange={(e) => setIsCouple(e.target.checked)}
                        className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                      />
                      <span className="font-bold text-xs text-slate-800">Tengo pareja fiscal en NL</span>
                    </label>

                    <label className="p-3 rounded-xl border border-slate-200 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hasRent}
                        onChange={(e) => setHasRent(e.target.checked)}
                        className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                      />
                      <span className="font-bold text-xs text-slate-800">Vivo de alquiler en NL</span>
                    </label>
                  </div>

                  {hasRent && (
                    <div>
                      <div className="flex justify-between items-center text-xs font-bold text-slate-700 mb-2">
                        <span>Alquiler básico mensual (Kale huur):</span>
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-mono-data text-xs border border-emerald-200">
                          € {monthlyRent} / mes
                        </span>
                      </div>
                      <input
                        type="range"
                        min="400"
                        max="900"
                        step="10"
                        value={monthlyRent}
                        onChange={(e) => setMonthlyRent(parseInt(e.target.value))}
                        className="w-full accent-emerald-600 h-2.5 bg-slate-100 rounded-lg cursor-pointer"
                      />
                      <div className="flex justify-between text-[11px] text-slate-400 mt-1 font-mono-data">
                        <span>€ 400</span>
                        <span>Límite legal: € 880</span>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Número de hijos menores de 18 años a cargo:
                    </label>
                    <div className="flex items-center gap-2">
                      {[0, 1, 2, 3].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setChildrenCount(num)}
                          className={`w-12 h-10 rounded-lg border font-bold text-xs transition-all ${
                            childrenCount === num
                              ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Resultado Subsidios */}
                <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 text-white p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden">
                  <div className="space-y-4 relative z-10">
                    <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 font-mono-data text-[10px] font-bold rounded-full border border-emerald-400/30">
                      SUBSIDIOS MENSUALES TOESLAGEN
                    </span>

                    <div>
                      <span className="text-xs text-slate-300 font-medium block">Total abono mensual en tu cuenta:</span>
                      <div className="text-4xl sm:text-5xl font-extrabold font-mono-data text-emerald-400 tracking-tight mt-1">
                        € {totalMonthlySubsidies.toLocaleString('es-ES')} <span className="text-lg font-normal text-slate-300">/ mes</span>
                      </div>
                      <span className="text-xs font-mono-data text-slate-300 block mt-1">
                        Equivale a <strong>€ {totalAnnualSubsidies.toLocaleString('es-ES')}</strong> al año
                      </span>
                    </div>

                    <div className="space-y-2 pt-2 text-xs text-slate-300 border-t border-slate-800">
                      <div className="flex justify-between">
                        <span>Zorgtoeslag (Seguro médico):</span>
                        <span className="font-mono-data font-bold text-emerald-400">€ {calculateZorgtoeslag()} / mes</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Huurtoeslag (Alquiler):</span>
                        <span className="font-mono-data font-bold text-emerald-400">€ {calculateHuurtoeslag()} / mes</span>
                      </div>
                      {childrenCount > 0 && (
                        <div className="flex justify-between">
                          <span>Kindgebonden Budget (Hijos):</span>
                          <span className="font-mono-data font-bold text-emerald-400">€ {calculateKindtoeslag()} / mes</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-6 relative z-10 space-y-2.5">
                    <a
                      href="#reservar"
                      className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md transition-all"
                    >
                      <span className="material-symbols-outlined text-[17px]">send</span>
                      <span>Solicitar Mis Subsidios Oficiales</span>
                    </a>
                    <p className="text-[10px] text-center text-slate-400">
                      Gestión única: € 85 · Posibilidad de cobro retroactivo de meses pasados.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* CASOS REALES Y TESTIMONIOS (SOCIAL PROOF CON CARAS Y RESULTADOS) */}
      {/* ========================================================================= */}
      <section id="testimonios" className="py-20 bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-12">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold rounded-full uppercase tracking-wider">
              Casos Reales y Opiniones
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
              Así ayudamos a la comunidad en Países Bajos
            </h2>
            <p className="text-sm text-slate-600">
              Historias reales de personas que confiaron en nosotros para su fiscalidad, subsidios y trámites.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Testimonio 1 */}
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex text-amber-400 text-xs">
                    <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
                  </div>
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded font-mono-data">
                    +€ 2.890 devueltos
                  </span>
                </div>
                <p className="text-xs text-slate-700 italic leading-relaxed">
                  &quot;Llegué a Ámsterdam a mitad de año y no tenía ni idea de qué era el M-Form. NexusGest me aplicó todas las deducciones por mudanza y en menos de un mes tenía el dinero en mi cuenta holandesa.&quot;
                </p>
              </div>
              <div className="flex items-center gap-3 pt-3 border-t border-slate-200">
                <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center font-mono-data">
                  CM
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-900">Carlos Mendoza Ruiz</h4>
                  <p className="text-[11px] text-slate-500">Ámsterdam · Ingeniero Software</p>
                </div>
              </div>
            </div>

            {/* Testimonio 2 */}
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex text-amber-400 text-xs">
                    <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded font-mono-data">
                    € 154 / mes cobrados
                  </span>
                </div>
                <p className="text-xs text-slate-700 italic leading-relaxed">
                  &quot;No sabía que tenía derecho al subsidio de salud holandés. Me tramitaron el DigiD y el Zorgtoeslag con efecto retroactivo. Ahora cobro 154 euros todos los meses puntualmente.&quot;
                </p>
              </div>
              <div className="flex items-center gap-3 pt-3 border-t border-slate-200">
                <div className="w-9 h-9 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center font-mono-data">
                  MP
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-900">Maria Popescu</h4>
                  <p className="text-[11px] text-slate-500">Eindhoven · Sector Sanitario</p>
                </div>
              </div>
            </div>

            {/* Testimonio 3 */}
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex text-amber-400 text-xs">
                    <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
                  </div>
                  <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-bold rounded font-mono-data">
                    Alta KvK en 24h
                  </span>
                </div>
                <p className="text-xs text-slate-700 italic leading-relaxed">
                  &quot;Hacerse autónomo en Holanda da vértigo por el idioma y el BTW trimestral. Con NexusGest tengo todas mis facturas organizadas y ellos presentan el IVA sin que yo tenga que preocuparme.&quot;
                </p>
              </div>
              <div className="flex items-center gap-3 pt-3 border-t border-slate-200">
                <div className="w-9 h-9 rounded-full bg-amber-600 text-white font-bold text-xs flex items-center justify-center font-mono-data">
                  LV
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-900">Lars Van Dijk</h4>
                  <p className="text-[11px] text-slate-500">Rotterdam · Consultor ZZP</p>
                </div>
              </div>
            </div>

            {/* Testimonio 4 */}
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex text-amber-400 text-xs">
                    <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
                  </div>
                  <span className="px-2 py-0.5 bg-purple-50 text-purple-700 text-[10px] font-bold rounded font-mono-data">
                    € 380 / mes alquiler
                  </span>
                </div>
                <p className="text-xs text-slate-700 italic leading-relaxed">
                  &quot;La Belastingdienst me denegó el subsidio de alquiler por un error en la dirección del contrato. En NexusGest redactaron un recurso oficial en holandés y me lo concedieron con atrasos.&quot;
                </p>
              </div>
              <div className="flex items-center gap-3 pt-3 border-t border-slate-200">
                <div className="w-9 h-9 rounded-full bg-purple-600 text-white font-bold text-xs flex items-center justify-center font-mono-data">
                  EM
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-900">Elena Morales Castillo</h4>
                  <p className="text-[11px] text-slate-500">Utrecht · Diseñadora Gráfica</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* CÓMO FUNCIONA: 3 PASOS TRANSPARENTES */}
      {/* ========================================================================= */}
      <section id="como-funciona" className="py-20 bg-slate-50 border-b border-slate-200 px-4 sm:px-6 lg:px-12">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold rounded-full uppercase tracking-wider">
              Proceso 100% Digital y Seguro
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
              ¿Cómo gestionamos tu expediente?
            </h2>
            <p className="text-sm text-slate-600">
              Olvídate de desplazamientos, citas interminables en holandés o cartas sin responder.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Paso 1 */}
            <div className="p-8 bg-white rounded-2xl border border-slate-200 shadow-sm relative space-y-4">
              <div className="w-12 h-12 rounded-xl bg-blue-600 text-white font-extrabold text-lg flex items-center justify-center shadow-md">
                1
              </div>
              <h3 className="font-bold text-base text-slate-900">Envías tus datos o subes tu carta</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Rellenas nuestro formulario web o le haces una foto a la carta que recibiste en el buzón. Nuestro portal privado procesa y clasifica tus documentos con seguridad bancaria.
              </p>
              <div className="text-[11px] font-semibold text-blue-600 flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px]">upload_file</span>
                <span>Sin papeleo físico · 2 minutos</span>
              </div>
            </div>

            {/* Paso 2 */}
            <div className="p-8 bg-white rounded-2xl border border-slate-200 shadow-sm relative space-y-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white font-extrabold text-lg flex items-center justify-center shadow-md">
                2
              </div>
              <h3 className="font-bold text-base text-slate-900">Optimización por Gestor Colegiado</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Un asesor fiscal asignado revisa cada casilla de tu expediente, aplica las deducciones máximas permitidas por la ley neerlandesa y te envía el borrador en español antes de presentarlo.
              </p>
              <div className="text-[11px] font-semibold text-indigo-600 flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px]">verified_user</span>
                <span>Cero errores · Máxima deducción</span>
              </div>
            </div>

            {/* Paso 3 */}
            <div className="p-8 bg-white rounded-2xl border border-slate-200 shadow-sm relative space-y-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white font-extrabold text-lg flex items-center justify-center shadow-md">
                3
              </div>
              <h3 className="font-bold text-base text-slate-900">Presentación y Dinero en tu Cuenta</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Registramos formalmente la solicitud ante la Belastingdienst o KvK con nuestro certificado autorizado. Recibes la confirmación oficial y el dinero se abona directamente en tu IBAN.
              </p>
              <div className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px]">account_balance</span>
                <span>Ingreso directo en tu banco</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* TARIFAS CLARAS Y TRANSPARENTES (SIN SORPRESAS) */}
      {/* ========================================================================= */}
      <section className="py-20 bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-12">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="px-3 py-1 bg-slate-100 text-slate-800 border border-slate-200 text-xs font-bold rounded-full uppercase tracking-wider">
              Precios Transparentes
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
              Tarifas fijas, sin comisiones ocultas
            </h2>
            <p className="text-sm text-slate-600">
              No cobramos porcentajes de tu dinero devuelto. El 100% de la devolución de la Belastingdienst es para ti.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Tarifa 1: Subsidios */}
            <div className="p-8 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between space-y-6">
              <div>
                <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">Subsidios del Gobierno</span>
                <h3 className="text-xl font-bold text-slate-900 mt-1">Pack Toeslagen</h3>
                <p className="text-xs text-slate-600 mt-2">
                  Gestión integral de Zorgtoeslag, Huurtoeslag y activación de DigiD oficial.
                </p>
                <div className="mt-4 pb-4 border-b border-slate-200">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold font-mono-data text-slate-900">€ 85</span>
                    <span className="text-xs text-slate-500">/ trámite único</span>
                  </div>
                  <span className="text-[10px] text-slate-400">Incluye cálculo retroactivo de meses pasados</span>
                </div>
                <ul className="mt-4 space-y-2.5 text-xs text-slate-600">
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-600 text-base">check</span>
                    <span>Activación y soporte con carta DigiD</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-600 text-base">check</span>
                    <span>Presentación formal ante Belastingdienst</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-600 text-base">check</span>
                    <span>Vinculación de cuenta bancaria para abonos</span>
                  </li>
                </ul>
              </div>
              <a
                href="#reservar"
                className="w-full h-10 border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>Solicitar Pack Toeslagen</span>
              </a>
            </div>

            {/* Tarifa 2: M-Form (Destacada) */}
            <div className="p-8 bg-gradient-to-b from-blue-900 to-indigo-950 text-white rounded-2xl border-2 border-blue-500 shadow-xl flex flex-col justify-between space-y-6 relative">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-[10px] font-extrabold uppercase rounded-full shadow-sm tracking-wider">
                MÁS POPULAR ENTRE EXPATS
              </div>
              <div>
                <span className="text-xs font-bold uppercase text-blue-300 tracking-wider">Declaración de la Renta</span>
                <h3 className="text-xl font-bold text-white mt-1">M-Form Primer Año</h3>
                <p className="text-xs text-slate-300 mt-2">
                  Declaración fiscal obligatoria para el año en que te registraste en Países Bajos.
                </p>
                <div className="mt-4 pb-4 border-b border-indigo-800">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold font-mono-data text-emerald-400">€ 180</span>
                    <span className="text-xs text-slate-300">/ tarifa fija</span>
                  </div>
                  <span className="text-[10px] text-blue-200">Garantía total de devolución legal máxima</span>
                </div>
                <ul className="mt-4 space-y-2.5 text-xs text-slate-200">
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-400 text-base">check</span>
                    <span>Deducción por mudanza y gastos de relocalización</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-400 text-base">check</span>
                    <span>Revisión de doble imposición internacional</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-400 text-base">check</span>
                    <span>Presentación telemática oficial con acuse de recibo</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-400 text-base">check</span>
                    <span>El 100% de la devolución de Hacienda es para ti</span>
                  </li>
                </ul>
              </div>
              <a
                href="#reservar"
                className="w-full h-11 bg-blue-500 hover:bg-blue-400 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md transition-colors"
              >
                <span>Presentar mi M-Form</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </a>
            </div>

            {/* Tarifa 3: ZZP */}
            <div className="p-8 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between space-y-6">
              <div>
                <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">Freelancers y Negocios</span>
                <h3 className="text-xl font-bold text-slate-900 mt-1">Alta y Gestión ZZP</h3>
                <p className="text-xs text-slate-600 mt-2">
                  Inscripción mercantil en KvK, BTW-nummer y contabilidad fiscal trimestral.
                </p>
                <div className="mt-4 pb-4 border-b border-slate-200">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold font-mono-data text-slate-900">€ 250</span>
                    <span className="text-xs text-slate-500">/ alta completa</span>
                  </div>
                  <span className="text-[10px] text-slate-400">O mantenimiento mensual desde € 65/mes</span>
                </div>
                <ul className="mt-4 space-y-2.5 text-xs text-slate-600">
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-600 text-base">check</span>
                    <span>Preparación previa y registro presencial KvK</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-600 text-base">check</span>
                    <span>Alta de IVA ante la Belastingdienst</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-600 text-base">check</span>
                    <span>Plantilla oficial de facturas con 21% BTW</span>
                  </li>
                </ul>
              </div>
              <a
                href="#reservar"
                className="w-full h-10 border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>Solicitar Asesoría ZZP</span>
              </a>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 text-center sm:text-left">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-600">credit_card</span>
              <span>
                Todos los pagos se realizan mediante <strong>iDEAL oficial holandés</strong>, tarjeta o transferencia bancaria, con factura oficial deducible.
              </span>
            </div>
            <span className="font-mono-data text-[11px] font-bold text-slate-800">BTW 21% Desglosado</span>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* PREGUNTAS FRECUENTES INTERACTIVAS (FAQ) */}
      {/* ========================================================================= */}
      <section id="faq" className="py-20 bg-slate-50 border-b border-slate-200 px-4 sm:px-6 lg:px-12">
        <div className="max-w-4xl mx-auto space-y-10">
          <div className="text-center space-y-3">
            <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold rounded-full uppercase tracking-wider">
              Resolvemos tus Dudas
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Preguntas Frecuentes de Residentes en Países Bajos
            </h2>
          </div>

          <div className="space-y-3">
            {[
              {
                q: '¿Qué es exactamente el formulario M-Form y por qué casi siempre sale a devolver?',
                a: 'El formulario M-Form (M-biljet) es la declaración especial de la renta para personas que no vivieron en Países Bajos durante todo el año calendario (generalmente el primer año de mudanza). Como tu empleador te retuvo impuestos asumiendo que trabajarías los 12 meses completos, tu tipo impositivo real es mucho menor, lo que genera habitualmente devoluciones entre €1.500 y €3.000.',
              },
              {
                q: '¿Puedo solicitar el subsidio Zorgtoeslag con carácter retroactivo?',
                a: 'Sí, absolutamente. La ley holandesa permite solicitar el Zorgtoeslag con carácter retroactivo para todo el año en curso y hasta el 1 de septiembre del año siguiente. Si no lo habías pedido, podemos recuperar todas las mensualidades acumuladas que te correspondían.',
              },
              {
                q: '¿Necesito tener ya mi DigiD activado para que me gestionéis los trámites?',
                a: 'No es imprescindible. Podemos tramitar solicitudes oficiales en tu nombre mediante autorización fiscal autorizada, o bien podemos ayudarte a solicitar y activar tu DigiD desde cero resolviendo la carta postal con el código de activación.',
              },
              {
                q: '¿Qué diferencia hay entre hacerlo con NexusGest o intentar hacerlo por mi cuenta?',
                a: 'Los formularios oficiales de la Belastingdienst están en holandés técnico y cualquier error en una casilla puede retrasar meses tu devolución o derivar en sanciones. En NexusGest te atendemos 100% en español, garantizamos la máxima deducción legal posible y resolvemos cualquier requerimiento posterior sin coste adicional.',
              },
              {
                q: '¿Cuánto tiempo tarda la Belastingdienst en ingresar el dinero de la devolución?',
                a: 'Una vez presentado el M-Form por nuestra gestoría con certificado oficial, la Belastingdienst suele emitir la resolución provisional (Voorlopige aanslag) en un plazo de entre 3 y 8 semanas, ingresando el importe directamente en el número de cuenta bancaria (IBAN) que nos hayas facilitado.',
              },
              {
                q: '¿Cómo se pagan vuestros servicios y cómo accedo a mi documentación?',
                a: 'El pago se realiza cómodamente a través de la pasarela oficial iDEAL (con bancos holandeses como ING, ABN AMRO, Rabobank o Bunq), tarjeta de crédito o transferencia. Tras contratar cualquier servicio, tienes acceso permanente a tu portal "Mijn NexusGest" para ver el estado de tu trámite, tus facturas y tus documentos.',
              },
            ].map((faq, idx) => (
              <div
                key={idx}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden transition-all shadow-2xs"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 font-bold text-xs sm:text-sm text-slate-900 hover:text-blue-600 transition-colors"
                >
                  <span>{faq.q}</span>
                  <span className="material-symbols-outlined text-[20px] text-slate-400 shrink-0">
                    {openFaq === idx ? 'expand_less' : 'expand_more'}
                  </span>
                </button>
                {openFaq === idx && (
                  <div className="px-4 sm:px-5 pb-5 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* FORMULARIO DE RESERVA DE CITAS EN LÍNEA */}
      {/* ========================================================================= */}
      <section id="reservar" className="py-20 bg-white px-4 sm:px-6 lg:px-12 border-b border-slate-200">
        <div className="max-w-3xl mx-auto bg-gradient-to-b from-slate-50 to-white p-6 sm:p-10 rounded-3xl border border-slate-200 shadow-xl space-y-6">
          <div className="text-center space-y-2">
            <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold rounded-full uppercase tracking-wider">
              Agenda Oficial de Asesorías
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Reservar Cita con un Asesor Fiscal
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Elige día y hora para tu sesión individual. Te atenderemos en español por Google Meet, teléfono o en despacho.
            </p>
          </div>

          {bookingSuccess ? (
            <div className="p-8 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-3">
              <span className="material-symbols-outlined text-5xl text-emerald-600">check_circle</span>
              <h3 className="font-extrabold text-emerald-950 text-lg sm:text-xl">¡Cita agendada con éxito!</h3>
              <p className="text-xs sm:text-sm text-emerald-800 max-w-md mx-auto">
                Hemos registrado tu cita en el sistema para el <strong>{bookingDate}</strong> a las <strong>{bookingTime}</strong> ({bookingModality === 'online_meet' ? 'Videollamada Google Meet' : bookingModality === 'llamada' ? 'Llamada telefónica' : 'Presencial'}).
              </p>
              <div className="pt-2">
                <button
                  onClick={() => setBookingSuccess(false)}
                  className="px-5 py-2.5 bg-emerald-700 text-white rounded-xl text-xs font-bold hover:bg-emerald-800 transition-colors shadow-xs"
                >
                  Agendar otra cita
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleBooking} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nombre Completo *</label>
                  <input
                    required
                    type="text"
                    value={bookingName}
                    onChange={(e) => setBookingName(e.target.value)}
                    placeholder="Ej. Laura González Gómez"
                    className="w-full h-11 px-3.5 border border-slate-200 rounded-xl text-xs sm:text-sm bg-white focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Correo Electrónico *</label>
                  <input
                    required
                    type="email"
                    value={bookingEmail}
                    onChange={(e) => setBookingEmail(e.target.value)}
                    placeholder="correo@ejemplo.com"
                    className="w-full h-11 px-3.5 border border-slate-200 rounded-xl text-xs sm:text-sm bg-white focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Teléfono / WhatsApp *</label>
                  <input
                    required
                    type="tel"
                    value={bookingPhone}
                    onChange={(e) => setBookingPhone(e.target.value)}
                    placeholder="+31 6 1234 5678"
                    className="w-full h-11 px-3.5 border border-slate-200 rounded-xl text-xs sm:text-sm bg-white focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tipo de Trámite</label>
                  <select
                    value={bookingService}
                    onChange={(e) => setBookingService(e.target.value)}
                    className="w-full h-11 px-3 border border-slate-200 rounded-xl text-xs sm:text-sm bg-white focus:border-blue-600 focus:outline-none"
                  >
                    <option>M-Form / Declaración de la Renta</option>
                    <option>Subsidios Toeslagen (Zorg / Huur / Kind)</option>
                    <option>Activación DigiD & BSN</option>
                    <option>Alta KVK (Autónomo ZZP)</option>
                    <option>Consulta y Resolución de Cartas Belastingdienst</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Fecha</label>
                  <input
                    required
                    type="date"
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full h-11 px-3 border border-slate-200 rounded-xl text-xs sm:text-sm bg-white focus:border-blue-600 focus:outline-none font-mono-data"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Hora Deseada</label>
                  <select
                    value={bookingTime}
                    onChange={(e) => setBookingTime(e.target.value)}
                    className="w-full h-11 px-3 border border-slate-200 rounded-xl text-xs sm:text-sm bg-white focus:border-blue-600 focus:outline-none font-mono-data"
                  >
                    <option>09:30</option>
                    <option>10:30</option>
                    <option>11:30</option>
                    <option>14:00</option>
                    <option>15:30</option>
                    <option>16:30</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Modalidad</label>
                  <select
                    value={bookingModality}
                    onChange={(e) => setBookingModality(e.target.value as any)}
                    className="w-full h-11 px-3 border border-slate-200 rounded-xl text-xs sm:text-sm bg-white focus:border-blue-600 focus:outline-none"
                  >
                    <option value="online_meet">Google Meet (Online)</option>
                    <option value="llamada">Llamada Telefónica</option>
                    <option value="presencial">Presencial en Despacho</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full h-12 mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">event_available</span>
                <span>Confirmar Reserva de Cita Gratuita</span>
              </button>
            </form>
          )}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* FOOTER CORPORATIVO PREMIUM */}
      {/* ========================================================================= */}
      <footer className="mt-auto bg-slate-950 text-white py-12 px-4 sm:px-6 lg:px-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-slate-800 text-xs">
          {/* Col 1 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                NG
              </div>
              <span className="font-extrabold text-base tracking-tight">NexusGest</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Gestoría y asesoría fiscal oficial para la comunidad hispanohablante e internacional en los Países Bajos.
            </p>
            <div className="flex items-center gap-2 text-slate-400 font-mono-data text-[11px]">
              <span>KvK: 89123847</span> · <span>BTW: NL829102948B01</span>
            </div>
          </div>

          {/* Col 2 */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-sm text-white">Trámites Principales</h4>
            <ul className="space-y-1.5 text-slate-400">
              <li><a href="#simulador" className="hover:text-blue-400 transition-colors">Declaración Fiscal M-Form</a></li>
              <li><a href="#simulador" className="hover:text-blue-400 transition-colors">Subsidio Zorgtoeslag</a></li>
              <li><a href="#simulador" className="hover:text-blue-400 transition-colors">Subsidio Alquiler Huurtoeslag</a></li>
              <li><a href="#perfiles" className="hover:text-blue-400 transition-colors">Alta KVK Autónomos ZZP</a></li>
              <li><a href="#perfiles" className="hover:text-blue-400 transition-colors">Activación DigiD & BSN</a></li>
            </ul>
          </div>

          {/* Col 3 */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-sm text-white">Plataforma</h4>
            <ul className="space-y-1.5 text-slate-400">
              <li><Link href="/portal" className="hover:text-blue-400 transition-colors">Portal Mijn NexusGest</Link></li>
              <li><Link href="/crm" className="hover:text-blue-400 transition-colors">Acceso Asesores CRM</Link></li>
              <li><a href="#faq" className="hover:text-blue-400 transition-colors">Preguntas Frecuentes</a></li>
              <li><a href="#reservar" className="hover:text-blue-400 transition-colors">Pedir Cita Online</a></li>
            </ul>
          </div>

          {/* Col 4 */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-sm text-white">Contacto Directo</h4>
            <p className="text-slate-400">Atención en español, inglés y neerlandés.</p>
            <div className="space-y-1 text-slate-300 font-mono-data">
              <p>WhatsApp: +31 6 8123 9845</p>
              <p>Email: soporte@nexusgest.nl</p>
              <p className="text-slate-500 text-[11px]">Ámsterdam · Eindhoven · Rotterdam</p>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© 2026 NexusGest Advies B.V. Todos los derechos reservados.</p>
          <div className="flex items-center gap-4">
            <span className="hover:text-slate-400 cursor-pointer">Privacidad & AVG</span>
            <span>·</span>
            <span className="hover:text-slate-400 cursor-pointer">Términos del Servicio</span>
            <span>·</span>
            <span className="hover:text-slate-400 cursor-pointer">Seguridad iDEAL</span>
          </div>
        </div>
      </footer>

      {/* ========================================================================= */}
      {/* BOTÓN FLOTANTE DE WHATSAPP / CONTACTO RÁPIDO */}
      {/* ========================================================================= */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2">
        <button
          type="button"
          onClick={() => setShowWhatsAppModal(!showWhatsAppModal)}
          className="h-13 px-4 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xl flex items-center gap-2.5 transition-all transform hover:scale-105 border-2 border-white/20"
          title="Consultar por WhatsApp con un Asesor"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse"></span>
          <span className="material-symbols-outlined text-[22px]">chat</span>
          <span className="hidden sm:inline">¿Dudas? Habla por WhatsApp</span>
        </button>

        {showWhatsAppModal && (
          <div className="w-80 bg-white rounded-2xl border border-slate-200 shadow-2xl p-4 text-xs space-y-3 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  NG
                </div>
                <div>
                  <h5 className="font-bold text-slate-900">Asesor NexusGest</h5>
                  <p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    En línea ahora
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowWhatsAppModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            <p className="text-slate-600">
              ¡Hola! Escríbenos directamente si tienes dudas sobre tu <strong>M-Form</strong>, subsidios <strong>Zorgtoeslag</strong> o una carta de la <strong>Belastingdienst</strong>.
            </p>
            <a
              href="https://wa.me/31681239845?text=Hola,%20quisiera%20informaci%C3%B3n%20sobre%20mi%20tr%C3%A1mite%20fiscal%20en%20Pa%C3%ADses%20Bajos"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
            >
              <span>Abrir Chat de WhatsApp</span>
              <span className="material-symbols-outlined text-[15px]">open_in_new</span>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
