'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';

type Step = { id: string; title: string; due_date?: string; status: string };
type Dossier = { id: string; code: string; title: string; category?: string; status?: string; deadline?: string; progress_percentage?: number; client_name?: string; client_email?: string; client_phone?: string; assigned_to_name?: string };
type Message = { id: string; body: string; author_name?: string; created_at: string };
type DocumentRow = { id: string; file_name: string; category?: string; created_at: string; is_verified?: boolean };
const dateLabel = (v?: string) => v ? new Date(v).toLocaleDateString('es-NL', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Sin fecha';

export default function ExpedienteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [tab, setTab] = useState('Vista general');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    apiFetch('/dossiers/' + id).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo cargar el expediente');
      setDossier(data.dossier); setSteps(data.steps || []); setDocuments(data.documents || []); setMessages(data.messages || []);
    }).catch((reason) => setError(reason instanceof Error ? reason.message : 'No se pudo cargar el expediente')).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-8 text-center text-sm text-on-surface-variant">Cargando expediente…</div>;
  if (!dossier) return <div className="space-y-3"><Link href="/crm/expedientes" className="text-xs font-semibold text-secondary">← Volver a expedientes</Link><div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error || 'Expediente no encontrado'}</div></div>;

  const completed = steps.filter((step) => step.status === 'completed').length;
  return (
    <div className="w-full h-full max-h-[calc(100vh-4.6rem)] overflow-hidden flex flex-col gap-2.5">
      <div className="flex items-center justify-between shrink-0">
        <Link href="/crm/expedientes" className="text-xs font-semibold text-secondary hover:underline flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">arrow_back</span>
          <span>Volver a expedientes</span>
        </Link>
      </div>
      <header className="rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-2.5 shadow-xs shrink-0">
        <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-primary">{(dossier.client_name || 'LC').slice(0, 2).toUpperCase()}</div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h1 className="text-lg font-bold">{dossier.client_name || 'Cliente'}</h1><span className="rounded-md border border-orange-200 bg-orange-50 px-2 py-0.5 text-[10px] font-bold text-orange-700">{dossier.status || 'En curso'}</span></div><p className="text-[11px] text-on-surface-variant">{dossier.code} · {dossier.category || 'Trámite'} · Cliente particular</p></div><Link href="/crm/clientes/demo-client-1" className="rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-[11px] font-bold text-secondary">Ver ficha completa ↗</Link><button type="button" onClick={() => setError('Acciones rápidas disponibles en staging.')} className="rounded-md border border-outline-variant px-2.5 py-1.5 text-[11px] font-bold">⋯</button></div>
        <div className="mt-2.5 rounded-md border border-surface-container bg-surface-container-low px-3 py-2"><div className="grid grid-cols-5 gap-2">{['1. Documentación', '2. Presentación', '3. Revisión', '4. Resolución', '5. Cierre'].map((label, index) => <div key={label} className="relative"><div className={'mb-1 h-2 w-2 rounded-full ' + (index < completed ? 'bg-emerald-500' : index === completed ? 'bg-secondary ring-4 ring-blue-100' : 'bg-slate-300')} /><p className={'text-[10px] font-bold ' + (index <= completed ? 'text-secondary' : 'text-on-surface-variant')}>{label}</p><p className="text-[10px] text-on-surface-variant">{index < completed ? 'Completado' : index === completed ? 'En curso' : 'Pendiente'}</p></div>)}</div><div className="mt-1.5 h-1.5 rounded-full bg-slate-200"><div className="h-full rounded-full bg-secondary" style={{ width: (dossier.progress_percentage || 68) + '%' }} /></div></div>
      </header>
      <nav className="flex gap-1 overflow-x-auto border-b border-surface-container shrink-0">{['Vista general', 'Documentos', 'Comunicaciones', 'Notas', 'Historial', 'Facturación'].map((item) => <button key={item} type="button" onClick={() => setTab(item)} className={'whitespace-nowrap border-b-2 px-3 py-1.5 text-[11px] font-semibold ' + (tab === item ? 'border-secondary text-secondary' : 'border-transparent text-on-surface-variant')}>{item}</button>)}</nav>
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar pr-1">
    {tab === 'Vista general' && <div className="grid gap-3 xl:grid-cols-[1.1fr_1fr_300px]">
      <div className="space-y-3"><section className="rounded-lg border border-outline-variant bg-surface-container-lowest p-3 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="text-sm font-bold">Documentos requeridos</h2><p className="text-[11px] text-on-surface-variant">{completed} de {steps.length} completados</p></div><span className="text-[11px] font-bold text-secondary">Ver todos →</span></div><div className="mt-2 divide-y divide-surface-container">{steps.map((step) => <label key={step.id} className="flex items-center gap-2 py-2"><input type="checkbox" checked={step.status === 'completed'} onChange={() => undefined} /><span className={'text-xs ' + (step.status === 'completed' ? 'text-on-surface-variant line-through' : 'font-semibold')}>{step.title}</span><span className="ml-auto text-[10px] text-on-surface-variant">{dateLabel(step.due_date)}</span></label>)}</div></section><section className="rounded-lg border border-outline-variant bg-surface-container-lowest p-3 shadow-sm"><h2 className="text-sm font-bold">Notas internas</h2><p className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs">Pendiente de recibir extractos bancarios. Recordar revisar el M-form antes de la presentación.</p><button type="button" onClick={() => setTab('Notas')} className="mt-2 text-[11px] font-bold text-secondary">+ Añadir nota</button></section></div>
      <section className="rounded-lg border border-outline-variant bg-surface-container-lowest p-3 shadow-sm"><div className="flex items-center justify-between"><h2 className="text-sm font-bold">Últimas comunicaciones</h2><Link href="/crm/chat-ia" className="text-[11px] font-bold text-secondary">Ver todas →</Link></div><div className="mt-2 divide-y divide-surface-container">{(messages.length ? messages : [{ id: 'demo', body: 'Perfecto, muchas gracias por la explicación. Adjunto el comprobante.', author_name: dossier.client_name, created_at: '2026-11-18' }, { id: 'demo2', body: 'Te confirmo que hemos recibido la documentación.', author_name: 'Usuario de prueba', created_at: '2026-11-17' }]).map((message) => <article key={message.id} className="py-2"><div className="flex items-start gap-2"><div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-primary">{(message.author_name || 'RP').slice(0, 2).toUpperCase()}</div><div><p className="text-xs font-semibold">{message.author_name}</p><p className="text-xs text-on-surface-variant">{message.body}</p><p className="mt-1 text-[10px] text-on-surface-variant">{dateLabel(message.created_at)}</p></div></div></article>)}</div></section>
      <aside className="space-y-3"><section className="rounded-lg border border-outline-variant bg-surface-container-lowest p-3 shadow-sm"><h2 className="text-sm font-bold">Próxima cita</h2><p className="mt-2 text-sm font-bold">Jue, 20 nov 2026</p><p className="text-xs text-on-surface-variant">10:00 – 10:30 · Videollamada</p><p className="mt-2 text-xs text-on-surface-variant">Revisar documentos pendientes y resolver dudas sobre deducciones.</p><button type="button" onClick={() => setError('Videollamada disponible en staging.')} className="mt-2 w-full rounded-md bg-secondary px-3 py-2 text-[11px] font-bold text-white">Iniciar videollamada</button></section><section className="rounded-lg border border-outline-variant bg-surface-container-lowest p-3 shadow-sm"><h2 className="text-sm font-bold">Gestor asignado</h2><p className="mt-2 text-xs font-bold">{dossier.assigned_to_name || 'Usuario de prueba'}</p><p className="text-[11px] text-on-surface-variant">Especialista fiscal · Equipo gestor</p><button type="button" onClick={() => setError('Cambio de gestor disponible en staging.')} className="mt-2 w-full rounded-md border border-outline-variant px-3 py-2 text-[11px] font-bold">Cambiar gestor</button></section><section className="rounded-lg border border-orange-200 bg-orange-50 p-3"><h2 className="text-sm font-bold text-orange-900">Estado y próximos pasos</h2><p className="mt-2 text-xs text-orange-900">Esperando documentación del cliente.</p><button type="button" onClick={() => setError('Recordatorio enviado en modo demo.')} className="mt-2 w-full rounded-md bg-orange-500 px-3 py-2 text-[11px] font-bold text-white">Recordar al cliente</button></section></aside>
    </div>}
    {tab === 'Documentos' && <section className="rounded-lg border border-outline-variant bg-surface-container-lowest p-3"><h2 className="text-sm font-bold">Documentos del expediente</h2><div className="mt-2 divide-y divide-surface-container">{documents.map((doc) => <div key={doc.id} className="flex justify-between py-2 text-xs"><span>{doc.file_name} · {doc.category}</span><span className="text-emerald-700">{doc.is_verified ? 'Verificado' : 'Recibido'}</span></div>)}</div></section>}
    {tab !== 'Vista general' && tab !== 'Documentos' && <section className="rounded-lg border border-outline-variant bg-surface-container-lowest p-5 text-sm text-on-surface-variant">Contenido de {tab} disponible en el flujo del expediente.</section>}
      </div>
    </div>
  );
}
