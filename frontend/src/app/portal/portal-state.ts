/** Portal projections use saved records only; CRM progress is not an official decision. */
export const HUURTOESLAG_REQUEST = 'Solicitud al gestor: revisar mi posible derecho a Huurtoeslag. Solicito asesoramiento; este mensaje no es una solicitud oficial ante la autoridad.';

export interface SavedPortalMessage {
  id: string;
  body: string;
  author_name?: string;
  author_role?: string;
  created_at: string;
}

export async function persistPortalMessage(endpoint: string, body: string, request: typeof fetch = fetch): Promise<SavedPortalMessage> {
  const response = await request(endpoint, {
    method: 'POST', credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body }),
  });
  const data = await response.json().catch(() => ({}));
  if (response.status !== 201 || !data.message?.id || data.message.body !== body || !data.message.created_at) {
    throw new Error(data.error || 'No se pudo confirmar el envío. Revisa Mensajes antes de reintentar.');
  }
  return data.message;
}

export function hasHuurtoeslagRequest(messages: SavedPortalMessage[]) {
  return messages.some(message => message.body === HUURTOESLAG_REQUEST);
}

export function localDate(value = new Date()): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

export function nextWorkingDates(now = new Date(), count = 3): string[] {
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  const dates: string[] = [];
  while (dates.length < count) {
    day.setDate(day.getDate() + 1);
    if (day.getDay() !== 0 && day.getDay() !== 6) dates.push(localDate(day));
  }
  return dates;
}

export function savedAmount(value: unknown): number | null {
  if ((typeof value !== 'number' && typeof value !== 'string') || String(value).trim() === '') return null;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
}

export function meetingUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.hostname !== 'meet.google.com' || url.username || url.password || url.port || !/^\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/.test(url.pathname)) return null;
    return url.href;
  } catch { return null; }
}

export function internalStatus(value: unknown): string {
  const labels: Record<string, string> = {
    en_proceso: 'En proceso interno', en_preparacion: 'En preparación interna',
    pendiente_documentos: 'Documentación pendiente', en_belastingdienst: 'Seguimiento por el gestor',
    completado: 'Completado en CRM', aprobado: 'Marcado aprobado en CRM', cancelado: 'Cancelado en CRM',
  };
  return labels[String(value)] || 'Estado interno sin confirmar';
}

export function portalRecords(data: any) {
  const dossiers: any[] = Array.isArray(data?.dossiers) ? data.dossiers : [];
  const dossier = dossiers[0];
  const rawSteps = Array.isArray(dossier?.steps) ? dossier.steps : Array.isArray(dossier?.dossier_steps) ? dossier.dossier_steps : Array.isArray(data?.dossier_steps) && dossier?.id ? data.dossier_steps.filter((step: any) => step.dossier_id === dossier.id) : [];
  const steps = [...rawSteps].sort((a, b) => (a.position ?? a.order_index ?? 0) - (b.position ?? b.order_index ?? 0));
  const progress = savedAmount(dossier?.progress_percentage);
  return {
    dossiers, steps, progress: progress === null ? null : Math.max(0, Math.min(100, progress)),
    zorg: savedAmount(data?.client?.monthly_zorg), huur: savedAmount(data?.client?.monthly_huur),
    refund: savedAmount(data?.client?.refund_amount),
    notifications: dossiers.filter(item => item.updated_at || item.created_at).map(item => ({
      id: String(item.id), title: item.title || 'Expediente registrado',
      date: String(item.updated_at || item.created_at).slice(0, 10),
      text: `${item.code || 'Expediente'} · ${internalStatus(item.status)}. Registro del gestor, no resolución oficial.`, type: 'info',
    })),
  };
}
