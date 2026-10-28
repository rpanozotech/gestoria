'use client';

import { useEffect, useState } from 'react';
import ConfigurationNav from '@/components/crm/ConfigurationNav';

export default function ContentAdminPage() {
  const [pageKey, setPageKey] = useState('home');
  const [locale, setLocale] = useState('ES');
  const [json, setJson] = useState('{\n  "blocks": [\n    { "type": "hero", "title": "Asesoría fiscal y legal en Países Bajos", "text": "Expertos en trámites en Holanda", "cta": { "label": "Reservar cita", "href": "/reservar" } }\n  ],\n  "seo_title": "RP Asesoría | Gestoría Fiscal en Países Bajos",\n  "seo_description": "Servicios de gestoría, impuestos y asesoría para autónomos y particulares."\n}');
  const [message, setMessage] = useState('');
  const [versions, setVersions] = useState<any[]>([]);

  const load = async () => {
    const r = await fetch('/api/backend/content-admin');
    if (r.ok) setVersions((await r.json()).pages || []);
  };

  useEffect(() => {
    load().catch(() => undefined);
  }, []);

  const save = async (status: 'draft' | 'published') => {
    try {
      const value = JSON.parse(json);
      const r = await fetch('/api/backend/content-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page_key: pageKey, locale, ...value, status }),
      });
      const data = await r.json();
      setMessage(
        r.ok
          ? `Versión ${data.content?.version || 1} guardada como ${status}.`
          : (data.error || 'No se pudo guardar')
      );
      await load();
    } catch {
      setMessage('JSON no válido. Revisa el contenido antes de guardar.');
    }
  };

  return (
    <div className="w-full h-full min-h-0 overflow-hidden flex flex-col gap-2">
      {/* Header */}
      <header className="shrink-0 pb-1.5 border-b border-surface-container flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-on-surface">CMS & Contenido Web Público</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#c96f16]/10 text-[#c96f16]">
              Sitio Web Público
            </span>
          </div>
          <p className="text-[11px] text-on-surface-variant">
            Edita bloques y textos de la web pública. Guarda borradores o publica cambios en producción en tiempo real.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {message && (
            <span role="status" className="text-xs font-semibold text-secondary">
              {message}
            </span>
          )}
          <button
            type="button"
            onClick={() => save('draft')}
            className="h-8 rounded-lg border border-outline-variant bg-surface px-3 text-xs font-semibold text-on-surface hover:bg-surface-container transition-colors"
          >
            Guardar Borrador
          </button>
          <button
            type="button"
            onClick={() => save('published')}
            className="h-8 rounded-lg bg-secondary px-3.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
          >
            Publicar en Web
          </button>
        </div>
      </header>

      <ConfigurationNav />

      {/* Grid a Pantalla Completa: Editor (8 cols) + Versiones (4 cols) */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3 overflow-hidden">
        {/* Editor Principal */}
        <section className="lg:col-span-8 bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-xs flex flex-col min-h-0 overflow-hidden">
          <div className="grid grid-cols-2 gap-3 shrink-0 pb-3 border-b border-surface-container">
            <label className="text-xs font-semibold text-on-surface">
              <span className="block text-[11px] font-semibold text-outline uppercase tracking-wider mb-1">
                Página
              </span>
              <input
                value={pageKey}
                onChange={(e) => setPageKey(e.target.value)}
                className="h-8 w-full rounded-md border border-outline-variant bg-surface px-2.5 text-xs focus:border-secondary focus:outline-none"
                placeholder="home, servicios, sobre-nosotros..."
              />
            </label>

            <label className="text-xs font-semibold text-on-surface">
              <span className="block text-[11px] font-semibold text-outline uppercase tracking-wider mb-1">
                Idioma
              </span>
              <select
                value={locale}
                onChange={(e) => setLocale(e.target.value)}
                className="h-8 w-full rounded-md border border-outline-variant bg-surface px-2.5 text-xs focus:border-secondary focus:outline-none"
              >
                <option value="ES">Español (ES)</option>
                <option value="EN">English (EN)</option>
                <option value="NL">Nederlands (NL)</option>
              </select>
            </label>
          </div>

          <div className="flex-1 min-h-0 flex flex-col pt-3">
            <span className="block text-[11px] font-semibold text-outline uppercase tracking-wider mb-1 shrink-0">
              Contenido Estructurado (JSON)
            </span>
            <textarea
              value={json}
              onChange={(e) => setJson(e.target.value)}
              className="flex-1 min-h-0 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 font-mono text-xs text-emerald-400 focus:outline-none focus:ring-1 focus:ring-secondary resize-none"
            />
          </div>
        </section>

        {/* Panel de Versiones y Auditoría */}
        <aside className="lg:col-span-4 bg-surface-container-low border border-outline-variant rounded-xl p-4 shadow-xs flex flex-col min-h-0 overflow-hidden">
          <div className="pb-2 border-b border-surface-container shrink-0 flex items-center justify-between">
            <h2 className="text-sm font-bold text-on-surface flex items-center gap-1.5">
              <span className="material-symbols-outlined text-secondary text-[16px]">history</span>
              <span>Versiones Registradas</span>
            </h2>
            <span className="text-[11px] text-outline font-mono-data">
              {versions.length} versiones
            </span>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-2 pt-2.5 pr-1">
            {versions.map((v, i) => (
              <div
                key={i}
                className="rounded-lg border border-surface-container bg-white p-3 text-xs space-y-1 shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <strong className="text-on-surface font-mono-data">{v.page_key}</strong>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      v.status === 'published'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}
                  >
                    {v.status}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-on-surface-variant">
                  <span>Idioma: {v.locale}</span>
                  <span className="font-mono-data">v{v.version}</span>
                </div>
              </div>
            ))}

            {!versions.length && (
              <div className="p-8 text-center text-xs text-outline">
                Todavía no hay versiones registradas.
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
