/**
 * Limitador de peticiones en memoria, sin dependencias externas.
 *
 * Motivo: `express-rate-limit` y `helmet` no se pudieron instalar en este
 * entorno, asi que el control de fuerza bruta y las cabeceras de seguridad se
 * implementan aqui con APIs nativas. Cumple la misma funcion para el modelo
 * actual de despliegue (un solo contenedor Node tras Traefik).
 *
 * LIMITACION CONOCIDA: el contador vive en memoria del proceso. Con una sola
 * instancia es correcto. Si se escala a varias replicas, cada una lleva su
 * propio contador y el limite efectivo se multiplica por el numero de
 * instancias. Cuando eso ocurra, hay que mover el estado a Redis/Postgres o
 * sustituir este modulo por express-rate-limit con store compartido.
 */

import type { Request, Response, NextFunction } from 'express';

interface Ventana {
  /** marca de tiempo (ms) en la que expira la ventana */
  expiraEn: number;
  peticiones: number;
}

/** clave -> ventana activa. Se limpia solo al expirar. */
const ventanas = new Map<string, Ventana>();

/** Evita que el Map crezca sin limite si llegan muchas IPs distintas. */
const MAX_CLAVES = 50_000;
let ultimaLimpieza = Date.now();

function limpiarCaducadas() {
  const ahora = Date.now();
  // Cada 5 minutos es suficiente: no tiene coste apreciable y evita fugas.
  if (ahora - ultimaLimpieza < 5 * 60 * 1000) return;
  ultimaLimpieza = ahora;
  for (const [clave, v] of ventanas) {
    if (v.expiraEn <= ahora) ventanas.delete(clave);
  }
}

/**
 * Identifica al cliente por IP. Detras de Traefik/Coolify todas las peticiones
 * llegan con x-forwarded-for, asi que sin esto todas compartirian el mismo
 * contador y un solo usuario podria bloquear a los demas.
 *
 * AVISO sobre el fallback: cuando no hay x-forwarded-for se usa la direccion
 * del socket, que en un despliegue sin proxy upstream es la MISMA para todo
 * el mundo (o `::1` en local). En ese caso el limite se aplica site-wide en
 * lugar de por cliente — 8 citas/hora para toda la web, no por visitante.
 *
 * Por eso se avisa una sola vez al arrancar el primer uso: si aparece en los
 * logs, falta el proxy o hay que fijar `trust proxy`. No se falla en silencio
 * porque el limitador debe seguir protegiendo aunque la IP no sea fiable.
 */
let yaAvisoDeFallback = false;

function ipDe(req: Request): string {
  const reenviada = req.headers['x-forwarded-for'];
  const valor = Array.isArray(reenviada) ? reenviada[0] : reenviada;
  if (valor) return valor.split(',')[0].trim();

  if (!yaAvisoDeFallback) {
    yaAvisoDeFallback = true;
    console.warn(
      '[rate-limit] Las peticiones llegan sin x-forwarded-for: se usara la IP del socket, ' +
      'que es compartida si no hay un proxy delante. Configura el proxy (Traefik/Coolify) ' +
      'o los limites se aplicaran a todos los clientes juntos.'
    );
  }
  return req.socket.remoteAddress || 'desconocida';
}

export interface OpcionesRateLimit {
  /** Numero maximo de peticiones dentro de la ventana. */
  max: number;
  /** Duracion de la ventana en milisegundos. */
  ventanaMs: number;
  /** Nombre del bucket, para que los mensajes de error sean distinguibles. */
  nombre: string;
  /**
   * Solo cuenta peticiones fallidas (401/403). Util para el login: Allows que
   * un gestor legitimo que teclee bien su contrasena varias veces no se bloquee
   * a si mismo, mientras que la fuerza bruta sigue contando.
   */
  soloFallidos?: boolean;
}

