import { Router, Request, Response } from 'express';
import { query, pool } from '../db/index.js';

import { nextDossierCode } from '../utils/dossier-number.js';

const router = Router();

// GET /api/dossiers - Lista de expedientes y trámites
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, category, clientId } = req.query;
    let sql = `
      SELECT d.*, c.full_name as client_name, c.bsn as client_bsn, c.phone as client_phone
      FROM dossiers d
      JOIN clients c ON d.client_id = c.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status) {
      params.push(status);
      sql += ` AND d.status = $${params.length}`;
    }

    if (category) {
      params.push(category);
      sql += ` AND d.category = $${params.length}`;
    }

    if (clientId) {
      params.push(clientId);
      sql += ` AND d.client_id = $${params.length}`;
    }

    sql += ` ORDER BY d.created_at DESC`;

    const result = await query(sql, params);
    res.json({ dossiers: result.rows });
  } catch (error) {
    console.error('Error al consultar trámites:', error);
    res.status(500).json({ error: 'Error al consultar expedientes' });
  }
});


// GET /api/dossiers/:id - Detalle operativo del expediente
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const dossier = await query('SELECT d.*, c.full_name AS client_name, c.email AS client_email, c.phone AS client_phone, u.full_name AS assigned_to_name FROM dossiers d JOIN clients c ON c.id=d.client_id LEFT JOIN users u ON u.id=d.assigned_to WHERE d.id=$1', [req.params.id]);
    if (!dossier.rows.length) return res.status(404).json({ error: 'Expediente no encontrado' });
    const [steps, activity, documents, messages, notes, appointments] = await Promise.all([
      query('SELECT * FROM dossier_steps WHERE dossier_id=$1 ORDER BY position, created_at', [req.params.id]),
      query('SELECT a.*, u.full_name AS actor_name FROM dossier_activity a LEFT JOIN users u ON u.id=a.actor_user_id WHERE a.dossier_id=$1 ORDER BY a.created_at DESC', [req.params.id]),
      query('SELECT id, file_name, category, ocr_status, is_verified, created_at FROM documents WHERE client_id=$1 ORDER BY created_at DESC', [dossier.rows[0].client_id]),
      query('SELECT m.*, u.full_name AS author_name FROM client_messages m LEFT JOIN users u ON u.id=m.author_user_id WHERE m.client_id=$1 ORDER BY m.created_at DESC LIMIT 20', [dossier.rows[0].client_id]),
      query('SELECT n.*, u.full_name AS author_name FROM dossier_notes n LEFT JOIN users u ON u.id=n.author_user_id WHERE n.dossier_id=$1 ORDER BY n.created_at DESC', [req.params.id]),
      query('SELECT * FROM appointments WHERE client_id=$1 ORDER BY appointment_date DESC, appointment_time DESC LIMIT 5', [dossier.rows[0].client_id]),
    ]);
    res.json({ dossier: dossier.rows[0], steps: steps.rows, activity: activity.rows, documents: documents.rows, messages: messages.rows, notes: notes.rows, appointments: appointments.rows });
  } catch (error) { console.error('Error consultando detalle de expediente:', error); res.status(500).json({ error: 'No se pudo cargar el expediente' }); }
});

router.post('/:id/steps', async (req: Request, res: Response) => {
  const { title, due_date, required } = req.body || {};
  if (!String(title || '').trim()) return res.status(400).json({ error: 'El título del paso es obligatorio' });
  try {
    const result = await query(`INSERT INTO dossier_steps (dossier_id, title, due_date, required, status, position) VALUES ($1,$2,$3,$4,'pending',(SELECT COALESCE(MAX(position),0)+1 FROM dossier_steps WHERE dossier_id=$1)) RETURNING *`, [req.params.id, String(title).trim(), due_date || null, required !== false]);
    await query('INSERT INTO dossier_activity (dossier_id, actor_user_id, action, detail) VALUES ($1,$2,$3,$4)', [req.params.id, req.user?.id, 'step_created', String(title).trim()]);
    res.status(201).json({ step: result.rows[0] });
  } catch (error) { console.error('Error creando paso:', error); res.status(500).json({ error: 'No se pudo crear el paso' }); }
});

router.post('/:id/notes', async (req: Request, res: Response) => {
  const body = String(req.body?.body || '').trim();
  if (!body) return res.status(400).json({ error: 'La nota no puede estar vacía' });
  try {
    const result = await query('INSERT INTO dossier_notes (dossier_id, author_user_id, body, private) VALUES ($1,$2,$3,$4) RETURNING *', [req.params.id, req.user?.id, body, req.body?.private !== false]);
    await query('INSERT INTO dossier_activity (dossier_id, actor_user_id, action, detail) VALUES ($1,$2,$3,$4)', [req.params.id, req.user?.id, 'note_added', body]);
    res.status(201).json({ note: result.rows[0] });
  } catch (error) { console.error('Error creando nota:', error); res.status(500).json({ error: 'No se pudo guardar la nota' }); }
});

router.patch('/:id/steps/:stepId', async (req: Request, res: Response) => {
  const status = req.body?.status === 'completed' ? 'completed' : 'pending';
  try {
    const result = await query(`UPDATE dossier_steps SET status=$1::varchar, completed_at=CASE WHEN $1::varchar='completed' THEN CURRENT_TIMESTAMP ELSE NULL END WHERE id=$2 AND dossier_id=$3 RETURNING *`, [status, req.params.stepId, req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Paso no encontrado' });
    await query('INSERT INTO dossier_activity (dossier_id, actor_user_id, action, detail) VALUES ($1,$2,$3,$4)', [req.params.id, req.user?.id, 'step_updated', result.rows[0].title]);
    res.json({ step: result.rows[0] });
  } catch (error) { console.error('Error actualizando paso:', error); res.status(500).json({ error: 'No se pudo actualizar el paso' }); }
});

// POST /api/dossiers - Crear nuevo trámite con código correlativo
router.post('/', async (req: Request, res: Response) => {
  let client;
  try {
    const { client_id, title, category, description, fee, deadline, priority } = req.body;

    if (!client_id || !title || !category) {
      return res.status(400).json({ error: 'Cliente, título y categoría son campos obligatorios' });
    }

    client = await pool.connect();
    await client.query('BEGIN');
    const code = await nextDossierCode(client);

    const sql = `
      INSERT INTO dossiers (code, client_id, title, category, description, fee, deadline, priority, status, progress_percentage)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'en_proceso', 15)
      RETURNING *;
    `;

    const result = await client.query(sql, [code, client_id, title, category, description || null, fee || 0, deadline || null, priority || 'media']);
    await client.query('COMMIT');
    res.status(201).json({ dossier: result.rows[0], message: 'Expediente creado correctamente' });
  } catch (error) {
    // El ROLLBACK puede fallar si la conexion ya esta rota; sin este guard el
    // `finally` no llegaria a release() y la conexion se fugaria al pool.
    if (client) { try { await client.query('ROLLBACK'); } catch { /* ya no sirve */ } }
    console.error('Error creando expediente:', error);
    res.status(500).json({ error: 'Error al registrar expediente' });
  } finally { client?.release(); }
});

// PATCH /api/dossiers/:id/status - Actualizar estado y progreso
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, progress_percentage } = req.body;

    const sql = `
      UPDATE dossiers SET 
        status = COALESCE($1, status),
        progress_percentage = COALESCE($2, progress_percentage),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *;
    `;

    const result = await query(sql, [status, progress_percentage, id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Expediente no encontrado' });
    }

    res.json({ dossier: result.rows[0] });
  } catch (error) {
    console.error('Error actualizando estado del expediente:', error);
    res.status(500).json({ error: 'Error al actualizar expediente' });
  }
});

export default router;
