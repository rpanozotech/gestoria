'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';

type DossierPayload = { dossier: Record<string, any>; steps: any[]; activity: any[]; documents: any[]; messages: any[]; notes: any[]; appointments: any[] };

export default function ExpedienteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<DossierPayload | null>(null);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const response = await apiFetch('/dossiers/' + encodeURIComponent(id));
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'No se pudo cargar el expediente.');
    setData(payload);
  };
  useEffect(() => { let active = true; apiFetch('/dossiers/' + encodeURIComponent(id)).then(async (r) => { const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || 'No se pudo cargar el expediente.'); if (active) setData(d); }).catch((e) => { if (active) setError(e instanceof Error ? e.message : 'Error al cargar el expediente.'); }); return () => { active = false; }; }, [id]);

  const toggleStep = async (step: any) => {
    if (!data) return;
    const status = step.status === 'completed' ? 'pending' : 'completed';
    try { const response = await apiFetch('/dossiers/' + encodeURIComponent(id) + '/steps/' + encodeURIComponent(step.id), { method: 'PATCH', body: JSON.stringify({ status }) }); const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(payload.error || 'No se pudo guardar el paso.'); setData({ ...data, steps: data.steps.map((item) => item.id === step.id ? payload.step : item) }); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo guardar el paso.'); }
  };
  const addNote = async (event: FormEvent) => {
    event.preventDefault(); if (!note.trim()) return; setSaving(true);
    try { const response = await apiFetch('/dossiers/' + encodeURIComponent(id) + '/notes', { method: 'POST', body: JSON.stringify({ body: note, private: true }) }); const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(payload.error || 'No se pudo guardar la nota.'); await load(); setNote(''); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo guardar la nota.'); } finally { setSaving(false); }
  };

  if (error && !data) return <main className="space-y-4 p-6"><p role="alert" className="text-red-700">{error}</p><Link className="text-blue-700 underline" href="/crm/expedientes">Volver a expedientes</Link></main>;
  if (!data) return <main className="p-6" role="status">Cargando expediente…</main>;
  const dossier = data.dossier;
  const completed = data.steps.filter((step) => step.status === 'completed').length;

  return <main className="h-full overflow-y-auto space-y-4 p-4 sm:p-6"><header><Link href="/crm/expedientes" className="text-sm text-blue-700 underline">← Expedientes</Link><h1 className="mt-2 text-2xl font-bold text-slate-900">{dossier.title}</h1><p className="text-sm text-slate-600">{dossier.code} · {dossier.client_name} · {dossier.status}</p></header>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[['Categoría',dossier.category],['Prioridad',dossier.priority],['Plazo',dossier.deadline ? new Date(dossier.deadline).toLocaleDateString('es-ES') : 'Sin plazo'],['Progreso',String(dossier.progress_percentage ?? 0)+'%']].map(([label,value])=><article key={label} className="rounded-xl border bg-white p-4"><span className="text-xs text-slate-500">{label}</span><strong className="mt-1 block text-base">{value || 'Sin dato'}</strong></article>)}</section>
    <section className="rounded-xl border bg-white p-4"><h2 className="mb-3 text-lg font-bold">Pasos registrados ({completed}/{data.steps.length})</h2>{data.steps.length===0?<p className="text-sm text-slate-500">No hay pasos definidos.</p>:<ul className="divide-y">{data.steps.map((step)=><li key={step.id} className="flex items-center gap-3 py-3"><input type="checkbox" checked={step.status==='completed'} onChange={()=>void toggleStep(step)} aria-label={'Marcar '+step.title} /><span className={step.status==='completed'?'line-through text-slate-500':'font-medium'}>{step.title}</span><span className="ml-auto text-xs text-slate-500">{step.due_date ? new Date(step.due_date).toLocaleDateString('es-ES') : ''}</span></li>)}</ul>}</section>
    <section className="rounded-xl border bg-white p-4"><h2 className="mb-3 text-lg font-bold">Notas privadas</h2><form onSubmit={addNote} className="mb-4 flex flex-col gap-2 sm:flex-row"><textarea value={note} onChange={(event)=>setNote(event.target.value)} maxLength={4000} required rows={2} className="flex-1 rounded-lg border p-3 text-sm" placeholder="Añadir nota interna…"/><button disabled={saving} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{saving?'Guardando…':'Guardar nota'}</button></form>{data.notes.length===0?<p className="text-sm text-slate-500">No hay notas.</p>:<ul className="space-y-2">{data.notes.map((item)=><li key={item.id} className="rounded-lg bg-slate-50 p-3"><p className="whitespace-pre-wrap text-sm">{item.body}</p><p className="mt-1 text-xs text-slate-500">{item.author_name || 'Equipo'} · {new Date(item.created_at).toLocaleString('es-ES')}</p></li>)}</ul>}</section>
    {[['Documentos',data.documents],['Mensajes',data.messages],['Actividad',data.activity],['Citas',data.appointments]].map(([title,rows]:any)=><section key={title} className="rounded-xl border bg-white p-4"><h2 className="mb-3 text-lg font-bold">{title}</h2>{rows.length? <ul className="divide-y">{rows.map((row:any,index:number)=><li key={row.id||index} className="py-2 text-sm"><strong>{row.file_name||row.title||row.action||row.body||'Registro'}</strong><span className="ml-2 text-slate-500">{row.status||row.created_at||row.appointment_date||''}</span></li>)}</ul>:<p className="text-sm text-slate-500">No hay registros.</p>}</section>)}
  </main>;
}
