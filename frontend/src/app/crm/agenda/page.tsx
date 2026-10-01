'use client';

import React, { useState } from 'react';

export default function CRMAgendaPage() {
  const [appointments, setAppointments] = useState<any[]>([
    {
      id: '1',
      title: 'Revisión M-Form Carlos Mendoza',
      client_name: 'Carlos Mendoza Ruiz',
      client_phone: '+34 654 321 987',
      appointment_date: '2026-10-10',
      appointment_time: '10:00:00',
      modality: 'online_meet',
      status: 'confirmada',
      notes: 'Revisar certificado de retenciones emitido en España antes del traslado a Ámsterdam.',
    },
    {
      id: '2',
      title: 'Verificación carta Belastingdienst Maria',
      client_name: 'Maria Popescu',
      client_phone: '+31 6 81239845',
      appointment_date: '2026-10-10',
      appointment_time: '11:30:00',
      modality: 'presencial',
      status: 'confirmada',
      notes: 'Traer carta física recibida con código de activación DigiD.',
    },
    {
      id: '3',
      title: 'Consulta Huurtoeslag Elena Morales',
      client_name: 'Elena Morales Castillo',
      client_phone: '+34 611 223 344',
      appointment_date: '2026-10-10',
      appointment_time: '16:00:00',
      modality: 'online_meet',
      status: 'pendiente',
      notes: 'Consultar contrato de arrendamiento en Utrecht y límite de ingresos brutos.',
    },
    {
      id: '4',
      title: 'Planificación Fiscal Trimestral ZZP KVK',
      client_name: 'Lars Van Dijk',
      client_phone: '+31 6 49201948',
      appointment_date: '2026-10-12',
      appointment_time: '09:30:00',
      modality: 'online_meet',
      status: 'confirmada',
      notes: 'Cierre de BTW del trimestre y deducción por pequeña empresa (KOR).',
    },
  ]);

  const [filterModality, setFilterModality] = useState('todas');

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-surface-container">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-on-surface">Agenda & Citas</h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Citas de asesoría presencial y videollamadas con enlace automático de Google Meet.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterModality}
            onChange={(e) => setFilterModality(e.target.value)}
            className="h-9 px-3 border border-outline-variant rounded-md text-xs bg-surface-container-lowest focus:border-secondary focus:outline-none"
          >
            <option value="todas">Todas las modalidades</option>
            <option value="online_meet">Google Meet (Online)</option>
            <option value="presencial">Presencial (Despacho)</option>
          </select>
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
                  <p className="text-[11px] text-outline mt-0.5">{apt.client_phone}</p>
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
              <div className="flex items-center gap-1.5 font-medium text-on-surface-variant">
                {apt.modality === 'online_meet' ? (
                  <span className="flex items-center gap-1 text-secondary font-semibold">
                    <span className="material-symbols-outlined text-[16px]">videocam</span>
                    <span>Google Meet Ready</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-outline">
                    <span className="material-symbols-outlined text-[16px]">business</span>
                    <span>Despacho Presencial</span>
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
  );
}
