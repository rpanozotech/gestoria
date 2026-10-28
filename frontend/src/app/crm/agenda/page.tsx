'use client';

import { useState } from 'react';

type EventItem = { day: number; row: number; title: string; subtitle: string; time: string; color: string; client: string };
const events: EventItem[] = [
  { day: 0, row: 2, title: 'María López...', subtitle: 'Revisión renta', time: '09:00 - 09:30', color: 'blue', client: 'María López García' },
  { day: 0, row: 5, title: 'Carlos Martínez', subtitle: 'Firma de docu...', time: '12:00 - 12:30', color: 'purple', client: 'Carlos Martínez Ruiz' },
  { day: 0, row: 9, title: 'Clínica SaludPlus', subtitle: 'Facturación Q3', time: '16:00 - 16:30', color: 'blue', client: 'Clínica SaludPlus' },
  { day: 1, row: 3, title: 'Transportes del Sur', subtitle: 'Consulta IVA', time: '10:30 - 11:00', color: 'green', client: 'Transportes del Sur, S.L.' },
  { day: 1, row: 10, title: 'Laura Sánchez', subtitle: 'Consulta laboral', time: '17:30 - 18:00', color: 'pink', client: 'Laura Sánchez' },
  { day: 2, row: 2, title: 'Distribuciones...', subtitle: 'Seguimiento', time: '09:00 - 09:30', color: 'orange', client: 'Distribuciones Martín, S.L.' },
  { day: 2, row: 5, title: 'Javier Torres', subtitle: 'Asesoría fiscal', time: '12:00 - 12:30', color: 'blue', client: 'Javier Torres' },
  { day: 3, row: 4, title: 'Restaurantes Sol', subtitle: 'IVA trimestral', time: '11:00 - 11:30', color: 'purple', client: 'Restaurantes Sol' },
  { day: 3, row: 9, title: 'Elena Ruiz', subtitle: 'Contrato laboral', time: '15:00 - 15:30', color: 'green', client: 'Elena Ruiz' },
  { day: 4, row: 3, title: 'Construcciones...', subtitle: 'Revisión contratos', time: '10:00 - 10:30', color: 'blue', client: 'Construcciones Norte' },
  { day: 4, row: 10, title: 'Tecnología Norte', subtitle: 'Consulta mercantil', time: '16:30 - 17:00', color: 'orange', client: 'Tecnología Norte' },
  { day: 5, row: 2, title: 'Autoescuela Vial', subtitle: 'Facturas', time: '09:30 - 10:00', color: 'pink', client: 'Autoescuela Vial' },
  { day: 5, row: 6, title: 'Martín & Asociados', subtitle: 'Reunión anual', time: '13:00 - 13:30', color: 'purple', client: 'Martín & Asociados' },
  { day: 6, row: 4, title: 'García e Hijos', subtitle: 'Cierre mensual', time: '11:00 - 11:30', color: 'green', client: 'García e Hijos' },
];
const dayAppointments = [
  ['09:00 - 09:30', 'María López García', 'Revisión renta 2025', 'blue'],
  ['10:30 - 11:00', 'Transportes del Sur, S.L.', 'Consulta sobre IVA intracomunitario', 'green'],
  ['12:00 - 12:30', 'Carlos Martínez Ruiz', 'Firma de documentos', 'purple'],
  ['16:00 - 16:30', 'Clínica SaludPlus', 'Revisión de facturación Q3', 'blue'],
  ['17:30 - 18:00', 'Laura Sánchez', 'Consulta laboral', 'pink'],
];
const days = [['Dom', '25 oct'], ['Lun', '26 oct'], ['Mar', '27 oct'], ['Mié', '28 oct'], ['Jue', '29 oct'], ['Vie', '30 oct'], ['Sáb', '31 oct']];
const times = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];
const colors: Record<string, string> = { blue: 'border-[#1b73e8] bg-[#dcecff] text-[#075ec9]', green: 'border-[#0db477] bg-[#ddfaec] text-[#078c5b]', orange: 'border-[#f28b16] bg-[#fff0dc] text-[#d97800]', purple: 'border-[#7838e4] bg-[#eee5ff] text-[#6831c4]', pink: 'border-[#ee3972] bg-[#ffe5ee] text-[#cf225b]' };
const dots: Record<string, string> = { blue: 'bg-[#247ce5]', green: 'bg-[#0caf68]', orange: 'bg-[#ff9308]', purple: 'bg-[#7838e4]', pink: 'bg-[#ee3972]' };

