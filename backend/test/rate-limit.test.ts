/**
 * Pruebas del limitador de peticiones.
 *
 * Ejecutar con: npm test
 *
 * El escenario que motiva `soloFallidos` en el login es este: si el limite
 * contara TODOS los intentos, un gestor que teclee mal su contrasena cinco
 * veces y luego la acierta quedaria bloqueado — y, peor, un atacante podria
 * agotar el limite desde su IP para dejar a esa victima sin poder entrar.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response } from 'express';
import { rateLimit, cabecerasSeguridad } from '../src/middleware/rate-limit.ts';

// El modulo usa IP y cabeceras de peticion, asi que se fabrican dobles
// minimos en vez de levantar un servidor real.
function fakeReq(ip: string, email?: unknown, headers: Record<string, string> = {}): Request {
  return {
    headers: { ...headers },
    socket: { remoteAddress: ip } as never,
    body: email === undefined ? {} : { email },
  } as unknown as Request;
}

function fakeRes() {
  // `statusCode` tiene que vivir EN `res` (no solo en `state`), porque los
  // listeners de `finish` que registra el middleware leen `res.statusCode`.
  // Con un doble mal hecho, el contador de fallos nunca se incrementaba y el
  // test daba por bueno un limitador que en realidad no bloqueaba.
  const state = {
    body: undefined as unknown,
    headers: {} as Record<string, string>,
    eventos: [] as (() => void)[],
  };
  const res = {
    statusCode: 200,
    setHeader(k: string, v: string) { state.headers[k] = v; },
    status(code: number) { res.statusCode = code; return res; },
    json(payload: unknown) { state.body = payload; return res; },
    on(_event: string, cb: () => void) { state.eventos.push(cb); return res; },
  } as unknown as Response;
  return { res, state };
}

// Cada test necesita una IP distinta: el estado vive en el Map del modulo.
let ipSeq = 0;
const siguienteIp = () => `10.10.0.${(++ipSeq) % 250}`;

test('bloquea tras superar el maximo y devuelve 429', () => {
  const mw = rateLimit({ nombre: 'test-bloqueo', max: 3, ventanaMs: 60_000 });
  const ip = siguienteIp();

  for (let i = 0; i < 3; i++) {
    const { res } = fakeRes();
    let pasado = false;
    mw(fakeReq(ip), res, () => { pasado = true; });
    assert.equal(pasado, true, `la peticion ${i + 1} deberia pasar`);
  }

  const { res, state } = fakeRes();
  let pasado = false;
  mw(fakeReq(ip), res, () => { pasado = true; });
  assert.equal(pasado, false, 'la cuarta peticion deberia bloquearse');
  assert.equal(res.statusCode, 429);
  assert.ok(state.headers['Retry-After'], 'debe indicar Retry-After');
  assert.match(String(state.body && (state.body as { error: string }).error), /Demasiados intentos/);
});

test('IP distinta tiene su propio contador', () => {
  const mw = rateLimit({ nombre: 'test-ips', max: 1, ventanaMs: 60_000 });
  const a = siguienteIp();
  const b = siguienteIp();

  let pasoA = false;
  mw(fakeReq(a), fakeRes().res, () => { pasoA = true; });
  assert.equal(pasoA, true);

  // Agotar 'a' no debe afectar a 'b'.
  let pasoB = false;
  mw(fakeReq(b), fakeRes().res, () => { pasoB = true; });
  assert.equal(pasoB, true);
});

test('soloFallidos no cuenta los intentos correctos', () => {
  const mw = rateLimit({ nombre: 'test-login-ok', max: 2, ventanaMs: 60_000, soloFallidos: true });
  const ip = siguienteIp();
  const email = 'gestor@nexusgest.test';

  // 5 intentos correctos (respuesta 200) no deben agotar nada.
  for (let i = 0; i < 5; i++) {
    const { res, state } = fakeRes();
    let pasado = false;
    mw(fakeReq(ip, email), res, () => { pasado = true; });
    assert.equal(pasado, true, `intento correcto ${i + 1} debe pasar`);
    res.statusCode = 200;
    state.eventos.forEach((cb) => cb());
  }

  // Ahora fallamos dos veces -> se agota.
  for (let i = 0; i < 2; i++) {
    const { res, state } = fakeRes();
    mw(fakeReq(ip, email), res, () => {});
    res.statusCode = 401;
    state.eventos.forEach((cb) => cb());
  }

  const { res: resBloq } = fakeRes();
  let pasado = false;
  mw(fakeReq(ip, email), resBloq, () => { pasado = true; });
  assert.equal(pasado, false, 'tras dos fallos debe bloquearse');
  assert.equal(resBloq.statusCode, 429);
});

test('el bucket del login separa IPs y emails distintos', () => {
  const mw = rateLimit({ nombre: 'login', max: 1, ventanaMs: 60_000, soloFallidos: true });

  const fallo = (ip: string, email: string) => {
    const { res, state } = fakeRes();
    mw(fakeReq(ip, email), res, () => {});
    res.statusCode = 401;
    state.eventos.forEach((cb) => cb());
  };
  const permitido = (ip: string, email: string) => {
    const { res } = fakeRes();
    let pasado = false;
    mw(fakeReq(ip, email), res, () => { pasado = true; });
    return pasado;
  };

  const ip = siguienteIp();
  fallo(ip, 'gestor@nexusgest.test');
  // Mismo email, otra IP -> no esta bloqueado.
  assert.equal(permitido(siguienteIp(), 'gestor@nexusgest.test'), true);
  // Misma IP, otro email -> no esta bloqueado.
  assert.equal(permitido(ip, 'otro@nexusgest.test'), true);
});

test('usa x-forwarded-for detras de un proxy', () => {
  const mw = rateLimit({ nombre: 'test-proxy', max: 1, ventanaMs: 60_000 });
  // Traefik/ Coolify pasan la IP real en x-forwarded-for. Sin esto, todas las
  // peticiones sharing una sola IP y un solo usuario podria bloquear a todos.
  const cabecerasProxy = { 'x-forwarded-for': '203.0.113.45, 10.0.0.1' };

  let paso1 = false;
  mw(fakeReq('10.0.0.1', undefined, cabecerasProxy), fakeRes().res, () => { paso1 = true; });
  assert.equal(paso1, true);

  // Una IP distinta via proxy si tiene su propio cuota.
  let paso2 = false;
  mw(fakeReq('10.0.0.1', undefined, { 'x-forwarded-for': '198.51.100.9' }), fakeRes().res, () => { paso2 = true; });
  assert.equal(paso2, true);
});

test('expone X-RateLimit-* en las peticiones aceptadas', () => {
  const mw = rateLimit({ nombre: 'test-headers', max: 5, ventanaMs: 60_000 });
  const { res, state } = fakeRes();
  mw(fakeReq(siguienteIp()), res, () => {});
  assert.equal(state.headers['X-RateLimit-Limit'], '5');
  assert.equal(state.headers['X-RateLimit-Remaining'], '4');
});

test('las cabeceras de seguridad se aplican siempre', () => {
  const { res, state } = fakeRes();
  cabecerasSeguridad(fakeReq('1.2.3.4', undefined, { 'x-forwarded-proto': 'https' }), res, () => {});
  assert.equal(state.headers['X-Content-Type-Options'], 'nosniff');
  assert.equal(state.headers['X-Frame-Options'], 'DENY');
  assert.ok(state.headers['Strict-Transport-Security'], 'HSTS debe activarse con https delante');
});

test('HSTS no se activa en http local (romperia el desarrollo)', () => {
  const { res, state } = fakeRes();
  cabecerasSeguridad(fakeReq('127.0.0.1'), res, () => {});
  assert.equal(state.headers['Strict-Transport-Security'], undefined);
});