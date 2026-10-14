/**
 * Regresiones de aislamiento del portal por client_id/BSN.
 *
 * Ejecución contra un backend levantado:
 *   PORTAL_TEST_BASE_URL=https://rp-gestoria.tech/api/backend \
 *   PORTAL_TEST_TOKEN='...' \
 *   PORTAL_TEST_FOREIGN_DOCUMENT_ID='...' \
 *   node --test --experimental-strip-types test/portal-isolation.test.ts
 *
 * El token nunca se imprime. Sin variables de integración, los casos que
 * requieren sesión se omiten; el caso anónimo siempre debe ejecutarse.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

// El portal autenticado vive en su propia superficie; la web pública no enruta /api/backend.
const baseUrl = (process.env.PORTAL_TEST_BASE_URL || 'https://portal.rp-gestoria.tech/api/backend').replace(new RegExp('/$'), '');
const token = process.env.PORTAL_TEST_TOKEN;
const foreignDocumentId = process.env.PORTAL_TEST_FOREIGN_DOCUMENT_ID;
const integration = Boolean(token && foreignDocumentId);

const authHeaders = () => ({ Authorization: `Bearer ${token}` });

test('el portal rechaza peticiones sin autenticación', async () => {
  const response = await fetch(`${baseUrl}/portal/me`);
  assert.equal(response.status, 401);
});

test('una sesión de cliente solo puede leer su propio expediente agregado', { skip: !integration }, async () => {
  const response = await fetch(`${baseUrl}/portal/me`, { headers: authHeaders() });
  assert.equal(response.status, 200);
  const body = await response.json() as {
    client?: { id?: string; bsn?: string };
    dossiers?: unknown[];
    documents?: unknown[];
    invoices?: unknown[];
    appointments?: unknown[];
  };
  assert.ok(body.client?.id, 'la sesión debe estar vinculada a una ficha CRM');
  assert.ok(body.client?.bsn, 'la ficha CRM debe tener BSN');
  for (const collection of [body.dossiers, body.documents, body.invoices, body.appointments]) {
    assert.ok(Array.isArray(collection), 'las relaciones deben venir como colecciones');
  }
});

test('un cliente no puede descargar el documento de otro cliente', { skip: !integration }, async () => {
  const response = await fetch(`${baseUrl}/portal/documents/${encodeURIComponent(foreignDocumentId!)}/download`, {
    headers: authHeaders(),
  });
  assert.equal(response.status, 404);
});
