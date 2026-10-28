'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import ConfigurationNav from '@/components/crm/ConfigurationNav';

const defaults = {
  logo_url: '', commercial_name: 'RP Asesoría', legal_name: '', description: '', address: '', city: '', country: 'Países Bajos',
  kvk: '', vat_id: '', iban: '', email: '', phone: '', footer_text: '', default_language: 'es', quote_prefix: 'PRE', invoice_prefix: 'FAC',
  number_format: '{prefix}-{year}-{number}', currency: 'EUR', date_format: 'dd/MM/yyyy', default_invoice_status: 'pendiente',
  default_quote_status: 'borrador', pdf_template: 'rp-estandar',
};
type Settings = typeof defaults;

export default function SystemPreferencesPage() {
  const [settings, setSettings] = useState<Settings>(defaults);
  const [status, setStatus] = useState('Cargando…');
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/company-settings').then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudieron cargar las preferencias.');
      setSettings({ ...defaults, ...data.settings });
      setStatus('Listo para editar');
    }).catch((reason) => {
      setError(reason instanceof Error ? reason.message : 'No se pudieron cargar las preferencias.');
      setStatus('Error');
    });
  }, []);

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => setSettings((current) => ({ ...current, [key]: value }));

  const save = async () => {
    setStatus('Guardando…'); setError('');
    try {
      const response = await apiFetch('/company-settings', { method: 'PUT', body: JSON.stringify(settings) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudieron guardar las preferencias.');
      setSettings({ ...defaults, ...data.settings });
      setStatus('Guardado correctamente');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudieron guardar las preferencias.');
      setStatus('Error');
    }
  };

  const input = 'mt-1 h-9 w-full rounded-lg border border-outline-variant bg-surface px-2.5 text-[13px] text-on-surface focus:border-secondary focus:outline-none';
  const label = 'text-[11px] font-semibold uppercase tracking-wide text-outline';
  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-2 overflow-hidden">
      <header className="flex shrink-0 items-center justify-between border-b border-surface-container pb-2">
        <div><div className="flex items-center gap-2"><h1 className="text-xl font-bold tracking-tight text-on-surface">Configuración · Preferencias del sistema</h1><span className="rounded-full bg-secondary/10 px-2 py-0.5 text-[10px] font-bold text-secondary">Valores globales</span></div><p className="text-xs text-on-surface-variant">Define el formato que usarán las facturas, presupuestos y documentos del CRM.</p></div>
        <div className="flex items-center gap-2"><span role="status" className="text-xs font-medium text-on-surface-variant">{status}</span><button type="button" onClick={save} disabled={status === 'Guardando…' || status === 'Cargando…'} className="h-8 rounded-lg bg-secondary px-3.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50">Guardar cambios</button></div>
      </header>
      <ConfigurationNav />
      {error && <div role="alert" className="shrink-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{error}</div>}
      <div className="grid min-h-0 flex-1 gap-3 overflow-hidden lg:grid-cols-[minmax(0,1fr)_minmax(0,0.82fr)]">
        <section className="min-h-0 overflow-y-auto rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2 border-b border-surface-container pb-2"><span className="material-symbols-outlined text-[20px] text-secondary">format_list_numbered</span><div><h2 className="text-sm font-bold text-on-surface">Formato y numeración</h2><p className="text-xs text-on-surface-variant">Se aplica al crear nuevos documentos.</p></div></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={label}>Idioma predeterminado<select value={settings.default_language} onChange={(e) => update('default_language', e.target.value)} className={input}><option value="es">Español</option><option value="en">English</option><option value="nl">Nederlands</option></select></label>
            <label className={label}>Moneda<select value={settings.currency} onChange={(e) => update('currency', e.target.value)} className={input}><option value="EUR">Euro (€)</option><option value="USD">Dólar ($)</option></select></label>
            <label className={label}>Formato de fecha<select value={settings.date_format} onChange={(e) => update('date_format', e.target.value)} className={input}><option value="dd/MM/yyyy">31/12/2026</option><option value="MM/dd/yyyy">12/31/2026</option><option value="yyyy-MM-dd">2026-12-31</option></select></label>
            <label className={label}>Plantilla PDF<select value={settings.pdf_template} onChange={(e) => update('pdf_template', e.target.value)} className={input}><option value="rp-estandar">RP Asesoría · Estándar</option><option value="rp-compacta">RP Asesoría · Compacta</option></select></label>
            <label className={label}>Prefijo de presupuestos<input value={settings.quote_prefix} onChange={(e) => update('quote_prefix', e.target.value)} className={input} maxLength={12} /></label>
            <label className={label}>Prefijo de facturas<input value={settings.invoice_prefix} onChange={(e) => update('invoice_prefix', e.target.value)} className={input} maxLength={12} /></label>
            <label className={`${label} sm:col-span-2`}>Formato de numeración<input value={settings.number_format} onChange={(e) => update('number_format', e.target.value)} className={input} /><span className="mt-1 block normal-case tracking-normal text-[11px] font-normal text-on-surface-variant">Usa {`{prefix}`}, {`{year}`} y {`{number}`}. Ejemplo: FAC-2026-001.</span></label>
          </div>
        </section>
        <aside className="grid min-h-0 gap-3 overflow-hidden lg:grid-rows-[auto_minmax(0,1fr)]">
          <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm"><div className="mb-3 flex items-center gap-2 border-b border-surface-container pb-2"><span className="material-symbols-outlined text-[20px] text-secondary">rule</span><div><h2 className="text-sm font-bold text-on-surface">Valores por defecto</h2><p className="text-xs text-on-surface-variant">Punto de partida para nuevas operaciones.</p></div></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1"><label className={label}>Estado inicial de facturas<select value={settings.default_invoice_status} onChange={(e) => update('default_invoice_status', e.target.value)} className={input}><option value="pendiente">Pendiente de cobro</option><option value="pagada">Pagada</option></select></label><label className={label}>Estado inicial de presupuestos<select value={settings.default_quote_status} onChange={(e) => update('default_quote_status', e.target.value)} className={input}><option value="borrador">Borrador</option><option value="enviado">Enviado</option><option value="aprobado">Aprobado</option></select></label></div></section>
          <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm"><div className="flex items-center gap-2 border-b border-surface-container pb-2"><span className="material-symbols-outlined text-[20px] text-secondary">info</span><h2 className="text-sm font-bold text-on-surface">Criterios activos</h2></div><div className="mt-3 space-y-2 text-xs text-on-surface-variant"><div className="rounded-lg bg-secondary/10 p-3"><strong className="text-on-surface">Cliente y asesor:</strong> se eligen desde la operación para mantener trazabilidad y evitar asignaciones incorrectas.</div><div className="rounded-lg border border-surface-container p-3"><strong className="text-on-surface">PDF:</strong> los documentos nuevos heredarán este idioma, moneda, formato de fecha y plantilla.</div><div className="rounded-lg border border-surface-container p-3"><strong className="text-on-surface">Seguridad:</strong> los cambios quedan guardados en la configuración global del despacho.</div></div></section>
        </aside>
      </div>
    </div>
  );
}
