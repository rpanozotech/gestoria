'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { apiFetch } from '@/lib/api';

export default function NuevoClientePage() {
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', bsn: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState<{name:string;username:string;password:string}|null>(null);
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError(''); setSaving(true);
    try {
      const response = await apiFetch('/clients', { method: 'POST', body: JSON.stringify(form) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'No se pudo guardar el cliente.');
      setCreated({ name: data.client.full_name, username: data.portal_access.username, password: data.portal_access.password });
      setForm({ full_name: '', email: '', phone: '', bsn: '' });
      window.dispatchEvent(new Event('crm-client-count-updated'));
      window.dispatchEvent(new Event('nexusgest_clients_updated'));
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo guardar el cliente.'); }
    finally { setSaving(false); }
  };

  return <main className="h-full overflow-y-auto space-y-4 p-4 sm:p-6"><header><h1 className="text-xl font-bold text-slate-900">Nuevo cliente</h1><p className="text-sm text-slate-600">La ficha y el acceso del portal se crean en el CRM.</p></header>
    {error&&<p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {created&&<section role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"><h2 className="font-bold text-emerald-900">Cliente creado: {created.name}</h2><p className="mt-1 text-sm text-emerald-900">Acceso inicial al portal (la contraseña solo se muestra ahora):</p><dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2"><div><dt className="text-xs text-slate-600">Usuario</dt><dd className="font-mono">{created.username}</dd></div><div><dt className="text-xs text-slate-600">Contraseña inicial</dt><dd className="font-mono">{created.password}</dd></div></dl><p className="mt-2 text-xs text-slate-600">Entrégala por un canal privado seguro. No se guarda en el navegador.</p><Link href="/crm/clientes" className="mt-3 inline-block text-sm font-bold text-blue-700 underline">Ir al directorio →</Link></section>}
    <form onSubmit={submit} className="max-w-3xl space-y-4 rounded-xl border bg-white p-5 shadow-sm"><div className="grid gap-3 sm:grid-cols-2">{([['full_name','Nombre completo *','text',true],['email','Email','email',false],['phone','Teléfono','tel',false],['bsn','BSN','text',false]] as const).map(([key,label,type,required])=><label key={key} className="text-xs font-semibold text-slate-700"><span className="mb-1 block">{label}</span><input required={required} type={type} value={form[key]} onChange={(e)=>update(key,e.target.value)} maxLength={key==='bsn'?20:255} className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"/></label>)}</div><div className="flex flex-wrap gap-2 border-t pt-4"><button disabled={saving} type="submit" className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{saving?'Guardando…':'Guardar cliente real'}</button><Link href="/crm/clientes/alta-ia" className="rounded-lg border px-4 py-2 text-sm font-semibold">Alta con IA</Link><Link href="/crm/clientes" className="rounded-lg border px-4 py-2 text-sm font-semibold">Cancelar</Link></div></form>
  </main>;
}
