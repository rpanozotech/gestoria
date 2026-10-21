/**
 * Guard anti-SSRF para los route handlers de IA de Next.js.
 *
 * POR QUE ESTE ARCHIVO EXISTE
 *
 * La UI del CRM no llama a `/api/ai/*` del backend Express: llama a estos
 * route handlers de Next (`/api/ai/generate`, `/api/ai/test-connection`).
 * Son dos rutas distintas con su propio `fetch`, y son las que de verdad
 * aceptan `apiUrl` desde el navegador.
 *
 * Sin validacion, cualquiera que llegue al endpoint elige el destino del
 * fetch, el servidor adjunta el `Authorization` con OPENAI_API_KEY, y la
 * respuesta vuelve al llamante. Eso es SSRF con exfiltracion de la clave.
 *
 * Este modulo es la version edge-compatible del guard del backend
 * (`backend/src/routes/ai-endpoint-guard.ts`). NO usa `node:dns` porque los
 * route handlers se ejecutan en el runtime Edge, donde no existe.
 *
 * LIMITACION CONOCIDA: al no poder resolver DNS aqui, se filtra por el
 * nombre del host y por literales de IP, no por las IPs a las que resuelve un
 * nombre. `atacante.com` apuntando a 127.0.0.1 pasaria el filtro. El filtro
 * completo (con resolucion DNS) vive en el backend; estos handlers siguen
 *
 *   POST /api/backend/ai/test-connection
 *
 * cuando el destino no es un host local, y solo usan la ruta local para los
 * casos de Ollama que describimos abajo.
 */

const PUERTOS_PERMITIDOS = new Set([80, 443]);

export class EndpointNoPermitido extends Error {
  constructor(motivo: string) {
    super(motivo);
    this.name = 'EndpointNoPermitido';
  }
}

/** IPs privadas, loopback, link-local y reservadas (IPv4 e IPv6). */
function esIpPrivada(ip: string): boolean {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) {
    const [a, b] = ip.split('.').map(Number);
    if (a === 10 || a === 127 || a === 0 || a >= 224) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    return false;
  }

  const v = ip.toLowerCase().replace(/^\[|\]$/g, '');
  if (v === '::1' || v === '::') return true;
  if (v.startsWith('fc') || v.startsWith('fd')) return true;   // ULA
  if (v.startsWith('fe80')) return true;                       // link-local
  const mapeada = v.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (mapeada) return esIpPrivada(mapeada[1]);
  return false;
}

/**
 * Nombres de host que solo tienen sentido dentro de la red del servidor.
 * Bloquearlos es lo que impide alcanzar Postgres, Redis, el propio Next y
 * los servicios internos de Docker por nombre.
 */
const HOSTS_BLOQUEADOS = new Set([
  'localhost', 'localtest.me', 'ip6-localhost',
  'metadata.google.internal', 'metadata.goog',
]);

function esHostBloqueado(host: string): boolean {
  const h = host.toLowerCase();
  if (HOSTS_BLOQUEADOS.has(h)) return true;
  if (h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal')) return true;
  // Nombres de servicio de Docker: apuntan a la red interna (172.x).
  if (/^[a-z0-9-]+$/.test(h) && !h.includes('.')) return true;
  return false;
}

/**
 * Valida la URL de la API de IA. Lanza EndpointNoPermitido si no es apta.
 *
 * `permitirHostsLocales` habilita el caso de Ollama autoalojado
 * (`http://ollama:11434` o `http://localhost:11434`), que el CRM ofrece como
 * preset en el modal de configuracion. Va desligado por defecto porque
 * permitir "localhost" reabriria el SSRF contra el propio servidor.
 */
export function validarEndpointIA(
  rawUrl: string | undefined,
  opciones: { permitirHostsLocales?: boolean } = {}
): URL {
  const { permitirHostsLocales = false } = opciones;

  const valor = (rawUrl || '').trim();
  if (!valor) {
    throw new EndpointNoPermitido('No se ha indicado ninguna URL de API.');
  }

  let url: URL;
  try {
    url = new URL(valor);
  } catch {
    throw new EndpointNoPermitido('La URL de API no es válida.');
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new EndpointNoPermitido(`Protocolo no permitido: ${url.protocol}`);
  }

  const puerto = Number(url.port || (url.protocol === 'https:' ? 443 : 80));
  if (!PUERTOS_PERMITIDOS.has(puerto) && !(permitirHostsLocales && puerto === 11434)) {
    throw new EndpointNoPermitido(`Puerto no permitido: ${puerto}`);
  }

  const host = url.hostname.toLowerCase();

  if (permitirHostsLocales && puerto === 11434) {
    const hostsOllamaPermitidos = new Set(['ollama', 'host.docker.internal', 'localhost', '127.0.0.1']);
    if (!hostsOllamaPermitidos.has(host)) {
      throw new EndpointNoPermitido('El endpoint Ollama debe usar un host local permitido.');
    }
    return url;
  }

  if (esHostBloqueado(host)) {
    throw new EndpointNoPermitido('La URL apunta a un host interno o no permitido.');
  }
  if (esIpPrivada(host)) {
    throw new EndpointNoPermitido('La URL apunta a una direccion interna.');
  }

  return url;
}

/** Normaliza la URL anadiendo /chat/completions, como espera la API. */
export function normalizeChatUrl(rawUrl?: string): string {
  let url = (rawUrl || 'https://api.openai.com/v1').trim().replace(/\/+$/, '');
  if (url.endsWith('/chat/completions')) return url;
  return `${url}/chat/completions`;
}

/**
 * fetch que revalida cada salto de redireccion.
 *
 * `fetch` sigue redirecciones por defecto y reenvia el Authorization, asi que
 * un host publico puede responder 302 hacia un destino interno. Con
 * `redirect: 'manual'` se resuelve la cadena a mano y cada destino pasa por el
 * mismo filtro.
 */
export async function fetchConRedireccionesSeguras(
  url: string,
  opciones: RequestInit,
  maxSaltos = 4
): Promise<Response> {
  let actual = url;

  for (let salto = 0; salto <= maxSaltos; salto++) {
    const respuesta = await fetch(actual, { ...opciones, redirect: 'manual' });

    const esRedireccion = [301, 302, 303, 307, 308].includes(respuesta.status);
    const destino = respuesta.headers.get('location');
    if (!esRedireccion || !destino) return respuesta;

    if (salto === maxSaltos) {
      throw new EndpointNoPermitido('Demasiadas redirecciones.');
    }

    validarEndpointIA(destino);
    actual = destino;
  }

  throw new EndpointNoPermitido('No se pudo resolver la URL de la API.');
}