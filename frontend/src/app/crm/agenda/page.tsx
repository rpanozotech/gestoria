'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';

interface Appointment {
  id: string;
  title: string;
  client_name: string;
  client_phone: string;
  appointment_date: string; // YYYY-MM-DD
  appointment_time: string; // HH:MM:SS
  modality: 'llamada' | 'presencial' | 'online_meet';
  // 'cancelada' la devuelve el backend desde siempre pero no estaba en el
  // tipo, asi que comparar contra ella daba error de compilacion.
  status: 'confirmada' | 'completada' | 'pendiente' | 'cancelada';
  notes?: string;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const WEEK_DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function formatLongDate(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const monthNames = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];
  return `${dayNames[date.getDay()]}, ${d} de ${monthNames[m - 1]} de ${y}`;
}

export default function CRMAgendaPage() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  // Modo de visualización: Calendario Mensual (por defecto) o Lista
  const [viewMode, setViewMode] = useState<'calendario' | 'lista'>('calendario');

  // Estado del calendario mensual (Octubre 2026)
  const [calendarYear, setCalendarYear] = useState<number>(2026);
  const [calendarMonth, setCalendarMonth] = useState<number>(9); // 9 = Octubre (0-indexed)
  const [selectedDate, setSelectedDate] = useState<string>('2026-10-10');

  // Filtros
  const [filterModality, setFilterModality] = useState<'todas' | 'llamada' | 'presencial' | 'online_meet'>('todas');
  const [searchQuery, setSearchQuery] = useState('');

  // Modales
  const [showNewAptModal, setShowNewAptModal] = useState(false);
  const [aptClientName, setAptClientName] = useState('');
  const [aptPhone, setAptPhone] = useState('');
  const [clientOptions, setClientOptions] = useState<any[]>([]);
  const [aptTitle, setAptTitle] = useState('Consulta Telefónica Gestoría');
  const [aptDate, setAptDate] = useState('2026-10-10');
  const [aptTime, setAptTime] = useState('11:00');
  const [aptModality, setAptModality] = useState<'llamada' | 'presencial' | 'online_meet'>('llamada');

  const [meetModal, setMeetModal] = useState<string | null>(null);
  const [callModal, setCallModal] = useState<{ client: string; phone: string } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastTipo, setToastTipo] = useState<'exito' | 'error'>('exito');

  /** Los fallos se muestran en rojo: un error con check verde es peor que no avisar. */
  const showToast = (msg: string, tipo: 'exito' | 'error' = 'exito') => {
    setToastMessage(msg);
    setToastTipo(tipo);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    apiFetch('/clients').then((res) => res.ok ? res.json() : Promise.reject(new Error('clients'))).then((data) => setClientOptions(Array.isArray(data.clients) ? data.clients : [])).catch(() => setClientOptions([]));
  }, []);

  // Cargar citas reales de la API backend si está disponible
  useEffect(() => {
    apiFetch('/appointments')
      .then((res) => {
        if (!res.ok) throw new Error('No se pudieron cargar las citas.');
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data.appointments)) {
          const mapped: Appointment[] = data.appointments.map((a: any) => ({
            id: String(a.id),
            title: a.title,
            client_name: a.client_name || a.full_name || 'Cliente',
            client_phone: a.client_phone || a.phone || '',
            appointment_date: typeof a.appointment_date === 'string' ? a.appointment_date.slice(0, 10) : a.appointment_date,
            appointment_time: a.appointment_time,
            modality: a.modality || 'llamada',
            status: a.status || 'confirmada',
            notes: a.notes || '',
          }));
          setAppointments(mapped);
        }
      })
      .catch((error) => console.error('Error al cargar citas del CRM:', error));
  }, []);

  // Navegación entre meses
  const handlePrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear((y) => y - 1);
    } else {
      setCalendarMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear((y) => y + 1);
    } else {
      setCalendarMonth((m) => m + 1);
    }
  };

  const handleGoToDefaultOct2026 = () => {
    setCalendarYear(2026);
    setCalendarMonth(9);
    setSelectedDate('2026-10-10');
  };

  // Cuadrícula de días mensual
  const calendarGrid = useMemo(() => {
    const firstDayOfMonth = new Date(calendarYear, calendarMonth, 1);
    let startingDay = firstDayOfMonth.getDay() - 1;
    if (startingDay === -1) startingDay = 6;

    const daysInCurrentMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(calendarYear, calendarMonth, 0).getDate();

    const days: {
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
    }[] = [];

    // Días del mes previo
    for (let i = startingDay - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevMonth = calendarMonth === 0 ? 11 : calendarMonth - 1;
      const prevYear = calendarMonth === 0 ? calendarYear - 1 : calendarYear;
      const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      days.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: false,
      });
    }

    // Días del mes actual.
    // OJO: toISOString() devuelve la fecha en UTC. Entre las 00:00 y las
    // 02:00 hora de Amsterdam (UTC+2) eso es el dia ANTERIOR, y la agenda
    // marcaria "hoy" en el dia equivocado. Se formatea en hora local.
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
      });
    }

    // Relleno mes siguiente (35 o 42 casillas)
    const targetLength = days.length <= 35 ? 35 : 42;
    const paddingNeeded = targetLength - days.length;
    for (let d = 1; d <= paddingNeeded; d++) {
      const nextMonth = calendarMonth === 11 ? 0 : calendarMonth + 1;
      const nextYear = calendarMonth === 11 ? calendarYear + 1 : calendarYear;
      const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: false,
      });
    }

    return days;
  }, [calendarYear, calendarMonth]);

  // Agrupar citas por fecha
  const appointmentsMap = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    for (const apt of appointments) {
      if (!map[apt.appointment_date]) {
        map[apt.appointment_date] = [];
      }
      map[apt.appointment_date].push(apt);
    }
    return map;
  }, [appointments]);

  // Citas del día seleccionado
  const selectedDayAppointments = useMemo(() => {
    const list = appointmentsMap[selectedDate] || [];
    return list.filter((a) => {
      const matchesModality = filterModality === 'todas' || a.modality === filterModality;
      const matchesSearch =
        searchQuery === '' ||
        a.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.title.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesModality && matchesSearch;
    });
  }, [appointmentsMap, selectedDate, filterModality, searchQuery]);

  // Estadísticas del mes actual visible
  const monthStats = useMemo(() => {
    const currentMonthPrefix = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}`;
    const monthApts = appointments.filter((a) => a.appointment_date.startsWith(currentMonthPrefix));
    return {
      total: monthApts.length,
      llamadas: monthApts.filter((a) => a.modality === 'llamada').length,
      online_meet: monthApts.filter((a) => a.modality === 'online_meet').length,
      presencial: monthApts.filter((a) => a.modality === 'presencial').length,
    };
  }, [appointments, calendarYear, calendarMonth]);

  const isBackendAppointmentId = (id: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

  const handleToggleComplete = async (id: string) => {
    const current = appointments.find((a) => a.id === id);
    if (!current) return;
    const nextStatus = current.status === 'completada' ? 'confirmada' : 'completada';

    if (isBackendAppointmentId(id)) {
      try {
        const res = await apiFetch(`/appointments/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: nextStatus }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          showToast(data.error || 'No se pudo actualizar la cita.', 'error');
          return;
        }
      } catch {
        showToast('Error de conexión al actualizar la cita.', 'error');
        return;
      }
    }

    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status: nextStatus } : a)));
    showToast(nextStatus === 'completada' ? 'Cita marcada como completada.' : 'Cita reabierta.');
  };

  const handleExportAgendaCsv = () => {
    let csv = '\uFEFF"ID";"Titulo";"Cliente";"Telefono";"Fecha";"Hora";"Modalidad";"Estado";"Notas"\r\n';
    appointments.forEach((a) => {
      csv += `"${a.id}";"${a.title}";"${a.client_name}";"${a.client_phone || ''}";"${a.appointment_date}";"${a.appointment_time}";"${a.modality}";"${a.status}";"${(a.notes || '').replace(/"/g, '""')}"\r\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexusgest-agenda-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    showToast(`¡${appointments.length} citas exportadas a CSV con éxito!`);
  };

  // Eliminar cita: llama al backend. Antes solo la quitaba de la pantalla.
  // Para conservar constancia de una cita que el cliente ya tenía, usar
  // "Marcar cancelada" en su lugar.
  const handleDeleteAppointment = async (id: string) => {
    if (!confirm('¿Eliminar esta cita de la agenda?\n\nSe borrará del servidor. Si solo quieres dejar constancia de que se canceló, usa "Marcar cancelada".')) {
      return;
    }

    if (!isBackendAppointmentId(id)) {
      setAppointments((prev) => prev.filter((a) => a.id !== id));
      showToast('Cita eliminada de la agenda.');
      return;
    }

    try {
      const res = await apiFetch(`/appointments/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        showToast(data.error || 'No se pudo eliminar la cita.', 'error');
        return;
      }

      setAppointments((prev) => prev.filter((a) => a.id !== id));
      showToast('Cita eliminada.');
    } catch {
      showToast('Error de conexión al eliminar la cita.', 'error');
    }
  };

  // Marcar cancelada: conserva el registro en vez de borrarlo. Es lo
  // correcto cuando el cliente ya tenía la cita reservada.
  const handleCancelAppointment = async (id: string) => {
    if (!confirm('¿Marcar esta cita como cancelada?\n\nSe conserva en el historial; no se elimina de la agenda.')) {
      return;
    }

    if (!isBackendAppointmentId(id)) {
      setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status: 'cancelada' } : a)));
      showToast('Cita marcada como cancelada.');
      return;
    }

    try {
      const res = await apiFetch(`/appointments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'cancelada' }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        showToast(data.error || 'No se pudo actualizar la cita.', 'error');
        return;
      }

      setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status: 'cancelada' } : a)));
      showToast('Cita marcada como cancelada.');
    } catch {
      showToast('Error de conexión al actualizar la cita.', 'error');
    }
  };

  const handleOpenNewForDate = (dateStr?: string) => {
    const targetDate = dateStr || selectedDate;
    setAptDate(targetDate);
    setAptModality('llamada');
    setAptTitle('Consulta Telefónica Gestoría');
    setShowNewAptModal(true);
  };

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    const notes = `Cita registrada como: ${
      aptModality === 'llamada'
        ? 'Llamada telefónica'
        : aptModality === 'presencial'
        ? 'Solo presencial'
        : 'Videollamada Google Meet'
    }`;

    let newApt: Appointment | null = null;
    try {
      const clientsResponse = await apiFetch(`/clients?search=${encodeURIComponent(aptClientName)}`);
      const clientsData = clientsResponse.ok ? await clientsResponse.json() : {};
      const matchedClient = (clientsData.clients || []).find((client: any) =>
        String(client.full_name || '').trim().toLowerCase() === aptClientName.trim().toLowerCase()
      );
      const response = await apiFetch('/appointments', {
        method: 'POST',
        body: JSON.stringify({
          client_id: matchedClient?.id,
          full_name: aptClientName,
          phone: aptPhone,
          title: aptTitle,
          appointment_date: aptDate,
          appointment_time: `${aptTime}:00`,
          duration_minutes: 30,
          modality: aptModality,
          notes,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'No se pudo guardar la cita.');
      const saved = data.appointment;
      newApt = {
        id: String(saved.id),
        title: saved.title,
        client_name: aptClientName,
        client_phone: aptPhone,
        appointment_date: String(saved.appointment_date).slice(0, 10),
        appointment_time: saved.appointment_time,
        modality: saved.modality,
        status: saved.status,
        notes: saved.notes || notes,
      };
    } catch (error) {
      if (process.env.NODE_ENV === 'production') {
        showToast(error instanceof Error ? error.message : 'No se pudo guardar la cita.', 'error');
        return;
      }
      // El modo local permite probar la interfaz sin PostgreSQL.
      newApt = {
        id: String(Date.now()),
        title: aptTitle,
        client_name: aptClientName,
        client_phone: aptPhone,
        appointment_date: aptDate,
        appointment_time: `${aptTime}:00`,
        modality: aptModality,
        status: 'confirmada',
        notes,
      };
      showToast('Cita guardada solo en modo local: PostgreSQL no responde.', 'error');
    }

    if (!newApt) return;

    setAppointments([newApt, ...appointments]);
    setSelectedDate(aptDate);

    const [y, m] = aptDate.split('-').map(Number);
    if (y !== calendarYear || m - 1 !== calendarMonth) {
      setCalendarYear(y);
      setCalendarMonth(m - 1);
    }

    setShowNewAptModal(false);
    showToast(`Cita agendada para el ${formatLongDate(aptDate)}.`);
  };

  const gridRowsCount = calendarGrid.length / 7;

  return (
    <div className="h-full flex flex-col space-y-2.5 overflow-hidden">
      {/* Toast de Notificaciones */}
      {toastMessage && (
        <div
          role={toastTipo === 'error' ? 'alert' : 'status'}
          className={`fixed top-20 right-8 z-50 px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2.5 border animate-in fade-in duration-200 ${
            toastTipo === 'error'
              ? 'bg-red-50 text-red-800 border-red-300'
              : 'bg-slate-900 text-white border-secondary/40'
          }`}
        >
          <span
            className={`material-symbols-outlined text-lg ${
              toastTipo === 'error' ? 'text-red-600' : 'text-secondary'
            }`}
          >
            {toastTipo === 'error' ? 'error' : 'check_circle'}
          </span>
          <span className="text-xs font-medium">{toastMessage}</span>
        </div>
      )}

      {/* 1. BARRA SUPERIOR INTEGRADA: Título, Navegación de Mes, KPIs y Acciones (Sin ocupar altura excesiva) */}
      <div className="p-2 sm:px-3 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-xs flex flex-wrap items-center justify-between gap-2.5 shrink-0">
        {/* Título & Navegación de Mes */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5">
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-on-surface">Agenda</h1>
            <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-secondary/10 text-secondary">
              Mensual
            </span>
          </div>

          <div className="h-4 w-px bg-surface-container hidden sm:block" />

          {/* Navegador de mes */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              aria-label="Mes anterior"
              className="h-7 w-7 rounded-md border border-outline-variant hover:bg-surface-container flex items-center justify-center text-on-surface transition-colors"
              title="Mes anterior"
            >
              <span className="material-symbols-outlined text-[16px]">chevron_left</span>
            </button>
            <span className="text-xs sm:text-sm font-bold text-on-surface min-w-[125px] text-center font-mono-data">
              {MONTH_NAMES[calendarMonth]} {calendarYear}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              aria-label="Mes siguiente"
              className="h-7 w-7 rounded-md border border-outline-variant hover:bg-surface-container flex items-center justify-center text-on-surface transition-colors"
              title="Mes siguiente"
            >
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            </button>
            <button
              type="button"
              onClick={handleGoToDefaultOct2026}
              aria-label="Volver al mes actual"
              className="h-7 px-2 border border-outline-variant hover:bg-surface-container text-[11px] font-semibold rounded-md text-on-surface flex items-center gap-1 ml-0.5"
              title="Volver a mes actual"
            >
              <span className="material-symbols-outlined text-[13px] text-secondary">today</span>
              <span className="hidden sm:inline">Mes Actual</span>
            </button>
          </div>
        </div>

        {/* KPIs del mes integrados en píldoras compactas */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-container text-on-surface font-semibold text-[11px]">
            <span className="material-symbols-outlined text-[14px] text-secondary">event_note</span>
            <span>{monthStats.total} citas</span>
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-semibold text-[11px] border border-emerald-200/60">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>{monthStats.llamadas} llamadas</span>
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 font-semibold text-[11px] border border-blue-200/60">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            <span>{monthStats.online_meet} Meet</span>
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-semibold text-[11px] border border-slate-200/60">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
            <span>{monthStats.presencial} Presencial</span>
          </span>
        </div>

        {/* Acciones & Filtros */}
        <div className="flex items-center gap-2">
          {/* Selector de modo: Mensual / Lista */}
          <div className="flex items-center p-0.5 bg-surface-container rounded-md border border-outline-variant text-xs">
            <button
              type="button"
              onClick={() => setViewMode('calendario')}
              aria-pressed={viewMode === 'calendario'}
              className={`p-1 px-2 rounded font-semibold text-[11px] flex items-center gap-1 transition-all ${
                viewMode === 'calendario'
                  ? 'bg-surface-container-lowest text-secondary shadow-xs'
                  : 'text-outline hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">calendar_month</span>
              <span className="hidden sm:inline">Mensual</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('lista')}
              aria-pressed={viewMode === 'lista'}
              className={`p-1 px-2 rounded font-semibold text-[11px] flex items-center gap-1 transition-all ${
                viewMode === 'lista'
                  ? 'bg-surface-container-lowest text-secondary shadow-xs'
                  : 'text-outline hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">format_list_bulleted</span>
              <span className="hidden sm:inline">Lista</span>
            </button>
          </div>

          {/* Filtro modalidad */}
          <select
            value={filterModality}
            onChange={(e) => setFilterModality(e.target.value as any)}
            className="h-7 px-2 border border-outline-variant rounded-md text-[11px] bg-surface-container-lowest focus:border-secondary focus:outline-none"
          >
            <option value="todas">Todas</option>
            <option value="llamada">Llamadas</option>
            <option value="online_meet">Google Meet</option>
            <option value="presencial">Presencial</option>
          </select>

          {/* Botón Exportar CSV */}
          <button
            type="button"
            onClick={handleExportAgendaCsv}
            className="h-7 px-2 border border-outline-variant hover:bg-surface-container rounded-md text-[11px] font-semibold text-on-surface flex items-center gap-1 transition-colors"
            title="Descargar agenda en CSV"
          >
            <span className="material-symbols-outlined text-[14px]">file_download</span>
            <span className="hidden sm:inline">Exportar CSV</span>
          </button>

          {/* Enlace Backup */}
          <Link
            href="/crm/backup"
            className="h-7 px-2 border border-outline-variant hover:bg-surface-container rounded-md text-[11px] font-semibold text-on-surface flex items-center gap-1 transition-colors"
            title="Ir al Centro de Copias de Seguridad"
          >
            <span className="material-symbols-outlined text-[14px] text-secondary">cloud_download</span>
            <span className="hidden sm:inline">Backup</span>
          </Link>

          {/* Botón Nueva Cita */}
          <button type="button"
            onClick={() => handleOpenNewForDate(selectedDate)}
            className="h-7 px-3 bg-secondary text-white text-xs font-semibold rounded-md shadow-xs hover:bg-blue-700 transition-colors flex items-center gap-1 shrink-0"
          >
            <span className="material-symbols-outlined text-[14px]">add</span>
            <span>+ Cita</span>
          </button>
        </div>
      </div>

      {/* 2. CONTENIDO PRINCIPAL: FITS 100% EN PANTALLA COMPLETA SIN SCROLL EXTERNO */}
      {viewMode === 'calendario' ? (
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3 overflow-hidden">
          {/* COLUMNA IZQUIERDA: CALENDARIO MENSUAL COMPLETO (7 o 8 cols) */}
          <div className="lg:col-span-7 xl:col-span-8 flex flex-col h-full min-h-0 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-xs overflow-hidden">
            {/* Cabecera de días de la semana */}
            <div className="grid grid-cols-7 border-b border-surface-container text-center bg-surface-container-low text-outline text-[11px] font-semibold uppercase py-1 shrink-0">
              {WEEK_DAYS.map((day, idx) => (
                <div key={day} className={idx >= 5 ? 'text-amber-700/80 font-bold' : ''}>
                  {day}
                </div>
              ))}
            </div>

            {/* Matriz de Días del Mes: distribuye la altura exactamente entre 5 o 6 filas */}
            <div
              className="flex-1 min-h-0 grid grid-cols-7 divide-x divide-y divide-surface-container bg-surface-container/20"
              style={{
                gridTemplateRows: `repeat(${gridRowsCount}, minmax(0, 1fr))`,
              }}
            >
              {calendarGrid.map((cell) => {
                const dayApts = appointmentsMap[cell.dateStr] || [];
                const isSelected = selectedDate === cell.dateStr;
                const hasApts = dayApts.length > 0;

                const hasCall = dayApts.some((a) => a.modality === 'llamada');
                const hasMeet = dayApts.some((a) => a.modality === 'online_meet');
                const hasPresencial = dayApts.some((a) => a.modality === 'presencial');

                return (
                  <div
                    key={cell.dateStr}
                    role="button"
                    tabIndex={0}
                    aria-label={`${formatLongDate(cell.dateStr)}${hasApts ? `, ${dayApts.length} cita(s)` : ', sin citas'}`}
                    onClick={() => {
                      setSelectedDate(cell.dateStr);
                      const [y, m] = cell.dateStr.split('-').map(Number);
                      if (y !== calendarYear || m - 1 !== calendarMonth) {
                        setCalendarYear(y);
                        setCalendarMonth(m - 1);
                      }
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelectedDate(cell.dateStr);
                        const [y, m] = cell.dateStr.split('-').map(Number);
                        if (y !== calendarYear || m - 1 !== calendarMonth) {
                          setCalendarYear(y);
                          setCalendarMonth(m - 1);
                        }
                      }
                    }}
                    className={`h-full min-h-0 p-1 sm:p-1.5 flex flex-col justify-between cursor-pointer select-none transition-all relative overflow-hidden ${
                      isSelected
                        ? 'bg-blue-50/90 ring-2 ring-inset ring-secondary z-10'
                        : cell.isCurrentMonth
                        ? 'bg-surface-container-lowest hover:bg-surface-container/40'
                        : 'bg-surface-container-low/40 opacity-40 hover:opacity-80'
                    }`}
                  >
                    {/* Fila superior de celda: Día y Badge */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center ${
                          cell.isToday
                            ? 'bg-secondary text-white shadow-xs'
                            : isSelected
                            ? 'text-secondary font-black scale-105'
                            : cell.isCurrentMonth
                            ? 'text-on-surface'
                            : 'text-outline'
                        }`}
                      >
                        {cell.dayNumber}
                      </span>

                      {hasApts && (
                        <span
                          className={`px-1 py-0.2 rounded-full text-[9px] font-bold font-mono-data leading-none ${
                            isSelected
                              ? 'bg-secondary text-white'
                              : 'bg-secondary/15 text-secondary'
                          }`}
                        >
                          {dayApts.length}
                        </span>
                      )}
                    </div>

                    {/* Previsualización de citas (Desktop / Tablet) */}
                    <div className="hidden md:flex flex-col gap-0.5 overflow-hidden my-0.5">
                      {dayApts.slice(0, 2).map((apt) => (
                        <div
                          key={apt.id}
                          className={`px-1 py-0.2 rounded text-[9px] leading-tight truncate flex items-center gap-1 font-medium border ${
                            apt.modality === 'llamada'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200/80'
                              : apt.modality === 'online_meet'
                              ? 'bg-blue-50 text-blue-800 border-blue-200/80'
                              : 'bg-slate-100 text-slate-800 border-slate-200/80'
                          } ${apt.status === 'completada' ? 'line-through opacity-60' : ''}`}
                          title={`${apt.appointment_time.slice(0, 5)} - ${apt.client_name}: ${apt.title}`}
                        >
                          <span className="material-symbols-outlined text-[10px] shrink-0">
                            {apt.modality === 'llamada'
                              ? 'call'
                              : apt.modality === 'online_meet'
                              ? 'videocam'
                              : 'business'}
                          </span>
                          <span className="font-mono-data font-bold shrink-0">
                            {apt.appointment_time.slice(0, 5)}
                          </span>
                          <span className="truncate">{apt.client_name.split(' ')[0]}</span>
                        </div>
                      ))}

                      {dayApts.length > 2 && (
                        <span className="text-[8px] text-outline font-semibold pl-0.5 leading-none">
                          +{dayApts.length - 2} más
                        </span>
                      )}
                    </div>

                    {/* Mini-indicadores por puntos (Mobile) */}
                    <div className="md:hidden flex items-center justify-center gap-1 mt-0.5">
                      {hasCall && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>}
                      {hasMeet && <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>}
                      {hasPresencial && <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>}
                    </div>

                    {/* Indicador de selección sutil al pie */}
                    {isSelected && (
                      <div className="hidden sm:block text-[8px] font-bold text-secondary text-right uppercase tracking-wider leading-none">
                        Activo
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Pie de leyenda compacto */}
            <div className="h-6 shrink-0 px-3 bg-surface-container-low border-t border-surface-container flex items-center justify-between text-[10px] text-outline">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="text-on-surface-variant font-medium">Llamada</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  <span className="text-on-surface-variant font-medium">Google Meet</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                  <span className="text-on-surface-variant font-medium">Presencial</span>
                </span>
              </div>
              <span className="hidden sm:inline font-mono-data text-[9px]">
                Selecciona cualquier casilla para ver o añadir citas
              </span>
            </div>
          </div>

          {/* COLUMNA DERECHA: INSPECTOR DE CITAS DEL DÍA (4 o 5 cols) */}
          <div className="lg:col-span-5 xl:col-span-4 flex flex-col h-full min-h-0 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-xs overflow-hidden">
            {/* Header del día seleccionado */}
            <div className="p-3 sm:px-4 sm:py-3 border-b border-surface-container flex items-center justify-between gap-2 bg-surface/40 shrink-0">
              <div className="min-w-0">
                <div className="flex items-center gap-1 text-secondary text-[11px] font-bold uppercase tracking-wider">
                  <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                  <span>Citas del Día</span>
                </div>
                <h3 className="font-bold text-xs sm:text-sm text-on-surface truncate capitalize mt-0.5">
                  {formatLongDate(selectedDate)}
                </h3>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <span className="px-2 py-0.5 bg-surface-container text-on-surface text-[10px] font-mono-data font-bold rounded-full">
                  {selectedDayAppointments.length} cita(s)
                </span>
                <button
                  type="button"
                  onClick={() => handleOpenNewForDate(selectedDate)}
                  className="h-7 px-2.5 bg-secondary text-white text-[11px] font-semibold rounded hover:bg-blue-700 transition-colors flex items-center gap-1 shadow-xs"
                >
                  <span className="material-symbols-outlined text-[13px]">add</span>
                  <span>Añadir</span>
                </button>
              </div>
            </div>

            {/* Lista interna de citas del día con auto-scroll limpio sin barras visibles */}
            <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2.5">
              {selectedDayAppointments.length > 0 ? (
                selectedDayAppointments.map((apt) => (
                  <div
                    key={apt.id}
                    className={`p-3 rounded-xl border transition-all space-y-2 shadow-xs ${
                      apt.modality === 'llamada'
                        ? 'bg-emerald-50/30 border-emerald-200'
                        : apt.modality === 'online_meet'
                        ? 'bg-blue-50/30 border-blue-200'
                        : 'bg-surface-container-low/40 border-outline-variant'
                    }`}
                  >
                    {/* Fila 1: Hora, Nombre, Estado */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        <div
                          className={`px-1.5 py-1 rounded text-center font-mono-data font-bold text-xs shrink-0 ${
                            apt.modality === 'llamada'
                              ? 'bg-emerald-100 text-emerald-900'
                              : apt.modality === 'online_meet'
                              ? 'bg-blue-100 text-blue-900'
                              : 'bg-surface-container text-on-surface'
                          }`}
                        >
                          <span className="block text-[11px]">{apt.appointment_time.slice(0, 5)}</span>
                        </div>

                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => router.push(`/crm/clientes?client=${encodeURIComponent(apt.client_name)}&from=agenda`)}
                            className="text-left font-bold text-xs sm:text-sm text-on-surface hover:text-secondary hover:underline flex items-center gap-1 group/cname transition-colors truncate max-w-full"
                            title={`Abrir Ficha 360° de ${apt.client_name}`}
                          >
                            <span className="truncate">{apt.client_name}</span>
                            <span className="material-symbols-outlined text-[14px] text-secondary opacity-0 group-hover/cname:opacity-100 transition-opacity shrink-0">
                              open_in_new
                            </span>
                          </button>
                          <p className="text-[11px] font-semibold text-secondary truncate mt-0.2">
                            {apt.title}
                          </p>
                          <p className="text-[10px] font-mono-data text-outline mt-0.2 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px]">phone</span>
                            <span>{apt.client_phone}</span>
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {apt.status === 'completada' ? (
                          <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-bold rounded-full">
                            Completada
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 text-[9px] font-bold rounded-full">
                            Confirmada
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Nota o Detalle */}
                    {apt.notes && (
                      <div className="p-2 bg-surface-container-lowest/90 rounded-md text-[11px] text-on-surface-variant border border-surface-container line-clamp-2">
                        <span className="font-semibold text-on-surface">Nota: </span>
                        <span>{apt.notes}</span>
                      </div>
                    )}

                    {/* Botones de acción directa */}
                    <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-surface-container text-xs">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => router.push(`/crm/clientes?client=${encodeURIComponent(apt.client_name)}&from=agenda`)}
                          className="flex items-center gap-1 px-2 py-0.8 bg-secondary/10 hover:bg-secondary/20 text-secondary font-semibold rounded text-[10px] transition-colors border border-secondary/20 shadow-2xs"
                          title={`Abrir Ficha 360° de ${apt.client_name}`}
                        >
                          <span className="material-symbols-outlined text-[13px]">badge</span>
                          <span>Ficha 360°</span>
                        </button>

                        {apt.modality === 'llamada' && (
                          <button
                            type="button"
                            onClick={() => setCallModal({ client: apt.client_name, phone: apt.client_phone })}
                            className="flex items-center gap-1 px-2 py-0.8 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded text-[10px] transition-colors shadow-xs"
                          >
                            <span className="material-symbols-outlined text-[13px]">call</span>
                            <span>Llamar</span>
                          </button>
                        )}

                        {apt.modality === 'online_meet' && (
                          <button
                            type="button"
                            onClick={() => setMeetModal(`meet.google.com/nxg-${apt.id}-asesoria`)}
                            className="flex items-center gap-1 px-2 py-0.8 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded text-[10px] transition-colors shadow-xs"
                          >
                            <span className="material-symbols-outlined text-[13px]">videocam</span>
                            <span>Meet</span>
                          </button>
                        )}

                        {apt.modality === 'presencial' && (
                          <span className="flex items-center gap-1 px-1.5 py-0.8 bg-surface-container text-on-surface-variant font-semibold rounded text-[10px]">
                            <span className="material-symbols-outlined text-[12px] text-outline">business</span>
                            <span>Presencial</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleToggleComplete(apt.id)}
                          className={`h-6 px-2 rounded text-[10px] font-semibold transition-colors flex items-center gap-1 ${
                            apt.status === 'completada'
                              ? 'border border-outline-variant text-outline hover:bg-surface-container'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                          }`}
                          title={apt.status === 'completada' ? 'Reabrir cita' : 'Marcar como completada'}
                        >
                          <span className="material-symbols-outlined text-[13px]">
                            {apt.status === 'completada' ? 'undo' : 'check'}
                          </span>
                          <span>{apt.status === 'completada' ? 'Reabrir' : 'Completar'}</span>
                        </button>

                        {/* Cancelar: conserva la cita en el historial.
                            Se oculta si ya está cancelada o completada. */}
                        {apt.status !== 'cancelada' && apt.status !== 'completada' && (
                          <button
                            type="button"
                            onClick={() => handleCancelAppointment(apt.id)}
                            className="h-6 px-2 rounded text-[10px] font-semibold transition-colors flex items-center gap-1 border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                            title="Marcar como cancelada, conservando el registro"
                          >
                            <span className="material-symbols-outlined text-[13px]">event_busy</span>
                            <span>Cancelar</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDeleteAppointment(apt.id)}
                          className="h-6 w-6 rounded text-outline hover:text-error hover:bg-red-50 flex items-center justify-center transition-colors"
                          title="Eliminar cita"
                        >
                          <span className="material-symbols-outlined text-[14px]">delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                /* Estado sin citas para el día */
                <div className="h-full flex flex-col items-center justify-center p-6 text-center bg-surface-container-low/20 rounded-xl border border-dashed border-outline-variant space-y-2.5">
                  <div className="w-10 h-10 rounded-full bg-surface-container text-outline flex items-center justify-center">
                    <span className="material-symbols-outlined text-xl">event_available</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-on-surface">Sin citas para este día</h4>
                    <p className="text-[11px] text-outline mt-0.5">
                      No hay compromisos agendados para el <span className="font-semibold">{selectedDate}</span>.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenNewForDate(selectedDate)}
                    className="h-7 px-3 bg-secondary text-white text-[11px] font-semibold rounded-md hover:bg-blue-700 transition-colors inline-flex items-center gap-1 shadow-xs"
                  >
                    <span className="material-symbols-outlined text-[14px]">add_circle</span>
                    <span>Programar Cita</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* VISTA 2: LISTA COMPLETA INTEGRADA EN PANTALLA COMPLETA */
        <div className="flex-1 min-h-0 flex flex-col bg-surface-container-lowest rounded-xl border border-outline-variant shadow-xs overflow-hidden">
          <div className="p-3 border-b border-surface-container flex items-center justify-between gap-3 shrink-0 bg-surface/40">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-lg">format_list_bulleted</span>
              <h2 className="font-bold text-xs sm:text-sm text-on-surface">
                Listado Global de Citas ({appointments.length})
              </h2>
            </div>
            <div className="w-48 sm:w-64">
              <input
                type="text"
                placeholder="Buscar cliente o trámite..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-7 px-2.5 border border-outline-variant rounded text-xs bg-surface focus:border-secondary focus:outline-none"
              />
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {appointments
              .filter((a) => {
                const matchMod = filterModality === 'todas' || a.modality === filterModality;
                const matchQ =
                  searchQuery === '' ||
                  a.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  a.title.toLowerCase().includes(searchQuery.toLowerCase());
                return matchMod && matchQ;
              })
              .map((apt) => (
                <div
                  key={apt.id}
                  className="p-3.5 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-xs flex flex-col justify-between space-y-2 hover:border-secondary transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <div className="p-2 bg-surface-container rounded-md text-center min-w-[55px]">
                        <span className="block text-[11px] font-mono-data font-bold text-secondary">
                          {apt.appointment_time.slice(0, 5)}
                        </span>
                        <span className="text-[9px] text-outline uppercase font-semibold">
                          {apt.appointment_date}
                        </span>
                      </div>
                      <div>
                        <button
                          type="button"
                          onClick={() => router.push(`/crm/clientes?client=${encodeURIComponent(apt.client_name)}&from=agenda`)}
                          className="text-left font-bold text-xs sm:text-sm text-on-surface hover:text-secondary hover:underline flex items-center gap-1 group/cname transition-colors"
                          title={`Abrir Ficha 360° de ${apt.client_name}`}
                        >
                          <span>{apt.client_name}</span>
                          <span className="material-symbols-outlined text-[14px] text-secondary opacity-0 group-hover/cname:opacity-100 transition-opacity">
                            open_in_new
                          </span>
                        </button>
                        <p className="text-[11px] text-secondary font-medium">{apt.title}</p>
                        <p className="text-[10px] text-outline font-mono-data">{apt.client_phone}</p>
                      </div>
                    </div>

                    <div>
                      {apt.status === 'completada' ? (
                        <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-[9px] font-bold rounded">
                          Completada
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[9px] font-bold rounded">
                          Confirmada
                        </span>
                      )}
                    </div>
                  </div>

                  {apt.notes && (
                    <div className="p-2 bg-surface-container-low rounded text-[11px] text-on-surface-variant">
                      <span className="font-semibold text-on-surface">Detalle: </span>
                      <span>{apt.notes}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-surface-container text-xs">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => router.push(`/crm/clientes?client=${encodeURIComponent(apt.client_name)}&from=agenda`)}
                        className="flex items-center gap-1 px-2 py-0.8 bg-secondary/10 hover:bg-secondary/20 text-secondary font-semibold rounded text-[10px] transition-colors border border-secondary/20"
                        title={`Abrir Ficha 360° de ${apt.client_name}`}
                      >
                        <span className="material-symbols-outlined text-[13px]">badge</span>
                        <span>Ficha 360°</span>
                      </button>

                      {apt.modality === 'llamada' && (
                        <button type="button"
                          onClick={() => setCallModal({ client: apt.client_name, phone: apt.client_phone })}
                          className="flex items-center gap-1 px-2 py-0.8 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold rounded text-[10px] transition-colors"
                        >
                          <span className="material-symbols-outlined text-[13px] text-emerald-600">call</span>
                          <span>Llamada</span>
                        </button>
                      )}

                      {apt.modality === 'online_meet' && (
                        <button type="button"
                          onClick={() => setMeetModal(`meet.google.com/nxg-${apt.id}-asesoria`)}
                          className="flex items-center gap-1 px-2 py-0.8 bg-blue-50 hover:bg-blue-100 text-blue-800 font-semibold rounded text-[10px] transition-colors"
                        >
                          <span className="material-symbols-outlined text-[13px] text-blue-600">videocam</span>
                          <span>Meet</span>
                        </button>
                      )}

                      {apt.modality === 'presencial' && (
                        <span className="flex items-center gap-1 px-2 py-0.8 bg-surface-container text-on-surface-variant font-semibold rounded text-[10px]">
                          <span className="material-symbols-outlined text-[13px] text-outline">business</span>
                          <span>Presencial</span>
                        </span>
                      )}
                    </div>

                    <button type="button"
                      onClick={() => handleToggleComplete(apt.id)}
                      className={`h-6 px-2 rounded text-[10px] font-semibold transition-colors flex items-center gap-1 ${
                        apt.status === 'completada'
                          ? 'border border-outline-variant text-outline hover:bg-surface-container'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[13px]">
                        {apt.status === 'completada' ? 'undo' : 'check'}
                      </span>
                      <span>{apt.status === 'completada' ? 'Reabrir' : 'Completar'}</span>
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* MODAL NUEVA CITA CON LLAMADA POR DEFECTO */}
      {showNewAptModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateAppointment}
            className="bg-surface-container-lowest max-w-md w-full rounded-2xl border border-outline-variant shadow-2xl p-5 space-y-3.5 animate-in fade-in zoom-in-95"
          >
            <div className="flex items-center justify-between pb-2 border-b border-surface-container">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">event</span>
                <h3 className="font-bold text-sm text-on-surface">Programar Nueva Cita</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNewAptModal(false)}
                aria-label="Cerrar nueva cita"
                className="text-outline hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Modalidad con llamada por defecto */}
              <div>
                <label className="block text-outline uppercase font-semibold mb-1">
                  Modalidad de la Cita:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAptModality('llamada');
                      if (aptTitle.includes('Presencial') || aptTitle.includes('Videollamada')) {
                        setAptTitle('Consulta Telefónica Gestoría');
                      }
                    }}
                    className={`p-2 rounded-lg border text-center transition-all flex flex-col items-center gap-1 ${
                      aptModality === 'llamada'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold shadow-xs ring-2 ring-emerald-500/20'
                        : 'border-outline-variant bg-surface text-outline hover:bg-surface-container'
                    }`}
                  >
                    <span className="material-symbols-outlined text-base text-emerald-600">call</span>
                    <span className="text-[10px] leading-tight">Llamada (Defecto)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAptModality('presencial');
                      if (aptTitle.includes('Telefónica') || aptTitle.includes('Videollamada')) {
                        setAptTitle('Cita Presencial en Despacho');
                      }
                    }}
                    className={`p-2 rounded-lg border text-center transition-all flex flex-col items-center gap-1 ${
                      aptModality === 'presencial'
                        ? 'border-secondary bg-blue-50 text-secondary font-bold shadow-xs ring-2 ring-blue-500/20'
                        : 'border-outline-variant bg-surface text-outline hover:bg-surface-container'
                    }`}
                  >
                    <span className="material-symbols-outlined text-base text-secondary">business</span>
                    <span className="text-[10px] leading-tight">Solo Presencial</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAptModality('online_meet');
                      if (aptTitle.includes('Telefónica') || aptTitle.includes('Presencial')) {
                        setAptTitle('Videollamada Asesoría');
                      }
                    }}
                    className={`p-2 rounded-lg border text-center transition-all flex flex-col items-center gap-1 ${
                      aptModality === 'online_meet'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-bold shadow-xs ring-2 ring-indigo-500/20'
                        : 'border-outline-variant bg-surface text-outline hover:bg-surface-container'
                    }`}
                  >
                    <span className="material-symbols-outlined text-base text-indigo-600">videocam</span>
                    <span className="text-[10px] leading-tight">Videollamada</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-outline uppercase font-semibold mb-1">Cliente</label>
                <select
                  value={aptClientName}
                  onChange={(e) => {
                    setAptClientName(e.target.value);
                    const selected = clientOptions.find((client) => client.full_name === e.target.value);
                    setAptPhone(selected?.phone || '');
                  }}
                  className="w-full h-8 px-2.5 border border-outline-variant rounded bg-surface focus:border-secondary focus:outline-none"
                >
                  <option value="">Selecciona un cliente</option>
                  {clientOptions.map((client) => <option key={client.id} value={client.full_name}>{client.full_name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-outline uppercase font-semibold mb-1">Teléfono de Contacto</label>
                <input
                  type="text"
                  value={aptPhone}
                  onChange={(e) => setAptPhone(e.target.value)}
                  className="w-full h-8 px-2.5 border border-outline-variant rounded bg-surface font-mono-data focus:border-secondary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-outline uppercase font-semibold mb-1">Asunto de la Cita</label>
                <input
                  required
                  type="text"
                  value={aptTitle}
                  onChange={(e) => setAptTitle(e.target.value)}
                  className="w-full h-8 px-2.5 border border-outline-variant rounded bg-surface focus:border-secondary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-outline uppercase font-semibold mb-1">Fecha</label>
                  <input
                    required
                    type="date"
                    value={aptDate}
                    onChange={(e) => setAptDate(e.target.value)}
                    className="w-full h-8 px-2.5 border border-outline-variant rounded bg-surface font-mono-data focus:border-secondary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-outline uppercase font-semibold mb-1">Hora</label>
                  <input
                    required
                    type="time"
                    value={aptTime}
                    onChange={(e) => setAptTime(e.target.value)}
                    className="w-full h-8 px-2.5 border border-outline-variant rounded bg-surface font-mono-data focus:border-secondary focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2.5 border-t border-surface-container">
              <button
                type="button"
                onClick={() => setShowNewAptModal(false)}
                className="h-8 px-3 border border-outline-variant rounded text-xs font-semibold hover:bg-surface-container"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="h-8 px-4 bg-secondary text-white rounded text-xs font-semibold hover:bg-blue-700 shadow-xs"
              >
                Guardar Cita ({aptModality === 'llamada' ? 'Llamada' : aptModality === 'presencial' ? 'Presencial' : 'Meet'})
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL SIMULACIÓN LLAMADA */}
      {callModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest max-w-sm w-full rounded-2xl p-5 text-center space-y-3.5 shadow-2xl border border-outline-variant animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto animate-pulse">
              <span className="material-symbols-outlined text-2xl">call</span>
            </div>
            <div>
              <h4 className="font-bold text-sm sm:text-base text-on-surface">Llamar a {callModal.client}</h4>
              <p className="text-xs sm:text-sm font-mono-data font-bold text-secondary mt-0.5">{callModal.phone || 'Teléfono no configurado'}</p>
              <p className="text-[11px] text-outline mt-1">Llamada telefónica directa configurada.</p>
            </div>

            <div className="pt-2 flex justify-center gap-2">
              <button type="button"
                onClick={() => setCallModal(null)}
                className="h-8 px-3 border border-outline-variant hover:bg-surface-container text-xs font-semibold rounded"
              >
                Cerrar
              </button>
              {callModal.phone ? (
                <a
                  href={`tel:${callModal.phone}`}
                  className="h-8 px-4 bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold rounded text-white flex items-center gap-1.5 shadow-xs"
                >
                  <span className="material-symbols-outlined text-[15px]">phone_forwarded</span>
                  <span>Llamar Ahora</span>
                </a>
              ) : (
                <span className="h-8 px-3 border border-amber-300 bg-amber-50 text-amber-800 text-xs font-semibold rounded flex items-center">Teléfono no configurado</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL SIMULACIÓN GOOGLE MEET */}
      {meetModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 text-white max-w-sm w-full rounded-2xl p-5 text-center space-y-3.5 shadow-2xl">
            <span className="material-symbols-outlined text-3xl text-emerald-400">videocam</span>
            <h4 className="font-bold text-sm sm:text-base">Sala de Videollamada Google Meet</h4>
            <p className="text-xs text-slate-300">
              Enlace generado: <span className="font-mono-data font-bold text-secondary-fixed block mt-1">{meetModal}</span>
            </p>
            <div className="pt-2 flex justify-center gap-2">
              <button type="button"
                onClick={() => setMeetModal(null)}
                className="h-8 px-3 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded"
              >
                Cerrar
              </button>
              <button type="button"
                onClick={() => {
                  navigator.clipboard.writeText(`https://${meetModal}`);
                  showToast('¡Enlace de Google Meet copiado al portapapeles!');
                  setMeetModal(null);
                }}
                className="h-8 px-4 bg-secondary hover:bg-blue-700 text-xs font-semibold rounded text-white"
              >
                Copiar Enlace
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
