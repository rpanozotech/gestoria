'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

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
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans antialiased flex flex-col justify-between">
      <div>
        <Navbar />

        {/* HERO CALCULADORA */}
        <section className="pt-16 pb-14 bg-gradient-to-b from-blue-50/50 via-white to-[#F8FAFC] border-b border-slate-100">
          <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16 text-center">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100/70 border border-blue-200 text-blue-800 text-xs font-semibold mb-4">
              <span className="material-symbols-outlined text-[16px]">calculate</span>
              <span>Simuladores Fiscales Oficiales 2026</span>
            </div>

            <h1 className="font-heading text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
              Calcula tu devolución y <span className="text-blue-600">subsidios en Holanda</span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto mb-4">
              Descubre en menos de 1 minuto cuánto dinero puedes reclamar legalmente ante la Belastingdienst.
            </p>
          </div>
        </section>

        {/* SIMULADORES GRID */}
        <section className="py-16">
          <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16">
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              
              {/* SIMULADOR 1: M-FORM */}
              <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/90 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md">
                        <span className="material-symbols-outlined text-[26px]">receipt_long</span>
                      </div>
                      <div>
                        <h2 className="font-heading font-extrabold text-xl text-slate-900">Simulador Devolución M-Form</h2>
                        <p className="text-xs text-slate-500">Para tu primer año fiscal al mudarte a Países Bajos</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
                      Box 1
                    </span>
                  </div>

                  <div className="space-y-6">
                    {/* SLIDER MESES */}
                    <div>
                      <div className="flex justify-between w-full text-sm font-semibold text-slate-800 mb-2">
                        <span>Meses vividos en Holanda este año:</span>
                        <span className="text-blue-600 font-extrabold text-base">{monthsInNL} meses</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="11"
                        value={monthsInNL}
                        onChange={(e) => setMonthsInNL(Number(e.target.value))}
                        className="w-full accent-blue-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                      />
                      <input
                        type="number"
                        min="1"
                        max="11"
                        value={monthsInNL}
                        onChange={(e) => setMonthsInNL(Number(e.target.value))}
                        className="mt-2 mx-auto w-48 border border-slate-300 rounded p-1"
                      />
                    </div>

                    {/* SLIDER INGRESOS BRUTOS */}
                    <div>
                      <div className="flex justify-between w-full text-sm font-semibold text-slate-800 mb-2">
                        <span>Ingreso bruto percibido en Holanda:</span>
                        <span className="text-blue-600 font-extrabold text-base">{grossIncome.toLocaleString('es-ES')} €</span>
                      </div>
                      <input
                        type="range"
                        min="10000"
                        max="60000"
                        step="1000"
                        value={grossIncome}
                        onChange={(e) => setGrossIncome(Number(e.target.value))}
                        className="w-full accent-blue-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                      />
                      <input
                        type="number"
                        min="10000"
                        max="60000"
                        value={grossIncome}
                        onChange={(e) => setGrossIncome(Number(e.target.value))}
                        className="mt-2 mx-auto w-48 border border-slate-300 rounded p-1"
                      />
                    </div>

                    {/* SLIDER RETENCIONES */}
                    <div>
                      <div className="flex justify-between w-full text-sm font-semibold text-slate-800 mb-2">
                        <span>Impuestos retenidos en nómina (Loonheffing):</span>
                        <span className="text-blue-600 font-extrabold text-base">{withheldTax.toLocaleString('es-ES')} €</span>
                      </div>
                      <input
                        type="range"
                        min="2000"
                        max="20000"
                        step="500"
                        value={withheldTax}
                        onChange={(e) => setWithheldTax(Number(e.target.value))}
                        className="w-full accent-blue-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                      />
                      <input
                        type="number"
                        min="2000"
                        max="20000"
                        value={withheldTax}
                        onChange={(e) => setWithheldTax(Number(e.target.value))}
                        className="mt-2 mx-auto w-48 border border-slate-300 rounded p-1"
                      />
                    </div>

                    {/* DEDUCCIÓN MUDANZA */}
                    <label className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hasRelocation}
                        onChange={(e) => setHasRelocation(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded accent-blue-600"
                      />
                      <span className="text-xs font-semibold text-slate-700">
                        Aplicar deducción estándar por gastos de mudanza internacional (-1.450 €)
                      </span>
                    </label>
                  </div>
                </div>

                {/* RESULTADO M-FORM */}
                <div className="mt-10 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <span className="text-xs text-slate-500 font-bold block uppercase tracking-wider">Estimación a tu favor</span>
                    <span className="text-3xl sm:text-4xl font-heading font-black text-emerald-600">
                      + {calculateMFormRefund().toLocaleString()} €
                    </span>
                  </div>
                  <Link
                    href="/servicios"
                    className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all text-center"
                  >
                    Tramitar mi M-Form (89€)
                  </Link>
                </div>
              </div>

              {/* SIMULADOR 2: SUBSIDIOS TOESLAGEN */}
              <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/90 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
                        <span className="material-symbols-outlined text-[26px]">payments</span>
                      </div>
                      <div>
                        <h2 className="font-heading font-extrabold text-xl text-slate-900">Calculadora Subsidios Toeslagen</h2>
                        <p className="text-xs text-slate-500">Zorgtoeslag (Salud) & Huurtoeslag (Alquiler mensual)</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200">
                      Mensual
                    </span>
                  </div>

                  <div className="space-y-6">
                    {/* SLIDER INGRESOS ANUALES */}
                    <div>
                      <div className="flex justify-between text-sm font-semibold text-slate-800 mb-2">
                        <span>Ingreso anual bruto estimado:</span>
                        <span className="text-indigo-600 font-extrabold text-base">{toeslagIncome.toLocaleString()} € / año</span>
                      </div>
                      <input
                        type="range"
                        min="12000"
                        max="55000"
                        step="1000"
                        value={toeslagIncome}
                        onChange={(e) => setToeslagIncome(Number(e.target.value))}
                        className="w-full accent-indigo-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                      />
                    </div>

                    {/* SLIDER ALQUILER */}
                    <div>
                      <div className="flex justify-between text-sm font-semibold text-slate-800 mb-2">
                        <span>Alquiler mensual de tu vivienda:</span>
                        <span className="text-indigo-600 font-extrabold text-base">{monthlyRent} € / mes</span>
                      </div>
                      <input
                        type="range"
                        min="400"
                        max="1400"
                        step="25"
                        value={monthlyRent}
                        onChange={(e) => setMonthlyRent(Number(e.target.value))}
                        className="w-full accent-indigo-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                      />
                    </div>

                    {/* SITUACIÓN */}
                    <div className="grid grid-cols-2 gap-3">
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

                {/* RESULTADO TOESLAGEN */}
                <div className="mt-10 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <span className="text-xs text-slate-500 font-bold block uppercase tracking-wider">Total Subsidios Mensuales</span>
                    <span className="text-3xl sm:text-4xl font-heading font-black text-indigo-600">
                      {totalMonthlyAid} € <span className="text-xs font-normal text-slate-500">/ mes</span>
                    </span>
                  </div>
                  <Link
                    href="/servicios"
                    className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all text-center"
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
