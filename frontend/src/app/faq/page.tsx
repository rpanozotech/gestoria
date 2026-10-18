'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import PublishedContent from '@/components/PublishedContent';

const FAQ_ITEMS = [
  {
    category: 'Renta & M-Form',
    q: '¿Qué es el formulario M-Form y por qué suele salir a devolver?',
    a: 'El M-Form (M-biljet) es la declaración de impuestos correspondiente al año en que cambias tu residencia fiscal a los Países Bajos. Durante los meses que trabajas en tu primer año, las empresas retienen impuestos sobre una base estimada anual. Al prorratear las retenciones y deducir gastos de traslado internacional y tramos no utilizados, la Belastingdienst casi siempre genera una devolución sustancial (entre 800€ y 2.400€).',
  },
  {
    category: 'DigiD & Identidad',
    q: '¿Cómo funciona el DigiD y cuánto tarda en llegar el código postal?',
    a: 'El DigiD es tu clave digital oficial para interactuar con todas las administraciones holandesas (Hacienda, Seguridad Social UWV, Ayuntamiento y aseguradoras). Tras solicitarlo, el código de activación llega en una carta física a tu dirección empadronada en un plazo de 3 a 5 días laborables.',
  },
  {
    category: 'Subsidios (Toeslagen)',
    q: '¿Puedo solicitar el subsidio de salud (Zorgtoeslag) con carácter retroactivo?',
    a: 'Sí, absolutamente. Si cumples con el tope de ingresos brutos anuales, puedes reclamar el Zorgtoeslag con efecto retroactivo de todo el año fiscal vigente y del año anterior (hasta el 1 de septiembre). Recibirás el abono conjunto de todos los meses pasados en tu cuenta bancaria.',
  },
  {
    category: 'Salud & Seguros',
    q: '¿Es obligatorio contratar seguro médico holandés si ya tengo tarjeta europea?',
    a: 'Sí. Si estás trabajando o residiendo habitualmente en Países Bajos, la ley sanitaria neerlandesa obliga a contratar una póliza de seguro básica (Basisverzekering) en un plazo de 4 meses. Mantener solo la Tarjeta Sanitaria Europea no es legal para residentes y conlleva multas del CAK.',
  },
  {
    category: 'Autónomos ZZP',
    q: '¿Qué necesito para darme de alta como autónomo (ZZP) en Países Bajos?',
    a: 'Necesitas tu número BSN, un documento de identidad en vigor (pasaporte o DNI europeo) y acudir a la cita con la Cámara de Comercio (KvK). En RP Asesoría preparamos toda tu inscripción, gestionamos tu número de IVA (BTW-id) y nos ocupamos de tus declaraciones trimestrales.',
  },
  {
    category: 'Paro & UWV',
    q: '¿Qué es el formulario U1 y cuándo debo pedirlo?',
    a: 'El certificado U1 acredita todos los periodos cotizados a la seguridad social en Países Bajos. Si decides regresar a España o mudarte a otro país de la UE, este documento te permite sumar tus meses trabajados en Holanda para cobrar el subsidio de desempleo en tu país de destino.',
  },
];

const FAQ_ITEMS_EN = [
  { category: 'Tax & M-Form', q: 'What is the M-Form and why is it often refundable?', a: 'The M-Form is the tax return for the year in which you change your tax residence to the Netherlands. We review your situation and prepare the filing; the final decision belongs to the Dutch Tax Administration.' },
  { category: 'DigiD & Identity', q: 'How does DigiD work and how long does activation take?', a: 'DigiD is your official digital key for Dutch government services. We guide you through the application and activation process.' },
  { category: 'Benefits', q: 'Can I apply for Zorgtoeslag retroactively?', a: 'Possibly, if you meet the income and insurance requirements. Eligibility and the final amount are decided by the competent authority.' },
  { category: 'Health insurance', q: 'Do I need Dutch health insurance if I already have a European Health Insurance Card?', a: 'If you work or usually live in the Netherlands, Dutch rules may require basic health insurance. We help you understand the administrative steps.' },
  { category: 'Self-employed ZZP', q: 'What do I need to register as self-employed in the Netherlands?', a: 'Usually a BSN and valid identity document are needed. We explain the registration process and the required documents.' },
  { category: 'Unemployment & UWV', q: 'What is the U1 form and when should I request it?', a: 'The U1 certificate proves insurance periods for unemployment purposes within the EU. We can help request and prepare the documentation.' },
];

