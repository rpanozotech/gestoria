'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { formatThousands } from '@/lib/format';

/**
 * Tope del ingreso bruto en los simuladores.
 *
 * El publico objetivo de la gestoria no gana mas de esta cifra, asi que
 * el deslizador se detiene aqui. Los campos numericos siguen aceptando
 * cualquier importe: quien gana mas puede escribirlo a mano.
 */
const MIN_INCOME = 100;
const MAX_INCOME = 40000;

const formatAmount = formatThousands;
const parseAmount = (value: string) => Number(value.replace(/\D/g, '')) || 0;

export default function CalculadoraPage() {
  // 1. Calculadora M-Form
  const [monthsInNL, setMonthsInNL] = useState<number>(8);
  const [grossIncome, setGrossIncome] = useState<number>(27000);
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

  return (
    <div role="main" id="main-content" className="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans antialiased flex flex-col justify-between">
      <div>
        <Navbar />

        {/* HERO CALCULADORA */}
        <section className="pt-10 sm:pt-14 pb-9 sm:pb-12 bg-gradient-to-br from-blue-50 via-white to-indigo-50/40 border-b border-slate-100">
          <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-8 lg:px-12 text-center">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100/70 border border-blue-200 text-blue-800 text-xs font-semibold mb-4">
              <span className="material-symbols-outlined text-[16px]">calculate</span>
              <span>Simuladores Fiscales Oficiales 2026</span>
            </div>

            <h1 className="font-heading text-3xl sm:text-5xl lg:text-[52px] leading-tight font-extrabold text-slate-900 tracking-tight mb-4">
              Calcula tu devolución y <span className="text-blue-600">subsidios en Holanda</span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto mb-4 leading-relaxed">
              Descubre en menos de 1 minuto cuánto dinero puedes reclamar legalmente ante la Belastingdienst.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] sm:text-xs font-semibold text-slate-500">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 border border-slate-200"><span className="material-symbols-outlined text-[15px] text-emerald-600">verified</span>Estimación orientativa</span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 border border-slate-200"><span className="material-symbols-outlined text-[15px] text-blue-600">lock</span>Sin guardar tus datos</span>
            </div>
          </div>
        </section>

        {/* SIMULADORES GRID */}
        <section className="py-10 sm:py-14 bg-[#F8FAFC]">
          <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-8 lg:px-12">

            <div className="max-w-3xl mx-auto text-center mb-8 sm:mb-10">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600 mb-2">Dos simuladores rápidos</p>
              <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-slate-900">Introduce tus datos y descubre tu margen</h2>
              <p className="text-sm text-slate-500 mt-2">Puedes modificar cualquier cifra y ver el resultado al instante.</p>
            </div>
            
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 xl:gap-8 items-stretch">
              
              {/* SIMULADOR 1: M-FORM */}
              <div className="relative overflow-hidden bg-white rounded-[28px] p-5 sm:p-7 lg:p-8 border border-slate-200/90 border-t-4 border-t-blue-600 shadow-[0_18px_55px_-28px_rgba(15,23,42,0.45)] flex flex-col justify-between h-full">
                <div>
                  <div className="flex items-start justify-between gap-3 mb-7 pb-5 border-b border-slate-100">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md">
                        <span className="material-symbols-outlined text-[26px]">receipt_long</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1"><span className="text-[10px] font-bold uppercase tracking-widest text-blue-600">Simulador 01</span><span className="h-1 w-1 rounded-full bg-blue-300" /></div>
                        <h2 className="font-heading font-extrabold text-lg sm:text-xl leading-tight text-slate-900">Simulador Devolución M-Form</h2>
                        <p className="text-xs leading-relaxed text-slate-500 mt-1">Para tu primer año fiscal al mudarte a Países Bajos</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
                      Box 1
                    </span>
                  </div>

                  <div className="space-y-4">
                    {/* SLIDER MESES */}
                    <div className="rounded-2xl bg-slate-50/80 border border-slate-200/80 p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between w-full text-sm font-semibold text-slate-800 mb-2">
                        <span><span className="text-blue-600 font-bold mr-1">01</span> Meses vividos en Holanda este año:</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <input
                            type="number"
                            min="1"
                            max="11"
                            value={monthsInNL}
                            onChange={(e) => setMonthsInNL(Number(e.target.value))}
                            aria-label="Meses vividos en Holanda"
                            className="w-14 h-8 text-center text-blue-600 font-extrabold text-sm border border-slate-300 bg-white rounded-lg px-1 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                          />
                          <span className="text-blue-600 font-extrabold text-[17px]">meses</span>
                        </div>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="11"
                        value={monthsInNL}
                        onChange={(e) => setMonthsInNL(Number(e.target.value))}
                        aria-label="Meses vividos en Holanda"
                        className="w-full accent-blue-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                      />
                    </div>

                    {/* SLIDER INGRESOS BRUTOS */}
                    <div className="rounded-2xl bg-slate-50/80 border border-slate-200/80 p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between w-full text-sm font-semibold text-slate-800 mb-2">
                        <span><span className="text-blue-600 font-bold mr-1">02</span> Ingreso bruto percibido en Holanda:</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <input
                          type="text"
                          inputMode="numeric"
                          min={MIN_INCOME}
                          max={MAX_INCOME}
                           step="100"
                          value={formatAmount(grossIncome)}
                          onChange={(e) => setGrossIncome(parseAmount(e.target.value))}
                          aria-label="Ingreso bruto percibido en Holanda"
                           className="w-16 h-8 text-center text-blue-600 font-extrabold text-sm border border-slate-300 bg-white rounded-lg px-1 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                          />
                          <span className="text-blue-600 font-extrabold text-[17px]">€</span>
                        </div>
                      </div>
                      <input
                        type="range"
                        min={MIN_INCOME}
                        max={MAX_INCOME}
                         step="100"
                        value={Math.min(Math.max(grossIncome, MIN_INCOME), MAX_INCOME)}
                        onChange={(e) => setGrossIncome(Number(e.target.value))}
                        aria-label="Ingreso bruto percibido en Holanda, deslizador"
                        className="w-full accent-blue-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                      />
                      <p className="text-[11px] text-slate-500 mt-1">
                        Puedes escribir el importe directamente. Rango del deslizador: {MIN_INCOME.toLocaleString('es-ES')} – {MAX_INCOME.toLocaleString('es-ES')} €.
                      </p>
                    </div>

                    {/* SLIDER RETENCIONES */}
                    <div className="rounded-2xl bg-slate-50/80 border border-slate-200/80 p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between w-full text-sm font-semibold text-slate-800 mb-2">
                        <span><span className="text-blue-600 font-bold mr-1">03</span> Impuestos retenidos en nómina (Loonheffing):</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <input
                          type="text"
                          inputMode="numeric"
                          min={MIN_INCOME}
                          max={MAX_INCOME}
                          step="100"
                          value={formatAmount(withheldTax)}
                          onChange={(e) => setWithheldTax(parseAmount(e.target.value))}
                          aria-label="Impuestos retenidos en nómina"
                           className="w-16 h-8 text-center text-blue-600 font-extrabold text-sm border border-slate-300 bg-white rounded-lg px-1 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                          />
                          <span className="text-blue-600 font-extrabold text-[17px]">€</span>
                        </div>
                      </div>
                      <input
                        type="range"
                        min={MIN_INCOME}
                        max={MAX_INCOME}
                        step="100"
                        value={Math.min(Math.max(withheldTax, MIN_INCOME), MAX_INCOME)}
                        onChange={(e) => setWithheldTax(Number(e.target.value))}
                        aria-label="Impuestos retenidos en nómina, deslizador"
                        className="w-full accent-blue-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                      />
                      <p className="text-[11px] text-slate-500 mt-1">
                        Escribe el importe que aparece en tu nómina (loonheffing).
                      </p>
                    </div>

                    {/* DEDUCCIÓN MUDANZA */}
                    <label className="flex items-center gap-3 p-3.5 bg-blue-50/60 rounded-2xl border border-blue-100 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hasRelocation}
                        onChange={(e) => setHasRelocation(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded accent-blue-600"
                      />
                        <span className="text-xs font-semibold text-slate-700">
                          <span className="text-blue-600 font-bold mr-1">04</span>
                        Aplicar deducción estándar por gastos de mudanza internacional (-1.450 €)
                      </span>
                    </label>
                  </div>
                </div>

                {/* RESULTADO M-FORM */}
                <div className="mt-8 pt-6 border-t border-slate-100 bg-emerald-50/70 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                   <div className="min-w-0">
                    <span className="text-xs text-slate-500 font-bold block uppercase tracking-wider">Estimación a tu favor</span>
                    <span className="text-3xl sm:text-4xl font-heading font-black text-emerald-600">
                       + {formatThousands(calculateMFormRefund())} €
                    </span>
                  </div>
                  <Link
                    href="/servicios"
                     className="w-full sm:w-auto px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all text-center"
                  >
                    Tramitar mi M-Form (89€)
                  </Link>
                </div>
              </div>

              {/* SIMULADOR 2: SUBSIDIOS TOESLAGEN */}
              <div className="relative overflow-hidden bg-white rounded-[28px] p-5 sm:p-7 lg:p-8 border border-slate-200/90 border-t-4 border-t-indigo-600 shadow-[0_18px_55px_-28px_rgba(15,23,42,0.45)] flex flex-col justify-between h-full">
                <div>
                  <div className="flex items-start justify-between gap-3 mb-7 pb-5 border-b border-slate-100">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
                        <span className="material-symbols-outlined text-[26px]">payments</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1"><span className="text-[10px] font-bold uppercase tracking-widest text-indigo-600">Simulador 02</span><span className="h-1 w-1 rounded-full bg-indigo-300" /></div>
                        <h2 className="font-heading font-extrabold text-lg sm:text-xl leading-tight text-slate-900">Calculadora Subsidios Toeslagen</h2>
                        <p className="text-xs leading-relaxed text-slate-500 mt-1">Zorgtoeslag (Salud) & Huurtoeslag (Alquiler mensual)</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200">
                      Mensual
                    </span>
                  </div>

                  <div className="space-y-4">
                    {/* SLIDER INGRESOS ANUALES */}
                    <div className="rounded-2xl bg-slate-50/80 border border-slate-200/80 p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-sm font-semibold text-slate-800 mb-2">
                        <span><span className="text-indigo-600 font-bold mr-1">01</span> Ingreso anual bruto estimado:</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <input
                          type="text"
                          inputMode="numeric"
                          min={MIN_INCOME}
                          max={MAX_INCOME}
                           step="100"
                          value={formatAmount(toeslagIncome)}
                          onChange={(e) => setToeslagIncome(parseAmount(e.target.value))}
                          aria-label="Ingreso anual bruto estimado"
                           className="w-16 h-8 text-center text-indigo-600 font-extrabold text-sm border border-slate-300 bg-white rounded-lg px-1 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                          />
                           <span className="text-indigo-600 font-extrabold text-[17px]">€ / año</span>
                        </div>
                      </div>
                      <input
                        type="range"
                        min={MIN_INCOME}
                        max={MAX_INCOME}
                         step="100"
                        value={Math.min(Math.max(toeslagIncome, MIN_INCOME), MAX_INCOME)}
                        onChange={(e) => setToeslagIncome(Number(e.target.value))}
                        aria-label="Ingreso anual bruto estimado, deslizador"
                        className="w-full accent-indigo-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                      />
                      <p className="text-[11px] text-slate-500 mt-1">
                        Puedes escribir el importe directamente. El deslizador va de {MIN_INCOME.toLocaleString('es-ES')} a {MAX_INCOME.toLocaleString('es-ES')} €.
                      </p>
                    </div>

                    {/* SLIDER ALQUILER */}
                    <div className="rounded-2xl bg-slate-50/80 border border-slate-200/80 p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-sm font-semibold text-slate-800 mb-2">
                        <span><span className="text-indigo-600 font-bold mr-1">02</span> Alquiler mensual de tu vivienda:</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <input
                          type="text"
                          inputMode="numeric"
                          min="0"
                          step="25"
                          value={formatAmount(monthlyRent)}
                          onChange={(e) => setMonthlyRent(parseAmount(e.target.value))}
                          aria-label="Alquiler mensual de la vivienda"
                           className="w-16 h-8 text-center text-indigo-600 font-extrabold text-sm border border-slate-300 bg-white rounded-lg px-1 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                          />
                           <span className="text-indigo-600 font-extrabold text-[17px]">€ / mes</span>
                        </div>
                      </div>
                      <input
                        type="range"
                        min="400"
                        max="1400"
                        step="25"
                        value={Math.min(Math.max(monthlyRent, 0), 1400)}
                        onChange={(e) => setMonthlyRent(Number(e.target.value))}
                        aria-label="Alquiler mensual de la vivienda, deslizador"
                        className="w-full accent-indigo-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                      />
                      <p className="text-[11px] text-slate-500 mt-1">
                        Si pagas mas de 1.400 €, escribe el importe real arriba.
                      </p>
                    </div>

                    {/* SITUACIÓN */}
                    <div>
                      <p className="text-sm font-semibold text-slate-800 mb-2"><span className="text-indigo-600 font-bold mr-1">03</span> Situación familiar</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label className="flex items-center gap-2.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isCouple}
                          onChange={(e) => setIsCouple(e.target.checked)}
                          className="w-4 h-4 text-indigo-600 rounded accent-indigo-600"
                        />
                        <span className="text-xs font-semibold text-slate-700">Con pareja fiscal</span>
                      </label>

                      <label className="flex items-center gap-2.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={hasChildren}
                          onChange={(e) => setHasChildren(e.target.checked)}
                          className="w-4 h-4 text-indigo-600 rounded accent-indigo-600"
                        />
                        <span className="text-xs font-semibold text-slate-700">Con hijos menores</span>
                      </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* RESULTADO TOESLAGEN */}
                <div className="mt-8 pt-6 border-t border-slate-100 bg-indigo-50/70 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                   <div className="min-w-0">
                    <span className="text-xs text-slate-500 font-bold block uppercase tracking-wider">Total Subsidios Mensuales</span>
                    <span className="text-3xl sm:text-4xl font-heading font-black text-indigo-600">
                      {totalMonthlyAid} € <span className="text-xs font-normal text-slate-500">/ mes</span>
                    </span>
                  </div>
                  <Link
                    href="/servicios"
                     className="w-full sm:w-auto px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all text-center"
                  >
                    Solicitar Subsidios (45€)
                  </Link>
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
