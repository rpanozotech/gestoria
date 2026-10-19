import { getStoredUser } from './session';

const demoClient = { id: 'demo-client-1', full_name: 'María Ejemplo', email: 'demo@example.test', bsn: '••••••••', status: 'activo' };
const demoServices = [
  { id: 'demo-service-1', title: 'Declaración de la renta (M-Form)', category: 'Impuestos', priceFinal: 89 },
  { id: 'demo-service-2', title: 'DigiD y trámites de llegada', category: 'Llegada', priceFinal: 29 },
];
const demoInvoices = [
  { id: 'demo-invoice-1', code: 'FAC-DEMO-001', client_id: demoClient.id, client_name: demoClient.full_name, client_bsn: demoClient.bsn, items: [{ description: 'Consulta de orientación', total: 49 }], subtotal: 40.50, tax_amount: 8.50, total: 49, status: 'emitida', payment_method: 'transferencia', due_date: '2026-11-15' },
  { id: 'demo-invoice-2', code: 'FAC-DEMO-002', client_id: demoClient.id, client_name: demoClient.full_name, client_bsn: demoClient.bsn, items: [{ description: 'Solicitud DigiD', total: 29 }], subtotal: 23.97, tax_amount: 5.03, total: 29, status: 'pagada', payment_method: 'ideal', payment_reference: 'DEMO-PAID-002', due_date: '2026-10-30' },
];
const demoQuotes = [{ id: 'demo-quote-1', code: 'PRE-DEMO-001', client_id: demoClient.id, client_name: demoClient.full_name, client_bsn: demoClient.bsn, items: [{ description: 'Ruta de llegada', total: 120 }], subtotal: 99.17, tax_amount: 20.83, total: 120, status: 'pendiente', valid_until: '2026-12-01' }];

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

export async function previewApiResponse(path: string, init: RequestInit = {}): Promise<Response> {
  const method = init.method || 'GET';
  if (path === '/auth/me') return json({ user: getStoredUser() || { id: 'demo-user', email: 'demo@example.test', full_name: 'Usuario de prueba', role: 'gestor' } });
  if (path === '/push/preferences') return json({ preferences: { citas: true, deudas: true, pagos: true, documentos: true, mensajes: true, facturas: true, tareas: true } });
  if (path === '/push/public-key') return json({ publicKey: null, enabled: false });
  if (path === '/push/subscription') return json({ ok: true });
  if (path === '/clients/count') return json({ total: 1, activos: 1, archivados: 0, nuevos_este_mes: 1, pendientes: 1 });
  if (path === '/dashboard/stats') return json({ kpis: { active_clients: 1, appointments_today: { total: 2, completed: 1, pending: 1 }, active_dossiers: { total: 3, belastingdienst: 1 }, finances: { monthly_revenue: 1200, pending_revenue: 169, pending_invoices_count: 1 }, client_stats: { active: 1, new_this_month: 1, incomplete: 1 } }, today_appointments: [{ id: 'demo-appointment-1', client_name: demoClient.full_name, title: 'Revisión de documentación', appointment_time: '10:30:00', status: 'pendiente' }], recent_dossiers: [{ id: 'demo-dossier-1', client_name: demoClient.full_name, title: 'Solicitud de toeslagen', code: 'EXP-DEMO-001', status: 'pendiente_documentos' }] });
  if (path === '/clients') return json({ clients: [demoClient] });
  if (path === '/services') return json({ services: demoServices });
  if (path === '/invoices') return json({ invoices: demoInvoices });
  if (path === '/quotes') return json({ quotes: demoQuotes });
  if (path === '/advisor-profile') return json({ profile: { full_name: 'Laura Demo', title: 'Asesora administrativa', organization: 'RP Asesoría', phone: '', email: '', hours: '', online: true, avatar_url: '', bio: '', booking_enabled: true, chat_enabled: true } });
  if (path === '/appointments') return json({ appointments: [] });
  if (path === '/dossiers') return json({ dossiers: [] });
  if (method !== 'GET') return json({ ok: true, invoice: {}, quote: {}, profile: {} });
  return json({});
}
