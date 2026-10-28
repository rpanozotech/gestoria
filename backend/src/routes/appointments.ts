import { Router, Request, Response, NextFunction } from 'express';
import { pool, query } from '../db/index.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { diffChangedFields } from '../utils/audit.js';
import { buildSlots, getBookingSettings, isSlotConfigured } from './booking-settings.js';

const router = Router();

// GET/PATCH de citas es la agenda interna del CRM: requiere gestor.
// Las reservas públicas no envían client_id; vincular una cita existente exige rol gestor.
const gestorOnly = [requireAuth, requireRole('admin', 'gestor')];

const requireGestorForLinkedClient = (req: Request, res: Response, next: NextFunction) => {
  if (!req.body?.client_id) return next();
  return requireAuth(req, res, () => requireRole('admin', 'gestor')(req, res, next));
};

// Disponibilidad pública: solo expone fecha, hora y duración, nunca datos
// personales de los clientes del CRM.
router.get('/availability', async (req: Request, res: Response) => {
  try {
    const { date } = req.query;
    const bookingSettings = await getBookingSettings();
    const params: any[] = [];
    let sql = `
      SELECT appointment_date, appointment_time, duration_minutes, status
      FROM appointments
      WHERE status NOT IN ('cancelada', 'completada')
    `;

    if (date) {
      params.push(date);
      sql += ` AND appointment_date = $${params.length}`;
    }

    sql += ' ORDER BY appointment_date ASC, appointment_time ASC';
    const result = await query(sql, params);
    res.json({
      appointments: result.rows,
      slots: typeof date === 'string' ? buildSlots(date, bookingSettings) : [],
      settings: {
        timezone: bookingSettings.timezone,
        appointment_duration: bookingSettings.appointment_duration,
        buffer_minutes: bookingSettings.buffer_minutes,
        min_notice_minutes: bookingSettings.min_notice_minutes,
      },
    });
  } catch (error) {
    console.error('Error consultando disponibilidad:', error);
    res.status(500).json({ error: 'No se pudo consultar la disponibilidad' });
  }
});

// GET /api/appointments/reminders/due - Cola local para un worker/n8n futuro.
// Solo lee recordatorios pendientes; no envía mensajes ni cambia datos.
router.get('/reminders/due', gestorOnly, async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT r.id, r.appointment_id, r.client_id, r.kind, r.scheduled_at,
              a.title, a.appointment_date, a.appointment_time, a.modality,
              c.full_name AS client_name, c.email AS client_email, c.phone AS client_phone
       FROM appointment_reminders r
       JOIN appointments a ON a.id = r.appointment_id
       JOIN clients c ON c.id = r.client_id
       WHERE r.status = 'pending' AND r.scheduled_at <= CURRENT_TIMESTAMP
         AND a.status NOT IN ('cancelada', 'completada')
       ORDER BY r.scheduled_at ASC
       LIMIT 100`,
    );
    res.json({ reminders: result.rows, side_effects: false });
  } catch (error) {
    console.error('Error consultando recordatorios:', error);
    res.status(500).json({ error: 'No se pudo consultar la cola de recordatorios' });
  }
});

// GET /api/appointments - Lista de citas
router.get('/', gestorOnly, async (req: Request, res: Response) => {
  try {
    const { date, status } = req.query;
    let sql = `
      SELECT a.*, COALESCE(c.full_name, a.requester_name) AS client_name,
             COALESCE(c.email, a.email) AS client_email,
             COALESCE(c.phone, a.phone) AS client_phone,
             s.title as service_title
      FROM appointments a
      LEFT JOIN clients c ON a.client_id = c.id
      LEFT JOIN service_prices s ON s.id = a.service_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (date) {
      params.push(date);
      sql += ` AND a.appointment_date = $${params.length}`;
    }

    if (status) {
      params.push(status);
      sql += ` AND a.status = $${params.length}`;
    }

    sql += ` ORDER BY a.appointment_date ASC, a.appointment_time ASC`;

    const result = await query(sql, params);
    res.json({ appointments: result.rows });
  } catch (error) {
    console.error('Error al consultar citas:', error);
    res.status(500).json({ error: 'Error al cargar citas de agenda' });
  }
});

