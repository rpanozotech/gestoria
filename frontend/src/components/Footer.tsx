import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-400 text-xs pt-16 pb-12 border-t border-slate-800 w-full">
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16 space-y-12">
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          
          {/* BRAND */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl overflow-hidden bg-slate-900 border border-slate-700">
                <Image src="/logo.png" alt="RP Gestoría" width={36} height={36} className="object-cover" />
              </div>
              <span className="font-heading font-extrabold text-lg text-white">
                RP Gestoría <span className="text-blue-500">& Asesoría</span>
              </span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed max-w-sm">
              “Tus trámites en Holanda, mucho más fáciles.” Asesoría fiscal, laboral y de extranjería para expatriados, jóvenes y profesionales en Países Bajos.
            </p>
            <div className="pt-2 text-[11px] text-slate-500">
              <p>Servicios de gestoría y asesoría para toda Holanda (Países Bajos)</p>
            </div>
          </div>

          {/* TRÁMITES */}
          <div className="space-y-3">
            <p className="text-white font-bold uppercase tracking-wider text-xs">Trámites Populares</p>
            <ul className="space-y-2">
              <li><Link href="/servicios" className="hover:text-blue-400 transition-colors">M-Form Renta</Link></li>
              <li><Link href="/servicios" className="hover:text-blue-400 transition-colors">DigiD Holanda</Link></li>
              <li><Link href="/servicios" className="hover:text-blue-400 transition-colors">Zorgtoeslag</Link></li>
              <li><Link href="/servicios" className="hover:text-blue-400 transition-colors">Seguro Médico</Link></li>
              <li><Link href="/servicios" className="hover:text-blue-400 transition-colors">Formulario U1</Link></li>
            </ul>
          </div>

          {/* EMPRESAS & OTROS */}
          <div className="space-y-3">
            <p className="text-white font-bold uppercase tracking-wider text-xs">Autónomos & Legal</p>
            <ul className="space-y-2">
              <li><Link href="/servicios" className="hover:text-blue-400 transition-colors">Alta Autónomo ZZP</Link></li>
              <li><Link href="/servicios" className="hover:text-blue-400 transition-colors">Impuesto BTW Trimestral</Link></li>
              <li><Link href="/servicios" className="hover:text-blue-400 transition-colors">Importación RDW / BPM</Link></li>
              <li><Link href="/servicios" className="hover:text-blue-400 transition-colors">Residencia Fiscal</Link></li>
              <li><Link href="/servicios" className="hover:text-blue-400 transition-colors">Paro UWV (WW)</Link></li>
            </ul>
          </div>

          {/* ACCESOS DIRECTOS */}
          <div className="space-y-3">
            <p className="text-white font-bold uppercase tracking-wider text-xs">Páginas</p>
            <ul className="space-y-2">
              <li><Link href="/portal" className="text-blue-400 font-bold hover:underline">Área Cliente (Mijn RP)</Link></li>
              <li><Link href="/reservar" className="hover:text-blue-400 transition-colors">Reservar Cita</Link></li>
              <li><Link href="/calculadora" className="hover:text-blue-400 transition-colors">Calculadora M-Form</Link></li>
              <li><Link href="/como-funciona" className="hover:text-blue-400 transition-colors">Cómo funciona</Link></li>
              <li><Link href="/nosotros" className="hover:text-blue-400 transition-colors">Sobre nosotros</Link></li>
              <li><Link href="/faq" className="hover:text-blue-400 transition-colors">Preguntas Frecuentes</Link></li>
              <li><Link href="/contacto" className="hover:text-blue-400 transition-colors">Contacto Directo</Link></li>
            </ul>
          </div>

        </div>

        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <p>© {new Date().getFullYear()} RP Gestoría & Asesoría B.V. Todos los derechos reservados.</p>
          <div className="flex items-center gap-6">
            <span className="hover:text-slate-300 cursor-pointer">Aviso Legal</span>
            <span className="hover:text-slate-300 cursor-pointer">Política de Privacidad</span>
            <span className="hover:text-slate-300 cursor-pointer">Términos y Condiciones</span>
          </div>
        </div>

      </div>
    </footer>
  );
}
