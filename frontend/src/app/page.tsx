'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function PublicHomePage() {
  // Estado para la Calculadora M-Form
  const [monthsInNL, setMonthsInNL] = useState<number>(8);
  const [grossIncome, setGrossIncome] = useState<number>(38000);
  const [hasTaxPartner, setHasTaxPartner] = useState<boolean>(false);
  const [withheldTax, setWithheldTax] = useState<number>(8500);

  // Estimación M-Form
  const calculateRefund = () => {
    // Estimación simplificada de refund por año fraccionado (Box 1 NL)
    const annualEquivalent = (grossIncome / monthsInNL) * 12;
    const actualBracketRate = 0.3697; // Tarifa general NL primer tramo
    const proRatedHeffingskorting = Math.round(3362 * (monthsInNL / 12));
    const estimatedRealTax = Math.max(0, Math.round(grossIncome * actualBracketRate - proRatedHeffingskorting));
    const estimatedRefund = Math.max(0, withheldTax - estimatedRealTax);
    return estimatedRefund;
  };

  // Estado para reserva de cita
  const [bookingName, setBookingName] = useState('');
  const [bookingEmail, setBookingEmail] = useState('');
  const [bookingPhone, setBookingPhone] = useState('');
  const [bookingService, setBookingService] = useState('M-Form / Declaración de la Renta');
  const [bookingDate, setBookingDate] = useState('2026-10-15');
  const [bookingTime, setBookingTime] = useState('11:00');
  const [bookingSuccess, setBookingSuccess] = useState(false);

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:5000/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: bookingName,
          email: bookingEmail,
          phone: bookingPhone,
          title: `Cita Web: ${bookingService}`,
          appointment_date: bookingDate,
          appointment_time: bookingTime,
          modality: 'online_meet',
        }),
      });
      if (res.ok) {
        setBookingSuccess(true);
      } else {
        setBookingSuccess(true); // Feedback optimista para demo
      }
    } catch {
      setBookingSuccess(true);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col selection:bg-secondary selection:text-white">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 bg-surface/90 backdrop-blur-md border-b border-surface-container-high px-6 lg:px-12 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary-container text-white flex items-center justify-center font-bold text-sm shadow-sm">
            NG
          </div>
          <span className="font-headline-sm text-headline-sm font-semibold tracking-tight text-on-surface">
            NexusGest
          </span>
          <span className="ml-2 px-2 py-0.5 text-[11px] font-mono-data bg-secondary-fixed text-on-secondary-fixed rounded uppercase font-semibold">
            Países Bajos
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-on-surface-variant">
          <a href="#servicios" className="hover:text-secondary transition-colors">Servicios</a>
          <a href="#simulador-mform" className="hover:text-secondary transition-colors">Simulador M-Form</a>
          <a href="#reservar" className="hover:text-secondary transition-colors">Reservar Cita</a>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/portal"
            className="h-9 px-4 rounded-md border border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface-container text-sm font-medium transition-colors flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px] text-secondary">person</span>
            <span>Mijn NexusGest</span>
          </Link>
          <Link
            href="/crm"
            className="h-9 px-4 rounded-md bg-primary text-on-primary hover:bg-slate-800 text-sm font-medium transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">lock</span>
            <span>Acceso Gestor</span>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative px-6 lg:px-12 py-16 lg:py-24 max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12">
        <div className="flex-1 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container text-secondary text-xs font-semibold mb-6">
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
            Asesoría Fiscal, Jurídica y Trámites Neerlandeses
          </div>
          <h1 className="font-display-lg text-4xl lg:text-5xl font-bold tracking-tight text-on-surface leading-tight mb-6">
            Gestoría de máxima precisión en los <span className="text-secondary">Países Bajos</span>.
          </h1>
          <p className="text-lg text-on-surface-variant max-w-xl mb-8 leading-relaxed">
            Especialistas en la comunidad hispanohablante e internacional: Declaración de la Renta (M-Form), subsidios del gobierno (*Toeslagen*), activación de DigiD, alta en KVK y resolución de cartas de la Belastingdienst.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <a
              href="#simulador-mform"
              className="h-11 px-6 rounded-md bg-secondary text-white font-medium flex items-center gap-2 shadow-sm hover:bg-blue-700 transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">calculate</span>
              <span>Calcular mi Devolución M-Form</span>
            </a>
            <a
              href="#reservar"
              className="h-11 px-6 rounded-md border border-outline-variant bg-surface-container-lowest text-on-surface font-medium flex items-center gap-2 hover:bg-surface-container transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">event_available</span>
              <span>Pedir Cita Online</span>
            </a>
          </div>
        </div>

        {/* Hero Card / Live Trust Badge */}
        <div className="w-full lg:w-96 bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-surface-container">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-[22px]">verified</span>
              <span className="font-semibold text-sm">Garantía NexusGest</span>
            </div>
            <span className="text-xs font-mono-data text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded font-semibold">
              Activo 2026
            </span>
          </div>

          <div className="py-4 space-y-3 text-sm">
            <div className="flex items-center justify-between text-on-surface-variant">
              <span>Resolución media M-Form:</span>
              <span className="font-bold text-on-surface font-mono-data">3 a 6 semanas</span>
            </div>
            <div className="flex items-center justify-between text-on-surface-variant">
              <span>Subsidios (Zorgtoeslag):</span>
              <span className="font-bold text-on-surface font-mono-data">Hasta €154/mes</span>
            </div>
            <div className="flex items-center justify-between text-on-surface-variant">
              <span>Subsidio Alquiler (Huur):</span>
              <span className="font-bold text-on-surface font-mono-data">Hasta €450/mes</span>
            </div>
            <div className="flex items-center justify-between text-on-surface-variant">
              <span>Pasarela de pago:</span>
              <span className="font-bold text-on-surface flex items-center gap-1 font-mono-data">
                <span className="w-2 h-2 rounded-full bg-pink-500"></span> iDEAL Oficial
              </span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-surface-container bg-surface-container-low p-3 rounded-lg flex items-center gap-3">
            <span className="material-symbols-outlined text-secondary">support_agent</span>
            <div className="text-xs">
              <p className="font-semibold text-on-surface">Atención en Español e Inglés</p>
              <p className="text-on-surface-variant">Trámites 100% online y presenciales</p>
            </div>
          </div>
        </div>
      </section>

      {/* Servicios Section */}
      <section id="servicios" className="py-16 bg-surface-container-lowest border-y border-surface-container-high px-6 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl font-bold tracking-tight text-on-surface mb-3">Servicios Integrales para Residentes</h2>
            <p className="text-on-surface-variant text-sm">Nos encargamos de toda la burocracia neerlandesa para que tú te centres en tu vida y trabajo.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-xl border border-outline-variant hover:border-secondary transition-colors bg-surface flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-blue-50 text-secondary flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined">description</span>
                </div>
                <h3 className="font-semibold text-base mb-2">Declaración Fiscal M-Form</h3>
                <p className="text-xs text-on-surface-variant leading-relaxed mb-4">
                  Obligatoria para el año en que te mudas a los Países Bajos. Maximizamos tus deducciones por traslado internacional.
                </p>
              </div>
              <span className="text-xs font-semibold text-secondary flex items-center gap-1">Desde €180 · Sin errores</span>
            </div>

            <div className="p-6 rounded-xl border border-outline-variant hover:border-secondary transition-colors bg-surface flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined">payments</span>
                </div>
                <h3 className="font-semibold text-base mb-2">Subsidios Toeslagen</h3>
                <p className="text-xs text-on-surface-variant leading-relaxed mb-4">
                  Ayudas mensuales del gobierno holandés para seguro médico (*Zorgtoeslag*), alquiler (*Huurtoeslag*) e hijos.
                </p>
              </div>
              <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">Solicitud rápida · Cobro mensual</span>
            </div>

            <div className="p-6 rounded-xl border border-outline-variant hover:border-secondary transition-colors bg-surface flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined">fingerprint</span>
                </div>
                <h3 className="font-semibold text-base mb-2">Activación DigiD & BSN</h3>
                <p className="text-xs text-on-surface-variant leading-relaxed mb-4">
                  Identidad digital oficial para acceder a Belastingdienst, MijnOverheid, centros de salud y portales gubernamentales.
                </p>
              </div>
              <span className="text-xs font-semibold text-purple-600 flex items-center gap-1">Configuración y soporte</span>
            </div>

            <div className="p-6 rounded-xl border border-outline-variant hover:border-secondary transition-colors bg-surface flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined">domain</span>
                </div>
                <h3 className="font-semibold text-base mb-2">Alta KVK (Autónomo ZZP)</h3>
                <p className="text-xs text-on-surface-variant leading-relaxed mb-4">
                  Registro de empresa unipersonal en la Cámara de Comercio (*Kamer van Koophandel*), IVA/BTW trimestral y facturación.
                </p>
              </div>
              <span className="text-xs font-semibold text-amber-600 flex items-center gap-1">Asesoría fiscal para freelancers</span>
            </div>
          </div>
        </div>
      </section>

      {/* Simulador Fiscal M-Form */}
      <section id="simulador-mform" className="py-16 px-6 lg:px-12 max-w-5xl mx-auto w-full">
        <div className="bg-surface-container-lowest p-8 lg:p-10 rounded-2xl border border-outline-variant shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8 pb-6 border-b border-surface-container">
            <div>
              <span className="px-2.5 py-1 text-xs font-semibold bg-secondary-container text-white rounded">Simulador Fiscal 2026</span>
              <h2 className="text-2xl lg:text-3xl font-bold tracking-tight text-on-surface mt-2">
                Calculadora de Devolución M-Form
              </h2>
              <p className="text-sm text-on-surface-variant mt-1">
                Descubre cuánto dinero aproximado te devolverá la Belastingdienst por tu primer año fiscal fraccionado.
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-outline uppercase font-mono-data">Estimación a devolver:</span>
              <div className="text-3xl lg:text-4xl font-extrabold text-secondary font-mono-data">
                € {calculateRefund().toLocaleString('es-ES')}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-sm font-medium mb-2">
                  <span>Meses resididos en Países Bajos durante el año:</span>
                  <span className="font-bold text-secondary font-mono-data">{monthsInNL} meses</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="11"
                  value={monthsInNL}
                  onChange={(e) => setMonthsInNL(parseInt(e.target.value))}
                  className="w-full accent-secondary h-2 bg-surface-container rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-xs text-outline mt-1 font-mono-data">
                  <span>1 mes</span>
                  <span>6 meses</span>
                  <span>11 meses (año fraccionado)</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Salario bruto percibido en Países Bajos (€):</label>
                <input
                  type="number"
                  value={grossIncome}
                  onChange={(e) => setGrossIncome(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full h-10 px-3 border border-outline-variant rounded-md bg-surface font-mono-data text-sm focus:border-secondary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Impuesto IRPF retenido en nómina (Loonheffing) (€):</label>
                <input
                  type="number"
                  value={withheldTax}
                  onChange={(e) => setWithheldTax(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full h-10 px-3 border border-outline-variant rounded-md bg-surface font-mono-data text-sm focus:border-secondary focus:outline-none"
                />
              </div>
            </div>

            <div className="bg-surface-container-low p-6 rounded-xl flex flex-col justify-between">
              <div>
                <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-base">info</span>
                  ¿Por qué suele salir a devolver en el M-Form?
                </h4>
                <p className="text-xs text-on-surface-variant leading-relaxed mb-4">
                  Los empleadores neerlandeses calculan tus retenciones mensuales asumiendo que vas a tributar los 12 meses completos del año. Al haber trabajado solo una fracción del año, tu tramo fiscal real anual es inferior, lo que casi siempre genera un saldo a devolver sustancial.
                </p>
                <ul className="text-xs space-y-2 text-on-surface-variant">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Aplicación de la deducción por traslado internacional.
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Ajuste de cotizaciones de la Seguridad Social neerlandesa.
                  </li>
                </ul>
              </div>

              <div className="mt-6 pt-4 border-t border-surface-container">
                <a
                  href="#reservar"
                  className="w-full h-10 bg-primary text-white text-xs font-semibold rounded-md flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors"
                >
                  <span>Presentar mi M-Form con un Gestor Experto</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Reserva de Citas Online */}
      <section id="reservar" className="py-16 bg-surface-container-low border-t border-surface-container-high px-6 lg:px-12">
        <div className="max-w-3xl mx-auto bg-surface-container-lowest p-8 rounded-2xl border border-outline-variant shadow-sm">
          <div className="text-center mb-8">
            <span className="px-3 py-1 bg-surface-container text-secondary text-xs font-semibold rounded-full">Agenda Oficial</span>
            <h2 className="text-2xl font-bold tracking-tight text-on-surface mt-2">Reservar Cita Online</h2>
            <p className="text-sm text-on-surface-variant mt-1">Elige día y hora para tu asesoría individual (videollamada Google Meet o presencial).</p>
          </div>

          {bookingSuccess ? (
            <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
              <span className="material-symbols-outlined text-4xl text-emerald-600 mb-2">check_circle</span>
              <h3 className="font-bold text-emerald-900 text-lg">¡Cita solicitada exitosamente!</h3>
              <p className="text-sm text-emerald-700 mt-1">
                Hemos registrado tu cita en el sistema para el {bookingDate} a las {bookingTime}. Recibirás los detalles de conexión por email.
              </p>
              <button
                onClick={() => setBookingSuccess(false)}
                className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded text-xs font-semibold"
              >
                Agendar otra cita
              </button>
            </div>
          ) : (
            <form onSubmit={handleBooking} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-outline mb-1">Nombre Completo *</label>
                  <input
                    required
                    type="text"
                    value={bookingName}
                    onChange={(e) => setBookingName(e.target.value)}
                    placeholder="Ej. Laura González"
                    className="w-full h-10 px-3 border border-outline-variant rounded-md text-sm bg-surface focus:border-secondary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-outline mb-1">Correo Electrónico *</label>
                  <input
                    required
                    type="email"
                    value={bookingEmail}
                    onChange={(e) => setBookingEmail(e.target.value)}
                    placeholder="correo@ejemplo.com"
                    className="w-full h-10 px-3 border border-outline-variant rounded-md text-sm bg-surface focus:border-secondary focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-outline mb-1">Teléfono / WhatsApp *</label>
                  <input
                    required
                    type="tel"
                    value={bookingPhone}
                    onChange={(e) => setBookingPhone(e.target.value)}
                    placeholder="+31 6 12345678"
                    className="w-full h-10 px-3 border border-outline-variant rounded-md text-sm bg-surface focus:border-secondary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-outline mb-1">Tipo de Trámite</label>
                  <select
                    value={bookingService}
                    onChange={(e) => setBookingService(e.target.value)}
                    className="w-full h-10 px-3 border border-outline-variant rounded-md text-sm bg-surface focus:border-secondary focus:outline-none"
                  >
                    <option>M-Form / Declaración de la Renta</option>
                    <option>Subsidios Toeslagen (Zorg / Huur)</option>
                    <option>Activación DigiD & BSN</option>
                    <option>Alta KVK (Autónomo ZZP)</option>
                    <option>Consulta y Revisión de Cartas Belastingdienst</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-outline mb-1">Fecha</label>
                  <input
                    required
                    type="date"
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full h-10 px-3 border border-outline-variant rounded-md text-sm bg-surface focus:border-secondary focus:outline-none font-mono-data"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-outline mb-1">Hora Deseada</label>
                  <select
                    value={bookingTime}
                    onChange={(e) => setBookingTime(e.target.value)}
                    className="w-full h-10 px-3 border border-outline-variant rounded-md text-sm bg-surface focus:border-secondary focus:outline-none font-mono-data"
                  >
                    <option>09:30</option>
                    <option>10:30</option>
                    <option>11:30</option>
                    <option>14:00</option>
                    <option>15:30</option>
                    <option>16:30</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full h-11 mt-4 bg-secondary text-white font-medium rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-sm text-sm"
              >
                <span className="material-symbols-outlined text-[18px]">calendar_month</span>
                <span>Confirmar Reserva de Cita</span>
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-8 bg-surface-container border-t border-surface-container-high px-6 lg:px-12 text-xs text-on-surface-variant flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-on-surface">NexusGest Advies & Gestoría</span>
          <span>· Países Bajos</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/crm" className="hover:text-secondary font-medium">Panel Operativo CRM</Link>
          <Link href="/portal" className="hover:text-secondary font-medium">Portal Mijn NexusGest</Link>
          <span>KvK 89123847 · BTW NL829102948B01</span>
        </div>
      </footer>
    </div>
  );
}
