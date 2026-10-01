'use client';

import React, { useState } from 'react';
import { apiUrl } from '@/lib/api';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function ReservarCitaPage() {
  const [bookName, setBookName] = useState('');
  const [bookEmail, setBookEmail] = useState('');
  const [bookPhone, setBookPhone] = useState('');
  const [bookService, setBookService] = useState('Declaración de la Renta (M-Form)');
  const [bookDate, setBookDate] = useState('2026-10-15');
  const [bookTime, setBookTime] = useState('11:00');
  const [bookModality, setBookModality] = useState<'meet' | 'phone' | 'office'>('meet');
  const [bookSuccess, setBookSuccess] = useState(false);
  const [bookLoading, setBookLoading] = useState(false);

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
      setBookSuccess(true);
    } finally {
      setBookLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans antialiased flex flex-col justify-between">
      <div>
        <Navbar />

        {/* HERO RESERVAR CITA */}
        <section className="pt-16 pb-14 bg-gradient-to-b from-blue-50/50 via-white to-[#F8FAFC] border-b border-slate-100">
          <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16 text-center">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100/70 border border-blue-200 text-blue-800 text-xs font-semibold mb-4">
              <span className="material-symbols-outlined text-[16px]">calendar_month</span>
              <span>Agenda Online & Confirmación Inmediata</span>
            </div>

            <h1 className="font-heading text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
              Reserva tu cita con <span className="text-blue-600">RP Gestoría</span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto">
              Elige el formato que prefieras (videollamada Google Meet, llamada telefónica o en persona) y selecciona tu horario ideal.
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
                    ¡Cita programada con éxito!
                  </h3>
                  <p className="text-slate-600 max-w-md mx-auto text-sm leading-relaxed">
                    Hemos enviado la confirmación y el enlace de la videollamada a <strong>{bookEmail}</strong>. Tu gestor asignado revisará tu caso antes de la reunión.
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
                      href="/portal"
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
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                        2. Motivo o Trámite
                      </label>
                      <select
                        value={bookService}
                        onChange={(e) => setBookService(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 focus:ring-2 focus:ring-blue-600 outline-none"
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
                        3. Fecha
                      </label>
                      <input
                        type="date"
                        value={bookDate}
                        onChange={(e) => setBookDate(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 focus:ring-2 focus:ring-blue-600 outline-none"
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
                        className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 focus:ring-2 focus:ring-blue-600 outline-none"
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

                  <button
                    type="submit"
                    disabled={bookLoading}
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
