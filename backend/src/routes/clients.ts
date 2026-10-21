import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import type { PoolClient } from 'pg';
import { pool, query } from '../db/index.js';
import { diffChangedFields } from '../utils/audit.js';

const router = Router();

// GET /api/clients/count - Recuento de clientes por estado
//
// Debe declararse ANTES que '/:id': Express prueba las rutas en orden, y si
// '/:id' va primero, GET /clients/count se interpretaria como buscar un
// cliente con id='count' y devolveria 404.
//
// Endpoint aparte del listado porque el menu lateral solo necesita el
// numero, no las fichas completas con sus JOIN a dossiers e invoices.
router.get('/count', async (req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT
        COUNT(DISTINCT id)::int AS total,
        COUNT(DISTINCT id) FILTER (WHERE status = 'activo')::int AS activos,
        COUNT(DISTINCT id) FILTER (WHERE status IN ('inactivo', 'archivado'))::int AS archivados,
        COUNT(DISTINCT id) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE))::int AS nuevos_este_mes,
        COUNT(DISTINCT id) FILTER (WHERE status <> 'eliminado' AND (NULLIF(trim(full_name), '') IS NULL OR NULLIF(trim(email), '') IS NULL OR NULLIF(trim(phone), '') IS NULL))::int AS pendientes
      FROM clients
      WHERE status <> 'eliminado'
    `);
    const row = result.rows[0] || {};
    res.json({
      total: Number(row.total || 0),
      activos: Number(row.activos || 0),
      archivados: Number(row.archivados || 0),
      nuevos_este_mes: Number(row.nuevos_este_mes || 0),
      pendientes: Number(row.pendientes || 0),
    });
  } catch (error) {
    console.error('Error al contar clientes:', error);
    res.status(500).json({ error: 'Error al obtener el recuento de clientes' });
  }
});

// GET /api/clients - Directorio con búsqueda y filtrado
router.get('/', async (req: Request, res: Response) => {
  try {
    const { search, status } = req.query;
    let sql = `
      SELECT c.*, 
             COUNT(DISTINCT d.id) as dossiers_count,
             COUNT(DISTINCT i.id) as invoices_count
      FROM clients c
      LEFT JOIN dossiers d ON c.id = d.client_id
      LEFT JOIN invoices i ON c.id = i.client_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (c.full_name ILIKE $${params.length} OR c.bsn ILIKE $${params.length} OR c.email ILIKE $${params.length} OR c.phone ILIKE $${params.length})`;
    }

    if (status) {
      params.push(status);
      sql += ` AND c.status = $${params.length}`;
    }

    sql += ` GROUP BY c.id ORDER BY c.created_at DESC`;

    const result = await query(sql, params);
    res.json({ clients: result.rows });
  } catch (error) {
    console.error('Error al listar clientes:', error);
    res.status(500).json({ error: 'Error al consultar clientes' });
  }
});

// GET /api/clients/match - Resolver un cliente al importar varios documentos.
// El BSN es la identidad fuerte; el nombre solo se devuelve si la coincidencia
// es exacta e inequívoca para que el frontend pueda evitar duplicados.
router.get('/match', async (req: Request, res: Response) => {
  try {
    const bsn = String(req.query.bsn || '').replace(/\s/g, '');
    const fullName = String(req.query.full_name || '').trim();
    if (!bsn && !fullName) return res.json({ match: null, candidates: [] });

    if (bsn) {
      const byBsn = await query('SELECT * FROM clients WHERE bsn = $1 LIMIT 2', [bsn]);
      if (byBsn.rows.length === 1) return res.json({ match: byBsn.rows[0], matched_by: 'bsn' });
      if (byBsn.rows.length > 1) return res.status(409).json({ error: 'Hay varios clientes con el mismo BSN', candidates: byBsn.rows });
    }

    // El nombre solo es fallback cuando el documento no trae BSN. Si un PDF
    // trae un BSN distinto, nunca debemos unirlo por nombre.
    if (!bsn && fullName) {
      const byName = await query(
        `SELECT * FROM clients
         WHERE lower(trim(full_name)) = lower(trim($1))
         ORDER BY created_at DESC LIMIT 2`,
        [fullName]
      );
      if (byName.rows.length === 1) return res.json({ match: byName.rows[0], matched_by: 'full_name' });
      if (byName.rows.length > 1) return res.status(409).json({ error: 'Hay varias coincidencias por nombre', candidates: byName.rows });
    }

    return res.json({ match: null, candidates: [] });
  } catch (error) {
    console.error('Error resolviendo coincidencia de cliente:', error);
    res.status(500).json({ error: 'No se pudo buscar el cliente existente' });
  }
});

// POST /api/clients/:id/portal-access - Crear o regenerar acceso del cliente.
router.post('/:id/portal-access', async (req: Request, res: Response) => {
  try {
    const clientResult = await query('SELECT * FROM clients WHERE id = $1', [req.params.id]);
    if (clientResult.rows.length === 0) return res.status(404).json({ error: 'Cliente no encontrado' });
    const client = clientResult.rows[0];
    const baseUsername = client.full_name.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '').slice(0, 32) || 'cliente';
    const username = client.portal_username || `${baseUsername}-${crypto.randomBytes(3).toString('hex')}`;
    const password = `RP-${crypto.randomBytes(6).toString('base64url')}`;
    const hash = await bcrypt.hash(password, 12);
    let userId = client.user_id;
    if (userId) {
      await query('UPDATE users SET password_hash = $1, is_active = true, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [hash, userId]);
    } else {
      const user = await query(
        `INSERT INTO users (email, password_hash, full_name, role, is_active)
         VALUES ($1, $2, $3, 'cliente', true) RETURNING id`,
        [`${username}@portal.local`, hash, client.full_name]
      );
      userId = user.rows[0].id;
    }
    await query('UPDATE clients SET user_id = $1, portal_username = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3', [userId, username, client.id]);
    res.json({ portal_access: { username, password }, message: 'Acceso del portal listo' });
  } catch (error) {
    console.error('Error generando acceso de portal:', error);
    res.status(500).json({ error: 'No se pudo generar el acceso del portal' });
  }
});

// POST /api/clients/import - Importación CSV validada, sin datos de demostración.
router.post('/import', async (req: Request, res: Response) => {
  try {
    const csv = typeof req.body?.csv === 'string' ? req.body.csv : '';
    if (!csv.trim()) return res.status(400).json({ error: 'El archivo CSV está vacío' });
    const rows = csv.trim().split(/\r?\n/).map((line: string) => {
      const values: string[] = []; const re = /(?:^|,)\s*(?:"((?:[^"]|"")*)"|([^,]*))/g; let match: RegExpExecArray | null;
      while ((match = re.exec(line))) values.push((match[1] ?? match[2] ?? '').replace(/""/g, '"').trim());
      return values;
    });
    const headers = rows.shift()!.map((h: string) => h.toLowerCase().replace(/^ï»¿/, '').trim());
    const required = ['full_name'];
    if (!required.every((h) => headers.includes(h))) return res.status(400).json({ error: 'El CSV debe incluir la columna full_name' });
    const created: unknown[] = []; const skipped: { row: number; reason: string }[] = [];
    for (const [index, values] of rows.entries()) {
      const data = Object.fromEntries(headers.map((header: string, i: number) => [header, values[i] || '']));
      if (!data.full_name) { skipped.push({ row: index + 2, reason: 'full_name vacío' }); continue; }
      if (data.email) { const existing = await query('SELECT id FROM clients WHERE lower(email) = lower($1) AND status <> $2 LIMIT 1', [data.email, 'eliminado']); if (existing.rows.length) { skipped.push({ row: index + 2, reason: 'email ya registrado' }); continue; } }
      const result = await query(`INSERT INTO clients (full_name,email,phone,bsn,address,city,postal_code,country,iban,status,notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'activo',$10) RETURNING id,full_name,email`, [data.full_name, data.email || null, data.phone || null, data.bsn || null, data.address || null, data.city || null, data.postal_code || null, data.country || 'Países Bajos', data.iban || null, data.notes || null]);
      created.push(result.rows[0]);
    }
    res.status(201).json({ created, skipped });
  } catch (error) { console.error('Error importando clientes:', error); res.status(500).json({ error: 'No se pudo importar el CSV' }); }
});

// GET /api/clients/:id - Ficha 360° completa
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 1. Datos básicos
    const clientRes = await query('SELECT * FROM clients WHERE id = $1', [id]);
    if (clientRes.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    const client = clientRes.rows[0];

    // 2. Expedientes asociados
    const dossiers = await query('SELECT * FROM dossiers WHERE client_id = $1 ORDER BY created_at DESC', [id]);

    // 3. Presupuestos y Facturas
    const quotes = await query('SELECT * FROM quotes WHERE client_id = $1 ORDER BY created_at DESC', [id]);
    const invoices = await query('SELECT * FROM invoices WHERE client_id = $1 ORDER BY created_at DESC', [id]);

    // 4. Citas
    const appointments = await query('SELECT a.*, sp.title AS service_title FROM appointments a LEFT JOIN service_prices sp ON sp.id = a.service_id WHERE a.client_id = $1 ORDER BY appointment_date DESC, appointment_time DESC', [id]);
    const serviceRequests = await query('SELECT sr.*, sp.title AS service_title, sp.base_price AS service_price FROM service_requests sr LEFT JOIN service_prices sp ON sp.id = sr.service_id WHERE sr.client_id = $1 ORDER BY sr.created_at DESC', [id]);

    // 5. Documentos
    const documents = await query('SELECT * FROM documents WHERE client_id = $1 ORDER BY created_at DESC', [id]);
    const messages = await query('SELECT m.*, u.full_name AS author_name FROM client_messages m LEFT JOIN users u ON u.id=m.author_user_id WHERE m.client_id = $1 ORDER BY m.created_at DESC', [id]);
    const audit = await query('SELECT a.*, u.full_name AS actor_name FROM client_audit_log a LEFT JOIN users u ON u.id=a.actor_user_id WHERE a.client_id = $1 ORDER BY a.created_at DESC', [id]);
    const tasks = await query('SELECT t.*, d.code AS dossier_code FROM crm_tasks t LEFT JOIN dossiers d ON d.id=t.dossier_id WHERE t.client_id = $1 ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC', [id]);

    res.json({
      client,
      dossiers: dossiers.rows,
      quotes: quotes.rows,
      invoices: invoices.rows,
      appointments: appointments.rows,
      service_requests: serviceRequests.rows,
      documents: documents.rows,
      messages: messages.rows,
      audit: audit.rows,
      tasks: tasks.rows,
    });
  } catch (error) {
    console.error('Error al obtener ficha 360 del cliente:', error);
    res.status(500).json({ error: 'Error al cargar ficha 360°' });
  }
});

// POST /api/clients - Crear nuevo cliente (Manual o tras revisión IA)
router.post('/', async (req: Request, res: Response) => {
  let db: PoolClient | undefined;
  let transactionOpen = false;
  try {
    db = await pool.connect();
    await db.query('BEGIN');
    transactionOpen = true;
    const {
      full_name,
      email,
      phone,
      bsn,
      id_document_number,
      nationality,
      address,
      city,
      postal_code,
      country,
      iban,
      digid_status,
      status,
      notes,
    } = req.body;

    if (!full_name) {
      return res.status(400).json({ error: 'El nombre completo es obligatorio' });
    }

    const insertSql = `
      INSERT INTO clients 
      (full_name, email, phone, bsn, id_document_number, nationality, address, city, postal_code, country, iban, digid_status, status, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *;
    `;

    const values = [
      full_name.trim(),
      email ? email.trim().toLowerCase() : null,
      phone ? phone.trim() : null,
      bsn ? bsn.trim() : null,
      id_document_number || null,
      nationality || 'España',
      address || null,
      city || null,
      postal_code || null,
      country || 'Países Bajos',
      iban ? iban.trim().toUpperCase() : null,
      digid_status || 'sin_digid',
      status || 'activo',
      notes || null,
    ];

    const clientResult = await db.query(insertSql, values);
    const client = clientResult.rows[0];

    // Credenciales reales del portal: la clave se muestra una sola vez en la
    // respuesta y solo el hash queda guardado en PostgreSQL.
    const baseUsername = full_name.trim()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '').slice(0, 32) || 'cliente';
    const portalUsername = `${baseUsername}-${crypto.randomBytes(3).toString('hex')}`;
    const portalPassword = `RP-${crypto.randomBytes(6).toString('base64url')}`;
    const portalHash = await bcrypt.hash(portalPassword, 12);
    const userResult = await db.query(
      `INSERT INTO users (email, password_hash, full_name, role, is_active)
       VALUES ($1, $2, $3, 'cliente', true) RETURNING id, email, full_name, role`,
      [`${portalUsername}@portal.local`, portalHash, full_name.trim()]
    );
    await db.query(
      'UPDATE clients SET user_id = $1, portal_username = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
      [userResult.rows[0].id, portalUsername, client.id]
    );
    client.user_id = userResult.rows[0].id;
    client.portal_username = portalUsername;

    await db.query('COMMIT');
    transactionOpen = false;
    res.status(201).json({
      client,
      portal_access: { username: portalUsername, password: portalPassword },
      message: 'Cliente registrado exitosamente',
    });
  } catch (error: any) {
    if (db && transactionOpen) await db.query('ROLLBACK').catch(() => undefined);
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Ya existe un cliente con ese número de BSN' });
    }
    console.error('Error al registrar cliente:', error);
    res.status(500).json({ error: 'Error al guardar el cliente' });
  } finally {
    db?.release();
  }
});

// PUT /api/clients/:id - Actualizar datos del cliente
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      full_name,
      email,
      phone,
      bsn,
      id_document_number,
      nationality,
      address,
      city,
      postal_code,
      iban,
      digid_status,
      status,
      notes,
    } = req.body;

    const previousResult = await query(
      'SELECT full_name, email, phone, bsn, id_document_number, nationality, address, city, postal_code, iban, digid_status, status, notes FROM clients WHERE id = $1',
      [id],
    );
    if (previousResult.rows.length === 0) return res.status(404).json({ error: 'Cliente no encontrado' });

    const sql = `
      UPDATE clients SET
        full_name = COALESCE($1, full_name),
        email = COALESCE($2, email),
        phone = COALESCE($3, phone),
        bsn = COALESCE($4, bsn),
        id_document_number = COALESCE($5, id_document_number),
        nationality = COALESCE($6, nationality),
        address = COALESCE($7, address),
        city = COALESCE($8, city),
        postal_code = COALESCE($9, postal_code),
        iban = COALESCE($10, iban),
        digid_status = COALESCE($11, digid_status),
        status = COALESCE($12, status),
        notes = COALESCE($13, notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $14
      RETURNING *;
    `;

    const result = await query(sql, [
      full_name,
      email,
      phone,
      bsn,
      id_document_number,
      nationality,
      address,
      city,
      postal_code,
      iban,
      digid_status,
      status,
      notes,
      id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const auditFields = ['full_name', 'email', 'phone', 'bsn', 'id_document_number', 'nationality', 'address', 'city', 'postal_code', 'iban', 'digid_status', 'status', 'notes'] as const;
    const changes = diffChangedFields(previousResult.rows[0], result.rows[0], auditFields);
    if (Object.keys(changes).length > 0) {
      await query(
        `INSERT INTO client_audit_log (client_id, actor_user_id, actor_role, action, changes)
         VALUES ($1, $2, $3, 'client.updated', $4::jsonb)`,
        [id, req.user?.id || null, req.user?.role || null, JSON.stringify(changes)],
      );
    }

    res.json({ client: result.rows[0], message: 'Cliente actualizado correctamente' });
  } catch (error) {
    console.error('Error al actualizar cliente:', error);
    res.status(500).json({ error: 'Error al actualizar datos' });
  }
});

// Revelación explícita de BSN para gestores autorizados. Nunca se guarda el valor en auditoría.
router.post('/:id/bsn/reveal', async (req: Request, res: Response) => {
  try {
    const result = await query('SELECT id, bsn FROM clients WHERE id = $1', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Cliente no encontrado' });
    await query(
      `INSERT INTO client_audit_log (client_id, actor_user_id, actor_role, action, changes)
       VALUES ($1, $2, $3, 'bsn.revealed', $4::jsonb)`,
      [req.params.id, req.user?.id || null, req.user?.role || 'gestor', JSON.stringify({ field: 'bsn', origin: 'CRM' })]
    );
    return res.json({ ok: true });
  } catch (error) {
    console.error('Error registrando revelación de BSN del CRM:', error);
    return res.status(500).json({ error: 'No se pudo registrar la revelación del BSN' });
  }
});

// GET /api/clients/:id/audit - Historial de cambios de la ficha
router.get('/:id/audit', async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT a.id, a.action, a.changes, a.actor_role, a.created_at,
              u.full_name AS actor_name
       FROM client_audit_log a
       LEFT JOIN users u ON u.id = a.actor_user_id
       WHERE a.client_id = $1
       ORDER BY a.created_at DESC
       LIMIT 200`,
      [req.params.id],
    );
    res.json({ audit: result.rows });
  } catch (error) {
    console.error('Error al cargar historial del cliente:', error);
    res.status(500).json({ error: 'No se pudo cargar el historial' });
  }
});

