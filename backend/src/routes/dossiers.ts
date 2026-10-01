import { Router, Request, Response } from 'express';
import { query } from '../db/index.js';

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

// POST /api/dossiers - Crear nuevo trámite con código correlativo
router.post('/', async (req: Request, res: Response) => {
  try {
    const { client_id, title, category, description, fee, deadline, priority } = req.body;

    if (!client_id || !title || !category) {
      return res.status(400).json({ error: 'Cliente, título y categoría son campos obligatorios' });
    }

    // Generar código EXP-2026-XXXX
    const countRes = await query(`SELECT COUNT(*) FROM dossiers`);
    const nextNum = parseInt(countRes.rows[0].count, 10) + 1;
    const year = new Date().getFullYear();
    const code = `EXP-${year}-${String(nextNum).padStart(4, '0')}`;

    const sql = `
      INSERT INTO dossiers (code, client_id, title, category, description, fee, deadline, priority, status, progress_percentage)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'en_proceso', 15)
      RETURNING *;
    `;

    const result = await query(sql, [code, client_id, title, category, description || null, fee || 0, deadline || null, priority || 'media']);
    res.status(201).json({ dossier: result.rows[0], message: 'Expediente creado correctamente' });
  } catch (error) {
    console.error('Error creando expediente:', error);
    res.status(500).json({ error: 'Error al registrar expediente' });
  }
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
