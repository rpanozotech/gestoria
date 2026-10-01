import { Router, Request, Response } from 'express';
import { query } from '../db/index.js';

const router = Router();

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

    const result = await query(insertSql, values);
    res.status(201).json({ client: result.rows[0], message: 'Cliente registrado exitosamente' });
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
