'use client';

import React, { useState } from 'react';

export default function CRMAgendaPage() {
  const [appointments, setAppointments] = useState<any[]>([
    {
      id: '1',
      title: 'Seguimiento Telefónico Zorgtoeslag',
      client_name: 'Maria Popescu',
      client_phone: '+31 6 81239845',
      appointment_date: '2026-10-10',
      appointment_time: '10:00:00',
      modality: 'llamada', // Llamada por defecto
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
      modality: 'online_meet', // Videollamada
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
      modality: 'presencial', // Solo presencial
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
  ]);

  const [filterModality, setFilterModality] = useState('todas');

  // Modal para crear nueva cita (Por defecto: Llamada telefónica)
  const [showNewAptModal, setShowNewAptModal] = useState(false);
  const [aptClientName, setAptClientName] = useState('Maria Popescu');
  const [aptPhone, setAptPhone] = useState('+31 6 81239845');
  const [aptTitle, setAptTitle] = useState('Consulta Telefónica Gestoría');
  const [aptDate, setAptDate] = useState('2026-10-14');
  const [aptTime, setAptTime] = useState('11:00');
  const [aptModality, setAptModality] = useState<'llamada' | 'presencial' | 'online_meet'>('llamada'); // Por defecto 'llamada'

  // Modal Google Meet simulado
  const [meetModal, setMeetModal] = useState<string | null>(null);

  // Modal de llamada en curso
  const [callModal, setCallModal] = useState<{ client: string; phone: string } | null>(null);

  const filtered = appointments.filter((a) => {
    if (filterModality === 'todas') return true;
    return a.modality === filterModality;
  });

  const handleToggleComplete = (id: string) => {
    setAppointments(
      appointments.map((a) =>
        a.id === id ? { ...a, status: a.status === 'completada' ? 'confirmada' : 'completada' } : a
      )
    );
  };

  const handleCreateAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    const newApt = {
      id: String(Date.now()),
      title: aptTitle,
      client_name: aptClientName,
      client_phone: aptPhone,
      appointment_date: aptDate,
      appointment_time: `${aptTime}:00`,
      modality: aptModality,
      status: 'confirmada',
      notes: `Cita registrada como: ${
        aptModality === 'llamada' ? 'Llamada telefónica' : aptModality === 'presencial' ? 'Solo presencial' : 'Videollamada'
      }`,
    };
    setAppointments([newApt, ...appointments]);
    setShowNewAptModal(false);
    // Reset defaults
    setAptModality('llamada');
    setAptTitle('Consulta Telefónica Gestoría');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-surface-container">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-on-surface">Agenda & Citas</h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Gestión de citas por llamada telefónica (opción principal), videollamadas Google Meet y reuniones presenciales.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={filterModality}
            onChange={(e) => setFilterModality(e.target.value)}
            className="h-9 px-3 border border-outline-variant rounded-md text-xs bg-surface-container-lowest focus:border-secondary focus:outline-none"
          >
            <option value="todas">Todas las modalidades</option>
            <option value="llamada">Llamadas telefónicas</option>
            <option value="presencial">Solo presencial</option>
            <option value="online_meet">Videollamadas</option>
          </select>

          <button
            onClick={() => {
              setAptModality('llamada'); // Asegurar llamada por defecto al abrir
              setAptTitle('Consulta Telefónica Gestoría');
              setShowNewAptModal(true);
            }}
            className="h-9 px-4 bg-secondary text-white text-xs font-semibold rounded-md shadow-sm hover:bg-blue-700 transition-colors flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            <span>+ Nueva Cita</span>
          </button>
        </div>
      </div>

      {/* Grid of Appointments */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((apt) => (
          <div
            key={apt.id}
            className="p-5 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm flex flex-col justify-between space-y-4 hover:border-secondary transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-surface-container rounded-lg text-center min-w-[60px]">
                  <span className="block text-[11px] font-mono-data font-bold text-secondary">
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

            <div className="flex items-center justify-between pt-2 border-t border-surface-container text-xs">
              <div className="flex items-center gap-2">
                {/* 1. Modalidad: Llamada telefónica */}
                {apt.modality === 'llamada' && (
                  <button
                    onClick={() => setCallModal({ client: apt.client_name, phone: apt.client_phone })}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold rounded transition-colors"
                  >
                    <span className="material-symbols-outlined text-[15px] text-emerald-600">call</span>
                    <span>Llamada Telefónica</span>
                  </button>
                )}

                {/* 2. Modalidad: Videollamada */}
                {apt.modality === 'online_meet' && (
                  <button
                    onClick={() => setMeetModal(`meet.google.com/nxg-${apt.id}-asesoria`)}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 font-semibold rounded transition-colors"
                  >
                    <span className="material-symbols-outlined text-[15px] text-blue-600">videocam</span>
                    <span>Videollamada</span>
                  </button>
                )}

                {/* 3. Modalidad: Solo presencial */}
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
              <button type="button" onClick={() => setShowNewAptModal(false)} className="text-outline hover:text-on-surface">
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
                  {/* Opción 1: Llamada (Por defecto) */}
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

                  {/* Opción 2: Solo presencial */}
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

                  {/* Opción 3: Videollamada */}
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
                  alert('¡Enlace de Google Meet copiado al portapapeles!');
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
