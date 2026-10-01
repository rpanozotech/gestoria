'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function PortalClientePage() {
  const [activeTab, setActiveTab] = useState<'resumen' | 'toeslagen' | 'facturas' | 'documentos'>('resumen');

  // Estado simulación iDEAL
  const [selectedBank, setSelectedBank] = useState('ING');
  const [isPaying, setIsPaying] = useState(false);
  const [paymentDone, setPaymentDone] = useState(false);

  // Subida de carta
  const [uploadSuccess, setUploadSuccess] = useState(false);

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Top Navbar Cliente */}
      <header className="sticky top-0 z-50 bg-surface/95 backdrop-blur-md border-b border-surface-container-high px-6 lg:px-12 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-container text-white flex items-center justify-center font-bold text-sm shadow-sm">
              NG
            </div>
            <span className="font-headline-sm text-base font-bold text-on-surface tracking-tight">Mijn NexusGest</span>
          </Link>
          <span className="px-2 py-0.5 text-[10px] font-mono-data bg-emerald-50 text-emerald-700 font-bold rounded">
            PORTAL SEGURO
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-secondary text-white font-mono-data font-bold text-xs flex items-center justify-center shadow-sm">
              MP
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-bold text-on-surface">Maria Popescu</span>
              <span className="text-[10px] font-mono-data text-outline">BSN: 982145672</span>
            </div>
          </div>
          <Link
            href="/"
            className="text-xs font-medium text-outline hover:text-secondary flex items-center gap-1 border-l border-surface-container pl-3"
          >
            <span>Salir</span>
            <span className="material-symbols-outlined text-[16px]">logout</span>
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8 space-y-6">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-primary-container to-slate-900 text-white p-6 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-mono-data text-secondary-fixed">Expediente Activo: EXP-2026-0041</span>
            <h1 className="text-2xl font-bold tracking-tight mt-1">¡Hola, Maria!</h1>
            <p className="text-xs text-slate-300 mt-0.5">
              Tu solicitud de DigiD y subsidio Zorgtoeslag se encuentra en curso en la Belastingdienst.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-semibold rounded-lg flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
              En Revisión Oficial
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-surface-container gap-2 overflow-x-auto text-xs font-semibold">
          <button
            onClick={() => setActiveTab('resumen')}
            className={`py-3 px-4 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'resumen' ? 'border-secondary text-secondary' : 'border-transparent text-outline hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">assignment</span>
            <span>Mi Trámite & Estado</span>
          </button>
          <button
            onClick={() => setActiveTab('toeslagen')}
            className={`py-3 px-4 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'toeslagen' ? 'border-secondary text-secondary' : 'border-transparent text-outline hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">health_and_safety</span>
            <span>Subsidios & Toeslagen Hub</span>
          </button>
          <button
            onClick={() => setActiveTab('facturas')}
            className={`py-3 px-4 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'facturas' ? 'border-secondary text-secondary' : 'border-transparent text-outline hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">credit_card</span>
            <span>Facturas & Pago iDEAL</span>
          </button>
          <button
            onClick={() => setActiveTab('documentos')}
            className={`py-3 px-4 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'documentos' ? 'border-secondary text-secondary' : 'border-transparent text-outline hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">upload_file</span>
            <span>Subir Cartas Seguras (IA)</span>
          </button>
        </div>

        {/* TAB 1: RESUMEN Y EXPEDIENTES */}
        {activeTab === 'resumen' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-sm text-on-surface">Progreso del Trámite EXP-2026-0041</h3>
                  <span className="text-xs font-mono-data font-bold text-secondary">65% completado</span>
                </div>
                <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                  <div className="bg-secondary h-full rounded-full w-[65%]"></div>
                </div>
              </div>

              {/* Timeline Steps */}
              <div className="space-y-4 text-xs">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[15px]">check</span>
                  </div>
                  <div>
                    <h5 className="font-bold text-on-surface">1. Recopilación de Documentos y BSN</h5>
                    <p className="text-outline text-[11px] mt-0.5">Completado por el asesor el 2 de Octubre</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[15px]">check</span>
                  </div>
                  <div>
                    <h5 className="font-bold text-on-surface">2. Envío formal a Belastingdienst</h5>
                    <p className="text-outline text-[11px] mt-0.5">Expediente remitido a la oficina fiscal de Heerlen</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-secondary text-white flex items-center justify-center shrink-0 animate-pulse">
                    <span className="material-symbols-outlined text-[15px]">hourglass_top</span>
                  </div>
                  <div>
                    <h5 className="font-bold text-secondary">3. Espera de carta oficial con código DigiD</h5>
                    <p className="text-on-surface-variant text-[11px] mt-0.5">
                      Recibirás una carta física por correo postal en tu domicilio de Eindhoven. Cuando la tengas, súbela en la pestaña &quot;Subir Cartas&quot;.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 opacity-50">
                  <div className="w-6 h-6 rounded-full bg-surface-container text-outline flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[15px]">radio_button_unchecked</span>
                  </div>
                  <div>
                    <h5 className="font-bold text-on-surface">4. Activación final y primer abono del subsidio</h5>
                    <p className="text-outline text-[11px] mt-0.5">Ingreso mensual directo en tu cuenta bancaria (IBAN)</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Asesor Asignado */}
            <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-on-surface">Tu Asesor Personal</h3>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-container text-white font-mono-data font-bold flex items-center justify-center">
                  RP
                </div>
                <div>
                  <h4 className="font-bold text-xs text-on-surface">Rony P.</h4>
                  <p className="text-[11px] text-outline">Especialista en Fiscalidad NL</p>
                </div>
              </div>

              <div className="p-3 bg-surface-container-low rounded-lg text-xs space-y-2">
                <div className="flex items-center gap-2 text-on-surface-variant">
                  <span className="material-symbols-outlined text-secondary text-base">call</span>
                  <span>+31 6 12345678</span>
                </div>
                <div className="flex items-center gap-2 text-on-surface-variant">
                  <span className="material-symbols-outlined text-secondary text-base">mail</span>
                  <span>soporte@nexusgest.nl</span>
                </div>
              </div>

              <button
                onClick={() => setActiveTab('documentos')}
                className="w-full h-9 bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold rounded transition-colors flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">upload</span>
                <span>Enviar Carta al Asesor</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: TOESLAGEN HUB */}
        {activeTab === 'toeslagen' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-surface-container-lowest p-6 rounded-xl border border-secondary shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="material-symbols-outlined text-secondary text-2xl">medical_services</span>
                <span className="px-2 py-0.5 bg-blue-50 text-secondary text-[10px] font-bold rounded">EN TRÁMITE</span>
              </div>
              <h3 className="font-bold text-sm text-on-surface">Zorgtoeslag (Seguro Médico)</h3>
              <p className="text-xs text-on-surface-variant">
                Compensación para el pago de tu seguro de salud obligatorio.
              </p>
              <div className="pt-2 border-t border-surface-container">
                <span className="text-[10px] text-outline uppercase font-mono-data">Estimación mensual:</span>
                <div className="text-xl font-bold font-mono-data text-secondary">€ 154,00 / mes</div>
              </div>
            </div>

            <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="material-symbols-outlined text-emerald-600 text-2xl">home</span>
                <span className="px-2 py-0.5 bg-surface-container text-outline text-[10px] font-bold rounded">DISPONIBLE</span>
              </div>
              <h3 className="font-bold text-sm text-on-surface">Huurtoeslag (Alquiler)</h3>
              <p className="text-xs text-on-surface-variant">
                Subsidio para viviendas de alquiler independiente hasta límite legal.
              </p>
              <div className="pt-2 border-t border-surface-container">
                <span className="text-[10px] text-outline uppercase font-mono-data">Estimación mensual:</span>
                <div className="text-xl font-bold font-mono-data text-on-surface">Hasta € 450,00 / mes</div>
              </div>
            </div>

            <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="material-symbols-outlined text-purple-600 text-2xl">child_care</span>
                <span className="px-2 py-0.5 bg-surface-container text-outline text-[10px] font-bold rounded">NO APLICADO</span>
              </div>
              <h3 className="font-bold text-sm text-on-surface">Kindgebonden Budget</h3>
              <p className="text-xs text-on-surface-variant">
                Ayuda del gobierno para familias con hijos a cargo menores de 18 años.
              </p>
              <div className="pt-2 border-t border-surface-container">
                <span className="text-[10px] text-outline uppercase font-mono-data">Estimación mensual:</span>
                <div className="text-xl font-bold font-mono-data text-outline">—</div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: FACTURAS & PAGO IDEAL */}
        {activeTab === 'facturas' && (
          <div className="max-w-2xl mx-auto bg-surface-container-lowest p-8 rounded-2xl border border-outline-variant shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-surface-container">
              <div>
                <span className="text-xs font-mono-data text-secondary font-bold">FACTURA FAC-2026-0002</span>
                <h3 className="text-lg font-bold text-on-surface">Gestión Zorgtoeslag y Registro Belastingdienst</h3>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold font-mono-data text-on-surface">€ 102,85</span>
                <span className="block text-[10px] text-outline">Incluye 21% BTW</span>
              </div>
            </div>

            {paymentDone ? (
              <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-2">
                <span className="material-symbols-outlined text-4xl text-emerald-600">verified</span>
                <h4 className="font-bold text-emerald-950 text-base">¡Pago completado con éxito!</h4>
                <p className="text-xs text-emerald-800">
                  Referencia iDEAL: <span className="font-mono-data font-bold">IDL-TRX-2026-98124</span>. Tu asesor ya ha recibido la confirmación automática.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-pink-500"></span>
                  <span className="text-xs font-bold uppercase text-outline">Selecciona tu Banco Holandés (iDEAL):</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {['ING', 'ABN AMRO', 'Rabobank', 'Bunq'].map((bank) => (
                    <button
                      key={bank}
                      type="button"
                      onClick={() => setSelectedBank(bank)}
                      className={`p-3 rounded-lg border text-xs font-bold transition-all text-center ${
                        selectedBank === bank
                          ? 'border-secondary bg-blue-50 text-secondary shadow-sm'
                          : 'border-outline-variant bg-surface text-on-surface hover:bg-surface-container'
                      }`}
                    >
                      {bank}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => {
                    setIsPaying(true);
                    setTimeout(() => {
                      setIsPaying(false);
                      setPaymentDone(true);
                    }, 1200);
                  }}
                  disabled={isPaying}
                  className="w-full h-11 bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs rounded-md shadow-sm transition-colors flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">lock</span>
                  <span>{isPaying ? 'Conectando con tu banco...' : `Pagar € 102,85 con ${selectedBank}`}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: SUBIR CARTAS SEGURAS */}
        {activeTab === 'documentos' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-surface-container-lowest p-8 rounded-2xl border-2 border-dashed border-outline-variant text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-2xl">document_scanner</span>
              </div>
              <div>
                <h3 className="font-bold text-sm text-on-surface">Sube la carta que recibiste en tu buzón</h3>
                <p className="text-xs text-on-surface-variant mt-1">
                  Nuestra Inteligencia Artificial leerá el código DigiD o la resolución de impuestos al instante y avisará a tu gestor.
                </p>
              </div>

              {uploadSuccess ? (
                <div className="p-4 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-lg">
                  ✓ Carta recibida y analizada por IA. Tu gestor Rony P. ha sido notificado.
                </div>
              ) : (
                <button
                  onClick={() => setUploadSuccess(true)}
                  className="h-10 px-6 bg-secondary text-white text-xs font-semibold rounded-md hover:bg-blue-700 transition-colors shadow-sm inline-flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">cloud_upload</span>
                  <span>Simular Subida de Carta Belastingdienst</span>
                </button>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