export default function FaqPage() {
  const { lang } = useLanguage();
  const english = lang === 'EN';
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [search, setSearch] = useState('');

  const filtered = (english ? FAQ_ITEMS_EN : FAQ_ITEMS).filter((item) =>
    item.q.toLowerCase().includes(search.toLowerCase()) ||
    item.a.toLowerCase().includes(search.toLowerCase()) ||
    item.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div role="main" id="main-content" className="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans antialiased flex flex-col justify-between">
      <div>
        <Navbar />
        <PublishedContent pageKey="faq" />

        {/* HERO FAQ */}
        <section className="pt-16 pb-14 bg-gradient-to-b from-blue-50/50 via-white to-[#F8FAFC] border-b border-slate-100">
          <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16 text-center">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100/70 border border-blue-200 text-blue-800 text-xs font-semibold mb-4">
              <span className="material-symbols-outlined text-[16px]">help</span>
              {english ? 'Help Centre & Answers' : 'Centro de Ayuda & Respuestas'}
            </div>

            <h1 className="font-heading text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
              {english ? <>Frequently Asked Questions about <span className="text-blue-600">Dutch paperwork</span></> : <>Preguntas Frecuentes sobre <span className="text-blue-600">Trámites en Holanda</span></>}
            </h1>

            <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto mb-8">
              {english ? 'Clear, direct answers to common questions about taxes, healthcare, DigiD and benefits in the Netherlands.' : 'Respuestas claras y directas a las dudas más habituales sobre impuestos, sanidad, DigiD y ayudas en Países Bajos.'}
            </p>

            <div className="max-w-xl mx-auto relative">
              <span className="material-symbols-outlined absolute left-4 top-3.5 text-slate-400 text-[22px]">search</span>
              <input
                type="text"
                placeholder={english ? 'Search a question (e.g. M-Form, Zorgtoeslag, insurance...)' : 'Buscar duda (ej. M-Form, Zorgtoeslag, seguro, plazos...)'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-white rounded-2xl border border-slate-200 text-sm shadow-sm focus:ring-2 focus:ring-blue-600 outline-none"
              />
            </div>
          </div>
        </section>

        {/* FAQ ACCORDION */}
        <section className="py-16">
          <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16 space-y-4">
            {filtered.map((item, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm transition-all"
              >
                <button
                  onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                  className="w-full text-left px-6 py-5 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
                >
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 mb-1 block">
                      {item.category}
                    </span>
                    <span className="font-heading font-bold text-base sm:text-lg text-slate-900">
                      {item.q}
                    </span>
                  </div>
                  <span className={`material-symbols-outlined text-blue-600 transition-transform duration-200 shrink-0 ${
                    openIndex === idx ? 'rotate-180' : ''
                  }`}>
                    keyboard_arrow_down
                  </span>
                </button>

                {openIndex === idx && (
                  <div className="px-6 pb-6 pt-2 text-slate-600 text-sm leading-relaxed border-t border-slate-100">
                    {item.a}
                  </div>
                )}
              </div>
            ))}

            {/* CALLOUT AYUDA INDIVIDUAL */}
            <div className="mt-14 p-8 bg-blue-50 rounded-3xl border border-blue-200 text-center space-y-3">
              <h3 className="font-heading font-extrabold text-xl text-slate-900">¿Tienes una duda específica sobre tu caso?</h3>
              <p className="text-sm text-slate-600 max-w-lg mx-auto">
                Escríbenos directamente o agenda una videollamada de 30 minutos con un gestor para resolverlo todo.
              </p>
              <div className="pt-2 flex justify-center gap-3">
                <Link href="/reservar" className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md">
                  Reservar Consulta
                </Link>
                <Link href="/contacto" className="px-6 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold border border-slate-300 shadow-sm">
                  Enviar Mensaje
                </Link>
              </div>
            </div>

          </div>
        </section>

      </div>
      <Footer />
    </div>
  );
}
