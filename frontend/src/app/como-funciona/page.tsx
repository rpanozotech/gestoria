'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function ComoFuncionaPage() {
  return (
    <div role="main" id="main-content" className="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans antialiased flex flex-col justify-between">
      <div>
        <Navbar />

        {/* HERO CÓMO FUNCIONA */}
        <section className="pt-16 pb-14 bg-gradient-to-b from-blue-50/50 via-white to-[#F8FAFC] border-b border-slate-100">
          <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16 text-center">
            
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100/70 border border-blue-200 text-blue-800 text-xs font-semibold mb-4">
              <span className="material-symbols-outlined text-[16px]">timeline</span>
              <span>Proceso 100% Digital & Cercano</span>
            </div>

            <h1 className="font-heading text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
              Cómo funciona <span className="text-blue-600">RP Gestoría & Asesoría</span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto mb-8">
              Gestionamos tu documentación ante la administración holandesa en 4 sencillos pasos. Sin citas presenciales interminables ni cartas en neerlandés.
            </p>

            <div className="flex justify-center gap-4">
              <Link
                href="/reservar"
                className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-md shadow-blue-600/20 transition-all"
              >
                Reservar consulta inicial
              </Link>
              <Link
                href="/servicios"
                className="px-6 py-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-sm font-bold shadow-sm transition-all"
              >
                Ver servicios disponibles
              </Link>
            </div>

          </div>
        </section>

        {/* 4 PASOS DETALLADOS */}
        <section className="py-20">
          <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16">
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              
              {/* PASO 1 */}
              <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm hover:shadow-xl transition-all group flex flex-col justify-between">
                <div>
                  <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white font-heading font-black text-xl flex items-center justify-center mb-6 shadow-md group-hover:scale-110 transition-transform">
                    01
                  </div>
                  <h3 className="font-heading font-bold text-xl text-slate-900 mb-3">
                    Cuéntanos tu situación
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed mb-4">
                    Escríbenos por WhatsApp o reserva una cita rápida por videollamada. Nos explicas en qué momento de tu mudanza o trabajo en Holanda te encuentras.
                  </p>
                </div>
                <div className="pt-4 border-t border-slate-100 flex items-center gap-2 text-xs font-semibold text-blue-600">
                  <span className="material-symbols-outlined text-[16px]">chat</span>
                  <span>Sin tecnicismos jurídicos</span>
                </div>
              </div>

              {/* PASO 2 */}
              <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm hover:shadow-xl transition-all group flex flex-col justify-between">
                <div>
                  <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white font-heading font-black text-xl flex items-center justify-center mb-6 shadow-md group-hover:scale-110 transition-transform">
                    02
                  </div>
                  <h3 className="font-heading font-bold text-xl text-slate-900 mb-3">
                    Te indicamos qué necesitas
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed mb-4">
                    Te enviamos un checklist claro y reducido: sólo los 2 o 3 documentos indispensables (nómina, contrato de alquiler o pasaporte). Nada de papeles innecesarios.
                  </p>
                </div>
                <div className="pt-4 border-t border-slate-100 flex items-center gap-2 text-xs font-semibold text-blue-600">
                  <span className="material-symbols-outlined text-[16px]">checklist</span>
                  <span>Lista clara y directa</span>
                </div>
              </div>

              {/* PASO 3 */}
              <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm hover:shadow-xl transition-all group flex flex-col justify-between">
                <div>
                  <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white font-heading font-black text-xl flex items-center justify-center mb-6 shadow-md group-hover:scale-110 transition-transform">
                    03
                  </div>
                  <h3 className="font-heading font-bold text-xl text-slate-900 mb-3">
                    Sube tus documentos
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed mb-4">
                    Haz una foto con tu móvil y súbela a tu Área de Cliente cifrada o envíala por WhatsApp. Nosotros revisamos que todo esté perfecto antes de presentar.
                  </p>
                </div>
                <div className="pt-4 border-t border-slate-100 flex items-center gap-2 text-xs font-semibold text-blue-600">
                  <span className="material-symbols-outlined text-[16px]">lock</span>
                  <span>Cifrado de grado bancario</span>
                </div>
              </div>

              {/* PASO 4 */}
              <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm hover:shadow-xl transition-all group flex flex-col justify-between">
                <div>
                  <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white font-heading font-black text-xl flex items-center justify-center mb-6 shadow-md group-hover:scale-110 transition-transform">
                    04
                  </div>
                  <h3 className="font-heading font-bold text-xl text-slate-900 mb-3">
                    Nos encargamos de todo
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed mb-4">
                    Presentamos tu trámite formal ante Belastingdienst, UWV o Gemeente. Recibirás avisos en tiempo real y el borrador oficial en tu portal.
                  </p>
                </div>
                <div className="pt-4 border-t border-slate-100 flex items-center gap-2 text-xs font-semibold text-emerald-600">
                  <span className="material-symbols-outlined text-[16px]">verified</span>
                  <span>Seguimiento garantizado</span>
                </div>
              </div>

            </div>

            {/* SECCIÓN VISUAL CON FOTO REAL */}
            <div className="mt-16 bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/90 shadow-lg grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 space-y-4">
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider bg-blue-50 px-3 py-1 rounded-full">
                  Portal Seguro Mijn RP Gestoría
                </span>
                <h3 className="font-heading font-extrabold text-2xl sm:text-3xl text-slate-900">
                  Todo tu expediente accesible desde tu móvil
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Con tu usuario podrás ver la barra de progreso de tu M-Form o Zorgtoeslag, descargar facturas, pagar con iDEAL de tu banco holandés y consultar dudas con nuestro asistente IA las 24 horas del día.
                </p>
                <div className="pt-2">
                  <Link
                    href="/portal"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-blue-600 transition-colors shadow-md"
                  >
                    <span>Entrar a mi Área Cliente</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </Link>
                </div>
              </div>

              <div className="lg:col-span-5 relative h-64 sm:h-72 rounded-2xl overflow-hidden shadow-md border-2 border-slate-100">
                <Image src="/photo-2.png" alt="Área de Cliente" fill className="object-cover" />
              </div>
            </div>

          </div>
        </section>

      </div>
      <Footer />
    </div>
  );
}
