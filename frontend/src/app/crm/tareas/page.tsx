'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';

type Task = { id: string; client: string; title: string; due: string; status: string; priority: string };

export default function TareasPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState('todas');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/dashboard/stats')
      .then(async (response) => {
        if (!response.ok) throw new Error('No se pudo cargar el trabajo de hoy.');
        const data = await response.json();
        setTasks((data.today_appointments || []).map((item: any) => ({
          id: String(item.id),
          client: item.client_name || 'Cliente pendiente',
          title: item.title || 'Cita',
          due: item.appointment_time ? `Hoy · ${String(item.appointment_time).slice(0, 5)}` : 'Sin fecha',
          status: item.status || 'pendiente',
          priority: item.priority || 'normal',
        })));
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'No se pudo cargar el trabajo.'))
      .finally(() => setLoading(false));
  }, []);

  const visible = useMemo(() => tasks.filter((task) => filter === 'todas' || (filter === 'urgentes' && task.priority === 'alta') || (filter === 'pendientes' && task.status !== 'completada')), [filter, tasks]);

  return <div className="space-y-5 pb-10">
    <header className="flex flex-col gap-3 border-b border-surface-container pb-5 lg:flex-row lg:items-end lg:justify-between">
      <div><Link href="/crm" className="text-xs font-semibold text-secondary hover:underline">← Centro de gestión</Link><p className="mt-3 text-[11px] font-semibold tracking-[0.14em] text-secondary">GESTIÓN DIARIA</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-on-surface">Mi trabajo de hoy</h1><p className="mt-1 text-sm text-on-surface-variant">Prioriza citas y seguimientos sin salir de esta vista.</p></div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar trabajo">
        {['todas', 'urgentes', 'pendientes'].map((value) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)} className={`min-h-10 rounded-md border px-3 text-xs font-semibold capitalize ${filter === value ? 'border-secondary bg-secondary text-white' : 'border-outline-variant bg-surface-container-lowest text-on-surface-variant'}`}>{value}</button>)}
      </div>
    </header>
    {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
    <section className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm" aria-label="Trabajo pendiente">
      <div className="grid grid-cols-[1fr_1.3fr_1.4fr_150px_130px] gap-3 border-b border-surface-container bg-surface-container-low px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-on-surface-variant"><span>Prioridad</span><span>Cliente / expediente</span><span>Tarea</span><span>Fecha límite</span><span>Estado</span></div>
      {loading ? <div className="p-10 text-center text-sm text-on-surface-variant">Cargando trabajo real…</div> : visible.length ? <div className="divide-y divide-surface-container">{visible.map((task) => <Link key={task.id} href="/crm/agenda" className="grid grid-cols-1 gap-2 px-4 py-4 transition hover:bg-surface-container-low md:grid-cols-[1fr_1.3fr_1.4fr_150px_130px] md:items-center md:gap-3"><span className={`w-fit rounded border px-2 py-1 text-[10px] font-bold ${task.priority === 'alta' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-blue-200 bg-blue-50 text-blue-700'}`}>{task.priority}</span><span className="font-semibold text-on-surface">{task.client}</span><span className="text-sm text-on-surface-variant">{task.title}</span><span className="text-xs text-on-surface-variant">{task.due}</span><span className="w-fit rounded-full border border-outline-variant px-2 py-1 text-[10px] font-semibold text-on-surface-variant">{task.status}</span></Link>)}</div> : <div className="p-12 text-center"><span className="material-symbols-outlined text-3xl text-secondary">task_alt</span><h2 className="mt-2 font-bold text-on-surface">No hay trabajo pendiente</h2><p className="mt-1 text-sm text-on-surface-variant">Las citas y seguimientos reales aparecerán aquí cuando estén registrados.</p><Link href="/crm/agenda" className="mt-4 inline-flex min-h-10 items-center rounded-md bg-secondary px-4 text-xs font-bold text-white">Abrir agenda</Link></div>}
    </section>
  </div>;
}
