import test from 'node:test';
import assert from 'node:assert/strict';
import { esTipoDocumentoPermitido, nombreSeguroDocumento } from '../src/utils/upload.ts';

test('solo acepta documentos de portal/CRM con MIME y extensión coherentes', () => {
  assert.equal(esTipoDocumentoPermitido({ mimetype: 'application/pdf', originalname: 'contrato.pdf' }), true);
  assert.equal(esTipoDocumentoPermitido({ mimetype: 'image/jpeg', originalname: 'dni.jpg' }), true);
  assert.equal(esTipoDocumentoPermitido({ mimetype: 'image/png', originalname: 'dni.png' }), true);

  assert.equal(esTipoDocumentoPermitido({ mimetype: 'text/html', originalname: 'factura.html' }), false);
  assert.equal(esTipoDocumentoPermitido({ mimetype: 'image/svg+xml', originalname: 'imagen.svg' }), false);
  assert.equal(esTipoDocumentoPermitido({ mimetype: 'application/pdf', originalname: 'factura.html' }), false);
  assert.equal(esTipoDocumentoPermitido({ mimetype: 'image/png', originalname: 'imagen.exe' }), false);
  assert.equal(nombreSeguroDocumento('../../secreto.pdf'), 'secreto.pdf');
  assert.equal(nombreSeguroDocumento('factura cliente (final).pdf'), 'factura_cliente__final_.pdf');
});
