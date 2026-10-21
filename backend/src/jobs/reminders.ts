import { query } from '../db/index.js';

/**
 * Previsualiza recordatorios vencidos sin enviar mensajes ni cambiar estados.
 * Un worker externo (n8n, email o WhatsApp) puede consumir la misma cola
 * después de configurar credenciales y política de entrega.
 */
const result = await query(
  `SELECT kind, COUNT(*)::int AS count
   FROM appointment_reminders r
   JOIN appointments a ON a.id = r.appointment_id
   WHERE r.status = 'pending' AND r.scheduled_at <= CURRENT_TIMESTAMP
     AND a.status NOT IN ('cancelada', 'completada')
   GROUP BY kind
   ORDER BY kind`,
);

console.log(JSON.stringify({ dry_run: true, side_effects: false, due_by_kind: result.rows }));
