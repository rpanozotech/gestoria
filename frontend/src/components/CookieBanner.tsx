'use client';

import { useEffect, useState } from 'react';

const CONSENT_KEY = 'rp_cookie_consent';

type Consent = { necessary: true; analytics: boolean; marketing: boolean };

export default function CookieBanner() {
  const [consent, setConsent] = useState<Consent | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try { setConsent(JSON.parse(window.localStorage.getItem(CONSENT_KEY) || 'null')); } catch { setConsent(null); }
    const openSettings = () => setOpen(true);
    window.addEventListener('rp-open-cookie-settings', openSettings);
    return () => window.removeEventListener('rp-open-cookie-settings', openSettings);
  }, []);

  const save = (value: Consent) => {
    window.localStorage.setItem(CONSENT_KEY, JSON.stringify(value));
    setConsent(value); setOpen(false);
  };
  if (consent && !open) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[200] mx-auto flex max-h-[85dvh] overflow-y-auto w-full flex-col gap-3 border-t border-slate-200 bg-white p-3 shadow-2xl sm:right-4 sm:left-auto sm:bottom-4 sm:max-w-2xl sm:flex-row sm:items-center sm:gap-5 sm:rounded-2xl sm:border sm:p-4" role="dialog" aria-label="Configuración de cookies">
      <div className="sm:flex-1"><h2 className="text-sm font-bold text-slate-900">Cookies y privacidad</h2>
      <p className="mt-1 text-xs leading-relaxed text-slate-600">Usamos solo cookies necesarias para que la web funcione. No activamos analítica ni publicidad sin tu consentimiento.</p></div>
      {open && <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-700"><label className="flex items-center gap-2"><input type="checkbox" checked disabled /> Necesarias (siempre activas)</label><label className="mt-2 flex items-center gap-2"><input id="analytics-consent" type="checkbox" /> Analítica (actualmente no instalada)</label><label className="mt-2 flex items-center gap-2"><input id="marketing-consent" type="checkbox" /> Marketing (actualmente no instalado)</label></div>}
      <div className="mt-3 flex shrink-0 flex-wrap gap-2 sm:mt-0">
        <button type="button" onClick={() => save({ necessary: true, analytics: false, marketing: false })} className="min-h-11 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-800">Rechazar</button>
        <button type="button" onClick={() => setOpen(true)} className="min-h-11 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-800">Configurar</button>
        <button type="button" onClick={() => save({ necessary: true, analytics: true, marketing: true })} className="min-h-11 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white">Aceptar</button>
      </div>
    </div>
  );
}
