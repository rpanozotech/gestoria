'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

const appointments = [
  ['09:00', '09:30', 'María López García', 'Revisión renta 2025', 'Reunión presencial', 'bg-[#e8f3ff] text-[#0568e8]', 'bg-[#3182e6]'],
  ['10:30', '11:00', 'Transportes del Sur, S.L.', 'Consulta sobre IVA intracomunitario', 'Videollamada', 'bg-[#ddfaec] text-[#0b9f66]', 'bg-[#0caf68]'],
  ['12:00', '12:30', 'Carlos Martínez Ruiz', 'Firma de documentos', 'Firma', 'bg-[#fff0da] text-[#ef8c00]', 'bg-[#ff9308]'],
  ['16:00', '16:30', 'Clínica SaludPlus', 'Revisión de facturación Q3', 'Reunión presencial', 'bg-[#e8f3ff] text-[#0568e8]', 'bg-[#3182e6]'],
  ['17:30', '18:00', 'Laura Sánchez', 'Consulta laboral', 'Llamada', 'bg-[#f0e7ff] text-[#7739df]', 'bg-[#7838e4]'],
];

const tasks = [
  ['Presentar modelo 303 - Q3', 'Transportes del Sur, S.L.', 'Urgente', 'Hoy', '25 oct', 'bg-[#ffe3e7] text-[#e32946]'],
  ['Revisar y enviar renta 2025', 'María López García', 'Alta', 'Hoy', '25 oct', 'bg-[#fff0d7] text-[#e58b00]'],
  ['Preparar contratos laborales', 'Clínica SaludPlus', 'Alta', 'Mañana', '26 oct', 'bg-[#fff0d7] text-[#e58b00]'],
  ['Responder consulta sobre IVA', 'Carlos Martínez Ruiz', 'Media', 'Mañana', '26 oct', 'bg-[#e4f1ff] text-[#0868d7]'],
  ['Revisar facturas pendientes', 'Varios clientes', 'Media', '', '27 oct', 'bg-[#e4f1ff] text-[#0868d7]'],
  ['Actualizar datos de cliente', 'Distribuciones Martín, S.L.', 'Baja', '', '28 oct', 'bg-[#dff9ed] text-[#0a9c62]'],
];

const clients = [
  ['ML', 'María López García', '12345678A', 'Particular', 'bg-[#4e83df]'],
  ['TS', 'Transportes del Sur, S.L.', 'B12345678', 'Empresa', 'bg-[#6d8de6]'],
  ['CM', 'Carlos Martínez Ruiz', '87654321B', 'Particular', 'bg-[#4b74c6]'],
  ['CS', 'Clínica SaludPlus', 'B87654321', 'Empresa', 'bg-[#697ce4]'],
  ['LS', 'Laura Sánchez', '45678912C', 'Particular', 'bg-[#794ce2]'],
];

const clientTones = ['bg-[#4e83df]', 'bg-[#6d8de6]', 'bg-[#4b74c6]', 'bg-[#697ce4]', 'bg-[#794ce2]'];

const documents = [
  ['picture_as_pdf', 'Renta_2025_Maria_Lopez.pdf', 'María López García', '25 oct 2026', '10:14', 'PDF', 'bg-[#ffe4e6] text-[#e32946]'],
  ['image', 'DNI_Carlos_Martinez.jpg', 'Carlos Martínez Ruiz', '25 oct 2026', '09:42', 'Imagen', 'bg-[#dff9ed] text-[#0a9c62]'],
  ['description', 'Contrato_laboral.docx', 'Clínica SaludPlus', '24 oct 2026', '18:20', 'Word', 'bg-[#e4f1ff] text-[#0868d7]'],
  ['picture_as_pdf', 'Modelo_303_Q3.pdf', 'Transportes del Sur, S.L.', '24 oct 2026', '16:05', 'PDF', 'bg-[#ffe4e6] text-[#e32946]'],
  ['description', 'Facturas_Q3.zip', 'Varios clientes', '24 oct 2026', '12:33', 'ZIP', 'bg-[#e8edf4] text-[#64748b]'],
];

