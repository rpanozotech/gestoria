import { Router, Request, Response } from 'express';
import { query } from '../db/index.js';

const router = Router();

// GET /api/dashboard/stats - Métricas ejecutivas en vivo
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // 1. Clientes activos
    const clientsCount = await query(`
      SELECT
        COUNT(DISTINCT id) FILTER (WHERE status = 'activo')::int AS activos,
        COUNT(DISTINCT id) FILTER (WHERE status <> 'eliminado' AND created_at >= date_trunc('month', CURRENT_DATE))::int AS nuevos_este_mes,
        COUNT(DISTINCT id) FILTER (WHERE status <> 'eliminado' AND (NULLIF(trim(full_name), '') IS NULL OR NULLIF(trim(email), '') IS NULL OR NULLIF(trim(phone), '') IS NULL))::int AS pendientes
      FROM clients
      WHERE status <> 'eliminado'`);

    // 2. Citas de hoy
    const appointmentsToday = await query(
      `SELECT COUNT(*) as total, 
              COUNT(CASE WHEN status = 'completada' THEN 1 END) as completed,
              COUNT(CASE WHEN status != 'completada' AND status != 'cancelada' THEN 1 END) as pending
       FROM appointments WHERE appointment_date = $1`,
      [today]
    );

    // 3. Trámites activos y Belastingdienst
    const dossiersStats = await query(
      `SELECT COUNT(*) as total_active,
              COUNT(CASE WHEN status = 'en_belastingdienst' THEN 1 END) as belastingdienst_count
       FROM dossiers WHERE status != 'completado' AND status != 'cancelado'`
    );

    // 4. Facturación mensual y facturas pendientes
    const invoicesStats = await query(
      `SELECT 
         COALESCE(SUM(CASE WHEN status = 'pagada' THEN total ELSE 0 END), 0) as paid_month,
         COALESCE(SUM(CASE WHEN status = 'emitida' THEN total ELSE 0 END), 0) as pending_amount,
         COUNT(CASE WHEN status = 'emitida' THEN 1 END) as pending_count
       FROM invoices`
    );

    // 5. Citas de hoy con datos de cliente
    const todayAppointmentsList = await query(
      `SELECT a.*, c.full_name as client_name, c.phone as client_phone
       FROM appointments a
       JOIN clients c ON a.client_id = c.id
       WHERE a.appointment_date = $1
       ORDER BY a.appointment_time ASC`,
      [today]
    );

    // 6. Trámites recientes
    const recentDossiers = await query(
      `SELECT d.*, c.full_name as client_name, c.bsn as client_bsn
       FROM dossiers d
       JOIN clients c ON d.client_id = c.id
       ORDER BY d.updated_at DESC
       LIMIT 6`
    );

    res.json({
      kpis: {
        active_clients: Number(clientsCount.rows[0].activos || 0),
        client_stats: {
          active: Number(clientsCount.rows[0].activos || 0),
          new_this_month: Number(clientsCount.rows[0].nuevos_este_mes || 0),
          incomplete: Number(clientsCount.rows[0].pendientes || 0),
        },
        appointments_today: {
          total: parseInt(appointmentsToday.rows[0].total, 10),
          completed: parseInt(appointmentsToday.rows[0].completed, 10),
          pending: parseInt(appointmentsToday.rows[0].pending, 10),
        },
        active_dossiers: {
          total: parseInt(dossiersStats.rows[0].total_active, 10),
          belastingdienst: parseInt(dossiersStats.rows[0].belastingdienst_count, 10),
        },
        finances: {
          monthly_revenue: parseFloat(invoicesStats.rows[0].paid_month),
          pending_revenue: parseFloat(invoicesStats.rows[0].pending_amount),
          pending_invoices_count: parseInt(invoicesStats.rows[0].pending_count, 10),
        },
      },
      today_appointments: todayAppointmentsList.rows,
      recent_dossiers: recentDossiers.rows,
    });
  } catch (error) {
    console.error('Error obteniendo stats del dashboard:', error);
    res.status(500).json({ error: 'Error al cargar estadísticas del dashboard' });
  }
});

export default router;
