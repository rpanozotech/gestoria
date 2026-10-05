import { Router, Request, Response } from 'express';
import { query, pool } from '../db/index.js';

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
  let client;
  try {
    const { client_id, title, category, description, fee, deadline, priority } = req.body;

    if (!client_id || !title || !category) {
      return res.status(400).json({ error: 'Cliente, título y categoría son campos obligatorios' });
    }

    // Codigo correlativo EXP-YYYY-XXXX.
    //
    // Tres cosas importan aqui y las tres importaban que no estuvieran:
    //
    // 1. MAX, no COUNT. COUNT sobre una tabla con huecos (borrados en cascada
    //    al eliminar un cliente) devuelve un numero que ya se uso: se creaban
    //    EXP-0001..0003, se borraba el 0002 y el siguiente alta calculaba
    //    COUNT=2 -> EXP-0003 -> colision con el UNIQUE -> 500. Y como el
    //    siguiente COUNT daba 2 otra vez, cada reintento fallaba igual: la
    //    numeracion quedaba inutilizada. MAX da el ultimo codigo realmente
    //    emitido, asi que un hueco se rellena sin volver a colisionar.
    //
    // 2. Filtrar por anio, no contar la tabla entera. Con COUNT global, el
    //    primer expediente de 2027 saldria EXP-2027-0017.
    //
    // 3. pg_advisory_xact_lock, como ya hacen quotes e invoices. Sin el, dos
    //    altas simultaneas leen el mismo MAX y la segunda choca con el UNIQUE.
    const year = new Date().getFullYear();
    client = await pool.connect();
    await client.query('BEGIN');
    await client.query("SELECT pg_advisory_xact_lock(hashtext('nexusgest_dossiers_number'))");
    const maxRes = await client.query(
      `SELECT COALESCE(MAX(NULLIF(regexp_replace(code, '^EXP-${year}-', ''), '')), 0) AS max_num
         FROM dossiers WHERE code LIKE $1`,
      [`EXP-${year}-%`]
    );
    const nextNum = parseInt(maxRes.rows[0].max_num, 10) + 1;
    const code = `EXP-${year}-${String(nextNum).padStart(4, '0')}`;

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
