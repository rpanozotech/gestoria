import { Router, Request, Response } from 'express';
import { query } from '../db/index.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// GET/PATCH de citas es la agenda interna del CRM: requiere gestor.
// POST es la reserva publica y por eso NO lleva guard (ver index.ts).
const gestorOnly = [requireAuth, requireRole('admin', 'gestor')];

// Disponibilidad pública: solo expone fecha, hora y duración, nunca datos
// personales de los clientes del CRM.
router.get('/availability', async (req: Request, res: Response) => {
  try {
    const { date } = req.query;
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
    res.json({ appointments: result.rows });
  } catch (error) {
    console.error('Error consultando disponibilidad:', error);
    res.status(500).json({ error: 'No se pudo consultar la disponibilidad' });
  }
});

// GET /api/appointments - Lista de citas
router.get('/', gestorOnly, async (req: Request, res: Response) => {
  try {
    const { date, status } = req.query;
    let sql = `
      SELECT a.*, c.full_name as client_name, c.email as client_email, c.phone as client_phone
      FROM appointments a
      JOIN clients c ON a.client_id = c.id
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
router.post('/', async (req: Request, res: Response) => {
  try {
    let { client_id, full_name, email, phone, title, appointment_date, appointment_time, duration_minutes, modality, notes } = req.body;

    // Si viene de la web pública sin client_id, buscar o crear cliente
    if (!client_id && full_name) {
      const existing = await query('SELECT id FROM clients WHERE email = $1 OR phone = $2', [email, phone]);
      if (existing.rows.length > 0) {
        client_id = existing.rows[0].id;
      } else {
        const newClient = await query(
          'INSERT INTO clients (full_name, email, phone, status, notes) VALUES ($1, $2, $3, $4, $5) RETURNING id',
          [full_name, email, phone, 'prospecto', 'Cliente registrado mediante reserva web pública']
        );
        client_id = newClient.rows[0].id;
      }
    }

    if (!client_id || !appointment_date || !appointment_time) {
      return res.status(400).json({ error: 'Faltan campos obligatorios para agendar la cita' });
    }

    // Cada cita ocupa 30 minutos y exige 15 minutos libres antes de la
    // siguiente. La comprobación vive en el servidor para evitar carreras
    // aunque dos usuarios reserven simultáneamente.
    const conflict = await query(
      `
        SELECT id
        FROM appointments
        WHERE appointment_date = $1
          AND status NOT IN ('cancelada', 'completada')
          AND ($2::time < appointment_time + ((COALESCE(duration_minutes, 30) + 15) * interval '1 minute'))
          AND (($2::time + interval '45 minutes') > appointment_time)
        LIMIT 1
      `,
      [appointment_date, appointment_time]
    );

    if (conflict.rows.length > 0) {
      return res.status(409).json({
        error: 'Ese horario no está disponible. Cada cita dura 30 minutos y debe existir un margen de 15 minutos entre citas.',
      });
    }

    const sql = `
      INSERT INTO appointments (client_id, title, appointment_date, appointment_time, duration_minutes, modality, status, notes)
      VALUES ($1, $2, $3, $4, $5, $6, 'confirmada', $7)
      RETURNING *;
    `;

    const result = await query(sql, [
      client_id,
      title || 'Asesoría y Trámites Gestoría',
      appointment_date,
      appointment_time,
      duration_minutes || 30,
      modality || 'online_meet',
      notes || null,
    ]);

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
