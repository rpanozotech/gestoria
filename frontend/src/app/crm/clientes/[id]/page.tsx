'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { clientFinancials, debtOutstanding, validateClientDetail } from '@/lib/client-ficha';

type ClientDetail = {
  client: Record<string, any>;
  dossiers?: any[]; service_requests?: any[]; quotes?: any[]; invoices?: any[];
  appointments?: any[]; debts?: any[]; documents?: any[]; messages?: any[]; audit?: any[]; tasks?: any[];
};
const money = (value: unknown) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(Number(value || 0));
const dateLabel = (value: unknown) => {
  if (!value) return '—';
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
};
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'CL';
const tabs = [
  ['resumen', 'Resumen', 'dashboard'], ['expedientes', 'Expedientes', 'folder_open'], ['facturacion', 'Facturación', 'receipt_long'], ['deudas', 'Deudas y pagos', 'payments'],
  ['documentos', 'Documentos', 'description'], ['citas', 'Citas', 'calendar_month'], ['mensajes', 'Mensajes', 'chat'], ['historial', 'Historial', 'history'],
] as const;
type PanelKey = Exclude<typeof tabs[number][0], 'resumen'>;

export default function ClienteFichaPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<ClientDetail | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [openPanel, setOpenPanel] = useState<PanelKey | null>(null);
  const [actionOpen, setActionOpen] = useState(false);
  const [isGeneratingPortalAccess, setIsGeneratingPortalAccess] = useState(false);
  const [portalAccessNotice, setPortalAccessNotice] = useState<{ username: string; password: string } | null>(null);
  const [isCompletingTask, setIsCompletingTask] = useState(false);
  const [activeTab, setActiveTab] = useState<typeof tabs[number][0]>('resumen');
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    let active = true;
    setLoading(true); setError(''); setData(null); setOpenPanel(null);
    apiFetch('/clients/' + encodeURIComponent(params.id)).then(async (response) => {
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'No se pudo cargar la ficha del cliente.');
      validateClientDetail(payload);
      if (active) setData(payload);
    }).catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : 'Error al cargar el cliente.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [params.id]);

  useEffect(() => {
    if (!openPanel) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpenPanel(null); };
    window.addEventListener('keydown', onKeyDown);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener('keydown', onKeyDown); };
  }, [openPanel]);

  if (loading) return <div className="flex h-full min-h-0 items-center justify-center" role="status">Cargando ficha del cliente…</div>;
  if (error || !data?.client) return <div className="flex h-full min-h-0 flex-col items-center justify-center gap-4 p-6"><p role="alert" className="text-red-700">{error || 'Cliente no encontrado.'}</p><Link className="text-blue-700 underline" href="/crm/clientes">Volver al directorio</Link></div>;

  const client = data.client;
  const dossiers = Array.isArray(data.dossiers) ? data.dossiers : [];
  const activeServices = (Array.isArray(data.service_requests) ? data.service_requests : []).filter((row) => !['completada', 'completado', 'cancelada', 'cancelado', 'rechazada'].includes(String(row.status || '').toLowerCase()));
  const invoices = Array.isArray(data.invoices) ? data.invoices : [];
  const appointments = Array.isArray(data.appointments) ? data.appointments : [];
  const debts = Array.isArray(data.debts) ? data.debts : [];
  const documents = Array.isArray(data.documents) ? data.documents : [];
  const messages = Array.isArray(data.messages) ? data.messages : [];
  const audit = Array.isArray(data.audit) ? data.audit : [];
  const tasks = Array.isArray(data.tasks) ? data.tasks : [];
  const serviceRequests = Array.isArray(data.service_requests) ? data.service_requests : [];
  const nextTask = tasks.find((task: any) => !['completada', 'completed', 'cancelada', 'cancelled'].includes(String(task.status || '').toLowerCase())) || tasks[0];
  const billed = invoices.reduce((sum, invoice) => sum + Number(invoice.total || 0), 0);
  const pendingInvoices = invoices.filter((invoice) => !['pagada', 'paid', 'cobrada'].includes(String(invoice.status || '').toLowerCase()));
  const debt = debts[0];
  const nextAppointment = appointments[0];
  const nextAction = nextAppointment
    ? { title: nextAppointment.title || 'Cita programada', kind: 'Cita', date: nextAppointment.appointment_date || nextAppointment.date, notes: nextAppointment.notes }
    : nextTask
      ? { title: nextTask.title || 'Tarea pendiente', kind: 'Tarea', date: nextTask.due_date, notes: nextTask.description }
      : null;
  // Las pestañas cambian el contenido de la ficha; no son anclas de scroll.
  const scrollTo = (key: string) => { setActiveTab(key as typeof tabs[number][0]); };
  const open = (key: PanelKey) => { setActiveTab(key); };
  const statusLabel = client.status === 'activo' ? 'Activo' : client.status || 'Activo';
  const phone = client.phone || 'Sin teléfono';
  const email = client.email || 'Sin correo';
  const selectedTab = tabs.find(([key]) => key === activeTab) || tabs[0];
  const selectedTabTitle = selectedTab[1];
  const selectedTabIcon = selectedTab[2];
  const renderTabRows = (rows: any[], empty: string) => rows.length ? (
    <div className="grid gap-2 overflow-y-auto pr-1">
      {rows.slice(0, 12).map((row: any, index: number) => (
        <div key={row.id || row.code || row.number || index} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-xl border border-[#e1eaf4] bg-white px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,.04)]">
          <div className="min-w-0"><strong className="block truncate text-[14px] text-[#10264c]">{row.title || row.concept || row.name || row.code || 'Registro asociado'}</strong><span className="mt-1 block truncate text-[12px] text-[#6d819b]">{row.description || row.notes || row.client_name || row.category || 'Información del cliente'}</span></div>
          <span className="rounded-full bg-[#eaf3ff] px-3 py-1 text-[12px] font-bold text-[#0568e8]">{row.status || dateLabel(row.created_at || row.date || row.updated_at || row.due_date)}</span>
        </div>
      ))}
    </div>
  ) : <div className="flex h-full min-h-[260px] items-center justify-center rounded-xl border border-dashed border-[#cbd9e8] bg-white text-[13px] text-[#6d819b]">{empty}</div>;

  const renderActiveTabPanel = () => {
    const title = selectedTab[1];
    const icon = selectedTab[2];
    if (activeTab === 'facturacion') return <>{renderTabRows(invoices, 'Todavía no hay facturas para este cliente.')}</>;
    if (activeTab === 'expedientes') return <>{renderTabRows(dossiers, 'Todavía no hay expedientes asociados.')}</>;
    if (activeTab === 'deudas') return <>{debt ? <div className="rounded-xl border border-red-200 bg-red-50/40 p-5 text-[13px]"><div className="grid max-w-xl grid-cols-2 gap-y-4"><span className="text-[#6d819b]">Organismo acreedor</span><strong>{debt.creditor || '—'}</strong><span className="text-[#6d819b]">Referencia</span><strong>{debt.reference || '—'}</strong><span className="text-[#6d819b]">Importe pendiente</span><strong className="text-xl text-red-600">{money(Number(debt.original_amount || 0) - Number(debt.paid_total || debt.paid_amount || 0))}</strong><span className="text-[#6d819b]">Estado</span><strong className="text-red-700">{debt.status || 'Pendiente'}</strong><span className="text-[#6d819b]">Vencimiento</span><strong>{dateLabel(debt.due_date)}</strong></div><Link href={`/crm/deudas/${debt.id}`} className="mt-5 inline-flex h-10 items-center rounded-lg border border-[#6fa5ee] bg-white px-4 text-[13px] font-bold text-[#0568e8]">Ver detalle de la deuda →</Link></div> : <div className="flex h-full min-h-[260px] items-center justify-center rounded-xl border border-dashed border-[#cbd9e8] bg-white text-[13px] text-[#6d819b]">No hay deudas registradas.</div>}</>;
    if (activeTab === 'historial') return <>{renderTabRows(audit, 'No hay cambios registrados en el historial.')}</>;
    if (activeTab === 'documentos') return <>{renderTabRows(documents, 'No hay documentos asociados al cliente.')}</>;
    if (activeTab === 'citas') return <>{renderTabRows(appointments, 'No hay citas registradas para el cliente.')}</>;
    if (activeTab === 'mensajes') return <>{renderTabRows(messages, 'No hay mensajes registrados para el cliente.')}</>;
    return <>{renderTabRows([], 'Selecciona una pestaña para consultar la información.')}</>;
  };

  const regeneratePortalAccess = async () => {
    setIsGeneratingPortalAccess(true);
    try {
      const isPreview = params.id === 'demo-client-1' || process.env.NEXT_PUBLIC_CRM_PREVIEW === 'true';
      if (isPreview) {
        const previewAccess = {
          username: data?.client.portal_username || 'maria.ejemplo-demo',
          password: `RP-DEMO-${Date.now().toString(36).toUpperCase()}`,
        };
        setData((current) => current ? { ...current, client: { ...current.client, portal_username: previewAccess.username } } : current);
        setPortalAccessNotice(previewAccess);
        return;
      }
      const response = await apiFetch(`/clients/${encodeURIComponent(params.id)}/portal-access`, { method: 'POST' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.portal_access) throw new Error(payload.error || 'No se pudo generar el acceso al portal.');
      setData((current) => current ? { ...current, client: { ...current.client, portal_username: payload.portal_access.username } } : current);
      setPortalAccessNotice(payload.portal_access);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo generar el acceso al portal.');
    } finally {
      setIsGeneratingPortalAccess(false);
    }
  };

  const completeNextTask = async () => {
    if (!nextTask?.id) {
      router.push(`/crm/tareas?client_id=${encodeURIComponent(String(client.id))}&client=${encodeURIComponent(client.full_name)}&from=ficha`);
      return;
    }
    setIsCompletingTask(true);
    try {
      const response = await apiFetch(`/tasks/${encodeURIComponent(nextTask.id)}`, { method: 'PATCH', body: JSON.stringify({ status: 'completada' }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'No se pudo completar la tarea.');
      setData((current) => current ? { ...current, tasks: (current.tasks || []).map((task: any) => task.id === nextTask.id ? { ...task, ...(payload.task || {}), status: 'completada' } : task) } : current);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo completar la tarea.');
    } finally {
      setIsCompletingTask(false);
    }
  };

  return (
    <main data-active-tab={activeTab} className="crm-client-ficha h-full min-h-0 overflow-hidden bg-[#f5f8fc] px-0 py-0 text-[#13234b]">
      <style jsx global>{`
        /* La ficha 360 ocupa la pantalla útil; el contenido secundario se desplaza dentro de su panel. */
        .crm-client-ficha-canvas { zoom: 0.9; width: 100%; max-width: none; margin-inline: 0; font-size: 14px; }
        .crm-client-ficha-canvas .text-xs,
        .crm-client-ficha-canvas .text-\[10px\],
        .crm-client-ficha-canvas .text-\[11px\] { font-size: 14px; line-height: 1.15; }
        .crm-client-ficha[data-active-tab="resumen"] .crm-ficha-secondary-grid { display: none; }
        .crm-client-ficha[data-active-tab]:not([data-active-tab="resumen"]) .crm-ficha-resumen,
        .crm-client-ficha[data-active-tab]:not([data-active-tab="resumen"]) .crm-ficha-resumen ~ section,
        .crm-client-ficha[data-active-tab]:not([data-active-tab="resumen"]) .crm-ficha-secondary-grid { display: none !important; }
        .crm-client-ficha[data-active-tab]:not([data-active-tab="resumen"]) { overflow: hidden; }
        .crm-ficha-tab-panel { min-height: 360px; max-height: calc(100dvh - 390px); overflow: hidden; }
        .crm-ficha-tab-panel > div:last-child { max-height: calc(100dvh - 470px); overflow-y: auto; }
        @media (min-height: 960px) and (min-width: 1280px) { .crm-client-ficha-canvas { zoom: 0.96; } }
        @media (max-height: 820px) and (min-width: 1024px) { .crm-client-ficha-canvas { zoom: 0.82; } }
        @media (max-width: 1023px) { .crm-client-ficha { overflow-y: auto; } .crm-client-ficha-canvas { zoom: 1; width: auto; } }
      `}</style>
      <div className="crm-client-ficha-canvas mx-auto max-w-[1440px] space-y-2">
        <header className="flex flex-wrap items-end justify-between gap-2">
          <div><div className="flex items-center gap-2 text-[17px] font-medium text-blue-700"><Link href="/crm/clientes" className="hover:underline">← Clientes</Link><span>/</span><span>{client.full_name}</span></div><div className="mt-1 flex flex-wrap items-center gap-2"><h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">Ficha 360° del cliente</h1><span className="rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700">Datos ficticios de staging</span></div></div>
          <div className="relative flex items-center gap-2"><Link href={`/crm/clientes?id=${encodeURIComponent(String(client.id))}&edit=1&from=ficha`} className="inline-flex h-10 items-center gap-2 rounded-lg border border-blue-200 bg-white px-4 text-xs font-bold text-blue-700 hover:bg-blue-50"><span className="material-symbols-outlined text-[17px]">edit</span>Editar cliente</Link><button type="button" onClick={() => setActionOpen((value) => !value)} aria-expanded={actionOpen} className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-700 px-4 text-xs font-bold text-white shadow-sm hover:bg-blue-800"><span className="material-symbols-outlined text-[17px]">add</span>Nueva acción<span className="material-symbols-outlined text-[17px]">{actionOpen ? 'expand_less' : 'expand_more'}</span></button>{actionOpen && <div className="absolute right-0 top-12 z-20 w-52 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl"><button type="button" onClick={() => router.push(`/crm/agenda?client_id=${encodeURIComponent(String(client.id))}&client=${encodeURIComponent(client.full_name)}&from=ficha`)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold hover:bg-blue-50"><span className="material-symbols-outlined text-[16px]">calendar_add_on</span>Nueva cita</button><button type="button" onClick={() => router.push(`/crm/facturacion?client_id=${encodeURIComponent(String(client.id))}&client=${encodeURIComponent(client.full_name)}&action=new-invoice&from=ficha`)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold hover:bg-blue-50"><span className="material-symbols-outlined text-[16px]">receipt_long</span>Nueva factura</button><button type="button" onClick={() => router.push(`/crm/tareas?client_id=${encodeURIComponent(String(client.id))}&client=${encodeURIComponent(client.full_name)}&from=ficha`)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold hover:bg-blue-50"><span className="material-symbols-outlined text-[16px]">task_alt</span>Nueva tarea</button></div>}</div>
        </header>

      <section className="grid min-h-0 flex-1 gap-2 overflow-hidden md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.45fr)_minmax(0,1fr)]">
        <article className="min-h-0 overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4"><h2 className="mb-2 flex items-center gap-2 text-base font-extrabold"><span className="material-symbols-outlined text-[20px] text-slate-600">person</span>Resumen del cliente</h2><dl className="grid grid-cols-[84px_minmax(0,1fr)] gap-x-2 gap-y-1.5 text-xs sm:grid-cols-[96px_minmax(0,1fr)]"><dt className="text-slate-500">Nombre</dt><dd className="truncate font-semibold">{client.full_name}</dd><dt className="text-slate-500">Tipo</dt><dd className="truncate">{client.type || 'Sin dato'}</dd><dt className="text-slate-500">Estado</dt><dd><span className="rounded-md bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700">{statusLabel}</span></dd><dt className="text-slate-500">Responsable</dt><dd className="truncate">{client.responsible || 'Sin asignar'}</dd><dt className="text-slate-500">Email</dt><dd className="truncate font-semibold text-blue-700">{email}</dd><dt className="text-slate-500">Teléfono</dt><dd className="truncate font-semibold text-blue-700">{phone}</dd><dt className="text-slate-500">Dirección</dt><dd className="truncate">{client.address || 'Sin dato'}</dd><dt className="text-slate-500">Idioma</dt><dd className="truncate">{client.language || 'Sin dato'}</dd><dt className="text-slate-500">Notas</dt><dd className="line-clamp-2">{client.notes || 'Sin notas internas.'}</dd></dl><div className="mt-3 border-t border-slate-100 pt-2"><h3 className="mb-1 flex items-center gap-2 text-sm font-extrabold"><span className="material-symbols-outlined text-[17px]">layers</span>Servicios activos</h3>{activeServices.length ? <div className="flex flex-wrap gap-1.5">{activeServices.slice(0, 3).map((service) => <span key={service.id} className="max-w-full truncate rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">{service.service_title || 'Solicitud de servicio'} · {service.status}</span>)}</div> : <p className="text-xs text-slate-500">No hay solicitudes activas.</p>}</div></article>
        <div className="grid min-h-0 min-w-0 grid-rows-2 gap-2"><section className="min-h-0 overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4"><div className="mb-2 flex items-center justify-between gap-2"><h2 className="flex min-w-0 items-center gap-1.5 truncate text-base font-extrabold"><span className="material-symbols-outlined text-[19px]">receipt_long</span>Facturación reciente</h2><button type="button" onClick={() => open('facturacion')} className="shrink-0 rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">Ver toda →</button></div><div className="overflow-x-auto"><table className="w-full min-w-[400px] text-left text-xs"><thead className="border-b border-slate-200 text-[11px] uppercase text-slate-500"><tr><th className="py-1.5">Número</th><th>Fecha</th><th>Concepto</th><th>Importe</th><th>Estado</th></tr></thead><tbody className="divide-y divide-slate-100">{invoices.slice(0, 3).map((invoice, index) => <tr key={invoice.id || index}><td className="py-1.5 font-semibold">{invoice.code || invoice.number || '—'}</td><td>{dateLabel(invoice.created_at || invoice.date || invoice.due_date)}</td><td className="max-w-[120px] truncate">{invoice.concept || invoice.items?.[0]?.description || invoice.items?.[0]?.title || 'Sin concepto'}</td><td>{money(invoice.total)}</td><td>{invoice.status || 'Sin estado'}</td></tr>)}{!invoices.length && <tr><td colSpan={5} className="py-4 text-center text-slate-500">No hay facturas.</td></tr>}</tbody></table></div></section><section className="min-h-0 overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4"><div className="mb-2 flex items-center justify-between gap-2"><h2 className="flex min-w-0 items-center gap-1.5 truncate text-base font-extrabold"><span className="material-symbols-outlined text-[19px]">folder_open</span>Expedientes recientes</h2><button type="button" onClick={() => open('expedientes')} className="shrink-0 rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">Ver todos →</button></div><div className="overflow-x-auto"><table className="w-full min-w-[360px] text-left text-xs"><thead className="border-b border-slate-200 text-[11px] uppercase text-slate-500"><tr><th className="py-1.5">Referencia</th><th>Trámite</th><th>Estado</th><th>Fecha</th></tr></thead><tbody className="divide-y divide-slate-100">{dossiers.slice(0, 3).map((row, index) => <tr key={row.id || index}><td className="py-1.5 font-semibold">{row.code || '—'}</td><td className="max-w-[140px] truncate">{row.title || row.category || 'Expediente'}</td><td>{row.status || 'Sin estado'}</td><td>{dateLabel(row.updated_at || row.created_at || row.deadline)}</td></tr>)}{!dossiers.length && <tr><td colSpan={4} className="py-4 text-center text-slate-500">No hay expedientes.</td></tr>}</tbody></table></div></section></div>
        <div className="grid min-h-0 grid-rows-2 gap-2"><section className="min-h-0 overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4"><h2 className="mb-2 flex items-center gap-1.5 text-base font-extrabold"><span className="material-symbols-outlined text-[19px]">calendar_month</span>Próxima acción</h2>{nextAction ? <><div className="rounded-lg border border-blue-200 bg-blue-50 p-2.5"><strong className="block line-clamp-2 text-sm text-blue-800">{nextAction.title || nextAction.kind}</strong><p className="mt-1 text-xs text-slate-600">{nextAction.kind} · {dateLabel(nextAction.date)}</p>{nextAction.notes && <p className="mt-1 line-clamp-2 text-xs text-slate-600">{nextAction.notes}</p>}</div><button type="button" onClick={() => open(nextAction.kind === 'Cita' ? 'citas' : 'expedientes')} className="mt-2 min-h-9 w-full rounded-lg border border-blue-300 text-xs font-bold text-blue-700 hover:bg-blue-50">Abrir {nextAction.kind.toLowerCase()}</button></> : <p className="py-4 text-sm text-slate-500">No hay próximas acciones.</p>}</section><section className="min-h-0 overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4"><div className="mb-2 flex items-center justify-between gap-2"><h2 className="flex items-center gap-1.5 text-base font-extrabold"><span className="material-symbols-outlined text-[19px]">euro</span>Deudas y pagos</h2><button type="button" onClick={() => open('deudas')} className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">Ver todas →</button></div>{debts.filter((row) => row.status !== 'deleted').slice(0, 2).map((row, index) => <div key={row.id || index} className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs"><span className="truncate text-slate-500">{row.creditor || 'Acreedor'}</span><strong className="text-right text-red-600">{money(debtOutstanding(row))}</strong><span className="truncate text-slate-500">{row.reference || 'Referencia'}</span><span className="truncate text-right">{dateLabel(row.due_date)}</span></div>)}{!debts.some((row) => row.status !== 'deleted') && <p className="text-sm text-slate-500">No hay deudas pendientes.</p>}</section></div>
      </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><button type="button" onClick={() => scrollTo('expedientes')} className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-blue-300 hover:shadow-md"><span className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-700"><span className="material-symbols-outlined">folder_open</span></span><span><small className="block text-xs text-slate-500">Expedientes activos</small><strong className="text-xl">{dossiers.filter((row) => !['finalizado', 'cerrado'].includes(String(row.status || '').toLowerCase())).length}</strong></span></span><span className="material-symbols-outlined text-slate-400 transition-transform group-hover:translate-x-1">chevron_right</span></button><button type="button" onClick={() => scrollTo('facturacion')} className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-emerald-300 hover:shadow-md"><span className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-700"><span className="material-symbols-outlined">bar_chart</span></span><span><small className="block text-xs text-slate-500">Facturado este mes</small><strong className="text-xl">{money(billed)}</strong></span></span><span className="material-symbols-outlined text-slate-400 transition-transform group-hover:translate-x-1">chevron_right</span></button><button type="button" onClick={() => scrollTo('facturacion')} className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-amber-300 hover:shadow-md"><span className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-amber-700"><span className="material-symbols-outlined">schedule</span></span><span><small className="block text-xs text-slate-500">Pendiente de cobro</small><strong className="text-xl">{money(pendingInvoices.reduce((sum, row) => sum + Number(row.total || 0), 0))}</strong></span></span><span className="material-symbols-outlined text-slate-400 transition-transform group-hover:translate-x-1">chevron_right</span></button><button type="button" onClick={() => scrollTo('deudas')} className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-red-300 hover:shadow-md"><span className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-600"><span className="material-symbols-outlined">euro</span></span><span><small className="block text-xs text-slate-500">Deuda pendiente</small><strong className="text-xl text-red-600">{money(debt ? Number(debt.original_amount || 0) - Number(debt.paid_total || debt.paid_amount || 0) : 0)}</strong></span></span><span className="material-symbols-outlined text-slate-400 transition-transform group-hover:translate-x-1">chevron_right</span></button></section>

        <nav className="flex gap-1 overflow-x-auto border-b border-slate-200" aria-label="Secciones de la ficha">{tabs.map(([key, label, icon]) => <button key={key} type="button" onClick={() => scrollTo(key)} aria-current={activeTab === key ? 'page' : undefined} className={`inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-xs font-bold transition-colors ${activeTab === key ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:border-blue-200 hover:text-blue-700'}`}><span className="material-symbols-outlined text-[17px]">{icon}</span>{label}</button>)}</nav>

        {activeTab !== 'resumen' && <section className="crm-ficha-tab-panel rounded-2xl border border-[#dce6f3] bg-[#f8fbff] p-4 shadow-[0_1px_3px_rgba(15,23,42,.08)]"><div className="mb-4 flex items-center justify-between"><h2 className="flex items-center gap-3 text-[18px] font-extrabold text-[#10264c]"><span className="material-symbols-outlined text-[24px] text-[#0568e8]">{selectedTabIcon}</span>{selectedTabTitle}</h2><span className="rounded-full bg-[#eaf3ff] px-3 py-1 text-[12px] font-bold text-[#0568e8]">{client.full_name}</span></div>{renderActiveTabPanel()}</section>}

        <div ref={(node) => { sectionRefs.current.resumen = node; }} className="crm-ficha-resumen grid scroll-mt-4 gap-3 xl:grid-cols-[1.05fr_1.45fr_1fr]"><section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><h2 className="flex items-center gap-2 text-base font-extrabold"><span className="material-symbols-outlined text-[20px] text-slate-600">person</span>Resumen del cliente</h2><dl className="mt-4 grid grid-cols-[110px_1fr] gap-y-2 text-xs"><dt className="text-slate-500">Nombre</dt><dd className="font-semibold">{client.full_name}</dd><dt className="text-slate-500">Tipo</dt><dd>{client.type || 'Particular'}</dd><dt className="text-slate-500">Estado</dt><dd><span className="rounded-md bg-emerald-50 px-2 py-1 font-bold text-emerald-700">{statusLabel}</span></dd><dt className="text-slate-500">Responsable</dt><dd>{client.responsible || 'Equipo gestor'}</dd><dt className="text-slate-500">Email</dt><dd className="truncate font-semibold text-blue-700">{email}</dd><dt className="text-slate-500">Teléfono</dt><dd className="font-semibold text-blue-700">{phone}</dd><dt className="text-slate-500">Dirección</dt><dd>{client.address || 'Sin dato'}</dd><dt className="text-slate-500">Idioma</dt><dd>{client.language || 'Español'}</dd><dt className="text-slate-500">Notas internas</dt><dd>{client.notes || 'Sin notas internas.'}</dd></dl><div className="mt-5 border-t border-slate-100 pt-4"><h3 className="flex items-center gap-2 text-sm font-extrabold"><span className="material-symbols-outlined text-[18px]">layers</span>Servicios activos</h3><div className="mt-3 flex flex-wrap gap-2"><span className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700">Asesoría fiscal</span><span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700">Gestión administrativa</span>{serviceRequests.length > 0 && <span className="rounded-md border border-violet-200 bg-violet-50 px-2 py-1 text-[11px] font-bold text-violet-700">{serviceRequests.length} solicitudes</span>}</div></div><div className="mt-5 border-t border-slate-100 pt-4"><div className="flex items-center justify-between gap-3"><h3 className="flex items-center gap-2 text-sm font-extrabold"><span className="material-symbols-outlined text-[18px] text-blue-700">lock</span>Acceso al Portal Cliente</h3><span className={`rounded-md px-2 py-1 text-[10px] font-bold ${client.portal_username ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{client.portal_username ? 'Activo' : 'No generado'}</span></div><p className="mt-2 text-xs text-slate-500">Usuario: <strong className="text-slate-800">{client.portal_username || 'Pendiente de generar'}</strong></p><button type="button" onClick={regeneratePortalAccess} disabled={isGeneratingPortalAccess} className="mt-3 inline-flex h-8 items-center gap-2 rounded-lg border border-blue-300 px-3 text-xs font-bold text-blue-700 hover:bg-blue-50 disabled:opacity-60"><span className="material-symbols-outlined text-[16px]">{isGeneratingPortalAccess ? 'progress_activity' : 'key'}</span>{isGeneratingPortalAccess ? 'Generando…' : client.portal_username ? 'Regenerar contraseña' : 'Generar acceso'}</button></div></section>

          <div className="space-y-3"><section ref={(node) => { sectionRefs.current.facturacion = node; }} className="scroll-mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="mb-3 flex items-center justify-between gap-2"><h2 className="flex items-center gap-2 text-base font-extrabold"><span className="material-symbols-outlined text-[20px]">receipt_long</span>Facturación reciente</h2><Link href="/crm/facturacion" className="rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[11px] font-bold text-blue-700 hover:bg-blue-100">Ver toda la facturación →</Link></div><div className="overflow-x-auto"><table className="w-full min-w-[530px] text-left text-[11px]"><thead className="border-b border-slate-200 text-[10px] uppercase text-slate-500"><tr><th className="py-2">Número</th><th>Fecha</th><th>Concepto</th><th>Importe</th><th>Estado</th></tr></thead><tbody className="divide-y divide-slate-100">{invoices.slice(0, 5).map((invoice, index) => <tr key={invoice.id || index}><td className="py-2 font-semibold">{invoice.code || invoice.number || `FAC-${index + 1}`}</td><td>{dateLabel(invoice.created_at || invoice.date || invoice.due_date)}</td><td>{invoice.concept || invoice.items?.[0]?.description || 'Servicio de asesoría'}</td><td>{money(invoice.total)}</td><td><span className={`rounded-md px-2 py-1 font-bold ${String(invoice.status).toLowerCase() === 'pagada' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{invoice.status || 'Pendiente'}</span></td></tr>)}{invoices.length === 0 && <tr><td colSpan={5} className="py-5 text-center text-slate-500">No hay facturas.</td></tr>}</tbody></table></div></section><section ref={(node) => { sectionRefs.current.expedientes = node; }} className="scroll-mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="mb-3 flex items-center justify-between"><h2 className="flex items-center gap-2 text-base font-extrabold"><span className="material-symbols-outlined text-[20px]">folder_open</span>Expedientes recientes</h2><Link href="/crm/expedientes" className="rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[11px] font-bold text-blue-700 hover:bg-blue-100">Ver todos los expedientes →</Link></div><div className="overflow-x-auto"><table className="w-full min-w-[500px] text-left text-[11px]"><thead className="border-b border-slate-200 text-[10px] uppercase text-slate-500"><tr><th className="py-2">Referencia</th><th>Trámite</th><th>Estado</th><th>Fecha act.</th></tr></thead><tbody className="divide-y divide-slate-100">{dossiers.slice(0, 5).map((row, index) => <tr key={row.id || index}><td className="py-2 font-semibold">{row.code || `EXP-${index + 1}`}</td><td>{row.title || row.category || 'Expediente'}</td><td><span className="rounded-md bg-blue-50 px-2 py-1 font-bold text-blue-700">{row.status || 'En trámite'}</span></td><td>{dateLabel(row.updated_at || row.created_at || row.deadline)}</td></tr>)}</tbody></table></div></section></div>

          <div className="space-y-3"><section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><h2 className="flex items-center gap-2 text-base font-extrabold"><span className="material-symbols-outlined text-[20px]">calendar_month</span>Próxima acción</h2><div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 p-3"><div className="flex items-start justify-between gap-2"><strong className="text-sm text-blue-800">{nextAppointment?.title || nextTask?.title || 'Sin próxima acción'}</strong><span className="material-symbols-outlined text-blue-700">chevron_right</span></div><p className="mt-2 flex items-center gap-2 text-xs text-slate-600"><span className="material-symbols-outlined text-[16px]">calendar_today</span>{dateLabel(nextAppointment?.appointment_date || nextAppointment?.date || nextTask?.due_date)} <span className="rounded-md bg-blue-100 px-2 py-1 font-bold text-blue-700">{nextTask?.priority || 'Alta'}</span></p><p className="mt-2 text-xs text-slate-600">{nextAppointment?.notes || nextTask?.description || 'Solicitar y revisar documentación pendiente.'}</p></div><button type="button" onClick={() => void completeNextTask()} disabled={isCompletingTask} className="mt-2 flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-blue-300 text-xs font-bold text-blue-700 hover:bg-blue-50 disabled:opacity-60"><span className="material-symbols-outlined text-[16px]">{isCompletingTask ? 'progress_activity' : 'check'}</span>{isCompletingTask ? 'Completando…' : nextTask?.id ? 'Marcar como completada' : 'Ver tareas'}</button></section><section ref={(node) => { sectionRefs.current.deudas = node; }} className="scroll-mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="mb-3 flex items-center justify-between"><h2 className="flex items-center gap-2 text-base font-extrabold"><span className="material-symbols-outlined text-[20px]">euro</span>Deudas y pagos</h2><Link href={debt?.id ? `/crm/deudas/${debt.id}` : '/crm/deudas'} className="rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[11px] font-bold text-blue-700 hover:bg-blue-100">{debt ? 'Abrir ficha →' : 'Ver deudas →'}</Link></div>{debt ? <div className="rounded-xl border border-red-200 bg-red-50/40 p-3 text-xs"><div className="grid grid-cols-2 gap-y-2"><span className="text-slate-500">Organismo acreedor</span><strong>{debt.creditor || '—'}</strong><span className="text-slate-500">Referencia</span><strong>{debt.reference || '—'}</strong><span className="text-slate-500">Importe pendiente</span><strong className="text-lg text-red-600">{money(Number(debt.original_amount || 0) - Number(debt.paid_total || debt.paid_amount || 0))}</strong><span className="text-slate-500">Estado</span><span><span className="rounded-md bg-red-100 px-2 py-1 font-bold text-red-700">{debt.status || 'Pendiente'}</span></span><span className="text-slate-500">Vencimiento</span><strong>{dateLabel(debt.due_date)}</strong></div><Link href={`/crm/deudas/${debt.id}`} className="mt-3 flex h-9 items-center justify-center gap-2 rounded-lg border border-blue-300 bg-white text-xs font-bold text-blue-700 hover:bg-blue-50"><span className="material-symbols-outlined text-[16px]">description</span>Ver detalle de la deuda</Link></div> : <p className="text-xs text-slate-500">No hay deudas registradas.</p>}</section></div>
        </div>

        <div ref={(node) => { sectionRefs.current.historial = node; }} className="crm-ficha-secondary-grid grid scroll-mt-4 gap-3 md:grid-cols-2">{(['documentos', 'citas', 'mensajes'] as const).map((key) => { const rows = key === 'documentos' ? documents : key === 'citas' ? appointments : messages; const label = key[0].toUpperCase() + key.slice(1); return <section key={key} ref={(node) => { sectionRefs.current[key] = node; }} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><h2 className="text-base font-extrabold">{label} <span className="text-sm font-normal text-slate-500">({rows.length})</span></h2><p className="mt-2 text-xs text-slate-500">{rows.length ? `${rows.length} registros asociados al cliente.` : 'No hay registros.'}</p></section>; })}<section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><h2 className="text-base font-extrabold">Historial <span className="text-sm font-normal text-slate-500">({audit.length})</span></h2><p className="mt-2 text-xs text-slate-500">{audit.length ? `${audit.length} cambios registrados.` : 'No hay cambios registrados.'}</p></section></div>
        {portalAccessNotice && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4" role="dialog" aria-modal="true" aria-labelledby="portal-access-title"><div className="w-full max-w-md rounded-2xl border border-blue-200 bg-white p-5 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><h2 id="portal-access-title" className="text-lg font-extrabold text-[#10264c]">Acceso al Portal Cliente</h2><p className="mt-1 text-sm text-slate-500">Guarda estas credenciales. La contraseña no volverá a mostrarse.</p></div><button type="button" onClick={() => setPortalAccessNotice(null)} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100" aria-label="Cerrar"><span className="material-symbols-outlined">close</span></button></div><div className="mt-4 space-y-3 rounded-xl bg-[#f5f8fc] p-4 text-sm"><p><span className="text-slate-500">Usuario</span><strong className="ml-3 text-[#10264c]">{portalAccessNotice.username}</strong></p><p><span className="text-slate-500">Contraseña</span><strong className="ml-3 break-all text-[#10264c]">{portalAccessNotice.password}</strong></p></div><div className="mt-4 flex justify-end"><button type="button" onClick={() => setPortalAccessNotice(null)} className="h-9 rounded-lg bg-blue-700 px-4 text-xs font-bold text-white hover:bg-blue-800">He guardado las credenciales</button></div></div></div>}
      </div>
    </main>
  );
}
