/**
 * Pruebas del guard de SSRF de Next (route handlers).
 *
 * Este guard es DISTINTO del del backend: corre en el runtime Edge, sin
 * `node:dns`, asi que no puede resolver nombres. Filtra por literales de IP,
 * por nombres de host internos y por puerto.
 *
 * Es el que de verdad importa, porque `/api/ai/generate` y
 * `/api/ai/test-connection` son los endpoints a los que llama la UI del CRM.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { validarEndpointIA, EndpointNoPermitido } from '../../frontend/src/lib/ai-endpoint-guard.ts';

test('rechaza el endpoint de metadatos de la nube (SSRF clasico)', () => {
  assert.throws(() => validarEndpointIA('http://169.254.169.254/latest/meta-data/'), EndpointNoPermitido);
});

test('rechaza IPs privadas y loopback', () => {
  for (const url of [
    'http://127.0.0.1:11434/v1',
    'http://10.0.0.5/v1',
    'http://172.17.0.2/v1',
    'http://192.168.1.1/v1',
    'http://[::1]/v1',
    'http://[fe80::1]/v1',
    'http://[fd00::1]/v1',
  ]) {
    assert.throws(() => validarEndpointIA(url), EndpointNoPermitido, `deberia rechazar ${url}`);
  }
});

test('rechaza nombres de host internos y de servicio de Docker', () => {
  for (const url of [
    'http://localhost:3000/v1',
    'http://localhost/v1',
    'http://algo.localhost/v1',
    'http://postgres:5432/v1',
    'http://backend:5000/v1',
    'http://metadata.google.internal/computeMetadata/v1/',
    'http://localtest.me/v1',
  ]) {
    assert.throws(() => validarEndpointIA(url), EndpointNoPermitido, `deberia rechazar ${url}`);
  }
});

test('rechaza protocolos no HTTP', () => {
  assert.throws(() => validarEndpointIA('file:///etc/passwd'), EndpointNoPermitido);
  assert.throws(() => validarEndpointIA('gopher://127.0.0.1:11211/'), EndpointNoPermitido);
});

test('acepta endpoints publicos legitimos', () => {
  assert.equal(validarEndpointIA('https://api.openai.com/v1').hostname, 'api.openai.com');
  assert.equal(validarEndpointIA('https://api.anthropic.com/v1').hostname, 'api.anthropic.com');
});

test('permite Ollama solo en su puerto (P3)', () => {
  // El CRM ofrece Ollama como preset, asi que el caso es real.
  assert.equal(validarEndpointIA('http://ollama:11434/v1', { permitirHostsLocales: true }).port, '11434');
  assert.equal(validarEndpointIA('http://host.docker.internal:11434/v1', { permitirHostsLocales: true }).port, '11434');

  // Pero el mismo host en otro puerto no: abrir "ollama" sin restringir el
  // puerto abriria tambien cualquier otro servicio en ese host.
  assert.throws(
    () => validarEndpointIA('http://ollama:9999/v1', { permitirHostsLocales: true }),
    EndpointNoPermitido
  );
  // Y localhost NO se rehabilita aunque venga el flag: el puerto de Ollama es
  // la unica excepcion, no "localhost en general".
  assert.throws(
    () => validarEndpointIA('http://localhost:8080/v1', { permitirHostsLocales: true }),
    EndpointNoPermitido
  );
});

test('sin el flag, Ollama queda bloqueado', () => {
  assert.throws(() => validarEndpointIA('http://ollama:11434/v1'), EndpointNoPermitido);
});

test('rechaza vacio y malformed', () => {
  assert.throws(() => validarEndpointIA(''), EndpointNoPermitido);
  assert.throws(() => validarEndpointIA(undefined), EndpointNoPermitido);
  assert.throws(() => validarEndpointIA('no-es-una-url'), EndpointNoPermitido);
});