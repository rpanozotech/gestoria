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
const demoDebts = [
  { id: 'demo-debt-1', client_id: demoClient.id, client_name: 'Cliente demo A', creditor: 'CJIB', reference: 'CJIB-2024-458739', status: 'Pagando', original_amount: 1200, paid_amount: 360, paid_total: 360, due_date: '2026-11-15', plan_name: '10 cuotas' },
  { id: 'demo-debt-2', client_id: demoClient.id, client_name: 'Cliente demo B', creditor: 'Belastingdienst', reference: 'BEL-2026-001', status: 'Aplazamiento aprobado', original_amount: 1860, paid_amount: 0, paid_total: 0, due_date: '2026-12-01', plan_name: 'Aplazamiento' },
  { id: 'demo-debt-3', client_id: demoClient.id, client_name: 'RP Gestoría', creditor: 'Belastingdienst', reference: 'BEL-2026-002', status: 'Pagado', original_amount: 735, paid_amount: 735, paid_total: 735, due_date: '2026-11-20', plan_name: 'Pago único' },
];
const demoDossiers = [
  { id: 'demo-dossier-1', code: 'EXP-2026-001', client_id: demoClient.id, client_name: demoClient.full_name, title: 'DigiD y trámites iniciales', category: 'Identidad digital', status: 'En trámite', priority: 'alta', deadline: '2026-11-20', progress: 68 },
  { id: 'demo-dossier-2', code: 'EXP-2026-002', client_id: demoClient.id, client_name: demoClient.full_name, title: 'Solicitud de toeslagen', category: 'Impuestos', status: 'Pendiente documentación', priority: 'normal', deadline: '2026-11-28', progress: 35 },
  { id: 'demo-dossier-3', code: 'EXP-2026-003', client_id: demoClient.id, client_name: demoClient.full_name, title: 'Revisión trimestral', category: 'Asesoría fiscal', status: 'Finalizado', priority: 'normal', deadline: '2026-10-15', progress: 100 },
];
const demoAppointments = [
  { id: 'demo-appointment-1', client_id: demoClient.id, client_name: demoClient.full_name, title: 'Revisión de documentación', appointment_time: '10:30:00', date: '2026-11-20', status: 'pendiente', type: 'videollamada' },
  { id: 'demo-appointment-2', client_id: demoClient.id, client_name: demoClient.full_name, title: 'Seguimiento de expediente', appointment_time: '12:00:00', date: '2026-11-21', status: 'confirmada', type: 'presencial' },
];
const demoTasks = [
  { id: 'demo-task-1', client_id: demoClient.id, client_name: 'Laura C.', dossier_code: 'EXP-2026-0034', title: 'Revisar documentación de residencia', detail_title: 'Certificado de Residencia Fiscal', description: 'Validar certificados y enviar confirmación.', due_date: '2026-11-20', status: 'documentacion', priority: 'alta', assigned_to_name: 'RP' },
  { id: 'demo-task-2', client_id: demoClient.id, client_name: 'Javier M.', dossier_code: 'EXP-2026-0031', title: 'Presentación a la KVK', description: 'Preparar y enviar expediente.', due_date: '2026-11-21', status: 'en_espera_cliente', priority: 'alta', assigned_to_name: 'Usuario de prueba' },
  { id: 'demo-task-3', client_id: demoClient.id, client_name: 'Pablo D.', dossier_code: 'EXP-2026-0026', title: 'Consulta sobre subsidio', description: 'Responder dudas del cliente.', due_date: '2026-11-20', status: 'mensaje', priority: 'normal', assigned_to_name: 'Equipo gestor' },
  { id: 'demo-task-4', client_id: demoClient.id, client_name: 'Marta S.', dossier_code: 'EXP-2026-0021', title: 'Solicitud de documento adicional', description: 'Pedir extracto bancario pendiente.', due_date: '2026-11-20', status: 'en_espera_cliente', priority: 'normal', assigned_to_name: 'Laura C.' },
  { id: 'demo-task-5', client_id: demoClient.id, client_name: 'Ana R.', dossier_code: 'EXP-2026-0028', title: 'Esperar documentación', description: 'El cliente debe subir su copia de ID.', due_date: '2026-11-20', status: 'en_espera_cliente', priority: 'normal', assigned_to_name: 'Equipo gestor' },
  { id: 'demo-task-6', client_id: demoClient.id, client_name: 'Carlos R.', dossier_code: 'EXP-2026-0030', title: 'Revisión de declaración 2024', description: 'Comprobar cálculos y enviar borrador.', due_date: '2026-11-23', status: 'revision', priority: 'normal', assigned_to_name: 'Usuario de prueba' },
  { id: 'demo-task-7', client_id: demoClient.id, client_name: 'Elena L.', dossier_code: 'EXP-2026-0025', title: 'Cita presencial en oficina', description: 'Confirmar horario y preparar dossier.', due_date: '2026-11-20', status: 'cita', priority: 'normal', assigned_to_name: 'Equipo gestor' },
  { id: 'demo-task-8', client_id: demoClient.id, client_name: 'Daniel S.', dossier_code: 'EXP-2026-0029', title: 'Alta como autónomo (ZZP)', description: 'Revisar formulario y anexos.', due_date: '2026-11-24', status: 'documentacion', priority: 'normal', assigned_to_name: 'Usuario de prueba' },
  { id: 'demo-task-9', client_id: demoClient.id, client_name: 'María V.', dossier_code: 'EXP-2026-0024', title: 'Seguimiento post-presentación', description: 'Comprobar estado con la Belastingdienst.', due_date: '2026-11-24', status: 'seguimiento', priority: 'normal', assigned_to_name: 'Laura C.' },
  { id: 'demo-task-10', client_id: demoClient.id, client_name: 'Tomás P.', dossier_code: 'EXP-2026-0027', title: 'Renovación de permiso', description: 'Validar fechas de validez.', due_date: '2026-11-27', status: 'revision', priority: 'normal', assigned_to_name: 'Usuario de prueba' },
  { id: 'demo-task-11', client_id: demoClient.id, client_name: 'Noa L.', dossier_code: 'EXP-2026-0032', title: 'Consulta general', description: 'Llamar al cliente para aclarar dudas.', due_date: '2026-11-27', status: 'mensaje', priority: 'normal', assigned_to_name: 'Equipo gestor' },
  { id: 'demo-task-12', client_id: demoClient.id, client_name: 'Sofía B.', dossier_code: 'EXP-2026-0033', title: 'Revisión final y cierre', description: 'Enviar resumen y cerrar expediente.', due_date: '2026-11-28', status: 'seguimiento', priority: 'normal', assigned_to_name: 'Usuario de prueba' },
];

