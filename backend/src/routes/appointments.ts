import { Router, Request, Response } from 'express';
import { query } from '../db/index.js';

const router = Router();

// GET /api/appointments - Lista de citas
router.get('/', async (req: Request, res: Response) => {
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
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

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

export default router;
