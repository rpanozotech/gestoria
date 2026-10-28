'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import ConfigurationNav from '@/components/crm/ConfigurationNav';

type DaySchedule = { enabled: boolean; start: string; end: string; break_start: string; break_end: string };
type BookingSettings = {
  timezone: string;
  appointment_duration: number;
  min_notice_minutes: number;
  buffer_minutes: number;
  holidays: string[];
  weekly: Record<string, DaySchedule>;
};

const dayLabels: Array<[string, string]> = [
  ['mon', 'Lunes'], ['tue', 'Martes'], ['wed', 'Miércoles'], ['thu', 'Jueves'],
  ['fri', 'Viernes'], ['sat', 'Sábado'], ['sun', 'Domingo'],
];

const fallback: BookingSettings = {
  timezone: 'Europe/Amsterdam', appointment_duration: 30, min_notice_minutes: 120, buffer_minutes: 15,
  holidays: [],
  weekly: Object.fromEntries(dayLabels.map(([key]) => [key, {
    enabled: !['sat', 'sun'].includes(key), start: '09:00', end: '18:00', break_start: '13:00', break_end: '14:00',
  }])),
};

export default function AvailabilitySettingsPage() {
  const [settings, setSettings] = useState<BookingSettings>(fallback);
  const [status, setStatus] = useState('Cargando…');
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/booking-settings')
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'No se pudieron cargar los horarios.');
        setSettings({ ...fallback, ...data.settings, weekly: { ...fallback.weekly, ...(data.settings?.weekly || {}) } });
        setStatus('Listo para editar');
      })
      .catch((reason) => { setError(reason instanceof Error ? reason.message : 'No se pudieron cargar los horarios.'); setStatus('Error'); });
  }, []);

  const updateDay = (key: string, patch: Partial<DaySchedule>) => {
    setSettings((current) => ({ ...current, weekly: { ...current.weekly, [key]: { ...current.weekly[key], ...patch } } }));
  };

  const save = async () => {
    setStatus('Guardando…'); setError('');
    try {
      const response = await apiFetch('/booking-settings', { method: 'PUT', body: JSON.stringify(settings) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudieron guardar los horarios.');
      setSettings(data.settings); setStatus('Guardado correctamente');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudieron guardar los horarios.');
      setStatus('Error');
    }
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-2 overflow-hidden">
      <header className="flex shrink-0 items-center justify-between border-b border-surface-container pb-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-on-surface">Configuración · Horarios y disponibilidad</h1>
            <span className="rounded-full bg-secondary/10 px-2 py-0.5 text-[10px] font-bold text-secondary">Agenda y reservas</span>
          </div>
          <p className="text-xs text-on-surface-variant">Estos horarios alimentan la agenda, la reserva pública y el cálculo de huecos disponibles.</p>
        </div>
        <div className="flex items-center gap-2">
          <span role="status" className="text-xs font-medium text-on-surface-variant">{status}</span>
          <button type="button" onClick={save} disabled={status === 'Guardando…' || status === 'Cargando…'} className="h-8 rounded-lg bg-secondary px-3.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50">
            Guardar cambios
          </button>
        </div>
      </header>

      <ConfigurationNav />

      {error && <div role="alert" className="shrink-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{error}</div>}

      <div className="grid min-h-0 flex-1 gap-3 overflow-hidden lg:grid-cols-[minmax(0,1fr)_330px]">
        <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest p-3 shadow-sm">
          <div className="mb-2 flex shrink-0 items-center justify-between border-b border-surface-container pb-2">
            <div>
              <h2 className="text-sm font-bold text-on-surface">Horario semanal</h2>
              <p className="text-xs text-on-surface-variant">Activa los días y define jornada y pausa.</p>
            </div>
            <span className="material-symbols-outlined text-[20px] text-secondary" aria-hidden="true">calendar_month</span>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <div className="grid gap-1.5">
              {dayLabels.map(([key, label]) => {
                const day = settings.weekly[key];
                return (
                  <div key={key} className={`grid items-center gap-2 rounded-lg border px-2.5 py-1.5 sm:grid-cols-[130px_92px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] ${day.enabled ? 'border-outline-variant bg-white' : 'border-surface-container bg-surface-container-low opacity-70'}`}>
                    <label className="flex items-center gap-2 text-[13px] font-semibold text-on-surface">
                      <input type="checkbox" checked={day.enabled} onChange={(event) => updateDay(key, { enabled: event.target.checked })} className="h-4 w-4 accent-secondary" />
                      {label}
                    </label>
                    <span className={`text-xs font-semibold ${day.enabled ? 'text-emerald-700' : 'text-outline'}`}>{day.enabled ? 'Disponible' : 'Cerrado'}</span>
                    <label className="text-[10px] font-semibold uppercase tracking-wide text-outline">Desde<input type="time" value={day.start} disabled={!day.enabled} onChange={(event) => updateDay(key, { start: event.target.value })} className="mt-0.5 h-7 w-full rounded-md border border-outline-variant bg-surface px-1.5 text-[13px] text-on-surface disabled:cursor-not-allowed" /></label>
                    <label className="text-[10px] font-semibold uppercase tracking-wide text-outline">Hasta<input type="time" value={day.end} disabled={!day.enabled} onChange={(event) => updateDay(key, { end: event.target.value })} className="mt-0.5 h-7 w-full rounded-md border border-outline-variant bg-surface px-1.5 text-[13px] text-on-surface disabled:cursor-not-allowed" /></label>
                    <label className="text-[10px] font-semibold uppercase tracking-wide text-outline">Pausa desde<input type="time" value={day.break_start} disabled={!day.enabled} onChange={(event) => updateDay(key, { break_start: event.target.value })} className="mt-0.5 h-7 w-full rounded-md border border-outline-variant bg-surface px-1.5 text-[13px] text-on-surface disabled:cursor-not-allowed" /></label>
                    <label className="text-[10px] font-semibold uppercase tracking-wide text-outline">Pausa hasta<input type="time" value={day.break_end} disabled={!day.enabled} onChange={(event) => updateDay(key, { break_end: event.target.value })} className="mt-0.5 h-7 w-full rounded-md border border-outline-variant bg-surface px-1.5 text-[13px] text-on-surface disabled:cursor-not-allowed" /></label>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <aside className="grid min-h-0 gap-3 overflow-hidden lg:grid-rows-[auto_minmax(0,1fr)]">
          <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-3 shadow-sm">
            <div className="mb-2 flex items-center gap-2 border-b border-surface-container pb-2">
              <span className="material-symbols-outlined text-[19px] text-secondary" aria-hidden="true">tune</span>
              <h2 className="text-sm font-bold text-on-surface">Reglas de reserva</h2>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[10px] font-semibold uppercase tracking-wide text-outline">Duración<select value={settings.appointment_duration} onChange={(event) => setSettings({ ...settings, appointment_duration: Number(event.target.value) })} className="mt-0.5 h-8 w-full rounded-md border border-outline-variant bg-surface px-2 text-[13px] text-on-surface"><option value={15}>15 min</option><option value={30}>30 min</option><option value={45}>45 min</option><option value={60}>60 min</option><option value={90}>90 min</option></select></label>
              <label className="text-[10px] font-semibold uppercase tracking-wide text-outline">Entre citas<select value={settings.buffer_minutes} onChange={(event) => setSettings({ ...settings, buffer_minutes: Number(event.target.value) })} className="mt-0.5 h-8 w-full rounded-md border border-outline-variant bg-surface px-2 text-[13px] text-on-surface"><option value={0}>Sin pausa</option><option value={15}>15 min</option><option value={30}>30 min</option><option value={45}>45 min</option></select></label>
              <label className="text-[10px] font-semibold uppercase tracking-wide text-outline">Antelación mínima<select value={settings.min_notice_minutes} onChange={(event) => setSettings({ ...settings, min_notice_minutes: Number(event.target.value) })} className="mt-0.5 h-8 w-full rounded-md border border-outline-variant bg-surface px-2 text-[13px] text-on-surface"><option value={0}>Sin límite</option><option value={60}>1 hora</option><option value={120}>2 horas</option><option value={1440}>24 horas</option><option value={2880}>48 horas</option></select></label>
              <label className="text-[10px] font-semibold uppercase tracking-wide text-outline">Zona horaria<select value={settings.timezone} onChange={(event) => setSettings({ ...settings, timezone: event.target.value })} className="mt-0.5 h-8 w-full rounded-md border border-outline-variant bg-surface px-2 text-[13px] text-on-surface"><option value="Europe/Amsterdam">Amsterdam</option><option value="Europe/Madrid">Madrid</option><option value="UTC">UTC</option></select></label>
            </div>
          </section>

          <section className="flex min-h-0 flex-col rounded-xl border border-outline-variant bg-surface-container-lowest p-3 shadow-sm">
            <div className="mb-2 flex items-center gap-2 border-b border-surface-container pb-2">
              <span className="material-symbols-outlined text-[19px] text-secondary" aria-hidden="true">event_busy</span>
              <div><h2 className="text-sm font-bold text-on-surface">Festivos y vacaciones</h2><p className="text-xs text-on-surface-variant">Una fecha por línea, formato AAAA-MM-DD.</p></div>
            </div>
            <textarea value={settings.holidays.join('\n')} onChange={(event) => setSettings({ ...settings, holidays: event.target.value.split(/[\n,]+/).map((value) => value.trim()).filter(Boolean) })} placeholder="2026-12-25\n2026-12-26" className="min-h-0 flex-1 resize-none rounded-lg border border-outline-variant bg-surface p-2.5 text-[13px] text-on-surface focus:border-secondary focus:outline-none" />
            <div className="mt-2 rounded-lg bg-secondary/10 px-2.5 py-2 text-xs text-on-surface-variant"><strong className="text-on-surface">Vista previa:</strong> la web no ofrecerá citas en días cerrados ni festivos.</div>
          </section>
        </aside>
      </div>
    </div>
  );
}