// DELETE /api/clients/:id - Eliminar cliente
//
// Solo permite borrar clientes SIN historial economico. Las tablas cuelgan
// de clients con ON DELETE CASCADE, asi que un DELETE se lleva por delante
// expedientes, presupuestos, facturas, citas y documentos. Para una
// gestoria eso es perder contabilidad con facturas ya pagadas, que tienen
// obligacion legal de conservacion.
//
// Ante la duda se desactiva (PUT con status='inactivo'), que es reversible.
// Este endpoint es para limpiar altas erroneas o duplicados.
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const exists = await query('SELECT id FROM clients WHERE id = $1', [id]);
    if (exists.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    // Inventario previo: devuelve el detalle para que la UI pueda mostrar
    // exactamente que se va a perder, no solo el numero.
    const [dossiers, invoices, quotes, appointments, documents, paid] = await Promise.all([
      query('SELECT COUNT(*)::int AS n FROM dossiers WHERE client_id = $1', [id]),
      query('SELECT COUNT(*)::int AS n FROM invoices WHERE client_id = $1', [id]),
      query('SELECT COUNT(*)::int AS n FROM quotes WHERE client_id = $1', [id]),
      query('SELECT COUNT(*)::int AS n FROM appointments WHERE client_id = $1', [id]),
      query('SELECT COUNT(*)::int AS n FROM documents WHERE client_id = $1', [id]),
      query("SELECT COUNT(*)::int AS n FROM invoices WHERE client_id = $1 AND status = 'pagada'", [id]),
    ]);

    const impact = {
      expedientes: dossiers.rows[0].n,
      facturas: invoices.rows[0].n,
      facturas_pagadas: paid.rows[0].n,
      presupuestos: quotes.rows[0].n,
      citas: appointments.rows[0].n,
      documentos: documents.rows[0].n,
    };

    const total = Object.values(impact).reduce((a, b) => a + b, 0) - impact.facturas_pagadas;

    // Bloqueo absoluto: con facturas pagadas no se borra nunca.
    if (impact.facturas_pagadas > 0) {
      return res.status(409).json({
        error:
          'Este cliente tiene facturas pagadas y no se puede eliminar. ' +
          'Por obligación de conservación fiscal deben mantenerse. ' +
          'Desactívalo en su lugar (estado "inactivo"): deja de aparecer en los listados sin borrar nada.',
        impact,
      });
    }

    // Con historico economico sin cobrar, se exige confirmacion explicita:
    // ?confirmar=SI. Sin ella, el endpoint devuelve el inventario y no borra.
    if (total > 0 && req.query.confirmar !== 'SI') {
      return res.status(409).json({
        error:
          'Este cliente tiene datos asociados que se perderán. ' +
          'Repite la petición con ?confirmar=SI si quieres continuar.',
        impact,
        requiere_confirmacion: true,
      });
    }

    await query('DELETE FROM clients WHERE id = $1', [id]);

    res.json({
      message: 'Cliente eliminado',
      eliminado: impact,
    });
  } catch (error) {
    console.error('Error al eliminar cliente:', error);
    res.status(500).json({ error: 'Error al eliminar el cliente' });
  }
});

// POST /api/clients/:id/deactivate - Desactivar cliente (vía recomendada)
//
// Marca el cliente como 'inactivo' sin tocar ningun otro registro: el
// historial permanece intacto y es reversible volviendo a ponerlo 'activo'.
// Es la alternativa al borrado cuando el cliente ya tiene expediente.
router.post('/:id/deactivate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const nuevoEstado = (req.body?.status || 'inactivo').trim();

    if (!['activo', 'inactivo', 'prospecto'].includes(nuevoEstado)) {
      return res.status(400).json({
        error: `Estado no válido: ${nuevoEstado}. Valores admitidos: activo, inactivo, prospecto.`,
      });
    }

    const result = await query(
      `UPDATE clients SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, full_name, status;`,
      [nuevoEstado, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    res.json({
      client: result.rows[0],
      message:
        nuevoEstado === 'inactivo'
          ? 'Cliente desactivado. Su historial se conserva intacto.'
          : `Cliente marcado como "${nuevoEstado}".`,
    });
  } catch (error) {
    console.error('Error al desactivar cliente:', error);
    res.status(500).json({ error: 'Error al cambiar el estado del cliente' });
  }
});

export default router;