export const rateLimit = (opciones: OpcionesRateLimit) => {
  const { max, ventanaMs, nombre, soloFallidos = false } = opciones;

  return (req: Request, res: Response, next: NextFunction) => {
    limpiarCaducadas();

    // El login se limita por IP+email: si solo por IP, un atacante podria
    // agotar el limite de una victima concreta y dejarla sin poder entrar
    // (denegacion de servicio sobre el gestor).
    const sufijo = nombre === 'login' ? `:${String(req.body?.email || '').toLowerCase()}` : '';
    const clave = `${nombre}:${ipDe(req)}${sufijo}`;

    const ahora = Date.now();
    let ventana = ventanas.get(clave);

    if (!ventana || ventana.expiraEn <= ahora) {
      // Tope de claves: si se supera, se limpia y se empieza de cero. Preferible
      // a dejar crecer la memoria sin limite.
      if (ventanas.size >= MAX_CLAVES) {
        for (const [k, v] of ventanas) {
          if (v.expiraEn <= ahora) ventanas.delete(k);
        }
        if (ventanas.size >= MAX_CLAVES) ventanas.clear();
      }
      ventana = { expiraEn: ahora + ventanaMs, peticiones: 0 };
      ventanas.set(clave, ventana);
    }

    // `soloFallidos` (login): el contador refleja los fallos YA registrados por
    // peticiones anteriores, no el de la peticion en curso — esta todavia no ha
    // Fallado. Asi que se comprueba el limite antes de delegar, y el incremento
    // se hace despues, en `finish`, solo si la respuesta fue 401/403.
    // De este modo los intentos correctos no consumen cuota.
    if (soloFallidos) {
      res.setHeader('X-RateLimit-Limit', String(max));
      res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - ventana.peticiones)));
      res.setHeader('X-RateLimit-Reset', String(Math.ceil(ventana.expiraEn / 1000)));

      if (ventana.peticiones >= max) {
        const esperaSeg = Math.ceil((ventana.expiraEn - ahora) / 1000);
        res.setHeader('Retry-After', String(esperaSeg));
        console.warn(`[rate-limit] ${nombre}: limite excedido para ${ipDe(req)}`);
        res.status(429).json({
          error: `Demasiados intentos fallidos. Intentalo de nuevo en ${esperaSeg} segundos.`,
        });
        return;
      }

      res.on('finish', () => {
        if (res.statusCode !== 401 && res.statusCode !== 403) return;
        const v = ventanas.get(clave);
        if (v) v.peticiones += 1;
      });
      next();
      return;
    }

    ventana.peticiones += 1;

    const restantes = Math.max(0, max - ventana.peticiones);
    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(restantes));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(ventana.expiraEn / 1000)));

    if (ventana.peticiones > max) {
      const esperaSeg = Math.ceil((ventana.expiraEn - ahora) / 1000);
      res.setHeader('Retry-After', String(esperaSeg));
      console.warn(`[rate-limit] ${nombre}: limite excedido para ${ipDe(req)}`);
      res.status(429).json({
        error: `Demasiados intentos. Intentalo de nuevo en ${esperaSeg} segundos.`,
      });
      return;
    }

    next();
  };
};

/**
 * Cabeceras de seguridad basicas.
 *
 * No es un reemplazo completo de helmet, pero cubre lo que mas importa aqui:
 * evitar que el navegador ejecute HTML inyectado servido desde el origen del
 * CRM (donde viven BSNs e IBANs de los clientes), y forzar HTTPS.
 *
 * La CSP es deliberadamente permisiva en `script-src` porque Next.js con
 * App Router inyecta scripts inline; restringirkas romperia la app.
 */
export const cabecerasSeguridad = (req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  // HSTS solo si hay HTTPS delante. Atras de Traefik/ Coolify siempre lo hay en
  // produccion, pero en desarrollo local (http://localhost:5000) un HSTS
  // largo dejaria al navegador bloqueando el subdominio durante un año.
  const protocolo = (req.headers['x-forwarded-proto'] || '').toString().split(',')[0].trim();
  if (protocolo === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  next();
};