function Icon({ children, className = '' }: { children: string; className?: string }) { return <span className={`material-symbols-outlined ${className}`}>{children}</span>; }

export default function CRMAgendaPage() {
  const [selected, setSelected] = useState<string[]>(dayAppointments[0]);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'new' | 'edit' | 'reschedule'>('new');
  const [status, setStatus] = useState('Confirmada');
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [weekOffset, setWeekOffset] = useState(0);
  const [dayPanelOffset, setDayPanelOffset] = useState(0);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [advisorFilter, setAdvisorFilter] = useState('all');
  const baseDate = new Date(2026, 9, 25);
  const weekStart = new Date(baseDate);
  weekStart.setDate(baseDate.getDate() + weekOffset * 7);
  const weekDates = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    return date;
  });
  const formatShortDate = (date: Date) => `${date.getDate()} ${date.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '')}`;
  const formatLongDate = (date: Date) => date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const weekLabel = `${formatShortDate(weekDates[0])} - ${formatShortDate(weekDates[6])} ${weekDates[6].getFullYear()}`;
  const filteredEvents = events.filter((event) => {
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || `${event.client} ${event.title} ${event.subtitle}`.toLowerCase().includes(query);
    const matchesType = typeFilter === 'all' || (typeFilter === 'meeting' ? event.color === 'blue' : typeFilter === 'call' ? event.color === 'pink' : typeFilter === 'signature' ? event.color === 'orange' : typeFilter === 'video' ? event.color === 'green' : event.color === 'purple');
    const matchesStatus = statusFilter === 'all' || statusFilter === status.toLowerCase();
    const matchesAdvisor = advisorFilter === 'all' || advisorFilter === 'test-user';
    return matchesSearch && matchesType && matchesStatus && matchesAdvisor && weekOffset === 0;
  });
  const selectedDayAppointments = weekOffset === 0 && dayPanelOffset === 0 ? dayAppointments : [];
  const filteredDayAppointments = selectedDayAppointments.filter((item) => {
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || item.slice(0, 3).join(' ').toLowerCase().includes(query);
    const matchesType = typeFilter === 'all' || (typeFilter === 'meeting' ? item[3] === 'blue' : typeFilter === 'call' ? item[3] === 'pink' : typeFilter === 'signature' ? item[3] === 'orange' : typeFilter === 'video' ? item[3] === 'green' : item[3] === 'purple');
    const matchesStatus = statusFilter === 'all' || statusFilter === status.toLowerCase();
    const matchesAdvisor = advisorFilter === 'all' || advisorFilter === 'test-user';
    return matchesSearch && matchesType && matchesStatus && matchesAdvisor;
  });
  const openAppointmentModal = (mode: 'new' | 'edit' | 'reschedule') => {
    setModalMode(mode);
    setShowModal(true);
  };
  const exportAgenda = () => {
    const csv = ['Hora,Cliente,Asunto', ...dayAppointments.map((item) => item.slice(0, 3).map((value) => `"${value.replaceAll('"', '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'agenda-25-10-2026.csv';
    link.click();
    URL.revokeObjectURL(url);
  };
  return (
    <main className="crm-agenda-reference flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#f3f7fd] text-[#10264c]">
      <style jsx global>{`
        /* La agenda debe conservar el encabezado y permitir consultar todas las horas
           dentro del calendario, sin empujar ni recortar el panel lateral. */
        .crm-agenda-reference > div.mt-4.grid { grid-template-columns: minmax(0, 1fr) 380px; }
        .crm-agenda-reference > div.mt-4.grid > section { display: flex; min-height: 0; flex-direction: column; }
        .crm-agenda-reference > div.mt-4.grid > section > div.grid:nth-child(2) { min-height: 0; flex: 1 1 auto; overflow-y: auto; }
        .crm-agenda-reference > div.mt-4.grid > aside { min-height: 0; overflow: hidden; }
        .crm-agenda-reference > div.mt-4.grid > aside > section:first-child { max-height: 250px; flex-shrink: 0; overflow-y: auto; }
        .crm-agenda-reference > div.mt-4.grid > aside > section:last-child { min-height: 0; overflow-y: auto; }
        @media (max-width: 1100px) {
          .crm-agenda-reference > div.mt-4.grid { grid-template-columns: minmax(0, 1fr) 340px; }
        }
      `}</style>
      <header className="flex shrink-0 items-start justify-between gap-5">
        <div><p className="text-[15px] font-medium text-[#6a7e99]">Agenda y citas</p><h1 className="mt-0.5 text-[40px] font-extrabold leading-[1.05] tracking-[-1.2px]">Agenda</h1><p className="mt-1 text-[16px] text-[#61768e]">Gestiona tus citas y reuniones. Semana del <strong className="text-[#0568e8] capitalize">{formatLongDate(weekDates[0])}.</strong></p></div>
        <div className="flex items-center gap-1.5"><button onClick={() => { setWeekOffset((value) => value - 1); setDayPanelOffset(0); }} aria-label="Semana anterior" className="ml-3 h-10 w-10 rounded-[9px] border border-[#dce6f3] bg-white"><Icon>chevron_left</Icon></button><button onClick={() => { setWeekOffset(0); setDayPanelOffset(0); }} aria-label="Ir a hoy" className="h-10 rounded-[9px] border border-[#dce6f3] bg-white px-4 text-[13px] font-bold"><Icon className="mr-2 align-middle text-[18px]">calendar_month</Icon>Hoy</button><button onClick={() => { setWeekOffset((value) => value + 1); setDayPanelOffset(0); }} aria-label="Semana siguiente" className="h-10 w-10 rounded-[9px] border border-[#dce6f3] bg-white"><Icon>chevron_right</Icon></button></div>
        <div className="flex items-center gap-1.5"><button onClick={() => setViewMode('week')} className={`h-10 rounded-[9px] px-5 text-[13px] font-bold ${viewMode === 'week' ? 'bg-[#0568e8] text-white' : 'border border-[#dce6f3] bg-white text-[#10264c]'}`}>Semana</button><button onClick={() => setViewMode('month')} className={`h-10 rounded-[9px] px-5 text-[13px] font-bold ${viewMode === 'month' ? 'bg-[#0568e8] text-white' : 'border border-[#dce6f3] bg-white text-[#10264c]'}`}>Mes</button></div>
        <div className="flex h-[58px] w-[283px] items-center gap-3 rounded-[13px] border border-[#dce6f3] bg-white px-4 shadow-[0_1px_3px_rgba(15,23,42,.08)]"><Icon className="text-[28px] text-[#5d7598]">calendar_month</Icon><div><strong className="block text-[14px] capitalize">{formatLongDate(weekDates[0])}</strong><span className="text-[12px] text-[#71839a]">Semana {43 + weekOffset} · {weekLabel}</span></div></div>
      </header>
      <div className="mt-4 flex shrink-0 items-center gap-3"><label className="flex h-11 w-[164px] items-center justify-between rounded-[9px] border border-[#dce6f3] bg-white px-4 text-[13px] font-semibold"> <select aria-label="Filtrar por tipo" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="w-full bg-transparent outline-none"><option value="all">Todos los tipos</option><option value="meeting">Reunión</option><option value="video">Videollamada</option><option value="signature">Firma</option><option value="call">Llamada</option><option value="followup">Seguimiento</option></select></label><label className="flex h-11 w-[164px] items-center justify-between rounded-[9px] border border-[#dce6f3] bg-white px-4 text-[13px] font-semibold"><select aria-label="Filtrar por estado" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="w-full bg-transparent outline-none"><option value="all">Todos los estados</option><option value="confirmada">Confirmada</option><option value="completada">Completada</option></select></label><label className="flex h-11 w-[164px] items-center justify-between rounded-[9px] border border-[#dce6f3] bg-white px-4 text-[13px] font-semibold"><select aria-label="Filtrar por asesor" value={advisorFilter} onChange={(event) => setAdvisorFilter(event.target.value)} className="w-full bg-transparent outline-none"><option value="all">Todos los asesores</option><option value="test-user">Usuario de prueba</option></select></label><label className="flex h-11 flex-1 items-center gap-3 rounded-[9px] border border-[#dce6f3] bg-white px-4 text-[13px] text-[#71839a]"><Icon className="text-[22px]">search</Icon><input value={search} onChange={(event) => setSearch(event.target.value)} className="w-full bg-transparent outline-none" placeholder="Buscar en la agenda..." aria-label="Buscar en la agenda" /></label><button onClick={exportAgenda} className="h-11 w-[151px] rounded-[9px] border border-[#0568e8] bg-white text-[13px] font-bold text-[#0568e8]"><Icon className="mr-2 align-middle text-[18px]">download</Icon>Exportar</button><button onClick={() => openAppointmentModal('new')} className="h-11 w-[145px] rounded-[9px] bg-[#0568e8] text-[13px] font-bold text-white">＋ Nueva cita</button></div>
      <div className="mt-4 grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_404px] gap-4">
        <section className="min-h-0 overflow-hidden rounded-[14px] border border-[#dce6f3] bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,.08)]">
          {viewMode === 'week' ? <><div className="grid grid-cols-[52px_repeat(7,minmax(0,1fr))] border-b border-[#dce6f3]"><div />{weekDates.map((date, index) => <div key={date.toISOString()} className={`flex h-[66px] flex-col items-center justify-center text-[13px] font-bold ${index === 0 && weekOffset === 0 ? 'bg-[#edf5ff] text-[#0568e8]' : ''}`}><span>{days[index][0]}</span><b className={`mt-1 ${index === 0 && weekOffset === 0 ? 'flex h-8 w-8 items-center justify-center rounded-full bg-[#0568e8] text-white' : ''}`}>{formatShortDate(date)}</b></div>)}</div><div className="grid min-h-0 grid-cols-[52px_repeat(7,minmax(0,1fr))]"><div>{times.map((time) => <div key={time} className="h-[57px] pr-2 pt-1 text-right text-[12px] text-[#718aa9]">{time}</div>)}</div><div className="col-span-7 grid grid-cols-7">{Array.from({ length: 7 }).map((_, day) => <div key={day} className="relative border-l border-[#e7eef6]">{times.map((time) => <div key={time} className="h-[57px] border-b border-[#e7eef6]" />)}{filteredEvents.filter((event) => event.day === day).map((event) => <button key={`${event.day}-${event.row}-${event.title}`} onClick={() => setSelected([event.time, event.client, event.subtitle, event.color])} className={`absolute left-1 right-1 h-[57px] overflow-hidden rounded-[7px] border-l-[4px] px-2 py-1 text-left text-[11px] leading-4 shadow-sm ${colors[event.color]}`} style={{ top: `${event.row * 57}px` }}><b className="block">{event.time}</b><strong className="block truncate">{event.title}</strong><span className="block truncate">{event.subtitle}</span></button>)}</div>)}</div></div></> : <div className="grid min-h-0 grid-cols-7 gap-px overflow-auto bg-[#e7eef6] p-px">{Array.from({ length: 35 }, (_, index) => { const date = new Date(weekDates[0].getFullYear(), weekDates[0].getMonth(), 1 + index); const dayEvents = weekOffset === 0 && date.getDate() >= 25 && date.getDate() <= 31 ? events.filter((event) => event.day === date.getDate() - 25) : []; return <div key={date.toISOString()} className="min-h-[108px] bg-white p-2 text-[12px]"><b className="text-[#506b8f]">{date.getDate()}</b>{dayEvents.map((event) => <button key={event.title} onClick={() => setSelected([event.time, event.client, event.subtitle, event.color])} className={`mt-2 block w-full truncate rounded px-2 py-1 text-left text-[11px] ${colors[event.color]}`}>{event.time} · {event.client}</button>)}</div>; })}</div>}
        </section>
        <aside className="flex min-h-0 flex-col gap-3 overflow-y-auto pr-1">
          <section className="rounded-[14px] border border-[#dce6f3] bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,.08)]"><div className="flex items-center justify-between"><h2 className="flex items-center gap-3 text-[18px] font-extrabold"><Icon className="text-[25px] text-[#0568e8]">calendar_month</Icon>Citas del día <span className="rounded-full bg-[#edf2f8] px-3 py-1 text-[12px] text-[#58708d]">{filteredDayAppointments.length}</span></h2><div className="flex items-center gap-1"><button type="button" aria-label="Día anterior" onClick={() => setDayPanelOffset((value) => Math.max(0, value - 1))} className="rounded p-1 text-[22px] text-[#0568e8] hover:bg-[#edf5ff]"><Icon>chevron_left</Icon></button><button type="button" aria-label="Día siguiente" onClick={() => setDayPanelOffset((value) => Math.min(6, value + 1))} className="rounded p-1 text-[22px] text-[#0568e8] hover:bg-[#edf5ff]"><Icon>chevron_right</Icon></button></div></div><div className="mt-3">{filteredDayAppointments.map((item) => <button key={item[1]} onClick={() => setSelected(item)} className={`flex w-full items-start gap-4 border-b border-[#e5edf5] px-3 py-3 text-left ${selected[1] === item[1] ? 'rounded-[8px] border border-[#6fa5ee] bg-[#eaf4ff]' : ''}`}><span className={`mt-1 h-3.5 w-3.5 shrink-0 rounded-full ${dots[item[3]]}`} /><span><b className="block text-[13px] text-[#58708d]">{item[0]}</b><strong className="block text-[14px]">{item[1]}</strong><span className="block text-[13px] text-[#6d819b]">{item[2]}</span></span><Icon className="ml-auto mt-2 text-[20px] text-[#0568e8]">chevron_right</Icon></button>)}{filteredDayAppointments.length === 0 && <p className="p-4 text-sm text-[#71839a]">No hay citas que coincidan con los filtros.</p>}</div></section>
          <section className="min-h-0 flex-1 rounded-[14px] border border-[#dce6f3] bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,.08)]"><div className="flex items-start justify-between"><div><h2 className="flex items-center gap-3 text-[18px] font-extrabold"><Icon className="text-[25px] text-[#506b8f]">event</Icon>Cita seleccionada</h2><h3 className="mt-3 text-[20px] font-extrabold">{selected[1]}</h3><p className="text-[14px] text-[#6d819b]">{selected[2]}</p></div><button onClick={() => openAppointmentModal('edit')} className="rounded-[8px] border border-[#bcd4f5] px-3 py-2 text-[12px] font-bold text-[#0568e8]">Editar</button></div><span className="mt-3 inline-flex rounded-full bg-[#dff9ed] px-3 py-1.5 text-[12px] font-bold text-[#0a9c62]">● {status}</span><div className="mt-4 space-y-4 text-[13px]"><p><Icon className="mr-3 align-middle text-[21px] text-[#506b8f]">schedule</Icon><b>Fecha y hora</b><span className="float-right text-right capitalize">{formatLongDate(weekDates[0])}<br />{selected[0]} (30 minutos)</span></p><p><Icon className="mr-3 align-middle text-[21px] text-[#506b8f]">person</Icon><b>Cliente</b><span className="float-right text-right">{selected[1]}<br />Particular · 12345678A</span></p><p><Icon className="mr-3 align-middle text-[21px] text-[#506b8f]">location_on</Icon><b>Ubicación</b><span className="float-right">Reunión presencial</span></p><p><Icon className="mr-3 align-middle text-[21px] text-[#506b8f]">description</Icon><b>Tipo de cita</b><span className="float-right">Asesoría fiscal</span></p></div><div className="mt-5 grid grid-cols-3 gap-2"><button onClick={() => setStatus('Confirmada')} className="h-11 rounded-[8px] bg-[#0568e8] text-[12px] font-bold text-white">✓ Confirmar</button><button onClick={() => openAppointmentModal('reschedule')} className="h-11 rounded-[8px] border border-[#0568e8] text-[12px] font-bold text-[#0568e8]">Reprogramar</button><button onClick={() => setStatus('Completada')} className="h-11 rounded-[8px] border border-[#0568e8] text-[12px] font-bold text-[#0568e8]">Completar</button></div></section>
        </aside>
      </div>
      {showModal && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#10264c]/30 p-6"><div role="dialog" aria-modal="true" aria-labelledby="appointment-modal-title" className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-center justify-between"><h2 id="appointment-modal-title" className="text-xl font-extrabold">{modalMode === 'new' ? 'Nueva cita' : modalMode === 'edit' ? 'Editar cita' : 'Reprogramar cita'}</h2><button aria-label="Cerrar ventana" onClick={() => setShowModal(false)}><Icon>close</Icon></button></div><p className="mt-2 text-sm text-[#61768e]">{modalMode === 'new' ? 'Crea una cita desde la vista Agenda.' : `Actualiza la cita de ${selected[1]}.`}</p><input defaultValue={modalMode === 'new' ? '' : selected[2]} className="mt-5 h-11 w-full rounded-lg border border-[#dce6f3] px-3" placeholder="Título de la cita" /><div className="mt-5 flex justify-end gap-2"><button onClick={() => setShowModal(false)} className="rounded-lg border px-4 py-2">Cancelar</button><button onClick={() => setShowModal(false)} className="rounded-lg bg-[#0568e8] px-4 py-2 font-bold text-white">{modalMode === 'reschedule' ? 'Guardar nueva hora' : 'Guardar cita'}</button></div></div></div>}
    </main>
  );
}