const PREVIEW_RESET_KEY = 'nexusgest_demo_reset';
const isPreviewCrmReset = () => typeof window !== 'undefined' && window.localStorage.getItem(PREVIEW_RESET_KEY) === 'true';
const PREVIEW_DELETED_CLIENTS_KEY = 'nexusgest_deleted_clients';
const PREVIEW_QUOTES_KEY = 'nexusgest_demo_quotes';
const PREVIEW_INVOICES_KEY = 'nexusgest_demo_invoices';
const deletedPreviewClients = () => {
  if (typeof window === 'undefined') return [] as string[];
  try { return JSON.parse(window.localStorage.getItem(PREVIEW_DELETED_CLIENTS_KEY) || '[]') as string[]; } catch { return []; }
};
const storedPreviewList = (key: string, fallback: any[]) => {
  if (typeof window === 'undefined') return fallback;
  try {
    const value = JSON.parse(window.localStorage.getItem(key) || 'null');
    return Array.isArray(value) ? value : fallback;
  } catch { return fallback; }
};
const savePreviewList = (key: string, value: any[]) => {
  if (typeof window !== 'undefined') window.localStorage.setItem(key, JSON.stringify(value));
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

export async function previewApiResponse(path: string, init: RequestInit = {}): Promise<Response> {
  const method = init.method || 'GET';
  if (method === 'DELETE' && path.match(/^\/clients\/[^/]+(?:\?.*)?$/)) {
    const clientId = path.split('/')[2].split('?')[0];
    if (clientId !== demoClient.id) return json({ error: 'Cliente no encontrado.' }, 404);
    const deleted = new Set(deletedPreviewClients());
    deleted.add(clientId);
    window.localStorage.setItem(PREVIEW_DELETED_CLIENTS_KEY, JSON.stringify(Array.from(deleted)));
    return json({ message: 'Cliente demo eliminado correctamente.' });
  }
  if (method === 'POST' && path === '/clients/restore-demo') {
    window.localStorage.removeItem(PREVIEW_DELETED_CLIENTS_KEY);
    window.localStorage.removeItem(PREVIEW_RESET_KEY);
    return json({ client: demoClient, message: 'Cliente demo restaurado correctamente.' });
  }
  if (method === 'POST' && path === '/backup/reset') {
    const body = JSON.parse(String(init.body || '{}')) as { confirmation?: string };
    if (body.confirmation !== 'RESETEAR CRM') return json({ error: 'Confirmación incorrecta. Escribe RESETEAR CRM para continuar.' }, 400);
    window.localStorage.setItem(PREVIEW_RESET_KEY, 'true');
    window.localStorage.removeItem(PREVIEW_QUOTES_KEY);
    window.localStorage.removeItem(PREVIEW_INVOICES_KEY);
    return json({ message: 'CRM demo reseteado correctamente', preserved: ['users'] });
  }
  if (path === '/backup/stats') {
    const reset = isPreviewCrmReset();
    return json({ counts: { clients: reset ? 0 : 1, dossiers: reset ? 0 : demoDossiers.length, quotes: reset ? 0 : demoQuotes.length, invoices: reset ? 0 : demoInvoices.length, appointments: reset ? 0 : demoAppointments.length, documents: 0 }, lastBackupDate: null, databaseStatus: 'online', retentionDays: 14 });
  }
  if (isPreviewCrmReset() && (path === '/clients' || path === '/clients/count' || path === '/finance/debts' || path === '/invoices' || path === '/quotes' || path === '/appointments' || path === '/dossiers' || path === '/tasks')) {
    if (path === '/clients/count') return json({ total: 0, activos: 0, archivados: 0, nuevos_este_mes: 0, pendientes: 0 });
    const key = path === '/finance/debts' ? 'debts' : path.slice(1);
    return json({ [key]: [] });
  }
  if (path === '/auth/me') return json({ user: getStoredUser() || { id: 'demo-user', email: 'demo@example.test', full_name: 'Usuario de prueba', role: 'gestor' } });
  if (path.startsWith('/clients/') && path !== '/clients/count') return json({ client: { ...demoClient, type: 'Particular', status: 'activo', responsible: 'Usuario de prueba', city: 'Eindhoven', address: 'Calle Demo 12', language: 'Español', notes: 'Cliente de demostración para staging.', created_at: '2026-04-10', last_activity: '2026-08-12' }, dossiers: demoDossiers, invoices: [{ number: 'FAC-DEMO-001', date: '05 nov 2026', concept: 'Consulta administrativa', total: 89, status: 'pagada' }], debts: demoDebts.filter((debt) => debt.client_id === demoClient.id), documents: [], appointments: demoAppointments });
  if (path === '/finance/debts') return json({ debts: demoDebts });
  if (path.match(/^\/finance\/debts\/[^/]+$/)) return json({ debt: demoDebts[0], payments: [{ id: 'demo-payment-1', amount: 120, paid_at: '2026-10-15', status: 'Registrado' }], installments: [{ id: 'demo-installment-1', installment_number: 1, amount: 120, due_date: '2026-10-15', status: 'Pagado' }, { id: 'demo-installment-2', installment_number: 2, amount: 120, due_date: '2026-11-15', status: 'Pendiente' }], documents: [], notes: [], history: [] });
  if (path === '/finance/obligations') return json({ obligations: [] });
  if (path === '/push/preferences') return json({ preferences: { citas: true, deudas: true, pagos: true, documentos: true, mensajes: true, facturas: true, tareas: true } });
  if (path === '/push/public-key') return json({ publicKey: null, enabled: false });
  if (path === '/push/subscription') return json({ ok: true });
  if (path === '/clients/count') {
    const deleted = deletedPreviewClients().includes(demoClient.id);
    return json({ total: deleted ? 0 : 1, activos: deleted ? 0 : 1, archivados: 0, nuevos_este_mes: deleted ? 0 : 1, pendientes: deleted ? 0 : 1 });
  }
  if (path === '/dashboard/stats') return json({ kpis: { active_clients: 1, appointments_today: { total: 2, completed: 1, pending: 1 }, active_dossiers: { total: 3, belastingdienst: 1 }, finances: { monthly_revenue: 1200, pending_revenue: 169, pending_invoices_count: 1 }, client_stats: { active: 1, new_this_month: 1, incomplete: 1 } }, today_appointments: [{ id: 'demo-appointment-1', client_name: demoClient.full_name, title: 'Revisión de documentación', appointment_time: '10:30:00', status: 'pendiente' }], recent_dossiers: [{ id: 'demo-dossier-1', client_name: demoClient.full_name, title: 'Solicitud de toeslagen', code: 'EXP-DEMO-001', status: 'pendiente_documentos' }] });
  if (path === '/clients') return json({ clients: deletedPreviewClients().includes(demoClient.id) ? [] : [demoClient] });
  if (path === '/services') return json({ services: demoServices });
  if (method === 'GET' && path === '/invoices') return json({ invoices: storedPreviewList(PREVIEW_INVOICES_KEY, demoInvoices) });
  if (method === 'GET' && path === '/quotes') return json({ quotes: storedPreviewList(PREVIEW_QUOTES_KEY, demoQuotes) });
  if (path === '/advisor-profile') return json({ profile: { full_name: 'Laura Demo', title: 'Asesora administrativa', organization: 'RP Asesoría', phone: '', email: '', hours: '', online: true, avatar_url: '', bio: '', booking_enabled: true, chat_enabled: true } });
  if (path === '/appointments') return json({ appointments: demoAppointments });
  if (method === 'POST' && path.match(/^\/finance\/debts\/[^/]+\/payments$/)) {
    const body = JSON.parse(String(init.body || '{}')) as { amount?: number };
    return json({ ok: true, payment: { id: `demo-payment-${Date.now()}`, amount: Number(body.amount || 0), status: 'Registrado' } }, 201);
  }
  if (method === 'POST' && path === '/quotes') {
    const body = JSON.parse(String(init.body || '{}')) as { client_id?: string; items?: Array<{ description?: string; quantity?: number; unit_price?: number }> };
    const total = (body.items || []).reduce((sum, item) => sum + Number(item.quantity || 1) * Number(item.unit_price || 0), 0);
    const quote = { ...demoQuotes[0], id: `demo-quote-${Date.now()}`, code: 'PRE-DEMO-NEW', client_id: body.client_id || demoClient.id, client_name: demoClient.full_name, total, items: body.items || [] };
    savePreviewList(PREVIEW_QUOTES_KEY, [quote, ...storedPreviewList(PREVIEW_QUOTES_KEY, demoQuotes)]);
    return json({ quote }, 201);
  }
  if (method === 'POST' && path.match(/^\/quotes\/[^/]+\/convert$/)) {
    const quoteId = path.split('/')[2];
    const quote = storedPreviewList(PREVIEW_QUOTES_KEY, demoQuotes).find((item: any) => item.id === quoteId) || demoQuotes[0];
    const invoice = { ...demoInvoices[0], id: `demo-invoice-${Date.now()}`, code: 'FAC-DEMO-NEW', client_id: quote.client_id, client_name: quote.client_name || demoClient.full_name, items: quote.items, total: quote.total, status: 'emitida' };
    savePreviewList(PREVIEW_INVOICES_KEY, [invoice, ...storedPreviewList(PREVIEW_INVOICES_KEY, demoInvoices)]);
    return json({ invoice }, 201);
  }
  if (path.match(/^\/dossiers\/[^/]+$/)) return json({ dossier: { ...demoDossiers[0], progress_percentage: 68, client_email: demoClient.email, client_phone: '+31 6 1234 5678', assigned_to_name: 'Usuario de prueba' }, steps: [
    { id: 'demo-step-1', title: 'Identificación y documentación inicial', required: true, status: 'completed', due_date: '2026-10-12' },
    { id: 'demo-step-2', title: 'Presentación del expediente', required: true, status: 'in_progress', due_date: '2026-11-20' },
    { id: 'demo-step-3', title: 'Revisión por el organismo', required: true, status: 'pending', due_date: '2026-12-05' },
    { id: 'demo-step-4', title: 'Resolución y cierre', required: true, status: 'pending', due_date: '2026-12-20' },
  ], documents: [
    { id: 'demo-doc-1', file_name: 'Identificación.pdf', category: 'Identidad', created_at: '2026-10-12', is_verified: true },
    { id: 'demo-doc-2', file_name: 'Certificado de residencia.pdf', category: 'Residencia', created_at: '2026-10-14', is_verified: true },
  ], messages: [
    { id: 'demo-message-1', body: 'He recibido la documentación, muchas gracias.', author_name: 'María Ejemplo', created_at: '2026-11-18' },
    { id: 'demo-message-2', body: 'Te confirmo que hemos presentado el expediente.', author_name: 'Usuario de prueba', created_at: '2026-11-17' },
  ], notes: [{ id: 'demo-note-1', body: 'Pendiente de validar la documentación adicional antes de la presentación.', author_name: 'Equipo gestor', created_at: '2026-11-16' }], activity: [
    { id: 'demo-activity-1', action: 'Documento subido', detail: 'Certificado de residencia', actor_name: 'María Ejemplo', created_at: '2026-11-14' },
    { id: 'demo-activity-2', action: 'Expediente presentado', detail: 'Presentación electrónica completada', actor_name: 'Usuario de prueba', created_at: '2026-11-17' },
  ] });
  if (path === '/dossiers') return json({ dossiers: demoDossiers });
  if (path === '/tasks') return json({ tasks: demoTasks });
  if (method !== 'GET') return json({ ok: true, invoice: {}, quote: {}, profile: {} });
  return json({});
}