// POST /api/appointments - Crear o reservar cita (Web pública o CRM)
router.post('/', requireGestorForLinkedClient, async (req: Request, res: Response) => {
  try {
    let { client_id, service_id, source, full_name, email, phone, title, appointment_date, appointment_time, duration_minutes, modality, notes, legal_consent, legal_terms_version } = req.body || {};
    if (!client_id && legal_consent !== true) return res.status(400).json({ error: 'Debes aceptar la política de privacidad y las condiciones generales.' });

    if (!appointment_date || !appointment_time || (!client_id && (!String(full_name || '').trim() || (!email && !phone)))) {
      return res.status(400).json({ error: 'Faltan campos obligatorios para agendar la cita' });
    }
    client_id = client_id || null;

    const requestedDuration = Number(duration_minutes ?? 30);
    if (!Number.isInteger(requestedDuration) || requestedDuration < 1 || requestedDuration > 480) {
      return res.status(400).json({ error: 'La duración de la cita no es válida.' });
    }
    const bookingSettings = await getBookingSettings();
    if ((source || 'crm') === 'web') {
      if (!isSlotConfigured(String(appointment_date), String(appointment_time), requestedDuration, bookingSettings)) {
        return res.status(409).json({ error: 'Ese horario está fuera de la disponibilidad configurada.' });
      }
    }

    // Cada cita exige su duración más el margen configurado antes de la siguiente.
    // El bloqueo transaccional por fecha serializa la comprobación
    // y la inserción incluso si llegan dos reservas a la vez.
    const client = await pool.connect();
    let transactionOpen = false;
    let result;
    try {
      await client.query('BEGIN');
      transactionOpen = true;
      await client.query('SELECT pg_advisory_xact_lock(48127, hashtext($1))', [appointment_date]);

      const conflict = await client.query(
        `
          SELECT id
          FROM appointments
          WHERE appointment_date = $1
            AND status NOT IN ('cancelada', 'completada')
            AND ($2::time < appointment_time + ((COALESCE(duration_minutes, 30) + $4::int) * interval '1 minute'))
            AND (($2::time + (($3::int + $4::int) * interval '1 minute')) > appointment_time)
          LIMIT 1
        `,
        [appointment_date, appointment_time, requestedDuration, bookingSettings.buffer_minutes]
      );

      if (conflict.rows.length > 0) {
        await client.query('ROLLBACK');
        transactionOpen = false;
        return res.status(409).json({
          error: `Ese horario no está disponible. Respeta la duración de la cita y deja ${bookingSettings.buffer_minutes} minutos entre citas.`,
        });
      }

      if (service_id) {
        const service = await client.query('SELECT id FROM service_prices WHERE id = $1 AND active = TRUE', [service_id]);
        if (service.rows.length === 0) throw new Error('El servicio seleccionado no existe o no está activo.');
      }
      if (client_id) {
        const existing = await client.query('SELECT id FROM clients WHERE id = $1', [client_id]);
        if (existing.rows.length === 0) throw new Error('El cliente seleccionado no existe.');
      }

      result = await client.query(
        `
          INSERT INTO appointments (client_id, requester_name, service_id, title, appointment_date, appointment_time, duration_minutes, modality, status, notes, source, email, phone, legal_consent, legal_consent_at, legal_terms_version)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pendiente', $9, $10, $11, $12, $13, CASE WHEN $13 THEN CURRENT_TIMESTAMP ELSE NULL END, $14)
          RETURNING *
        `,
        [
          client_id,
          client_id ? null : String(full_name).trim(),
          service_id || null,
          title || 'Asesoría y Trámites Gestoría',
          appointment_date,
          appointment_time,
          requestedDuration,
          modality || 'online_meet',
          notes || null,
          source || 'web',
          email || null,
          phone || null,
          legal_consent === true,
          legal_terms_version || '2026-10-07',
        ]
      );
      if (client_id) {
        await client.query(
          `INSERT INTO appointment_reminders (appointment_id, client_id, kind, scheduled_at)
           SELECT $1, $2, reminder.kind, appointment_start - reminder.offset
           FROM (SELECT ($3::date + $4::time) AS appointment_start) AS appointment
           CROSS JOIN (VALUES ('24h'::varchar, interval '24 hours'), ('1h'::varchar, interval '1 hour')) AS reminder(kind, offset)
           ON CONFLICT (appointment_id, kind) DO NOTHING`,
          [result.rows[0].id, client_id, appointment_date, appointment_time],
        );
      }
      await client.query('COMMIT');
      transactionOpen = false;
    } catch (error) {
      if (transactionOpen) await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }

    res.status(201).json({ appointment: result.rows[0], message: 'Cita reservada con éxito' });
  } catch (error) {
    console.error('Error reservando cita:', error);
    res.status(500).json({ error: 'Error al reservar cita' });
  }
});

// PATCH /api/appointments/:id - Cambiar estado
router.patch('/:id', gestorOnly, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    // Sin esta validación, un typo ("cancaldada") dejaba la cita en un
    // estado que la UI no reconoce y era irrecuperable sin editar a mano.
    const ESTADOS = ['pendiente', 'confirmada', 'completada', 'cancelada'];
    if (status !== undefined && status !== null && !ESTADOS.includes(status)) {
      return res.status(400).json({
        error: `Estado no válido: ${status}. Valores admitidos: ${ESTADOS.join(', ')}.`,
      });
    }

    const previous = await query('SELECT client_id, status, notes FROM appointments WHERE id = $1', [id]);
    if (previous.rows.length === 0) return res.status(404).json({ error: 'Cita no encontrada' });

    const sql = `
      UPDATE appointments SET
        status = COALESCE($1, status),
        notes = COALESCE($2, notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *;
    `;

    const result = await query(sql, [status, notes, id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }

    const changes = diffChangedFields(previous.rows[0], result.rows[0], ['status', 'notes']);
    if (Object.keys(changes).length > 0) {
      await query(
        `INSERT INTO client_audit_log (client_id, actor_user_id, actor_role, action, changes)
         VALUES ($1, $2, $3, 'appointment.updated', $4::jsonb)`,
        [previous.rows[0].client_id, req.user?.id || null, req.user?.role || null, JSON.stringify(changes)],
      );
    }

    res.json({ appointment: result.rows[0] });
  } catch (error) {
    console.error('Error actualizando cita:', error);
    res.status(500).json({ error: 'Error al actualizar cita' });
  }
});

// DELETE /api/appointments/:id - Eliminar cita
//
// Las citas no tienen valor contable ni historial fiscal asociado, asi que
// aqui si se permite el borrado real. Para "deshacer" una cita reservada
// por error, PATCH con status='cancelada' es mejor: deja constancia.
router.delete('/:id', gestorOnly, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM appointments WHERE id = $1 RETURNING id, title, appointment_date;',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }

    const cita = result.rows[0];
    res.json({
      message: 'Cita eliminada de la agenda',
      cita,
    });
  } catch (error) {
    console.error('Error al eliminar cita:', error);
    res.status(500).json({ error: 'Error al eliminar la cita' });
  }
});

export default router;