function Icon({ children, className = '' }: { children: string; className?: string }) {
  return <span className={`material-symbols-outlined ${className}`}>{children}</span>;
}

function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-[14px] border border-[#dce6f3] bg-white shadow-[0_1px_3px_rgba(15,23,42,.08)] ${className}`}>{children}</section>;
}

export default function CRMDashboardPage() {
  const [recentClients, setRecentClients] = useState<Array<{ id: string; initials: string; name: string; bsn: string; type: string; tone: string }>>([]);

  useEffect(() => {
    let active = true;
    apiFetch('/clients').then(async (response) => {
      const payload = await response.json().catch(() => ({}));
      if (!active || !response.ok || !Array.isArray(payload.clients)) return;
      setRecentClients(payload.clients.slice(0, 8).map((client: any, index: number) => ({
        id: String(client.id),
        initials: String(client.full_name || 'CL').split(/\s+/).filter(Boolean).slice(0, 2).map((part: string) => part[0]).join('').toUpperCase(),
        name: client.full_name || 'Cliente',
        bsn: client.bsn || '—',
        type: client.type || 'Particular',
        tone: clientTones[index % clientTones.length],
      })));
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  const visibleClients = recentClients.length ? recentClients : clients.map(([initials, name, bsn, type, tone]) => ({ id: '', initials, name, bsn, type, tone }));

  return (
    <main className="crm-reference-page crm-dashboard flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#f3f7fd] px-0 py-0 text-[#10264c]">
      <header className="crm-dashboard-header flex shrink-0 items-start justify-between gap-6">
        <div>
          <p className="text-[15px] font-medium text-[#6a7e99]">Buenos días, Usuario</p>
          <h1 className="crm-dashboard-title mt-0.5 text-[40px] font-extrabold leading-[1.05] tracking-[-1.2px]">Mi trabajo de hoy</h1>
          <p className="crm-dashboard-subtitle mt-1 text-[16px] text-[#61768e]">Aquí tienes un resumen de lo más importante para hoy. <strong className="text-[#0568e8]">25 de octubre de 2026.</strong></p>
        </div>
        <div className="crm-dashboard-date mt-4 flex h-[72px] w-[316px] shrink-0 items-center gap-3 rounded-[14px] border border-[#dce6f3] bg-white px-4 shadow-[0_1px_3px_rgba(15,23,42,.08)]">
          <Icon className="text-[30px] text-[#5d7598]">calendar_month</Icon>
          <div><strong className="crm-dashboard-date-title block text-[14px]">Domingo, 25 de octubre de 2026</strong><span className="text-[13px] text-[#71839a]">Semana 43 · Quedan 67 días para finalizar el año</span></div>
        </div>
      </header>

      <div className="crm-dashboard-kpis mt-4 grid shrink-0 grid-cols-4 gap-3">
        {[
          ['groups', 'Clientes activos', '128', '+ 6%', 'vs. mes anterior', 'bg-[#e8f3ff] text-[#0568e8]', '/crm/clientes'],
            ['folder', 'Expedientes en curso', '86', '+ 12%', 'vs. mes anterior', 'bg-[#e2faee] text-[#0b9f66]', '/crm/expedientes'],
          ['description', 'Tareas pendientes', '12', '↓ -18%', 'vs. semana anterior', 'bg-[#fff0da] text-[#ef8c00]', '/crm/tareas'],
          ['euro', 'Cobros pendientes', '4.250 €', '+ 25%', 'vs. mes anterior', 'bg-[#ffe6e9] text-[#e32946]', '/crm/deudas'],
        ].map(([icon, label, value, change, detail, tone, href]) => (
          <Link key={label} href={href} className="crm-dashboard-kpi group flex h-[104px] items-start gap-4 rounded-[14px] border border-[#dce6f3] bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,.08)] transition hover:-translate-y-0.5 hover:shadow-md">
            <Icon className={`crm-dashboard-kpi-icon flex h-[56px] w-[56px] items-center justify-center rounded-[14px] text-[30px] leading-none ${tone}`}>{icon}</Icon>
            <div className="min-w-0"><span className="block text-[13px] font-medium text-[#5f7592]">{label}</span><strong className="mt-1 block text-[25px] leading-none tracking-[-.5px]">{value}</strong><span className="mt-2 block text-[12px] text-[#71839a]"><b className={tone.includes('e329') ? 'text-[#e32946]' : tone.includes('ef8c') ? 'text-[#ef8c00]' : 'text-[#0b9f66]'}>{change}</b> {detail}</span></div>
            <Icon className="ml-auto mt-2 text-[22px] text-[#7890ad]">chevron_right</Icon>
          </Link>
        ))}
      </div>

      <div className="crm-dashboard-main-grid mt-4 grid min-h-0 flex-1 grid-cols-[1.08fr_1fr] gap-4">
        <Panel className="crm-dashboard-main-panel min-h-0 overflow-y-auto p-4">
          <div className="flex items-center justify-between"><h2 className="flex items-center gap-3 text-[18px] font-extrabold"><Icon className="text-[26px] text-[#0568e8]">calendar_month</Icon>Agenda de hoy <span className="rounded-full bg-[#edf2f8] px-3 py-1 text-[12px] font-bold text-[#58708d]">5 citas</span></h2><Link href="/crm/agenda" className="rounded-[9px] border border-[#0568e8] px-4 py-2 text-[13px] font-bold text-[#0568e8]">＋ Nueva cita</Link></div>
          <div className="mt-3 divide-y divide-[#e5edf5]">{appointments.map(([start, end, client, title, tag, tagClass, dot]) => <Link key={client} href={`/crm/agenda?client=${encodeURIComponent(client)}&from=dashboard`} className="crm-dashboard-list-row grid h-[60px] grid-cols-[80px_1fr_170px_22px] items-center gap-3 rounded-lg px-1 transition hover:bg-[#f3f8ff]" aria-label={`Abrir agenda para ${client}`}><div className="border-r border-[#e3ebf4] text-[13px] font-bold leading-5"><span className="block">{start}</span><span className="font-normal text-[#7690ad]">{end}</span></div><div className="flex min-w-0 items-center gap-4"><span className={`h-3.5 w-3.5 shrink-0 rounded-full ${dot}`} /><div className="min-w-0"><strong className="block truncate text-[15px]">{client}</strong><span className="block truncate text-[13px] text-[#6d819b]">{title}</span></div></div><span className={`crm-dashboard-appointment-tag justify-self-start rounded-[10px] px-3 py-1.5 text-[11px] font-bold ${tagClass}`}><Icon className="mr-1.5 align-middle text-[15px]">{tag === 'Videollamada' ? 'videocam' : tag === 'Llamada' ? 'call' : tag === 'Firma' ? 'description' : 'location_on'}</Icon>{tag}</span><Icon className="text-[20px] text-[#58718f]">more_horiz</Icon></Link>)}</div>
          <Link href="/crm/agenda" className="mt-3 inline-flex items-center gap-2 rounded-[9px] border border-[#0568e8] px-4 py-2 text-[13px] font-bold text-[#0568e8]"><Icon className="text-[17px]">calendar_month</Icon>Ver agenda completa</Link>
        </Panel>
        <Panel className="crm-dashboard-main-panel min-h-0 overflow-y-auto p-4">
          <div className="flex items-center justify-between"><h2 className="flex items-center gap-3 text-[18px] font-extrabold"><Icon className="text-[26px] text-[#0568e8]">checklist</Icon>Tareas prioritarias <span className="rounded-full bg-[#edf2f8] px-3 py-1 text-[12px] font-bold text-[#58708d]">12</span></h2><Link href="/crm/tareas" className="text-[13px] font-bold text-[#0568e8]">Ver todas　›</Link></div>
          <div className="mt-3 divide-y divide-[#e5edf5]">{tasks.map(([title, client, priority, day, date, cls]) => <Link key={title} href={`/crm/tareas?client=${encodeURIComponent(client)}&from=dashboard`} className="crm-dashboard-list-row grid h-[60px] grid-cols-[28px_1fr_74px_78px] items-center gap-3 rounded-lg px-1 transition hover:bg-[#f3f8ff]" aria-label={`Abrir tarea ${title}`}><span className="h-5 w-5 rounded-[4px] border-2 border-[#9bb0c9]" /><div className="min-w-0"><strong className="block truncate text-[14px]">{title}</strong><span className="block truncate text-[13px] text-[#6d819b]">{client}</span></div><span className={`rounded-full px-3 py-1.5 text-center text-[12px] font-bold ${cls}`}>{priority}</span><span className="text-right text-[12px] text-[#6d819b]"><Icon className="mr-1 align-middle text-[17px]">calendar_month</Icon>{day && <>{day}<br /></>}{date}</span></Link>)}</div>
        </Panel>
      </div>

      <div className="crm-dashboard-lower-grid mt-4 grid h-[288px] shrink-0 grid-cols-[1.08fr_1fr] gap-4">
        <Panel className="crm-dashboard-lower-panel overflow-hidden p-4"><div className="flex items-center justify-between"><h2 className="flex items-center gap-3 text-[18px] font-extrabold"><Icon className="text-[25px] text-[#0568e8]">groups</Icon>Clientes recientes</h2><Link href="/crm/clientes" className="text-[13px] font-bold text-[#0568e8]">Ver todos　›</Link></div><div className="mt-3 divide-y divide-[#e5edf5]">{visibleClients.map((client) => <Link key={client.id || client.name} href={client.id ? `/crm/clientes/${encodeURIComponent(client.id)}` : `/crm/clientes?client=${encodeURIComponent(client.name)}&from=dashboard`} className="crm-dashboard-lower-row grid h-[39px] grid-cols-[36px_1fr_100px_90px_90px_20px] items-center gap-3 rounded-lg px-1 text-[13px] transition hover:bg-[#f3f8ff]" aria-label={`Abrir ficha de ${client.name}`}><span className={`flex h-8 w-8 items-center justify-center rounded-full font-bold text-white ${client.tone}`}>{client.initials}</span><strong className="truncate">{client.name}</strong><span className="text-[#607896]">{client.bsn}</span><span className="w-fit rounded-full bg-[#edf2f8] px-3 py-1 text-[#607896]">{client.type}</span><span className="text-[#0a9c62]">● Activo</span><Icon className="text-[18px] text-[#58718f]">more_horiz</Icon></Link>)}</div></Panel>
        <Panel className="crm-dashboard-lower-panel overflow-hidden p-4"><div className="flex items-center justify-between"><h2 className="flex items-center gap-3 text-[18px] font-extrabold"><Icon className="text-[25px] text-[#0568e8]">description</Icon>Documentos recientes</h2><Link href="/crm/documentos-ia" className="text-[13px] font-bold text-[#0568e8]">Ver todos　›</Link></div><div className="mt-3 divide-y divide-[#e5edf5]">{documents.map(([icon, file, client, date, time, type, cls]) => <Link key={file} href={`/crm/documentos-ia?file=${encodeURIComponent(file)}&from=dashboard`} className="crm-dashboard-lower-row grid h-[39px] grid-cols-[36px_1fr_100px_58px_20px] items-center gap-3 rounded-lg px-1 text-[13px] transition hover:bg-[#f3f8ff]" aria-label={`Abrir documento ${file}`}><Icon className={`flex h-8 w-8 items-center justify-center rounded-[8px] text-[20px] ${cls}`}>{icon}</Icon><div className="min-w-0"><strong className="block truncate">{file}</strong><span className="block truncate text-[#6d819b]">{client}</span></div><span className="text-[#607896]">{date}<br />{time}</span><span className={`w-fit rounded-[8px] px-3 py-1 font-bold ${cls}`}>{type}</span><Icon className="text-[18px] text-[#58718f]">more_horiz</Icon></Link>)}</div></Panel>
      </div>
    </main>
  );
}
