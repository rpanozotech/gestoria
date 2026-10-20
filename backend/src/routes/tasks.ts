import { Router, Request, Response } from 'express';
import { query } from '../db/index.js';
import { normalizeTaskStatus } from '../utils/task-workflow.js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : '';
    const params: unknown[] = [];
    let where = '';
    if (status) { params.push(normalizeTaskStatus(status)); where = 'WHERE t.status = $1'; }
    const result = await query(`SELECT t.*, c.full_name AS client_name, d.code AS dossier_code, d.title AS dossier_title, u.full_name AS assigned_to_name FROM crm_tasks t LEFT JOIN clients c ON c.id=t.client_id LEFT JOIN dossiers d ON d.id=t.dossier_id LEFT JOIN users u ON u.id=t.assigned_to ${where} ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC`, params);
    res.json({ tasks: result.rows });
  } catch (error) { console.error('Error listando tareas:', error); res.status(500).json({ error: 'No se pudieron cargar las tareas' }); }
});

router.post('/', async (req: Request, res: Response) => {
  const { client_id, dossier_id, assigned_to, title, description, due_date, priority, category } = req.body || {};
  if (!String(title || '').trim()) return res.status(400).json({ error: 'El título de la tarea es obligatorio' });
  try {
    const result = await query(`INSERT INTO crm_tasks (client_id, dossier_id, assigned_to, title, description, due_date, priority, category, status, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pendiente',$9) RETURNING *`, [client_id || null, dossier_id || null, assigned_to || null, String(title).trim(), description || null, due_date || null, priority || 'normal', category || 'seguimiento', req.user?.id]);
    res.status(201).json({ task: result.rows[0] });
  } catch (error) { console.error('Error creando tarea:', error); res.status(500).json({ error: 'No se pudo crear la tarea' }); }
});

router.patch('/:id', async (req: Request, res: Response) => {
  const { title, description, due_date, priority, category, assigned_to, status } = req.body || {};
  try {
    const result = await query(`UPDATE crm_tasks SET title=COALESCE($1,title), description=COALESCE($2,description), due_date=COALESCE($3,due_date), priority=COALESCE($4,priority), category=COALESCE($5,category), assigned_to=COALESCE($6,assigned_to), status=COALESCE($7,status), completed_at=CASE WHEN $7='completada' THEN CURRENT_TIMESTAMP WHEN $7 IS NOT NULL THEN NULL ELSE completed_at END, updated_at=CURRENT_TIMESTAMP WHERE id=$8 RETURNING *`, [title ? String(title).trim() : null, description ?? null, due_date ?? null, priority ?? null, category ?? null, assigned_to ?? null, status ? normalizeTaskStatus(status) : null, req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Tarea no encontrada' });
    res.json({ task: result.rows[0] });
  } catch (error) { console.error('Error actualizando tarea:', error); res.status(500).json({ error: 'No se pudo actualizar la tarea' }); }
});

router.post('/bulk', async (req: Request, res: Response) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids.filter((id: unknown) => typeof id === 'string') : [];
  const action = typeof req.body?.action === 'string' ? req.body.action : '';
  const statusByAction: Record<string, string> = { complete: 'completada', waiting_client: 'en_espera_cliente', review: 'revision' };
  if (!ids.length || !statusByAction[action]) return res.status(400).json({ error: 'Selecciona tareas y una acción válida' });
  try {
    const result = await query(`UPDATE crm_tasks SET status=$1, completed_at=CASE WHEN $1='completada' THEN CURRENT_TIMESTAMP ELSE NULL END, updated_at=CURRENT_TIMESTAMP WHERE id = ANY($2::uuid[]) RETURNING id, status`, [statusByAction[action], ids]);
    res.json({ updated: result.rows });
  } catch (error) { console.error('Error aplicando acción masiva:', error); res.status(500).json({ error: 'No se pudo aplicar la acción' }); }
});

export default router;
