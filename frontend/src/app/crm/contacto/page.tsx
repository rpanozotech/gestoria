'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

type ContactMessage = { id: string; full_name: string; email: string; phone: string; topic: string; message: string; status: string; created_at: string };

export default function ContactInboxPage() {
  const [items, setItems] = useState<ContactMessage[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    apiFetch('/contact')
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'No se pudieron cargar las consultas.');
        if (active) setItems(Array.isArray(data.messages) ? data.messages : []);
      })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : 'Error al cargar las consultas.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return <main className="h-full overflow-y-auto p-4 sm:p-6"><header className="mb-5"><h1 className="text-xl font-bold text-slate-900">Consultas de la web</h1><p className="mt-1 text-sm text-slate-600">Mensajes guardados por el formulario público de contacto.</p></header>
    {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {loading ? <p role="status" className="text-sm text-slate-500">Cargando…</p> : items.length === 0 ? <p className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">No hay consultas recibidas.</p> : <ul className="space-y-3">{items.map((item) => <li key={item.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-bold text-slate-900">{item.full_name}</h2><p className="text-sm text-slate-600">{item.topic} · {new Date(item.created_at).toLocaleString('es-ES')}</p></div><span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">{item.status}</span></div><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm"><a className="text-blue-700 underline" href={'mailto:' + encodeURIComponent(item.email)}>{item.email}</a><a className="text-blue-700 underline" href={'tel:' + encodeURIComponent(item.phone)}>{item.phone}</a></div><p className="mt-3 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-800">{item.message}</p></li>)}</ul>}
  </main>;
}
