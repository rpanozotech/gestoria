'use client';

import React, { useState, useEffect, useMemo } from 'react';

interface Appointment {
  id: string;
  title: string;
  client_name: string;
  client_phone: string;
  appointment_date: string; // YYYY-MM-DD
  appointment_time: string; // HH:MM:SS
  modality: 'llamada' | 'presencial' | 'online_meet';
  status: 'confirmada' | 'completada' | 'pendiente';
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
  const [appointments, setAppointments] = useState<Appointment[]>([
    {
      id: '1',
      title: 'Seguimiento Telefónico Zorgtoeslag',
      client_name: 'Maria Popescu',
      client_phone: '+31 6 81239845',
      appointment_date: '2026-10-10',
      appointment_time: '10:00:00',
      modality: 'llamada',
      status: 'confirmada',
      notes: 'Llamar para verificar si ya llegó la carta física con el código de activación DigiD.',
    },
    {
      id: '2',
      title: 'Revisión M-Form Carlos Mendoza',
      client_name: 'Carlos Mendoza Ruiz',
      client_phone: '+34 654 321 987',
      appointment_date: '2026-10-10',
      appointment_time: '11:30:00',
      modality: 'online_meet',
      status: 'confirmada',
      notes: 'Revisar certificado de retenciones emitido en España antes del traslado a Ámsterdam.',
    },
    {
      id: '3',
      title: 'Firma Presencial Documentación KVK',
      client_name: 'Lars Van Dijk',
      client_phone: '+31 6 49201948',
      appointment_date: '2026-10-10',
      appointment_time: '16:00:00',
      modality: 'presencial',
      status: 'confirmada',
      notes: 'Firma de estatutos y verificación presencial de pasaporte en despacho.',
    },
    {
      id: '4',
      title: 'Consulta Telefónica Huurtoeslag',
      client_name: 'Elena Morales Castillo',
      client_phone: '+34 611 223 344',
      appointment_date: '2026-10-12',
      appointment_time: '09:30:00',
      modality: 'llamada',
      status: 'pendiente',
      notes: 'Resolver dudas sobre el contrato de arrendamiento en Utrecht y límite de ingresos.',
    },
    {
      id: '5',
      title: 'Videollamada Liquidación BTW 3T',
      client_name: 'Lars Van Dijk',
      client_phone: '+31 6 49201948',
      appointment_date: '2026-10-15',
      appointment_time: '12:00:00',
      modality: 'online_meet',
      status: 'confirmada',
      notes: 'Presentación trimestral del IVA (Omzetbelasting) y facturas deducibles.',
    },
    {
      id: '6',
      title: 'Consulta Deducción Hipoteca (Eigenwoningforfait)',
      client_name: 'Elena Morales Castillo',
      client_phone: '+34 611 223 344',
      appointment_date: '2026-10-22',
      appointment_time: '11:15:00',
      modality: 'llamada',
      status: 'confirmada',
      notes: 'Análisis fiscal sobre compra de vivienda habitual en Países Bajos.',
    },
    {
      id: '7',
      title: 'Firma Presencial Modelo 30% Ruling',
      client_name: 'Carlos Mendoza Ruiz',
      client_phone: '+34 654 321 987',
      appointment_date: '2026-10-27',
      appointment_time: '15:00:00',
      modality: 'presencial',
      status: 'confirmada',
      notes: 'Firma conjunta con empleador del formulario 30% Ruling ante la Belastingdienst.',
    },
    {
      id: '8',
      title: 'Verificación Certificado DigiD',
      client_name: 'Maria Popescu',
      client_phone: '+31 6 81239845',
      appointment_date: '2026-10-05',
      appointment_time: '10:00:00',
      modality: 'llamada',
      status: 'completada',
      notes: 'Revisión y confirmación de activación de código por SMS.',
    },
  ]);

  // Modo de visualización: Calendario Mensual (por defecto) o Lista
  const [viewMode, setViewMode] = useState<'calendario' | 'lista'>('calendario');

  // Estado del calendario mensual (Inicializado en Octubre 2026)
  const [calendarYear, setCalendarYear] = useState<number>(2026);
  const [calendarMonth, setCalendarMonth] = useState<number>(9); // 9 = Octubre (0-indexed)
  const [selectedDate, setSelectedDate] = useState<string>('2026-10-10');

  // Filtros
  const [filterModality, setFilterModality] = useState<'todas' | 'llamada' | 'presencial' | 'online_meet'>('todas');
  const [searchQuery, setSearchQuery] = useState('');

