import { Router, Request, Response } from 'express';
import { pool } from '../db/index.js';

import { nextDossierCode } from '../utils/dossier-number.js';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  const { service_id, full_name, email, phone, notes, source = 'web', legal_consent, legal_terms_version } = req.body || {};
  if (!service_id || !String(full_name || '').trim() || !email || !phone) {
    return res.status(400).json({ error: 'Servicio, nombre, email y teléfono son obligatorios.' });
  }
  if (legal_consent !== true) return res.status(400).json({ error: 'Debes aceptar la política de privacidad y las condiciones generales.' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const service = await client.query('SELECT id, title, base_price FROM service_prices WHERE id = $1 AND active = TRUE', [service_id]);
    if (service.rows.length === 0) {
      // Sin ROLLBACK, release() devolveria al pool una conexion con la
      // transaccion abierta: la siguiente peticion que la tome escribiria
      // dentro de ella y su COMMIT confirmaria trabajo ajeno.
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'El servicio no existe o no está activo.' });
    }
    // Take the shared numbering lock before locking a client: dossiers inserts
    // acquire an FK key-share lock, so the opposite order can deadlock.
    const dossierCode = await nextDossierCode(client);
    const found = await client.query(
      'SELECT id FROM clients WHERE lower(email) = lower($1) OR phone = $2 ORDER BY created_at DESC LIMIT 1 FOR UPDATE',
      [String(email).trim(), String(phone).trim()]
    );
    let clientId: string;
    if (found.rows.length > 0) {
      clientId = found.rows[0].id;
      await client.query('UPDATE clients SET full_name = COALESCE(NULLIF($1, \'\'), full_name), phone = COALESCE(NULLIF($2, \'\'), phone), updated_at = CURRENT_TIMESTAMP WHERE id = $3', [String(full_name).trim(), String(phone).trim(), clientId]);
    } else {
      const created = await client.query(
        `INSERT INTO clients (full_name, email, phone, status, notes) VALUES ($1,$2,$3,'prospecto',$4) RETURNING id`,
        [String(full_name).trim(), String(email).trim().toLowerCase(), String(phone).trim(), 'Solicitud creada desde la web']
      );
      clientId = created.rows[0].id;
    }
    const request = await client.query(
      `INSERT INTO service_requests (client_id, service_id, source, status, notes, legal_consent, legal_consent_at, legal_terms_version) VALUES ($1,$2,$3,'pendiente',$4,$5,CURRENT_TIMESTAMP,$6) RETURNING *`,
      [clientId, service_id, source, notes || null, true, legal_terms_version || '2026-10-07']
    );
    const dossier = await client.query(
      `INSERT INTO dossiers (code, client_id, title, category, description, fee, status, priority) VALUES ($1,$2,$3,'Solicitud web',$4,$5,'en_proceso','media') RETURNING *`,
      [dossierCode, clientId, service.rows[0].title, notes || 'Solicitud recibida desde la web', service.rows[0].base_price]
    );
    await client.query('COMMIT');
    res.status(201).json({ client_id: clientId, request: request.rows[0], dossier: dossier.rows[0], message: 'Solicitud guardada correctamente.' });
  } catch (error) {
    // El ROLLBACK puede fallar si la conexion ya esta rota; sin este guard el
    // `finally` no llegaria a release() y la conexion se fugaria al pool.
    try { await client.query('ROLLBACK'); } catch { /* la conexion ya no sirve */ }
    console.error('Error creando solicitud web:', error);
    res.status(500).json({ error: 'No se pudo guardar la solicitud.' });
  } finally { client.release(); }
});

export default router;
