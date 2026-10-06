'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function SobreNosotrosPage() {
  return (
    <div role="main" id="main-content" className="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans antialiased flex flex-col justify-between">
      <div>
        <Navbar />

        {/* HERO SOBRE NOSOTROS */}
        <section className="pt-16 pb-14 bg-gradient-to-b from-blue-50/50 via-white to-[#F8FAFC] border-b border-slate-100">
          <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16 text-center">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100/70 border border-blue-200 text-blue-800 text-xs font-semibold mb-4">
              <span className="material-symbols-outlined text-[16px]">groups</span>
              <span>Equipo & Misión</span>
            </div>

            <h1 className="font-heading text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
              Nacidos para hacer los trámites en Holanda <span className="text-blue-600">simples y humanos</span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto">
              Somos un equipo de profesionales jóvenes y multiculturales que también vivimos la experiencia de aterrizar en los Países Bajos.
            </p>
          </div>
        </section>

        {/* CONTENIDO & HISTORIA */}
        <section className="py-16">
          <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16">
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center mb-20">
              
              {/* IMÁGENES */}
              <div className="lg:col-span-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative h-64 rounded-3xl overflow-hidden shadow-lg border-2 border-white">
                    <Image src="/photo-6.png" alt="Equipo RP Gestoría" fill className="object-cover" />
                  </div>
                  <div className="relative h-64 rounded-3xl overflow-hidden shadow-lg border-2 border-white">
                    <Image src="/photo-8.png" alt="Reunión asesoría" fill className="object-cover" />
                  </div>
                </div>
                <div className="bg-blue-600 text-white p-6 rounded-3xl text-center shadow-lg">
                  <p className="font-heading font-extrabold text-3xl">+1.400</p>
                  <p className="text-xs text-blue-100 font-medium">Expats, trabajadores y autónomos asesorados con éxito</p>
                </div>
              </div>

              {/* TEXTO */}
              <div className="lg:col-span-6 space-y-6">
                <span className="text-blue-600 font-bold text-xs uppercase tracking-widest bg-blue-50 px-3.5 py-1.5 rounded-full border border-blue-100">
                  Nuestra Filosofía
                </span>
                
                <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                  La gestoría que nos hubiera gustado encontrar al llegar
                </h2>

                <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                  Llegar a Países Bajos es emocionante, pero el laberinto burocrático (el BSN, el seguro de salud, el DigiD y los formularios fiscales en neerlandés) puede convertirse en una pesadilla.
                </p>

                <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                  En <strong>RP Gestoría & Asesoría</strong> transformamos ese proceso en una experiencia digital fluida, transparente y 100% en tu lengua materna. Sin trajes excesivamente formales ni lenguaje ininteligible: hablamos de persona a persona.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
                    <span className="material-symbols-outlined text-blue-600 text-[24px] mb-2">language</span>
                    <h4 className="font-bold text-sm text-slate-900">100% en Español</h4>
                    <p className="text-xs text-slate-500">También atendemos en inglés, neerlandés y rumano.</p>
                  </div>
                  <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
                    <span className="material-symbols-outlined text-blue-600 text-[24px] mb-2">bolt</span>
                    <h4 className="font-bold text-sm text-slate-900">Agilidad Máxima</h4>
                    <p className="text-xs text-slate-500">Presentaciones oficiales directas en 24-48 horas.</p>
                  </div>
                </div>
              </div>

            </div>

            {/* VALORES */}
            <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/90 shadow-md">
              <div className="text-center max-w-2xl mx-auto mb-10">
                <h3 className="font-heading font-extrabold text-2xl text-slate-900">Nuestros 3 Pilares Fundamentales</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                <div className="space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                    <span className="material-symbols-outlined text-[28px]">lock_person</span>
                  </div>
                  <h4 className="font-bold text-base text-slate-900">Transparencia Total</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Precios cerrados desde el primer momento. Sin costes ocultos ni comisiones sorpresa.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                    <span className="material-symbols-outlined text-[28px]">devices</span>
                  </div>
                  <h4 className="font-bold text-base text-slate-900">Tecnología & Comodidad</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Todo gestionable desde tu móvil. Firma electrónica segura y archivo digital en tu portal privado.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                    <span className="material-symbols-outlined text-[28px]">favorite</span>
                  </div>
                  <h4 className="font-bold text-base text-slate-900">Empatía Real</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Te escuchamos y entendemos tus circunstancias individuales para recomendarte solo lo que realmente te conviene.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </section>

      </div>
      <Footer />
    </div>
  );
}
