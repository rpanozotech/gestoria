'use client';

import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function ContactoPage() {
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [topic, setTopic] = useState('mform');
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans antialiased flex flex-col justify-between">
      <div>
        <Navbar />

        {/* HERO CONTACTO */}
        <section className="pt-16 pb-14 bg-gradient-to-b from-blue-50/50 via-white to-[#F8FAFC] border-b border-slate-100">
          <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16 text-center">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100/70 border border-blue-200 text-blue-800 text-xs font-semibold mb-4">
              <span className="material-symbols-outlined text-[16px]">support_agent</span>
              <span>Atención Rápida & Personalizada</span>
            </div>

            <h1 className="font-heading text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
              Ponte en contacto con <span className="text-blue-600">RP Gestoría</span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto">
              Respondemos tus dudas en menos de 2 horas laborables. Escríbenos o abre un chat de WhatsApp con nuestro equipo.
            </p>
          </div>
        </section>

        {/* FORM & INFO GRID */}
        <section className="py-16">
          <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16">
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
              
              {/* INFO CARDS */}
              <div className="lg:col-span-5 space-y-6">
                <div>
                  <h2 className="font-heading font-extrabold text-2xl text-slate-900 mb-3">
                    Canales de Atención Directa
                  </h2>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Estamos disponibles de lunes a viernes de 09:00 a 19:00 horas para resolver cualquier duda sobre tu estancia o trámites en Países Bajos.
                  </p>
                </div>

                <div className="space-y-4">
                  <a
                    href="https://wa.me/31685291402?text=Hola%20RP%20Gestoria,%20tengo%20una%20consulta"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:border-emerald-300 hover:shadow-md transition-all group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                      <span className="material-symbols-outlined text-[24px]">chat</span>
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">WhatsApp Oficial</span>
                      <span className="text-base font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">+31 6 8529 1402</span>
                      <span className="text-xs text-emerald-600 font-semibold block mt-0.5">● Respuesta inmediata</span>
                    </div>
                  </a>

                  <div className="flex items-center gap-4 p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
                    <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[24px]">mail</span>
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Correo Electrónico</span>
                      <span className="text-base font-bold text-slate-900">info@rpgestoria.nl</span>
                      <span className="text-xs text-slate-500 block mt-0.5">Gestión de expedientes y documentación</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
                    <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[24px]">location_on</span>
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Oficina Principal</span>
                      <span className="text-base font-bold text-slate-900">Keizersgracht 482</span>
                      <span className="text-xs text-slate-500 block mt-0.5">1016 EG Amsterdam, Países Bajos</span>
                    </div>
                  </div>
                </div>

                <div className="p-5 bg-blue-50 rounded-2xl border border-blue-200/70 text-xs text-slate-700 space-y-1.5">
                  <p className="font-bold text-blue-900">Datos Oficiales de Registro:</p>
                  <p>• Registro Mercantil KvK: <strong>84920194</strong></p>
                  <p>• Número Fiscal BTW: <strong>NL863492019B01</strong></p>
                </div>
              </div>

              {/* FORMULARIO */}
              <div className="lg:col-span-7 bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/90 shadow-xl">
                <h3 className="font-heading font-extrabold text-2xl text-slate-900 mb-2">Envíanos un mensaje</h3>
                <p className="text-xs text-slate-500 mb-6">Completa el formulario y te responderemos por correo o WhatsApp.</p>

                {submitted ? (
                  <div className="py-12 text-center space-y-3">
                    <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                      <span className="material-symbols-outlined text-[36px]">check_circle</span>
                    </div>
                    <h4 className="font-heading font-extrabold text-2xl text-slate-900">¡Mensaje enviado con éxito!</h4>
                    <p className="text-xs text-slate-600 max-w-sm mx-auto">
                      Hemos recibido tu consulta y nuestro equipo se pondrá en contacto contigo en breve.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Nombre y Apellidos</label>
                        <input
                          type="text"
                          required
                          placeholder="Tu nombre"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-600 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">WhatsApp / Teléfono</label>
                        <input
                          type="tel"
                          required
                          placeholder="+31 6 ..."
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-600 outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Correo Electrónico</label>
                      <input
                        type="email"
                        required
                        placeholder="tu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-600 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Tema de la Consulta</label>
                      <select
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-600 outline-none font-medium"
                      >
                        <option value="mform">Declaración de la Renta (M-Form)</option>
                        <option value="digid">DigiD & Acceso</option>
                        <option value="zorgtoeslag">Zorgtoeslag & Subsidios</option>
                        <option value="seguro">Seguro Médico Obligatorio</option>
                        <option value="zzp">Autónomos ZZP / KvK</option>
                        <option value="u1">Formulario U1</option>
                        <option value="otro">Otro trámite / Consulta general</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Mensaje o Detalle de tu Caso</label>
                      <textarea
                        rows={4}
                        required
                        placeholder="Explícanos tu situación, cuándo llegaste a Holanda o qué cartas has recibido..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-600 outline-none"
                      ></textarea>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-heading font-extrabold text-sm tracking-wide shadow-lg shadow-blue-600/20 transition-all"
                    >
                      Enviar Consulta Gratuita
                    </button>
                  </form>
                )}
              </div>

            </div>

          </div>
        </section>

      </div>
      <Footer />
    </div>
  );
}
