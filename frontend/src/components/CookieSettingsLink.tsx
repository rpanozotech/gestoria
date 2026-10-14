'use client';
export default function CookieSettingsLink() { return <button type="button" onClick={() => window.dispatchEvent(new Event('rp-open-cookie-settings'))} className="hover:text-slate-300 underline-offset-2 hover:underline">Configurar cookies</button>; }
