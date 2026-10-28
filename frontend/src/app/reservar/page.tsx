'use client';

import React, { useEffect, useState } from 'react';
import { apiUrl } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const APPOINTMENT_MINUTES = 30;
const BUFFER_MINUTES = 15;
const SLOT_MINUTES = APPOINTMENT_MINUTES + BUFFER_MINUTES;
// Jornada de 09:00 a 21:00: la última cita puede comenzar a las 20:15
// para ocupar 30 minutos y conservar 15 minutos de margen hasta las 21:00.
const BOOKING_SLOTS = Array.from({ length: 16 }, (_, index) => {
  const total = 9 * 60 + index * SLOT_MINUTES;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
});

type BusyAppointment = {
  appointment_date: string;
  appointment_time: string;
  duration_minutes?: number;
  status?: string;
};

export default function ReservarCitaPage() {
  const { lang } = useLanguage();
  const english = lang === 'EN';
  const [bookName, setBookName] = useState('');
  const [bookEmail, setBookEmail] = useState('');
  const [bookPhone, setBookPhone] = useState('');
  const [bookService, setBookService] = useState('');
  const [services, setServices] = useState<any[]>([]);
  const today = () => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`; };
  const [bookDate, setBookDate] = useState(today);
  const [bookTime, setBookTime] = useState('11:00');
  const [bookModality, setBookModality] = useState<'meet' | 'phone' | 'office'>('meet');
  const [bookSuccess, setBookSuccess] = useState(false);
  const [bookLoading, setBookLoading] = useState(false);
  const [busyAppointments, setBusyAppointments] = useState<BusyAppointment[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(true);
  const [availabilityError, setAvailabilityError] = useState('');
  const [availabilityDate, setAvailabilityDate] = useState('');
  const [availabilityRetry, setAvailabilityRetry] = useState(0);
  const [configuredSlots, setConfiguredSlots] = useState<string[]>(BOOKING_SLOTS);
  const [appointmentDuration, setAppointmentDuration] = useState(APPOINTMENT_MINUTES);
  const [bookingError, setBookingError] = useState('');
  const [legalConsent, setLegalConsent] = useState(false);

  useEffect(() => {
    fetch(apiUrl('/services/public'))
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('No se pudo cargar el catálogo')))
      .then((data) => {
        const list = Array.isArray(data.services) ? data.services : [];
        setServices(list);
        if (list.length > 0) setBookService((current) => current || list[0].id);
      })
      .catch(() => setBookingError('No se pudo cargar el catálogo de servicios.'));
  }, []);

  const toMinutes = (time: string) => {
    const [hours, minutes] = time.slice(0, 5).split(':').map(Number);
    return hours * 60 + minutes;
  };

  const isSlotAvailable = (slot: string, appointments = busyAppointments, duration = appointmentDuration) => {
    const start = toMinutes(slot);
    const end = start + duration;
    return !appointments.some((appointment) => {
      if (appointment.status === 'cancelada' || appointment.status === 'completada') return false;
      const existingStart = toMinutes(appointment.appointment_time);
      const existingEnd = existingStart + (appointment.duration_minutes || APPOINTMENT_MINUTES);
      return start < existingEnd + BUFFER_MINUTES && end + BUFFER_MINUTES > existingStart;
    });
  };

  const availableSlots = availabilityLoading || availabilityError || availabilityDate !== bookDate ? [] : configuredSlots.filter((slot) => isSlotAvailable(slot));

  useEffect(() => {
    let cancelled = false;

    const loadAvailability = async () => {
      setAvailabilityLoading(true);
      setAvailabilityError('');
      const localAppointments: BusyAppointment[] = [];
      if (process.env.NODE_ENV !== 'production') {
        try {
          const stored = window.localStorage.getItem('nexusgest_appointments');
          const parsed = stored ? JSON.parse(stored) : [];
          if (Array.isArray(parsed)) {
            localAppointments.push(
              ...parsed.filter((appointment: BusyAppointment) => appointment.appointment_date === bookDate)
            );
          }
        } catch {
          // El servidor sigue siendo la fuente principal si el almacenamiento local falla.
        }
      }

      let loadedSlots = BOOKING_SLOTS;
      let loadedDuration = APPOINTMENT_MINUTES;
      try {
        const response = await fetch(apiUrl(`/appointments/availability?date=${bookDate}`));
        if (!response.ok) throw new Error('No se pudo consultar la disponibilidad.');
        const data = await response.json();
        if (!Array.isArray(data.appointments)) throw new Error('La disponibilidad recibida está incompleta.');
        loadedSlots = Array.isArray(data.slots) ? data.slots : BOOKING_SLOTS;
        loadedDuration = Number(data.settings?.appointment_duration) || APPOINTMENT_MINUTES;
        setConfiguredSlots(loadedSlots);
        setAppointmentDuration(loadedDuration);
        localAppointments.push(...data.appointments);
      } catch {
        if (!cancelled) {
          setAvailabilityError('No se pudo consultar la disponibilidad. Vuelve a intentarlo.');
          setBusyAppointments([]);
          setBookTime('');
          setAvailabilityLoading(false);
        }
        return;
      }

      if (!cancelled) {
        const unique = new Map<string, BusyAppointment>();
        localAppointments.forEach((appointment) => {
          unique.set(`${appointment.appointment_date}-${appointment.appointment_time}`, appointment);
        });
        const nextBusy = Array.from(unique.values());
        setBusyAppointments(nextBusy);
        setAvailabilityDate(bookDate);
        setBookTime((current) => loadedSlots.includes(current) && isSlotAvailable(current, nextBusy, loadedDuration) ? current : (loadedSlots.find((slot) => isSlotAvailable(slot, nextBusy, loadedDuration)) || ''));
        setAvailabilityLoading(false);
      }
    };

    loadAvailability();
    return () => { cancelled = true; };
  }, [bookDate, availabilityRetry]);

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!legalConsent) {
      setBookingError('Debes aceptar la política de privacidad y las condiciones generales.');
      return;
    }
    if (!bookService) {
      setBookingError('Selecciona un servicio.');
      return;
    }
    if (availabilityLoading || availabilityError || availabilityDate !== bookDate || bookDate < today()) {
      setBookingError('Consulta una fecha vigente y espera a que se confirme la disponibilidad.');
      return;
    }
    if (!bookTime || !isSlotAvailable(bookTime)) {
      setBookingError('Ese horario ya no está disponible. Elige otra hora libre.');
      return;
    }
    setBookingError('');
    setBookLoading(true);
    const modality = bookModality === 'meet' ? 'online_meet' : bookModality === 'phone' ? 'llamada' : 'presencial';
    const selectedService = services.find((service) => service.id === bookService);
    const serviceTitle = selectedService?.title || bookService;
    const newAppointment = {
      id: `web-${Date.now()}`,
      title: `Cita Web: ${serviceTitle}`,
      client_name: bookName,
      client_phone: bookPhone,
      appointment_date: bookDate,
      appointment_time: `${bookTime}:00`,
      duration_minutes: appointmentDuration,
      modality,
      status: 'pendiente',
      notes: `Reserva realizada desde la web. Email: ${bookEmail}`,
    };

    if (process.env.NODE_ENV !== 'production') {
      try {
        const stored = window.localStorage.getItem('nexusgest_appointments');
        const existing = stored ? JSON.parse(stored) : [];
        const appointments = Array.isArray(existing) ? existing : [];
        window.localStorage.setItem('nexusgest_appointments', JSON.stringify([newAppointment, ...appointments]));
        window.dispatchEvent(new CustomEvent('nexusgest_appointments_updated'));
      } catch {
        // El guardado en PostgreSQL sigue siendo obligatorio.
      }
    }

    try {
      const response = await fetch(apiUrl('/appointments'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: bookName,
          email: bookEmail,
          phone: bookPhone,
          service_id: bookService,
          source: 'web',
          title: `Cita Web: ${serviceTitle}`,
          appointment_date: bookDate,
          appointment_time: bookTime,
          duration_minutes: appointmentDuration,
          modality,
          legal_consent: true,
          legal_terms_version: '2026-10-07',
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Ese horario ya no está disponible.');
      }
      setBookSuccess(true);
    } catch (error) {
      setBookingError(error instanceof Error && error.message !== 'Failed to fetch'
        ? error.message
        : 'No se pudo conectar con el servidor. La cita no se ha confirmado.');
      if (process.env.NODE_ENV !== 'production') {
        try {
          const stored = window.localStorage.getItem('nexusgest_appointments');
          const parsed = stored ? JSON.parse(stored) : [];
          window.localStorage.setItem(
            'nexusgest_appointments',
            JSON.stringify(Array.isArray(parsed) ? parsed.filter((appointment: any) => appointment.id !== newAppointment.id) : [])
          );
        } catch {}
      }
    } finally {
      setBookLoading(false);
    }
  };

  return (
    <div role="main" id="main-content" className="public-site min-h-screen bg-bg text-text font-sans antialiased flex flex-col justify-between">
      <div>
        <Navbar />

        {/* HERO RESERVAR CITA */}
        <section className="pt-16 pb-14 bg-bg border-b border-border">
          <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16 text-center">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-muted border border-border text-text text-xs font-semibold mb-4">
              <span className="material-symbols-outlined text-[16px]">calendar_month</span>
              {english ? 'Online booking request' : 'Solicitud de cita online'}
            </div>

            <h1 className="font-heading text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
              {english ? 'Book your appointment with' : 'Reserva tu cita con'} <span className="text-[#145DA0]">RP Asesoría</span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto">
              {english ? 'Choose your preferred format (Google Meet video call, phone call or in person) and select your ideal time.' : 'Elige el formato que prefieras (videollamada Google Meet, llamada telefónica o en persona) y selecciona tu horario ideal.'}
            </p>
          </div>
        </section>

        {/* FORMULARIO DE RESERVA */}
        <section className="py-16">
          <div className="w-full max-w-[1000px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16">
            
            <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/90 shadow-xl">
              {bookSuccess ? (
                <div className="text-center py-12 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                    <span className="material-symbols-outlined text-[36px]">check_circle</span>
                  </div>
                  <h3 className="font-heading font-extrabold text-2xl sm:text-3xl text-slate-900">
                    {english ? 'Appointment booked successfully!' : '¡Cita programada con éxito!'}
                  </h3>
                  <p className="text-slate-600 max-w-md mx-auto text-sm leading-relaxed">
                    {english ? 'Your booking has been registered. We will contact you to confirm the appointment details.' : 'Tu reserva quedó registrada. Nos pondremos en contacto contigo para confirmar los detalles de la cita.'}
                  </p>
                  <div className="pt-4 flex justify-center gap-3">
                    <button
                      onClick={() => {
                        setBookSuccess(false);
                        setBookName('');
                        setBookEmail('');
                        setBookPhone('');
                      }}
                      className="px-6 py-2.5 rounded-xl bg-slate-100 text-slate-800 text-xs font-bold hover:bg-slate-200 transition-colors"
                    >
                      Reservar otra fecha
                    </button>
                    <a
                      href="https://portal.rp-gestoria.tech/portal/login"
                      className="px-6 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors shadow-md"
                    >
                      Ir al Área de Cliente
                    </a>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleBookingSubmit} className="space-y-8">
                  
                  {/* PASO 1: MODALIDAD */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                      1. Formato de la consulta
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        { id: 'meet', label: 'Videollamada Google Meet', icon: 'videocam', desc: 'Enlace directo a tu correo' },
                        { id: 'phone', label: 'Llamada Telefónica', icon: 'call', desc: 'Te llamamos a tu móvil' },
                        { id: 'office', label: 'Presencial', icon: 'apartment', desc: 'Atención presencial en Tilburg, Países Bajos' },
                      ].map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setBookModality(m.id as any)}
                          className={`p-4 rounded-2xl border flex flex-col items-start text-left transition-all ${
                            bookModality === m.id
                              ? 'border-blue-600 bg-blue-50/80 text-blue-900 shadow-sm ring-2 ring-blue-600/20'
                              : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="material-symbols-outlined text-blue-600 text-[20px]">{m.icon}</span>
                            <span className="text-xs font-bold">{m.label}</span>
                          </div>
                          <span className="text-[11px] text-slate-500">{m.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* PASO 2: SERVICIO & FECHA */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="booking-service" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                        2. Motivo o Trámite
                      </label>
                      <select
                        id="booking-service"
                        value={bookService}
                        onChange={(e) => setBookService(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 focus:ring-2 focus:ring-blue-600 outline-none"
                        required
                      >
                        <option value="">Selecciona un servicio</option>
                        {services.map((service) => (
                          <option key={service.id} value={service.id}>{service.title} · €{Number(service.priceFinal ?? service.basePrice).toFixed(2)} IVA incluido</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="booking-date" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                        3. Fecha
                      </label>
                      <input
                        id="booking-date"
                        min={today()}
                        type="date"
                        value={bookDate}
                        onChange={(e) => setBookDate(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 focus:ring-2 focus:ring-blue-600 outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="booking-time" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                        4. Hora
                      </label>
                      <select
                        id="booking-time"
                        value={bookTime}
                        onChange={(e) => setBookTime(e.target.value)}
                        disabled={availabilityLoading || availableSlots.length === 0}
                        className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 focus:ring-2 focus:ring-blue-600 outline-none"
                      >
                        {availableSlots.length === 0 ? (
                          <option value="">{availabilityLoading ? 'Consultando disponibilidad…' : availabilityError ? 'Disponibilidad no confirmada' : 'No hay horarios libres'}</option>
                        ) : (
                          availableSlots.map((slot) => <option key={slot} value={slot}>{slot}</option>)
                        )}
                      </select>
                    </div>
                  </div>

                  {/* PASO 3: TUS DATOS */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                        Nombre completo
                      </label>
                      <input
                        type="text"
                        placeholder="Tu nombre"
                        value={bookName}
                        onChange={(e) => setBookName(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-600 outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                        Correo electrónico
                      </label>
                      <input
                        type="email"
                        placeholder="tu@email.com"
                        value={bookEmail}
                        onChange={(e) => setBookEmail(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-600 outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                        Teléfono / WhatsApp
                      </label>
                      <input
                        type="tel"
                        placeholder="+31 6 ..."
                        value={bookPhone}
                        onChange={(e) => setBookPhone(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-600 outline-none"
                        required
                      />
                    </div>
                  </div>

                  {availabilityError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{availabilityError} <button type="button" onClick={() => setAvailabilityRetry(value => value + 1)} className="font-semibold underline">Reintentar</button></div>}
                  {bookingError && (
                    <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">
                      {bookingError}
                    </p>
                  )}

                  <label className="flex items-start gap-2 text-xs text-slate-600">
                    <input type="checkbox" checked={legalConsent} onChange={(e) => setLegalConsent(e.target.checked)} className="mt-0.5" />
                    <span>Acepto la <a href="/privacidad" target="_blank" className="text-primary underline">Política de privacidad</a> y las <a href="/condiciones" target="_blank" className="text-primary underline">Condiciones generales</a>. Solicito que el servicio pueda comenzar durante el plazo legal de desistimiento cuando corresponda.</span>
                  </label>

                  <button
                    type="submit"
                    disabled={bookLoading || availabilityLoading || availableSlots.length === 0 || !legalConsent}
                    className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-heading font-extrabold text-base tracking-wide shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2"
                  >
                    {bookLoading ? (
                      <span>Agendando sesión...</span>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[20px]">check</span>
                        <span>Confirmar Reserva de Cita</span>
                      </>
                    )}
                  </button>

                </form>
              )}
            </div>

          </div>
        </section>

      </div>
      <Footer />
    </div>
  );
}