  // Modales
  const [showNewAptModal, setShowNewAptModal] = useState(false);
  const [aptClientName, setAptClientName] = useState('Maria Popescu');
  const [aptPhone, setAptPhone] = useState('+31 6 81239845');
  const [aptTitle, setAptTitle] = useState('Consulta Telefónica Gestoría');
  const [aptDate, setAptDate] = useState('2026-10-10');
  const [aptTime, setAptTime] = useState('11:00');
  const [aptModality, setAptModality] = useState<'llamada' | 'presencial' | 'online_meet'>('llamada');

  const [meetModal, setMeetModal] = useState<string | null>(null);
  const [callModal, setCallModal] = useState<{ client: string; phone: string } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Cargar citas reales de la API backend si está disponible
  useEffect(() => {
    fetch('http://localhost:5000/api/appointments')
      .then((res) => res.json())
      .then((data) => {
        if (data.appointments && data.appointments.length > 0) {
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
      .catch(() => {});
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

  // Cálculo de la cuadrícula de días del calendario mensual (Lunes a Domingo)
  const calendarGrid = useMemo(() => {
    const firstDayOfMonth = new Date(calendarYear, calendarMonth, 1);
    // getDay() devuelve 0 para domingo, 1 para lunes...
    let startingDay = firstDayOfMonth.getDay() - 1;
    if (startingDay === -1) startingDay = 6; // Domingo pasa a ser índice 6

    const daysInCurrentMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(calendarYear, calendarMonth, 0).getDate();

    const days: {
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
    }[] = [];

    // Días del mes anterior para rellenar la primera semana
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

    // Días del mes actual
    const todayStr = '2026-10-10'; // Referencia base
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
      });
    }

    // Días del mes siguiente para completar la matriz (35 o 42 casillas)
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

  // Agrupar citas por fecha para acceso O(1)
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

  // Acciones sobre citas
  const handleToggleComplete = (id: string) => {
    setAppointments(
      appointments.map((a) =>
        a.id === id ? { ...a, status: a.status === 'completada' ? 'confirmada' : 'completada' } : a
      )
    );
    showToast('Estado de la cita actualizado con éxito.');
  };

  const handleDeleteAppointment = (id: string) => {
    if (confirm('¿Deseas cancelar y eliminar esta cita de la agenda?')) {
      setAppointments(appointments.filter((a) => a.id !== id));
      showToast('Cita cancelada y eliminada.');
    }
  };

  const handleOpenNewForDate = (dateStr?: string) => {
    const targetDate = dateStr || selectedDate;
    setAptDate(targetDate);
    setAptModality('llamada');
    setAptTitle('Consulta Telefónica Gestoría');
    setShowNewAptModal(true);
  };

  const handleCreateAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    const newApt: Appointment = {
      id: String(Date.now()),
      title: aptTitle,
      client_name: aptClientName,
      client_phone: aptPhone,
      appointment_date: aptDate,
      appointment_time: `${aptTime}:00`,
      modality: aptModality,
      status: 'confirmada',
      notes: `Cita registrada como: ${
        aptModality === 'llamada'
          ? 'Llamada telefónica'
          : aptModality === 'presencial'
          ? 'Solo presencial'
          : 'Videollamada Google Meet'
      }`,
    };

    setAppointments([newApt, ...appointments]);
    setSelectedDate(aptDate);

    // Si la fecha corresponde a otro mes, sincronizar el calendario al mes de la cita
    const [y, m] = aptDate.split('-').map(Number);
    if (y !== calendarYear || m - 1 !== calendarMonth) {
      setCalendarYear(y);
      setCalendarMonth(m - 1);
    }

    setShowNewAptModal(false);
    showToast(`Cita agendada para el ${formatLongDate(aptDate)}.`);
  };

  return (
    <div className="space-y-5 pb-6">
      {/* Toast de Notificaciones */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-secondary/40 animate-in fade-in duration-200">
          <span className="material-symbols-outlined text-secondary text-xl">check_circle</span>
          <span className="text-xs font-medium">{toastMessage}</span>
        </div>
      )}

      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-surface-container">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-on-surface">Agenda & Citas</h1>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-secondary/10 text-secondary">
              Calendario Interactivo
            </span>
          </div>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Vista mensual con selector de día, gestión de llamadas telefónicas, videollamadas Google Meet y citas presenciales.
          </p>
        </div>

        {/* CONTROLES SUPERIORES */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Selector de modo: Calendario vs Lista */}
          <div className="flex items-center p-0.5 bg-surface-container rounded-lg border border-outline-variant text-xs">
            <button
              onClick={() => setViewMode('calendario')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all ${
                viewMode === 'calendario'
                  ? 'bg-surface-container-lowest text-secondary shadow-xs'
                  : 'text-outline hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">calendar_month</span>
              <span>Mensual</span>
            </button>
            <button
              onClick={() => setViewMode('lista')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all ${
                viewMode === 'lista'
                  ? 'bg-surface-container-lowest text-secondary shadow-xs'
                  : 'text-outline hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">format_list_bulleted</span>
              <span>Lista</span>
            </button>
          </div>

          {/* Filtro por modalidad */}
          <select
            value={filterModality}
            onChange={(e) => setFilterModality(e.target.value as any)}
            className="h-9 px-3 border border-outline-variant rounded-md text-xs bg-surface-container-lowest focus:border-secondary focus:outline-none"
          >
            <option value="todas">Todas las modalidades</option>
            <option value="llamada">Solo llamadas telefónicas</option>
            <option value="online_meet">Solo videollamadas Meet</option>
            <option value="presencial">Solo presenciales en despacho</option>
          </select>

          {/* Botón Nueva Cita */}
          <button
            onClick={() => handleOpenNewForDate(selectedDate)}
            className="h-9 px-4 bg-secondary text-white text-xs font-semibold rounded-md shadow-sm hover:bg-blue-700 transition-colors flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            <span>+ Nueva Cita</span>
          </button>
        </div>
      </div>

      {/* STRIP DE MÉTRICAS DEL MES */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] text-outline font-medium uppercase">Citas en {MONTH_NAMES[calendarMonth]}</p>
            <p className="text-xl font-bold font-mono-data text-on-surface mt-0.5">{monthStats.total}</p>
          </div>
          <span className="material-symbols-outlined text-secondary text-2xl p-2 bg-blue-50 rounded-lg">
            event_note
          </span>
        </div>

        <div className="p-3 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] text-outline font-medium uppercase">Llamadas (Principal)</p>
            <p className="text-xl font-bold font-mono-data text-emerald-700 mt-0.5">{monthStats.llamadas}</p>
          </div>
          <span className="material-symbols-outlined text-emerald-600 text-2xl p-2 bg-emerald-50 rounded-lg">
            call
          </span>
        </div>

        <div className="p-3 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] text-outline font-medium uppercase">Google Meet</p>
            <p className="text-xl font-bold font-mono-data text-blue-700 mt-0.5">{monthStats.online_meet}</p>
          </div>
          <span className="material-symbols-outlined text-blue-600 text-2xl p-2 bg-blue-50 rounded-lg">
            videocam
          </span>
        </div>

        <div className="p-3 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] text-outline font-medium uppercase">Presenciales</p>
            <p className="text-xl font-bold font-mono-data text-slate-700 mt-0.5">{monthStats.presencial}</p>
          </div>
          <span className="material-symbols-outlined text-slate-600 text-2xl p-2 bg-slate-100 rounded-lg">
            business
          </span>
        </div>
      </div>

      {/* VISTA 1: CALENDARIO MENSUAL + VISOR DE CITAS DEL DÍA */}
      {viewMode === 'calendario' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
          {/* CALENDARIO MENSUAL (7 columnas en XL) */}
          <div className="xl:col-span-7 2xl:col-span-8 bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-sm overflow-hidden flex flex-col">
            {/* Barra de Navegación del Mes */}
            <div className="p-4 sm:p-5 border-b border-surface-container flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface/50">
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrevMonth}
                  className="h-8 w-8 rounded-lg border border-outline-variant hover:bg-surface-container flex items-center justify-center text-on-surface transition-colors"
                  title="Mes anterior"
                >
                  <span className="material-symbols-outlined text-lg">chevron_left</span>
                </button>

                <h2 className="text-base sm:text-lg font-bold text-on-surface min-w-[170px] text-center sm:text-left">
                  {MONTH_NAMES[calendarMonth]} {calendarYear}
                </h2>

                <button
                  onClick={handleNextMonth}
                  className="h-8 w-8 rounded-lg border border-outline-variant hover:bg-surface-container flex items-center justify-center text-on-surface transition-colors"
                  title="Mes siguiente"
                >
                  <span className="material-symbols-outlined text-lg">chevron_right</span>
                </button>
              </div>

              <div className="flex items-center gap-2 justify-end">
                <button
                  onClick={handleGoToDefaultOct2026}
                  className="h-8 px-3 rounded-lg border border-outline-variant text-xs font-semibold text-on-surface hover:bg-surface-container transition-colors flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[15px] text-secondary">today</span>
                  <span>Mes Actual</span>
                </button>

                <button
                  onClick={() => handleOpenNewForDate(selectedDate)}
                  className="h-8 px-3 bg-secondary/10 hover:bg-secondary/20 text-secondary text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[15px]">event</span>
                  <span>Agendar en {selectedDate}</span>
                </button>
              </div>
            </div>

            {/* Cabecera de días de la semana */}
            <div className="grid grid-cols-7 border-b border-surface-container text-center bg-surface-container-low text-outline text-[11px] font-semibold uppercase py-2">
              {WEEK_DAYS.map((day, idx) => (
                <div key={day} className={idx >= 5 ? 'text-amber-700/80 font-bold' : ''}>
                  {day}
                </div>
              ))}
            </div>

            {/* Cuadrícula de Días del Mes */}
            <div className="grid grid-cols-7 divide-x divide-y divide-surface-container bg-surface-container/20">
              {calendarGrid.map((cell) => {
                const dayApts = appointmentsMap[cell.dateStr] || [];
                const isSelected = selectedDate === cell.dateStr;
                const hasApts = dayApts.length > 0;

                // Contar modalidades para mini-indicadores
                const hasCall = dayApts.some((a) => a.modality === 'llamada');
                const hasMeet = dayApts.some((a) => a.modality === 'online_meet');
                const hasPresencial = dayApts.some((a) => a.modality === 'presencial');

                return (
                  <div
                    key={cell.dateStr}
                    onClick={() => {
                      setSelectedDate(cell.dateStr);
                      // Si hace clic en un día del mes adyacente, ajustar mes activo
                      const [y, m] = cell.dateStr.split('-').map(Number);
                      if (y !== calendarYear || m - 1 !== calendarMonth) {
                        setCalendarYear(y);
                        setCalendarMonth(m - 1);
                      }
                    }}
                    className={`min-h-[85px] sm:min-h-[105px] p-2 transition-all cursor-pointer flex flex-col justify-between relative group ${
                      isSelected
                        ? 'bg-blue-50/80 ring-2 ring-inset ring-secondary z-10'
                        : cell.isCurrentMonth
                        ? 'bg-surface-container-lowest hover:bg-surface-container/40'
                        : 'bg-surface-container-low/40 opacity-40 hover:opacity-80'
                    }`}
                  >
                    {/* Fila Superior: Número de día y badge de total */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs sm:text-sm font-bold rounded-full w-6 h-6 flex items-center justify-center ${
                          cell.isToday
                            ? 'bg-secondary text-white shadow-xs'
                            : isSelected
                            ? 'text-secondary font-black'
                            : cell.isCurrentMonth
                            ? 'text-on-surface'
                            : 'text-outline'
                        }`}
                      >
                        {cell.dayNumber}
                      </span>

                      {hasApts && (
                        <span
                          className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold font-mono-data ${
                            isSelected
                              ? 'bg-secondary text-white'
                              : 'bg-secondary/15 text-secondary'
                          }`}
                          title={`${dayApts.length} cita(s) programada(s)`}
                        >
                          {dayApts.length}
                        </span>
                      )}
                    </div>

                    {/* Contenido Central: Previsualización de citas (Desktop) */}
                    <div className="hidden sm:flex flex-col gap-1 my-1 overflow-hidden">
                      {dayApts.slice(0, 2).map((apt) => (
                        <div
                          key={apt.id}
                          className={`px-1.5 py-0.5 rounded text-[10px] truncate flex items-center gap-1 font-medium border ${
                            apt.modality === 'llamada'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200/80'
                              : apt.modality === 'online_meet'
                              ? 'bg-blue-50 text-blue-800 border-blue-200/80'
                              : 'bg-slate-100 text-slate-800 border-slate-200/80'
                          } ${apt.status === 'completada' ? 'line-through opacity-60' : ''}`}
                          title={`${apt.appointment_time.slice(0, 5)} - ${apt.client_name}: ${apt.title}`}
                        >
                          <span className="material-symbols-outlined text-[12px] shrink-0">
                            {apt.modality === 'llamada'
                              ? 'call'
                              : apt.modality === 'online_meet'
                              ? 'videocam'
                              : 'business'}
                          </span>
                          <span className="font-mono-data font-semibold shrink-0">
                            {apt.appointment_time.slice(0, 5)}
                          </span>
                          <span className="truncate">{apt.client_name.split(' ')[0]}</span>
                        </div>
                      ))}

                      {dayApts.length > 2 && (
                        <span className="text-[9px] text-outline font-semibold pl-1">
                          +{dayApts.length - 2} más
                        </span>
                      )}
                    </div>

                    {/* Previsualización en Móvil (Puntos de color) */}
                    <div className="sm:hidden flex items-center justify-center gap-1 mt-1">
                      {hasCall && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>}
                      {hasMeet && <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>}
                      {hasPresencial && <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>}
                    </div>

                    {/* Pie de celda: Indicador de día seleccionado */}
                    {isSelected && (
                      <div className="hidden sm:block text-[9px] font-bold text-secondary text-right uppercase tracking-wider">
                        Seleccionado
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Leyenda de Modalidades al pie del calendario */}
            <div className="p-3 bg-surface-container-low border-t border-surface-container flex flex-wrap items-center justify-between gap-3 text-[11px] text-on-surface-variant">
              <div className="flex items-center gap-3">
                <span className="text-outline font-medium">Leyenda:</span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <span>Llamada Telefónica</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                  <span>Google Meet</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span>
                  <span>Presencial</span>
                </span>
              </div>

              <span className="text-[10px] text-outline font-mono-data">
                Pulsa cualquier casilla para inspeccionar o agregar citas
              </span>
            </div>
          </div>

          {/* PANEL DERECHO: INSPECTOR DE CITAS DEL DÍA SELECCIONADO (5 columnas en XL) */}
          <div className="xl:col-span-5 2xl:col-span-4 space-y-4">
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-sm p-5 space-y-4">
              {/* Header del día seleccionado */}
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-surface-container">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-secondary text-xs font-semibold uppercase tracking-wider">
                    <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                    <span>Citas del Día</span>
                  </div>
                  <h3 className="font-bold text-base sm:text-lg text-on-surface capitalize">
                    {formatLongDate(selectedDate)}
                  </h3>
                  <p className="text-xs text-outline">
                    {selectedDayAppointments.length === 0
                      ? 'Sin citas programadas'
                      : `${selectedDayAppointments.length} cita(s) para este día`}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenNewForDate(selectedDate)}
                  className="h-8 px-3 bg-secondary text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1 shadow-xs shrink-0"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  <span>Añadir</span>
                </button>
              </div>

              {/* LISTA DE CITAS DEL DÍA SELECCIONADO */}
              {selectedDayAppointments.length > 0 ? (
                <div className="space-y-3.5 max-h-[620px] overflow-y-auto no-scrollbar pr-0.5">
                  {selectedDayAppointments.map((apt) => (
                    <div
                      key={apt.id}
                      className={`p-4 rounded-xl border transition-all space-y-3 shadow-xs ${
                        apt.modality === 'llamada'
                          ? 'bg-emerald-50/30 border-emerald-200 hover:border-emerald-400'
                          : apt.modality === 'online_meet'
                          ? 'bg-blue-50/30 border-blue-200 hover:border-blue-400'
                          : 'bg-surface-container-low/40 border-outline-variant hover:border-slate-400'
                      }`}
                    >
                      {/* Top: Hora, Nombre, Estado */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <div
                            className={`p-2 rounded-lg text-center font-mono-data font-bold text-xs shrink-0 ${
                              apt.modality === 'llamada'
                                ? 'bg-emerald-100 text-emerald-900'
                                : apt.modality === 'online_meet'
                                ? 'bg-blue-100 text-blue-900'
                                : 'bg-surface-container text-on-surface'
                            }`}
                          >
                            <span className="block text-[13px]">{apt.appointment_time.slice(0, 5)}</span>
                            <span className="text-[9px] uppercase font-semibold text-outline">Hora</span>
                          </div>

                          <div>
                            <h4 className="font-bold text-sm text-on-surface">{apt.client_name}</h4>
                            <p className="text-xs font-semibold text-secondary mt-0.5">{apt.title}</p>
                            <p className="text-[11px] font-mono-data text-outline mt-0.5 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[13px]">phone</span>
                              <span>{apt.client_phone}</span>
                            </p>
                          </div>
                        </div>

                        <div>
                          {apt.status === 'completada' ? (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                              Completada
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold rounded-full">
                              Confirmada
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Nota o Detalle */}
                      {apt.notes && (
                        <div className="p-2.5 bg-surface-container-lowest/80 rounded-lg text-xs text-on-surface-variant border border-surface-container">
                          <span className="font-semibold text-on-surface">Detalle: </span>
                          <span>{apt.notes}</span>
                        </div>
                      )}

                      {/* Botones de acción directa para este día */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-surface-container text-xs">
                        <div className="flex items-center gap-1.5">
                          {/* Acción 1: Llamada */}
                          {apt.modality === 'llamada' && (
                            <button
                              type="button"
                              onClick={() => setCallModal({ client: apt.client_name, phone: apt.client_phone })}
                              className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded text-[11px] transition-colors shadow-xs"
                            >
                              <span className="material-symbols-outlined text-[14px]">call</span>
                              <span>Llamar Ahora</span>
                            </button>
                          )}

                          {/* Acción 2: Google Meet */}
                          {apt.modality === 'online_meet' && (
                            <button
                              type="button"
                              onClick={() => setMeetModal(`meet.google.com/nxg-${apt.id}-asesoria`)}
                              className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded text-[11px] transition-colors shadow-xs"
                            >
                              <span className="material-symbols-outlined text-[14px]">videocam</span>
                              <span>Abrir Meet</span>
                            </button>
                          )}

                          {/* Acción 3: Presencial */}
                          {apt.modality === 'presencial' && (
                            <span className="flex items-center gap-1 px-2 py-1 bg-surface-container text-on-surface-variant font-semibold rounded text-[11px]">
                              <span className="material-symbols-outlined text-[14px] text-outline">business</span>
                              <span>En Despacho</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {/* Toggle Completar */}
                          <button
                            type="button"
                            onClick={() => handleToggleComplete(apt.id)}
                            className={`h-7 px-2.5 rounded text-[11px] font-semibold transition-colors flex items-center gap-1 ${
                              apt.status === 'completada'
                                ? 'border border-outline-variant text-outline hover:bg-surface-container'
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                            }`}
                            title={apt.status === 'completada' ? 'Reabrir cita' : 'Marcar como completada'}
                          >
                            <span className="material-symbols-outlined text-[14px]">
                              {apt.status === 'completada' ? 'undo' : 'check'}
                            </span>
                            <span>{apt.status === 'completada' ? 'Reabrir' : 'Completada'}</span>
                          </button>

                          {/* Cancelar / Eliminar */}
                          <button
                            type="button"
                            onClick={() => handleDeleteAppointment(apt.id)}
                            className="h-7 w-7 rounded text-outline hover:text-error hover:bg-red-50 flex items-center justify-center transition-colors"
                            title="Eliminar cita"
                          >
                            <span className="material-symbols-outlined text-[15px]">delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* ESTADO VACÍO CUANDO NO HAY CITAS PARA EL DÍA */
                <div className="p-8 text-center bg-surface-container-low/30 rounded-xl border border-dashed border-outline-variant space-y-3">
                  <div className="w-12 h-12 rounded-full bg-surface-container text-outline flex items-center justify-center mx-auto">
                    <span className="material-symbols-outlined text-2xl">event_available</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-on-surface">No hay citas programadas</h4>
                    <p className="text-xs text-outline mt-1 max-w-xs mx-auto">
                      No tienes compromisos agendados para el <span className="font-semibold">{selectedDate}</span>.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenNewForDate(selectedDate)}
                    className="h-8 px-4 bg-secondary text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-1.5 shadow-xs"
                  >
                    <span className="material-symbols-outlined text-[16px]">add_circle</span>
                    <span>Programar Cita en este día</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VISTA 2: LISTA COMPLETA DE TODAS LAS CITAS */}
      {viewMode === 'lista' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-surface-container-lowest p-4 rounded-xl border border-outline-variant">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">format_list_bulleted</span>
              <h2 className="font-bold text-sm text-on-surface">Todas las Citas Registradas ({appointments.length})</h2>
            </div>
            <div className="w-64">
              <input
                type="text"
                placeholder="Buscar por cliente o asunto..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8 px-3 border border-outline-variant rounded-md text-xs bg-surface focus:border-secondary focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  className="p-5 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm flex flex-col justify-between space-y-4 hover:border-secondary transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 bg-surface-container rounded-lg text-center min-w-[65px]">
                        <span className="block text-[12px] font-mono-data font-bold text-secondary">
                          {apt.appointment_time.slice(0, 5)}
                        </span>
                        <span className="text-[10px] text-outline uppercase font-semibold">
                          {apt.appointment_date}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-on-surface">{apt.client_name}</h3>
                        <p className="text-xs text-secondary font-medium mt-0.5">{apt.title}</p>
                        <p className="text-[11px] text-outline font-mono-data mt-0.5">{apt.client_phone}</p>
                      </div>
                    </div>

                    <div>
                      {apt.status === 'completada' ? (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded">
                          Completada
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded">
                          Confirmada
                        </span>
                      )}
                    </div>
                  </div>

                  {apt.notes && (
                    <div className="p-3 bg-surface-container-low rounded-lg text-xs text-on-surface-variant">
                      <span className="font-semibold text-on-surface">Detalles / Nota: </span>
                      <span>{apt.notes}</span>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-surface-container text-xs">
                    <div className="flex items-center gap-2">
                      {apt.modality === 'llamada' && (
                        <button
                          onClick={() => setCallModal({ client: apt.client_name, phone: apt.client_phone })}
                          className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold rounded transition-colors"
                        >
                          <span className="material-symbols-outlined text-[15px] text-emerald-600">call</span>
                          <span>Llamada Telefónica</span>
                        </button>
                      )}

                      {apt.modality === 'online_meet' && (
                        <button
                          onClick={() => setMeetModal(`meet.google.com/nxg-${apt.id}-asesoria`)}
                          className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 font-semibold rounded transition-colors"
                        >
                          <span className="material-symbols-outlined text-[15px] text-blue-600">videocam</span>
                          <span>Videollamada</span>
                        </button>
                      )}

                      {apt.modality === 'presencial' && (
                        <span className="flex items-center gap-1.5 px-2.5 py-1 bg-surface-container text-on-surface-variant font-semibold rounded">
                          <span className="material-symbols-outlined text-[15px] text-outline">business</span>
                          <span>Solo Presencial</span>
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => handleToggleComplete(apt.id)}
                      className={`h-8 px-3 rounded text-xs font-semibold transition-colors flex items-center gap-1 ${
                        apt.status === 'completada'
                          ? 'border border-outline-variant text-outline hover:bg-surface-container'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[15px]">
                        {apt.status === 'completada' ? 'undo' : 'check_circle'}
                      </span>
                      <span>{apt.status === 'completada' ? 'Reabrir Cita' : 'Marcar Completada'}</span>
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
            className="bg-surface-container-lowest max-w-md w-full rounded-2xl border border-outline-variant shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95"
          >
            <div className="flex items-center justify-between pb-2 border-b border-surface-container">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">event</span>
                <h3 className="font-bold text-sm text-on-surface">Programar Nueva Cita</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNewAptModal(false)}
                className="text-outline hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* MODALIDAD CON LLAMADA POR DEFECTO */}
              <div>
                <label className="block text-outline uppercase font-semibold mb-1.5">
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
                    className={`p-2.5 rounded-lg border text-center transition-all flex flex-col items-center gap-1 ${
                      aptModality === 'llamada'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold shadow-sm ring-2 ring-emerald-500/20'
                        : 'border-outline-variant bg-surface text-outline hover:bg-surface-container'
                    }`}
                  >
                    <span className="material-symbols-outlined text-lg text-emerald-600">call</span>
                    <span className="text-[11px] leading-tight">Llamada (Defecto)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAptModality('presencial');
                      if (aptTitle.includes('Telefónica') || aptTitle.includes('Videollamada')) {
                        setAptTitle('Cita Presencial en Despacho');
                      }
                    }}
                    className={`p-2.5 rounded-lg border text-center transition-all flex flex-col items-center gap-1 ${
                      aptModality === 'presencial'
                        ? 'border-secondary bg-blue-50 text-secondary font-bold shadow-sm ring-2 ring-blue-500/20'
                        : 'border-outline-variant bg-surface text-outline hover:bg-surface-container'
                    }`}
                  >
                    <span className="material-symbols-outlined text-lg text-secondary">business</span>
                    <span className="text-[11px] leading-tight">Solo Presencial</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAptModality('online_meet');
                      if (aptTitle.includes('Telefónica') || aptTitle.includes('Presencial')) {
                        setAptTitle('Videollamada Asesoría');
                      }
                    }}
                    className={`p-2.5 rounded-lg border text-center transition-all flex flex-col items-center gap-1 ${
                      aptModality === 'online_meet'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-bold shadow-sm ring-2 ring-indigo-500/20'
                        : 'border-outline-variant bg-surface text-outline hover:bg-surface-container'
                    }`}
                  >
                    <span className="material-symbols-outlined text-lg text-indigo-600">videocam</span>
                    <span className="text-[11px] leading-tight">Videollamada</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-outline uppercase font-semibold mb-1">Cliente</label>
                <select
                  value={aptClientName}
                  onChange={(e) => {
                    setAptClientName(e.target.value);
                    if (e.target.value === 'Carlos Mendoza Ruiz') setAptPhone('+34 654 321 987');
                    else if (e.target.value === 'Lars Van Dijk') setAptPhone('+31 6 49201948');
                    else if (e.target.value === 'Elena Morales Castillo') setAptPhone('+34 611 223 344');
                    else setAptPhone('+31 6 81239845');
                  }}
                  className="w-full h-9 px-3 border border-outline-variant rounded bg-surface focus:border-secondary focus:outline-none"
                >
                  <option>Maria Popescu</option>
                  <option>Carlos Mendoza Ruiz</option>
                  <option>Lars Van Dijk</option>
                  <option>Elena Morales Castillo</option>
                </select>
              </div>

              <div>
                <label className="block text-outline uppercase font-semibold mb-1">Teléfono de Contacto</label>
                <input
                  type="text"
                  value={aptPhone}
                  onChange={(e) => setAptPhone(e.target.value)}
                  className="w-full h-9 px-3 border border-outline-variant rounded bg-surface font-mono-data focus:border-secondary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-outline uppercase font-semibold mb-1">Asunto / Motivo de la Cita</label>
                <input
                  required
                  type="text"
                  value={aptTitle}
                  onChange={(e) => setAptTitle(e.target.value)}
                  className="w-full h-9 px-3 border border-outline-variant rounded bg-surface focus:border-secondary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-outline uppercase font-semibold mb-1">Fecha</label>
                  <input
                    required
                    type="date"
                    value={aptDate}
                    onChange={(e) => setAptDate(e.target.value)}
                    className="w-full h-9 px-3 border border-outline-variant rounded bg-surface font-mono-data focus:border-secondary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-outline uppercase font-semibold mb-1">Hora</label>
                  <input
                    required
                    type="time"
                    value={aptTime}
                    onChange={(e) => setAptTime(e.target.value)}
                    className="w-full h-9 px-3 border border-outline-variant rounded bg-surface font-mono-data focus:border-secondary focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-surface-container">
              <button
                type="button"
                onClick={() => setShowNewAptModal(false)}
                className="h-8 px-3 border border-outline-variant rounded text-xs font-semibold hover:bg-surface-container"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="h-8 px-4 bg-secondary text-white rounded text-xs font-semibold hover:bg-blue-700 shadow-sm"
              >
                Guardar Cita ({aptModality === 'llamada' ? 'Llamada' : aptModality === 'presencial' ? 'Presencial' : 'Videollamada'})
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL SIMULACIÓN LLAMADA TELEFÓNICA */}
      {callModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest max-w-sm w-full rounded-2xl p-6 text-center space-y-4 shadow-2xl border border-outline-variant animate-in zoom-in-95">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto animate-pulse">
              <span className="material-symbols-outlined text-3xl">call</span>
            </div>
            <div>
              <h4 className="font-bold text-base text-on-surface">Llamar a {callModal.client}</h4>
              <p className="text-sm font-mono-data font-bold text-secondary mt-1">{callModal.phone}</p>
              <p className="text-xs text-outline mt-1">Modalidad configurada como llamada telefónica directa.</p>
            </div>

            <div className="pt-2 flex justify-center gap-2">
              <button
                onClick={() => setCallModal(null)}
                className="h-9 px-4 border border-outline-variant hover:bg-surface-container text-xs font-semibold rounded"
              >
                Cerrar
              </button>
              <a
                href={`tel:${callModal.phone}`}
                className="h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold rounded text-white flex items-center gap-1.5 shadow-sm"
              >
                <span className="material-symbols-outlined text-[16px]">phone_forwarded</span>
                <span>Llamar Ahora</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SIMULACIÓN GOOGLE MEET */}
      {meetModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 text-white max-w-sm w-full rounded-2xl p-6 text-center space-y-4 shadow-2xl">
            <span className="material-symbols-outlined text-4xl text-emerald-400">videocam</span>
            <h4 className="font-bold text-base">Sala de Videollamada Preparada</h4>
            <p className="text-xs text-slate-300">
              Enlace generado: <span className="font-mono-data font-bold text-secondary-fixed block mt-1">{meetModal}</span>
            </p>
            <div className="pt-2 flex justify-center gap-2">
              <button
                onClick={() => setMeetModal(null)}
                className="h-8 px-4 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded"
              >
                Cerrar
              </button>
              <button
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
