'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';

type ClientDetail = { client: Record<string, any>; dossiers: any[]; quotes: any[]; invoices: any[]; appointments: any[]; service_requests: any[]; documents: any[]; messages: any[]; audit: any[]; tasks: any[] };
const money = (value: unknown) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(Number(value || 0));

export default function ClienteFichaPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<ClientDetail | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    apiFetch('/clients/' + encodeURIComponent(params.id))
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || 'No se pudo cargar la ficha del cliente.');
        if (active) setData(payload);
      })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : 'Error al cargar el cliente.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [params.id]);

  if (loading) return <main className="p-6" role="status">Cargando ficha del cliente…</main>;
  if (error || !data?.client) return <main className="space-y-4 p-6"><p role="alert" className="text-red-700">{error || 'Cliente no encontrado.'}</p><Link className="text-blue-700 underline" href="/crm/clientes">Volver al directorio</Link></main>;

  const client = data.client;
  const lists: Array<[string, any[]]> = [['Expedientes', data.dossiers], ['Solicitudes de servicio', data.service_requests], ['Facturas', data.invoices], ['Presupuestos', data.quotes], ['Citas', data.appointments], ['Documentos', data.documents], ['Tareas', data.tasks], ['Mensajes', data.messages], ['Historial de cambios', data.audit]];
  const billed = data.invoices.reduce((sum, invoice) => sum + Number(invoice.total || 0), 0);

  return <main className="h-full overflow-y-auto space-y-4 p-4 sm:p-6"><header className="flex flex-wrap items-center justify-between gap-3"><div><Link href="/crm/clientes" className="text-sm text-blue-700 underline">← Clientes</Link><h1 className="mt-2 text-2xl font-bold text-slate-900">{client.full_name}</h1><p className="text-sm text-slate-600">Ficha basada en los registros actuales del CRM · {client.status || 'estado no indicado'}</p></div></header>
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><article className="rounded-xl border bg-white p-4"><span className="text-xs text-slate-500">Expedientes</span><strong className="mt-1 block text-xl">{data.dossiers.length}</strong></article><article className="rounded-xl border bg-white p-4"><span className="text-xs text-slate-500">Citas</span><strong className="mt-1 block text-xl">{data.appointments.length}</strong></article><article className="rounded-xl border bg-white p-4"><span className="text-xs text-slate-500">Facturas (total emitido)</span><strong className="mt-1 block text-xl">{money(billed)}</strong></article><article className="rounded-xl border bg-white p-4"><span className="text-xs text-slate-500">Documentos</span><strong className="mt-1 block text-xl">{data.documents.length}</strong></article></section>
    <section className="rounded-xl border bg-white p-4"><h2 className="mb-3 text-lg font-bold">Datos registrados</h2><dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">{[['Correo',client.email],['Teléfono',client.phone],['BSN',client.bsn],['DigiD',client.digid_status],['Dirección',client.address],['Ciudad',client.city],['País',client.country],['Código postal',client.postal_code]].map(([label,value])=><div key={label}><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-0.5 break-words">{value || 'Sin dato'}</dd></div>)}</dl></section>
    {lists.map(([title, rows])=><section key={title} className="rounded-xl border bg-white p-4"><h2 className="mb-3 text-lg font-bold">{title} <span className="text-sm font-normal text-slate-500">({rows.length})</span></h2>{rows.length===0?<p className="text-sm text-slate-500">No hay registros.</p>:<ul className="divide-y">{rows.map((row:any,index:number)=><li key={row.id || index} className="py-3 text-sm"><strong>{row.title || row.code || row.file_name || row.action || row.body || row.reference || title}</strong><span className="ml-2 text-slate-600">{row.status || row.created_at || row.appointment_date || ''}</span></li>)}</ul>}</section>)}
  </main>;
}
