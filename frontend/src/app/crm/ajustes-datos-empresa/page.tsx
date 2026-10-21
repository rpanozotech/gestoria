'use client';

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';

const empty = { logo_url:'', commercial_name:'', legal_name:'', description:'', address:'', city:'', country:'Países Bajos', kvk:'', vat_id:'', iban:'', email:'', phone:'', footer_text:'', default_language:'es', quote_prefix:'PRE', invoice_prefix:'FAC', number_format:'{prefix}-{year}-{number}' };
type Settings = typeof empty;
const labels: Array<[keyof Settings,string]> = [['logo_url','Logo (URL)'],['commercial_name','Nombre comercial'],['legal_name','Razón social'],['description','Descripción'],['address','Dirección'],['city','Ciudad'],['country','País'],['kvk','KVK'],['vat_id','BTW-id'],['iban','IBAN'],['email','Email'],['phone','Teléfono'],['footer_text','Texto legal del pie'],['default_language','Idioma predeterminado'],['quote_prefix','Prefijo de presupuestos'],['invoice_prefix','Prefijo de facturas'],['number_format','Formato de numeración']];

export default function CompanyDocumentsSettingsPage() {
  const [settings,setSettings] = useState<Settings>(empty); 
  const [status,setStatus] = useState('Cargando…'); 
  const [error,setError] = useState('');

  useEffect(() => { 
    apiFetch('/company-settings')
      .then(async r => { 
        const d=await r.json(); 
        if(!r.ok) throw new Error(d.error||'No se pudieron cargar los datos.'); 
        setSettings({...empty,...d.settings}); 
        setStatus('Listo para editar'); 
      })
      .catch(e=>{
        setError(e instanceof Error?e.message:'No se pudo cargar');
        setStatus('Error');
      }); 
  }, []);

  const update=(key:keyof Settings,value:string)=>setSettings(s=>({...s,[key]:value}));

  const save=async()=>{
    setStatus('Guardando…');
    setError('');
    try{
      const r=await apiFetch('/company-settings',{method:'PUT',body:JSON.stringify(settings)});
      const d=await r.json();
      if(!r.ok)throw new Error(d.error||'No se pudo guardar.');
      setSettings({...empty,...d.settings});
      setStatus('Guardado correctamente');
    }catch(e){
      setError(e instanceof Error?e.message:'No se pudo guardar');
      setStatus('Error');
    }
  };

  return (
    <div className="w-full h-full max-h-[calc(100vh-4.6rem)] overflow-hidden flex flex-col gap-2.5">
      <header className="shrink-0 pb-1.5 border-b border-surface-container flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-on-surface">Datos de Empresa & Documentos</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary/10 text-secondary">
              Facturación & PDF
            </span>
          </div>
          <p className="text-[11px] text-on-surface-variant">
            Configuración global aplicada a presupuestos, facturas oficiales y correspondencia en Países Bajos.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span role="status" className="text-xs text-on-surface-variant font-medium">{status}</span>
          <button 
            type="button" 
            onClick={save} 
            disabled={status==='Guardando…'||status==='Cargando…'} 
            className="rounded-lg bg-secondary px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            Guardar cambios
          </button>
        </div>
      </header>

      <div className="flex border-b border-surface-container gap-3 shrink-0 text-xs font-semibold">
        <Link href="/crm/ajustes-datos-empresa" className="pb-1.5 border-b-2 border-secondary text-secondary flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[15px]">business</span>
          <span>Datos de Empresa</span>
        </Link>
        <Link href="/crm/integraciones" className="pb-1.5 border-b-2 border-transparent text-outline hover:text-on-surface flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[15px]">hub</span>
          <span>Integraciones (Email & WhatsApp)</span>
        </Link>
        <Link href="/crm/preferencias-avisos" className="pb-1.5 border-b-2 border-transparent text-outline hover:text-on-surface flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[15px]">notifications</span>
          <span>Preferencias de Avisos</span>
        </Link>
      </div>

      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-800 shrink-0">{error}</div>}

      <div className="flex-1 min-h-0 grid gap-3 lg:grid-cols-[minmax(0,1fr)_360px] overflow-hidden">
        {/* Formulario */}
        <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-3.5 shadow-sm flex flex-col h-full min-h-0 overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar grid gap-2.5 sm:grid-cols-2 pr-1">
            {labels.map(([key,label]) => (
              <label key={key} className={`text-xs font-semibold text-on-surface-variant ${key==='description'||key==='footer_text'?'sm:col-span-2':''}`}>
                <span className="block text-[11px] font-semibold text-outline uppercase tracking-wider mb-1">{label}</span>
                {key==='description'||key==='footer_text' ? (
                  <textarea rows={key==='footer_text'?3:2} value={settings[key]} onChange={e=>update(key,e.target.value)} className="w-full rounded-md border border-outline-variant bg-surface px-3 py-1.5 text-xs text-on-surface focus:border-secondary focus:outline-none" />
                ) : key==='default_language' ? (
                  <select value={settings[key]} onChange={e=>update(key,e.target.value)} className="h-8 w-full rounded-md border border-outline-variant bg-surface px-2.5 text-xs focus:border-secondary focus:outline-none">
                    <option value="es">Español</option>
                    <option value="en">English</option>
                    <option value="nl">Nederlands</option>
                  </select>
                ) : (
                  <input value={settings[key]} onChange={e=>update(key,e.target.value)} className="h-8 w-full rounded-md border border-outline-variant bg-surface px-2.5 text-xs text-on-surface focus:border-secondary focus:outline-none" />
                )}
              </label>
            ))}
          </div>
        </section>

        {/* Vista previa */}
        <aside className="rounded-xl border border-outline-variant bg-surface-container-low p-3.5 flex flex-col h-full min-h-0 overflow-y-auto no-scrollbar" aria-label="Vista previa del documento">
          <p className="text-[10px] uppercase font-bold tracking-wider text-secondary shrink-0">Vista previa · Encabezado y Pie</p>
          <article className="mt-2.5 flex-1 min-h-[360px] rounded-lg bg-white p-4 text-slate-800 shadow-sm border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-3">
                {settings.logo_url ? (
                  <img src={settings.logo_url} alt="Logo de empresa" className="h-10 max-w-28 object-contain"/>
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded bg-slate-900 text-xs font-bold text-white">RP</div>
                )}
                <div className="text-right">
                  <h2 className="font-bold text-xs">{settings.commercial_name||'Nombre comercial'}</h2>
                  <p className="text-[10px] text-slate-500">{settings.legal_name||'Razón social'}</p>
                  <p className="mt-0.5 text-[9px] text-slate-500">{settings.address||'Dirección'} · {settings.city||'Ciudad'}, {settings.country}</p>
                </div>
              </div>
              <div className="py-8 text-center text-xs text-slate-400">
                Vista previa del formato en documentos emitidos
              </div>
            </div>
            <footer className="border-t border-slate-200 pt-3 text-[9px] leading-relaxed text-slate-500">
              {settings.footer_text||'Texto legal del pie de documento'}<br/>
              {settings.email||'email'} · {settings.phone||'teléfono'} · KVK {settings.kvk||'—'} · BTW-id {settings.vat_id||'—'} · IBAN {settings.iban||'—'}
            </footer>
          </article>
        </aside>
      </div>
    </div>
  );
}
