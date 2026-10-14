'use client';
import { useEffect, useState } from 'react';

export default function ContentAdminPage() {
  const [pageKey, setPageKey] = useState('home');
  const [locale, setLocale] = useState('ES');
  const [json, setJson] = useState('{\n  "blocks": [\n    { "type": "hero", "title": "", "text": "", "cta": { "label": "", "href": "/reservar" } }\n  ],\n  "seo_title": "",\n  "seo_description": ""\n}');
  const [message, setMessage] = useState('');
  const [versions, setVersions] = useState<any[]>([]);
  const load = async () => { const r = await fetch('/api/backend/content-admin'); if (r.ok) setVersions((await r.json()).pages || []); };
  useEffect(() => { load().catch(() => undefined); }, []);
  const save = async (status: 'draft' | 'published') => {
    try {
      const value = JSON.parse(json);
      const r = await fetch('/api/backend/content-admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ page_key: pageKey, locale, ...value, status }) });
      const data = await r.json(); setMessage(r.ok ? `Versión ${data.content.version} guardada como ${status}.` : (data.error || 'No se pudo guardar')); await load();
    } catch { setMessage('JSON no válido. Revisa el contenido antes de guardar.'); }
  };
  return <main className="mx-auto max-w-6xl px-6 py-10"><div className="mb-8"><p className="text-sm font-bold uppercase tracking-widest text-[#c96f16]">CMS de RP Asesoría</p><h1 className="mt-2 text-3xl font-extrabold">Contenido público</h1><p className="mt-2 text-slate-600">Guarda borradores y publícalos explícitamente. Los datos privados del CRM no aparecen aquí.</p></div><div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]"><section className="rounded-2xl border bg-white p-5 shadow-sm"><label className="block text-sm font-bold">Página<input value={pageKey} onChange={e=>setPageKey(e.target.value)} className="mt-2 w-full rounded-lg border p-3" /></label><label className="mt-4 block text-sm font-bold">Idioma<select value={locale} onChange={e=>setLocale(e.target.value)} className="mt-2 w-full rounded-lg border p-3"><option>ES</option><option>EN</option><option>NL</option></select></label><textarea value={json} onChange={e=>setJson(e.target.value)} className="mt-4 min-h-[420px] w-full rounded-lg border bg-slate-950 p-4 font-mono text-sm text-white" /><div className="mt-4 flex gap-3"><button onClick={()=>save('draft')} className="rounded-lg border px-4 py-3 font-bold">Guardar borrador</button><button onClick={()=>save('published')} className="rounded-lg bg-[#145da0] px-4 py-3 font-bold text-white">Publicar</button></div>{message && <p className="mt-4 text-sm font-semibold">{message}</p>}</section><section className="rounded-2xl border bg-slate-50 p-5"><h2 className="text-xl font-bold">Versiones registradas</h2><div className="mt-4 space-y-3">{versions.map((v,i)=><div key={i} className="rounded-xl border bg-white p-4 text-sm"><strong>{v.page_key}</strong> · {v.locale} · {v.status} · v{v.version}</div>)}{!versions.length && <p className="text-slate-600">Todavía no hay contenido administrado.</p>}</div></section></div></main>;
}
