export class UnsafeAiDestination extends Error {}

export function isLocalAi(rawUrl?: string): boolean {
  if (!rawUrl) return false;
  try { return new URL(rawUrl).hostname === 'ollama' || ['localhost', '127.0.0.1', '::1'].includes(new URL(rawUrl).hostname); } catch { return false; }
}

export function aiCredential(requestKey?: string, rawUrl?: string): string {
  if (isLocalAi(rawUrl)) return '';
  return requestKey?.trim() || process.env.OPENAI_API_KEY || '';
}

function validate(url: string) {
  const parsed = new URL(url);
  const local = ['ollama', 'localhost', '127.0.0.1', '::1'].includes(parsed.hostname);
  const allowed = local || ['api.openai.com', 'openrouter.ai', 'api.groq.com', 'api.deepseek.com'].includes(parsed.hostname);
  if (!allowed || !['http:', 'https:'].includes(parsed.protocol)) throw new UnsafeAiDestination(`Destino IA no permitido: ${parsed.hostname}`);
}

export async function safeAiFetch(url: string, options: RequestInit, timeoutMs = 30000): Promise<Response> {
  let current = url;
  for (let hop = 0; hop < 5; hop += 1) {
    validate(current);
    const response = await fetch(current, { ...options, redirect: 'manual', signal: options.signal || AbortSignal.timeout(timeoutMs) });
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    const location = response.headers.get('location');
    if (!location) return response;
    current = new URL(location, current).href;
  }
  throw new UnsafeAiDestination('Demasiadas redirecciones en el endpoint IA');
}
