import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { query } from '../db/index.js';

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
    const result = await query(
      `SELECT status, COUNT(*)::int AS n
       FROM clients
       GROUP BY status
       ORDER BY status;`
    );

    const porEstado = result.rows.reduce((acc: Record<string, number>, r: any) => {
      acc[r.status] = r.n;
      return acc;
    }, {});

    res.json({
      total: result.rows.reduce((sum: number, r: any) => sum + r.n, 0),
      activos: porEstado['activo'] || 0,
      prospectos: porEstado['prospecto'] || 0,
      inactivos: porEstado['inactivo'] || 0,
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
    const appointments = await query('SELECT * FROM appointments WHERE client_id = $1 ORDER BY appointment_date DESC, appointment_time DESC', [id]);

    // 5. Documentos
    const documents = await query('SELECT * FROM documents WHERE client_id = $1 ORDER BY created_at DESC', [id]);

    res.json({
      client,
      dossiers: dossiers.rows,
      quotes: quotes.rows,
      invoices: invoices.rows,
      appointments: appointments.rows,
      documents: documents.rows,
    });
  } catch (error) {
    console.error('Error al obtener ficha 360 del cliente:', error);
    res.status(500).json({ error: 'Error al cargar ficha 360°' });
  }
});

// POST /api/clients - Crear nuevo cliente (Manual o tras revisión IA)
router.post('/', async (req: Request, res: Response) => {
  try {
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

    const clientResult = await query(insertSql, values);
    const client = clientResult.rows[0];

    // Credenciales reales del portal: la clave se muestra una sola vez en la
    // respuesta y solo el hash queda guardado en PostgreSQL.
    const baseUsername = full_name.trim()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '').slice(0, 32) || 'cliente';
    const portalUsername = `${baseUsername}-${crypto.randomBytes(3).toString('hex')}`;
    const portalPassword = `RP-${crypto.randomBytes(6).toString('base64url')}`;
    const portalHash = await bcrypt.hash(portalPassword, 12);
    const userResult = await query(
      `INSERT INTO users (email, password_hash, full_name, role, is_active)
       VALUES ($1, $2, $3, 'cliente', true) RETURNING id, email, full_name, role`,
      [`${portalUsername}@portal.local`, portalHash, full_name.trim()]
    );
    await query(
      'UPDATE clients SET user_id = $1, portal_username = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
      [userResult.rows[0].id, portalUsername, client.id]
    );
    client.user_id = userResult.rows[0].id;
    client.portal_username = portalUsername;

    res.status(201).json({
      client,
      portal_access: { username: portalUsername, password: portalPassword },
      message: 'Cliente registrado exitosamente',
    });
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Ya existe un cliente con ese número de BSN' });
    }
    console.error('Error al registrar cliente:', error);
    res.status(500).json({ error: 'Error al guardar el cliente' });
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

    res.json({ client: result.rows[0], message: 'Cliente actualizado correctamente' });
  } catch (error) {
    console.error('Error al actualizar cliente:', error);
    res.status(500).json({ error: 'Error al actualizar datos' });
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
