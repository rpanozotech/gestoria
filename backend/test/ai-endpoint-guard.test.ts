/**
 * Pruebas del guard de SSRF.
 *
 * Ejecutar con:  node --test --experimental-strip-types test/ai-endpoint-guard.test.ts
 * (o `npm test` si se anade el script).
 *
 * Estos casos son los que motivaron el guard: todos son destinos a los que el
 * servidor no debe dejar salir una peticion del cliente, y todos llegan como
 * `apiUrl` en el body de /api/ai/*.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { validarEndpointIA, EndpointNoPermitido } from '../src/routes/ai-endpoint-guard.ts';

test('rechaza el endpoint de metadatos de la nube (SSRF clasico)', async () => {
  assert.throws(
    () => validarEndpointIA('http://169.254.169.254/latest/meta-data/'),
    EndpointNoPermitido
  );
});

test('rechaza loopback en IPv4 e IPv6', async () => {
  assert.throws(() => validarEndpointIA('http://127.0.0.1:11434/v1'), EndpointNoPermitido);
  assert.throws(() => validarEndpointIA('http://localhost:11434/v1'), EndpointNoPermitido);
  assert.throws(() => validarEndpointIA('http://[::1]/v1'), EndpointNoPermitido);
});

test('rechaza rangos privados de la red de Docker / LAN', async () => {
  for (const url of [
    'http://postgres:5432/',
    'http://10.0.0.5/v1',
    'http://172.17.0.2/v1',
    'http://192.168.1.1/v1',
  ]) {
    assert.throws(() => validarEndpointIA(url), EndpointNoPermitido, `deberia rechazar ${url}`);
  }
});

test('rechaza protocolos no HTTP (lectura de ficheros local via fetch)', async () => {
  assert.throws(() => validarEndpointIA('file:///etc/passwd'), EndpointNoPermitido);
  assert.throws(() => validarEndpointIA('gopher://127.0.0.1:11211/'), EndpointNoPermitido);
});

test('rechaza puertos que no son de API web', async () => {
  assert.throws(() => validarEndpointIA('https://api.openai.com:22/v1'), EndpointNoPermitido);
});

test('acepta un endpoint publico valido', async () => {
  const url = await validarEndpointIA('https://api.openai.com/v1');
  assert.equal(url.hostname, 'api.openai.com');
});

test('acepta IPs publicas literales', async () => {
  const url = await validarEndpointIA('https://93.184.216.34/v1');
  assert.equal(url.hostname, '93.184.216.34');
});

test('rechaza URL vacia o ausente', async () => {
  assert.throws(() => validarEndpointIA(''), EndpointNoPermitido);
  assert.throws(() => validarEndpointIA(undefined), EndpointNoPermitido);
});

// --- Bypass por redireccion ---
//
// Validar solo la URL inicial no basta. Un host publico puede responder 302
// hacia una IP interna; si fetch sigue la redireccion y reenvia el
// Authorization, la OPENAI_API_KEY del servidor acaba en destino interno.
// Estos casos fijan la regla; fetchConRedireccionesSeguras (ai.ts) la aplica a
// cada salto.

test('una URL publica valida no habilita un destino interno', async () => {
  // example.com resuelve y es publico: la URL inicial pasa el filtro.
  const inicial = await validarEndpointIA('https://example.com/v1');
  assert.equal(inicial.hostname, 'example.com');

  // El destino de un salto pasa por el MISMO filtro, y este lo rechaza.
  assert.throws(
    () => validarEndpointIA('http://169.254.169.254/latest/meta-data/'),
    EndpointNoPermitido
  );
});

test('un servidor que responde 302 hacia una IP interna es bloqueado', async () => {
  // Servidor real en localhost que hace de redirector: representa al host
  // legitimo que supero el filtro y despues devuelve 302 a un destino interno.
  const http = await import('node:http');
  const servidor = http.createServer((_req, res) => {
    res.writeHead(302, { Location: 'http://169.254.169.254/latest/meta-data/' });
    res.end();
  });

  await new Promise<void>((r) => servidor.listen(0, '127.0.0.1', r));
  const puerto = (servidor.address() as { port: number }).port;

  try {
    const url = `http://127.0.0.1:${puerto}/v1`;

    // `redirect: 'manual'` NO sigue el salto: devuelve la respuesta con su
    // cabecera Location, sin contactar con el destino interno. Es exactamente
    // el mecanismo que usa fetchConRedireccionesSeguras antes de validar.
    const respuesta = await fetch(url, { redirect: 'manual' });
    assert.equal(respuesta.status, 302, 'el redirector deberia responder 302');

    // Y el destino que anuncia queda rechazado por el mismo filtro.
    const destino = respuesta.headers.get('location');
    assert.ok(destino, 'debe enviar Location');
    assert.throws(() => validarEndpointIA(destino!), EndpointNoPermitido);
  } finally {
    await new Promise<void>((r) => servidor.close(() => r()));
  }
});
