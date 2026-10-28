import { Router, Request, Response } from 'express';
import { query } from '../db/index.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export type DaySchedule = {
  enabled: boolean;
  start: string;
  end: string;
  break_start: string;
  break_end: string;
};

export type BookingSettings = {
  timezone: string;
  appointment_duration: number;
  min_notice_minutes: number;
  buffer_minutes: number;
  holidays: string[];
  weekly: Record<string, DaySchedule>;
};

const day = (enabled: boolean): DaySchedule => ({
  enabled,
  start: '09:00',
  end: '18:00',
  break_start: enabled ? '13:00' : '',
  break_end: enabled ? '14:00' : '',
});

export const DEFAULT_BOOKING_SETTINGS: BookingSettings = {
  timezone: 'Europe/Amsterdam',
  appointment_duration: 30,
  min_notice_minutes: 120,
  buffer_minutes: 15,
  holidays: [],
  weekly: {
    sun: day(false), mon: day(true), tue: day(true), wed: day(true),
    thu: day(true), fri: day(true), sat: day(false),
  },
};

const mergeSettings = (value: unknown): BookingSettings => {
  const raw = (value && typeof value === 'object' ? value : {}) as Partial<BookingSettings>;
  const rawWeekly = raw.weekly && typeof raw.weekly === 'object' ? raw.weekly : {};
  const weekly = Object.fromEntries(Object.entries(DEFAULT_BOOKING_SETTINGS.weekly).map(([key, fallback]) => {
    const candidate = (rawWeekly as Record<string, Partial<DaySchedule>>)[key] || {};
    return [key, {
      enabled: candidate.enabled ?? fallback.enabled,
      start: candidate.start || fallback.start,
      end: candidate.end || fallback.end,
      break_start: candidate.break_start ?? fallback.break_start,
      break_end: candidate.break_end ?? fallback.break_end,
    }];
  }));

  return {
    timezone: typeof raw.timezone === 'string' && raw.timezone ? raw.timezone : DEFAULT_BOOKING_SETTINGS.timezone,
    appointment_duration: Number.isInteger(raw.appointment_duration) ? Number(raw.appointment_duration) : DEFAULT_BOOKING_SETTINGS.appointment_duration,
    min_notice_minutes: Number.isInteger(raw.min_notice_minutes) ? Number(raw.min_notice_minutes) : DEFAULT_BOOKING_SETTINGS.min_notice_minutes,
    buffer_minutes: Number.isInteger(raw.buffer_minutes) ? Number(raw.buffer_minutes) : DEFAULT_BOOKING_SETTINGS.buffer_minutes,
    holidays: Array.isArray(raw.holidays) ? raw.holidays.filter((item): item is string => typeof item === 'string').slice(0, 200) : [],
    weekly,
  };
};

export async function getBookingSettings(): Promise<BookingSettings> {
  const result = await query('SELECT settings FROM booking_settings WHERE id = 1');
  return mergeSettings(result.rows[0]?.settings);
}

const toMinutes = (value: string) => {
  const [hours, minutes] = String(value || '').slice(0, 5).split(':').map(Number);
  return Number.isFinite(hours) && Number.isFinite(minutes) ? hours * 60 + minutes : -1;
};

const localNow = (timezone: string) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  return { date: `${values.year}-${values.month}-${values.day}`, minutes: Number(values.hour) * 60 + Number(values.minute) };
};

export const dayKeyForDate = (date: string) => {
  const parsed = new Date(`${date}T12:00:00Z`);
  return ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][parsed.getUTCDay()];
};

export const isSlotConfigured = (date: string, time: string, duration: number, settings: BookingSettings) => {
  if (settings.holidays.includes(date)) return false;
  const now = localNow(settings.timezone);
  const start = toMinutes(time);
  if (date < now.date || (date === now.date && start < now.minutes + settings.min_notice_minutes)) return false;
  const schedule = settings.weekly[dayKeyForDate(date)];
  if (!schedule?.enabled) return false;
  const end = start + duration;
  const open = toMinutes(schedule.start);
  const close = toMinutes(schedule.end);
  if (start < open || end > close) return false;
  const breakStart = toMinutes(schedule.break_start);
  const breakEnd = toMinutes(schedule.break_end);
  return breakStart < 0 || breakEnd < 0 || end <= breakStart || start >= breakEnd;
};

export const buildSlots = (date: string, settings: BookingSettings) => {
  const schedule = settings.weekly[dayKeyForDate(date)];
  if (settings.holidays.includes(date) || !schedule?.enabled) return [];
  const slots: string[] = [];
  const open = toMinutes(schedule.start);
  const close = toMinutes(schedule.end);
  const step = settings.appointment_duration + settings.buffer_minutes;
  for (let start = open; start + settings.appointment_duration <= close; start += step) {
    const time = `${String(Math.floor(start / 60)).padStart(2, '0')}:${String(start % 60).padStart(2, '0')}`;
    if (isSlotConfigured(date, time, settings.appointment_duration, settings)) slots.push(time);
  }
  return slots;
};

const router = Router();
const gestorOnly = [requireAuth, requireRole('admin', 'gestor')];

router.get('/', gestorOnly, async (_req: Request, res: Response) => {
  try {
    res.json({ settings: await getBookingSettings() });
  } catch (error) {
    console.error('Error cargando horarios:', error);
    res.status(500).json({ error: 'No se pudieron cargar los horarios.' });
  }
});

router.put('/', gestorOnly, async (req: Request, res: Response) => {
  try {
    const settings = mergeSettings(req.body);
    if (![15, 30, 45, 60, 90].includes(settings.appointment_duration)) {
      return res.status(400).json({ error: 'La duración debe ser 15, 30, 45, 60 o 90 minutos.' });
    }
    if (settings.min_notice_minutes < 0 || settings.min_notice_minutes > 10080 || settings.buffer_minutes < 0 || settings.buffer_minutes > 120) {
      return res.status(400).json({ error: 'La antelación o el tiempo entre citas no son válidos.' });
    }
    await query(
      `INSERT INTO booking_settings (id, settings, updated_by, updated_at)
       VALUES (1, $1::jsonb, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (id) DO UPDATE SET settings = EXCLUDED.settings, updated_by = EXCLUDED.updated_by, updated_at = CURRENT_TIMESTAMP`,
      [JSON.stringify(settings), req.user?.id || null],
    );
    res.json({ settings, message: 'Horarios y disponibilidad guardados.' });
  } catch (error) {
    console.error('Error guardando horarios:', error);
    res.status(500).json({ error: 'No se pudieron guardar los horarios.' });
  }
});

export default router;
