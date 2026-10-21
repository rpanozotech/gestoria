'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';

type Task = {
  id: string;
  client_name?: string;
  dossier_code?: string;
  title: string;
  detail_title?: string;
  description?: string;
  due_date?: string;
  status: string;
  priority: string;
  assigned_to_name?: string;
  docs_count?: number;
};

const DEFAULT_TASKS: Task[] = [
  {
    id: 'demo-task-1',
    client_name: 'Laura C.',
    dossier_code: 'EXP-2026-0034',
    title: 'Revisar documentación de residencia',
    description: 'Validar certificados y enviar confirmación.',
    due_date: '2026-10-20',
    status: 'documentacion',
    priority: 'alta',
    assigned_to_name: 'RP',
    docs_count: 3,
  },
  {
    id: 'demo-task-2',
    client_name: 'Javier M.',
    dossier_code: 'EXP-2026-0031',
    title: 'Presentación a la KvK',
    description: 'Preparar y enviar expediente.',
    due_date: '2026-10-20',
    status: 'pendiente',
    priority: 'normal',
    assigned_to_name: 'AR',
  },
  {
    id: 'demo-task-3',
    client_name: 'Pablo D.',
    dossier_code: 'EXP-2026-0026',
    title: 'Consulta sobre subsidio',
    description: 'Responder dudas del cliente.',
    due_date: '2026-10-20',
    status: 'mensaje',
    priority: 'normal',
    assigned_to_name: 'MS',
  },
  {
    id: 'demo-task-4',
    client_name: 'Marta S.',
    dossier_code: 'EXP-2026-0021',
    title: 'Solicitud de documento adicional',
    description: 'Pedir extracto bancario pendiente.',
    due_date: '2026-10-21',
    status: 'en_espera_cliente',
    priority: 'normal',
    assigned_to_name: 'LC',
  },
  {
    id: 'demo-task-5',
    client_name: 'Ana R.',
    dossier_code: 'EXP-2026-0028',
    title: 'Esperar documentación',
    description: 'El cliente debe subir su copia de ID.',
    due_date: '2026-10-22',
    status: 'en_espera_cliente',
    priority: 'normal',
    assigned_to_name: 'RP',
  },
  {
    id: 'demo-task-6',
    client_name: 'Carlos R.',
    dossier_code: 'EXP-2026-0030',
    title: 'Revisión de declaración 2024',
    description: 'Comprobar cálculos y enviar borrador.',
    due_date: '2026-10-23',
    status: 'revision',
    priority: 'normal',
    assigned_to_name: 'AR',
  },
  {
    id: 'demo-task-7',
    client_name: 'Elena L.',
    dossier_code: 'EXP-2026-0025',
    title: 'Cita presencial en oficina',
    description: 'Confirmar horario y preparar dossier.',
    due_date: '2026-10-23',
    status: 'cita',
    priority: 'normal',
    assigned_to_name: 'RP',
  },
  {
    id: 'demo-task-8',
    client_name: 'Daniel S.',
    dossier_code: 'EXP-2026-0029',
    title: 'Alta como autónomo (ZZP)',
    description: 'Revisar formulario y anexos.',
    due_date: '2026-10-24',
    status: 'documentacion',
    priority: 'normal',
    assigned_to_name: 'MS',
  },
  {
    id: 'demo-task-9',
    client_name: 'María V.',
    dossier_code: 'EXP-2026-0024',
    title: 'Seguimiento post-presentación',
    description: 'Comprobar estado con la Belastingdienst.',
    due_date: '2026-10-24',
    status: 'seguimiento',
    priority: 'normal',
    assigned_to_name: 'LC',
  },
  {
    id: 'demo-task-10',
    client_name: 'Tomás P.',
    dossier_code: 'EXP-2026-0027',
    title: 'Renovación de permiso',
    description: 'Validar fechas de validez.',
    due_date: '2026-10-27',
    status: 'revision',
    priority: 'normal',
    assigned_to_name: 'AR',
  },
  {
    id: 'demo-task-11',
    client_name: 'Noa L.',
    dossier_code: 'EXP-2026-0032',
    title: 'Consulta general',
    description: 'Llamar al cliente para aclarar dudas.',
    due_date: '2026-10-27',
    status: 'mensaje',
    priority: 'normal',
    assigned_to_name: 'RP',
  },
  {
    id: 'demo-task-12',
    client_name: 'Sofía B.',
    dossier_code: 'EXP-2026-0033',
    title: 'Revisión final y cierre',
    description: 'Enviar resumen y cerrar expediente.',
    due_date: '2026-10-28',
    status: 'seguimiento',
    priority: 'normal',
    assigned_to_name: 'MS',
  },
];

const stateLabel: Record<string, string> = {
  documentacion: 'Documentación',
  pendiente: 'En tramitación',
  en_espera_cliente: 'En espera cliente',
  revision: 'Revisión',
  seguimiento: 'Seguimiento',
  mensaje: 'Mensaje',
  cita: 'Cita',
  completada: 'Cierre',
};

const stateClass: Record<string, string> = {
  documentacion: 'border-blue-200 bg-blue-50 text-blue-700',
  pendiente: 'border-blue-200 bg-blue-50 text-blue-700',
  en_espera_cliente: 'border-orange-200 bg-orange-50 text-orange-700',
  revision: 'border-purple-200 bg-purple-50 text-purple-700',
  seguimiento: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  mensaje: 'border-slate-200 bg-slate-100 text-slate-700',
  cita: 'border-purple-200 bg-purple-50 text-purple-700',
};

const initials = (name?: string) => (name || 'RP').split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();

const shortDate = (date?: string) => {
  if (date === '2026-10-20') return 'Hoy';
  if (date === '2026-10-21') return 'Mañana';
  if (!date) return '—';
  return new Date(date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }).replace('.', '');
};

export default function TareasPage() {
  const [tasks, setTasks] = useState<Task[]>(DEFAULT_TASKS);
  const [selected, setSelected] = useState<Task | null>(DEFAULT_TASKS[0]);
  const [selectedIds, setSelectedIds] = useState<string[]>(['demo-task-1', 'demo-task-4']);
  const [filter, setFilter] = useState('todas');
  const [notice, setNotice] = useState('');
  const [detailTab, setDetailTab] = useState<'Resumen' | 'Documentos 3' | 'Notas 2' | 'Historial'>('Resumen');
  const [selectedDate, setSelectedDate] = useState('2026-10-20');
  const [sortAscending, setSortAscending] = useState(true);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState('todos');
  const [assigneeFilter, setAssigneeFilter] = useState('todos');

  useEffect(() => {
    apiFetch('/tasks')
      .then(async (res) => {
        const rows = (await res.json()).tasks || [];
        if (rows.length) {
          setTasks(rows);
          setSelected(rows[0]);
        }
      })
      .catch(() => {});
  }, []);

  const counts = {
    todas: tasks.length,
    hoy: tasks.filter((t) => t.due_date === selectedDate).length,
    urgentes: tasks.filter((t) => t.priority === 'alta').length,
    espera: tasks.filter((t) => t.status === 'en_espera_cliente').length,
    completadas: tasks.filter((t) => t.status === 'completada').length,
  };

  const visible = useMemo(
    () => tasks
      .filter((t) =>
        filter === 'todas' ||
        (filter === 'hoy' && t.due_date === selectedDate) ||
        (filter === 'urgentes' && t.priority === 'alta') ||
        (filter === 'espera' && t.status === 'en_espera_cliente') ||
        (filter === 'completadas' && t.status === 'completada')
      )
      .filter((t) => statusFilter === 'todos' || t.status === statusFilter)
      .filter((t) => assigneeFilter === 'todos' || t.assigned_to_name === assigneeFilter)
      .sort((a, b) => {
        const comparison = (a.due_date || '').localeCompare(b.due_date || '');
        return sortAscending ? comparison : -comparison;
      }),
    [tasks, filter, selectedDate, statusFilter, assigneeFilter, sortAscending]
  );

  const shiftDate = (days: number) => {
    const next = new Date(`${selectedDate}T12:00:00`);
    next.setDate(next.getDate() + days);
    setSelectedDate(next.toISOString().slice(0, 10));
  };

  const formattedSelectedDate = new Date(`${selectedDate}T12:00:00`).toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const updateSelectedTask = (status: string, message: string) => {
    if (!selected) return;
    setTasks((current) => current.map((task) => task.id === selected.id ? { ...task, status } : task));
    setSelected((current) => current ? { ...current, status } : current);
    setNotice(message);
  };

  const toggle = (id: string) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));

  return (
    <div className="crm-tasks-container w-full flex h-full max-h-[calc(100vh-4.6rem)] overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-800 shadow-2xs">
      {/* Columna Principal de Tareas */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Header Superior: Titulo + Fecha */}
        <div className="px-4 py-2.5 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0 bg-white">
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">Mi trabajo de hoy</h1>
            <p className="text-[11px] text-slate-500">
              <strong className="text-slate-700">{tasks.length} tareas pendientes</strong> · Organiza, avanza y mantén tus clientes al día.
            </p>
          </div>

          <div className="flex items-center gap-1 text-xs">
            <button type="button" aria-label="Día anterior" onClick={() => shiftDate(-1)} className="h-7 w-7 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50">‹</button>
            <div className="h-7 px-2.5 rounded border border-slate-200 bg-white text-slate-700 font-semibold flex items-center gap-1.5 text-xs shadow-2xs">
              <span className="material-symbols-outlined text-[15px] text-slate-400">calendar_today</span>
              <span className="capitalize">{formattedSelectedDate}</span>
              <span className="text-slate-400">›</span>
            </div>
            <button type="button" aria-label="Día siguiente" onClick={() => shiftDate(1)} className="h-7 w-7 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50">›</button>
          </div>
        </div>

        {/* Barra de Filtros: Todas, Hoy, Urgentes, En espera, etc. */}
        <div className="px-4 py-1.5 border-b border-slate-100 flex items-center justify-between gap-2 shrink-0 bg-[#fafcff]">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              ['todas', 'Todas', counts.todas],
              ['hoy', 'Hoy', counts.hoy],
              ['urgentes', 'Urgentes', counts.urgentes],
              ['espera', 'En espera', counts.espera],
              ['completadas', 'Completadas', counts.completadas],
            ].map(([val, lbl, cnt]) => (
              <button
                key={val}
                type="button"
                onClick={() => setFilter(val as string)}
                className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors ${
                  filter === val
                    ? 'bg-[#0055D4] text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>{lbl}</span>
                {val !== 'completadas' && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                      filter === val
                        ? 'bg-white/20 text-white'
                        : val === 'urgentes'
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {cnt}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 text-xs sm:text-sm shrink-0">
            <button type="button" onClick={() => setShowAdvancedFilters((open) => !open)} aria-expanded={showAdvancedFilters} className="h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-semibold flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">filter_alt</span>
              <span>Filtrar</span>
            </button>
            <button type="button" onClick={() => setSortAscending((ascending) => !ascending)} className="h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-semibold flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">swap_vert</span>
              <span>Fecha ({sortAscending ? 'más pronto' : 'más tarde'})</span>
            </button>
          </div>
        </div>

        {showAdvancedFilters && (
          <div className="px-4 py-2 border-b border-slate-100 bg-white flex flex-wrap items-center gap-2 text-xs">
            <label className="flex items-center gap-1.5 text-slate-600 font-semibold">
              Estado
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-8 rounded-md border border-slate-200 bg-white px-2 font-normal text-slate-700">
                <option value="todos">Todos</option>
                {Object.entries(stateLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-1.5 text-slate-600 font-semibold">
              Responsable
              <select value={assigneeFilter} onChange={(event) => setAssigneeFilter(event.target.value)} className="h-8 rounded-md border border-slate-200 bg-white px-2 font-normal text-slate-700">
                <option value="todos">Todos</option>
                {Array.from(new Set(tasks.map((task) => task.assigned_to_name).filter(Boolean))).map((assignee) => <option key={assignee} value={assignee}>{assignee}</option>)}
              </select>
            </label>
            <button type="button" onClick={() => { setStatusFilter('todos'); setAssigneeFilter('todos'); }} className="h-8 px-2.5 rounded-md text-[#0055D4] font-semibold hover:bg-blue-50">Limpiar filtros</button>
          </div>
        )}

        {notice && (
          <div className="px-4 py-2 bg-blue-50 border-b border-blue-200 text-xs sm:text-sm font-medium text-blue-800 flex items-center justify-between shrink-0">
            <span>{notice}</span>
            <button type="button" onClick={() => setNotice('')} className="text-blue-500 font-bold">✕</button>
          </div>
        )}

        {/* Barra de Selección Masiva */}
        <div className="px-4 py-2 border-b border-slate-100 flex items-center gap-2 bg-[#f8fafc] text-xs sm:text-sm shrink-0 flex-wrap">
          <input
            type="checkbox"
            aria-label="Seleccionar todas"
            className="rounded border-slate-300 text-[#0055D4] focus:ring-0"
            checked={visible.length > 0 && visible.every((t) => selectedIds.includes(t.id))}
            onChange={() =>
              setSelectedIds(
                visible.every((t) => selectedIds.includes(t.id)) ? [] : visible.map((t) => t.id)
              )
            }
          />
          <span className="font-semibold text-slate-700 mr-2">{selectedIds.length} seleccionados</span>

          <button type="button" onClick={() => setNotice(selectedIds.length ? `${selectedIds.length} tarea(s) seleccionada(s) para asignar.` : 'Selecciona al menos una tarea.')} className="h-7 px-2.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1">
            <span className="material-symbols-outlined text-[15px]">person</span>
            <span>Asignar</span>
          </button>
          <button type="button" onClick={() => setNotice(selectedIds.length ? `${selectedIds.length} tarea(s) pospuesta(s).` : 'Selecciona al menos una tarea.')} className="h-7 px-2.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1">
            <span className="material-symbols-outlined text-[15px]">schedule</span>
            <span>Posponer</span>
          </button>
          <button type="button" onClick={() => { if (!selectedIds.length) return setNotice('Selecciona al menos una tarea.'); setTasks((current) => current.map((task) => selectedIds.includes(task.id) ? { ...task, status: 'en_espera_cliente' } : task)); setNotice(`${selectedIds.length} tarea(s) marcada(s) en espera del cliente.`); }} className="h-7 px-2.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1">
            <span className="material-symbols-outlined text-[15px]">hourglass_top</span>
            <span>En espera cliente</span>
          </button>
          <button type="button" onClick={() => setNotice(selectedIds.length ? 'Seguimiento creado para las tareas seleccionadas.' : 'Selecciona al menos una tarea.')} className="h-7 px-2.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1">
            <span className="material-symbols-outlined text-[15px]">event</span>
            <span>Crear seguimiento</span>
          </button>
        </div>

        {/* Lista de Tareas con scroll interno */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {visible.map((task) => (
            <div
              key={task.id}
              onClick={() => setSelected(task)}
              className={`flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50/50 cursor-pointer transition-colors text-xs sm:text-sm ${
                selected?.id === task.id ? 'bg-blue-50/80' : ''
              }`}
            >
              <input
                type="checkbox"
                aria-label={`Seleccionar ${task.title}`}
                checked={selectedIds.includes(task.id)}
                onChange={(e) => {
                  e.stopPropagation();
                  toggle(task.id);
                }}
                className="rounded border-slate-300 text-[#0055D4] focus:ring-0"
              />

              {/* Avatar iniciales */}
              <div className="w-8 h-8 rounded-full bg-blue-100 text-[#0055D4] font-bold text-xs flex items-center justify-center shrink-0">
                {initials(task.client_name)}
              </div>

              {/* Cliente y codigo */}
              <div className="w-32 shrink-0 min-w-0">
                <p className="font-semibold text-slate-900 truncate leading-snug">{task.client_name}</p>
                <p className="text-xs font-mono-data text-slate-500 truncate">{task.dossier_code}</p>
              </div>

              {/* Descripcion de la tarea */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 truncate">{task.title}</p>
                <p className="text-xs text-slate-500 truncate">{task.description}</p>
              </div>

              {/* Badges de documentos o urgencia */}
              {task.docs_count && (
                <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold shrink-0">
                  {task.docs_count} documentos
                </span>
              )}
              {task.priority === 'alta' && (
                <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold shrink-0">
                  ♦ Urgente
                </span>
              )}

              {/* Estado */}
              <span className={`px-2.5 py-0.5 rounded text-xs font-semibold border shrink-0 ${stateClass[task.status] || stateClass.pendiente}`}>
                ● {stateLabel[task.status] || task.status}
              </span>

              {/* Fecha */}
              <span className={`text-xs font-medium shrink-0 w-16 text-right ${task.due_date === '2026-10-20' ? 'text-rose-600 font-bold' : 'text-slate-500'}`}>
                {shortDate(task.due_date)}
              </span>

              {/* Asignado */}
              <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                {task.assigned_to_name}
              </div>

              <span className="text-slate-300 hover:text-slate-600 text-base">›</span>
            </div>
          ))}
        </div>
      </div>

      {/* Panel Lateral Derecho: Ficha de Tarea (Foto 2 - Laura C.) */}
      {selected && (
        <aside className="w-80 lg:w-96 border-l border-slate-200 bg-[#fafcff] flex flex-col h-full overflow-hidden shrink-0">
          {/* Header Drawer */}
          <div className="p-3.5 border-b border-slate-200 flex items-start justify-between bg-white shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full bg-blue-100 text-[#0055D4] font-bold text-sm flex items-center justify-center shrink-0">
                {initials(selected.client_name)}
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 leading-tight">{selected.client_name}</h2>
                <p className="text-xs font-mono-data text-slate-500">{selected.dossier_code}</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold">
                ♦ Urgente
              </span>
              <button
                type="button"
                aria-label="Cerrar panel"
                onClick={() => setSelected(null)}
                className="text-slate-400 hover:text-slate-700 text-base px-1"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Subheader: Titulo del trámite */}
          <div className="px-3.5 py-2.5 bg-white border-b border-slate-100 shrink-0">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900">Certificado de Residencia Fiscal</h3>
            <p className="text-xs text-slate-500">Impuestos · Agencia Tributaria NL</p>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-200 px-3.5 bg-white text-xs shrink-0">
            {(['Resumen', 'Documentos 3', 'Notas 2', 'Historial'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setDetailTab(t)}
                className={`py-2 mr-3 font-semibold border-b-2 text-xs transition-colors ${
                  detailTab === t ? 'border-[#0055D4] text-[#0055D4]' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Contenido con scroll interno */}
          <div className="flex-1 overflow-y-auto no-scrollbar p-3.5 space-y-3 text-xs sm:text-sm">
            {detailTab !== 'Resumen' && (
              <div className="space-y-3">
                {detailTab === 'Documentos 3' && (
                  <>
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                      <p className="font-bold text-slate-900">Documentos del trámite</p>
                      <p className="mt-1 text-slate-600">3 documentos vinculados a {selected.client_name}.</p>
                    </div>
                    {['Certificado_residencia.pdf', 'Pasaporte_cliente.pdf', 'Formulario_fiscal.pdf'].map((document) => (
                      <div key={document} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-2.5">
                        <span className="flex min-w-0 items-center gap-2 font-semibold text-slate-700"><span className="material-symbols-outlined text-[18px] text-[#0055D4]">description</span><span className="truncate">{document}</span></span>
                        <button type="button" onClick={() => setNotice(`${document} listo para abrir en modo demo.`)} className="shrink-0 text-xs font-semibold text-[#0055D4] hover:underline">Abrir</button>
                      </div>
                    ))}
                  </>
                )}
                {detailTab === 'Notas 2' && (
                  <>
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3"><p className="font-bold text-slate-900">Notas del trámite</p><p className="mt-1 text-slate-600">2 notas internas asociadas.</p></div>
                    {['Pendiente validar la documentación recibida.', 'Enviar confirmación al cliente tras la revisión.'].map((note) => <div key={note} className="rounded-lg border border-slate-200 bg-white p-3 text-slate-700">{note}</div>)}
                    <button type="button" onClick={() => setNotice('Nueva nota preparada para guardar.')} className="w-full rounded-lg bg-[#0055D4] py-2 font-semibold text-white hover:bg-[#0047b3]">+ Añadir nota</button>
                  </>
                )}
                {detailTab === 'Historial' && (
                  <>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="font-bold text-slate-900">Historial del trámite</p><p className="mt-1 text-slate-600">Últimos cambios registrados.</p></div>
                    {['Documentación recibida · Hoy', 'Tarea asignada a RP · Ayer', 'Expediente creado · 10 oct'].map((event) => <div key={event} className="border-l-2 border-[#0055D4] bg-white p-2.5 text-slate-700">{event}</div>)}
                  </>
                )}
              </div>
            )}
            {detailTab === 'Resumen' && (
              <>
            {/* Estado del trámite & Fecha límite */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-lg border border-blue-200 bg-blue-50">
                <span className="text-xs font-medium text-slate-500 block">Estado del trámite</span>
                <span className="font-bold text-[#0055D4] text-xs sm:text-sm mt-0.5 block">● Documentación ▾</span>
              </div>
              <div className="p-2.5 rounded-lg border border-rose-200 bg-rose-50">
                <span className="text-xs font-medium text-rose-600 block">Fecha límite</span>
                <span className="font-bold text-rose-700 text-xs sm:text-sm mt-0.5 block">📅 Hoy (20 Oct)</span>
              </div>
            </div>

            {/* Descripción */}
            <div>
              <h4 className="font-bold text-slate-900 text-xs sm:text-sm mb-1">Descripción</h4>
              <p className="text-slate-700 text-xs sm:text-sm leading-relaxed bg-white p-2.5 rounded-lg border border-slate-200">
                El cliente ha subido la documentación pendiente. Revisa y valida los documentos de residencia fiscal y envía confirmación.
              </p>
            </div>

            {/* Ficha Cliente vinculada */}
            <div className="p-2.5 rounded-lg bg-white border border-slate-200 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase">Cliente</span>
                <Link
                  href="/crm/clientes/demo-client-1"
                  className="text-xs font-semibold text-[#0055D4] hover:underline"
                >
                  Ver ficha ↗
                </Link>
              </div>
              <p className="font-bold text-slate-900 text-xs sm:text-sm">{selected.client_name}</p>
              <p className="text-xs text-slate-600 flex items-center gap-1">
                <span>✉</span> laura.c@cliente.nl
              </p>
              <p className="text-xs text-slate-600 flex items-center gap-1">
                <span>📞</span> +31 6 1234 5678
              </p>
              <p className="text-xs text-slate-600 flex items-center gap-1">
                <span>📍</span> Ámsterdam, Países Bajos
              </p>
            </div>

            {/* Acciones Rápidas */}
            <div className="space-y-1.5">
              <h4 className="font-bold text-slate-900 text-xs sm:text-sm">Acciones rápidas</h4>
              <button
                type="button"
                onClick={() => updateSelectedTask('completada', 'Tarea marcada como completada.')}
                className="w-full py-2 rounded-lg bg-[#0055D4] hover:bg-[#0047b3] text-white font-semibold text-xs sm:text-sm transition-colors shadow-2xs"
              >
                ✓ Marcar como completada
              </button>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => updateSelectedTask('pendiente', 'Tarea pospuesta.')}
                  className="py-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold"
                >
                  ◷ Posponer
                </button>
                <button
                  type="button"
                  onClick={() => updateSelectedTask('en_espera_cliente', 'Tarea marcada en espera del cliente.')}
                  className="py-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold"
                >
                  ⌛ En espera cliente
                </button>
                <button
                  type="button"
                  onClick={() => setNotice('Seguimiento creado.')}
                  className="py-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold"
                >
                  📅 Crear seguimiento
                </button>
                <button
                  type="button"
                  onClick={() => setNotice('Asignar tarea.')}
                  className="py-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold"
                >
                  👤 Asignar a...
                </button>
              </div>
            </div>

            {/* Próximos Pasos */}
            <div className="space-y-1.5 pt-1">
              <h4 className="font-bold text-slate-900 text-xs sm:text-sm">Próximos pasos</h4>
              <div className="p-2 rounded bg-amber-50/70 border border-amber-200 text-xs flex items-center justify-between">
                <span>○ Enviar confirmación al cliente</span>
                <strong className="text-rose-600 font-bold">Hoy</strong>
              </div>
              <div className="p-2 rounded bg-white border border-slate-200 text-xs flex items-center justify-between text-slate-600">
                <span>○ Comprobar estado en la Belastingdienst</span>
                <span>22 Oct</span>
              </div>
              <button
                type="button"
                onClick={() => setNotice('Añadir siguiente paso.')}
                className="text-xs sm:text-sm text-[#0055D4] font-semibold hover:underline block pt-1"
              >
                + Añadir siguiente paso
              </button>
            </div>
              </>
            )}
          </div>
        </aside>
      )}
    </div>
  );
}
