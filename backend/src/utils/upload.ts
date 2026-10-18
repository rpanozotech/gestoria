import fs from 'node:fs';

const EXTENSIONES_POR_MIME: Record<string, readonly string[]> = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
};

export function esTipoDocumentoPermitido(file: { mimetype: string; originalname: string }): boolean {
  const extensiones = EXTENSIONES_POR_MIME[file.mimetype];
  if (!extensiones) return false;
  const nombre = file.originalname.trim().toLowerCase();
  return extensiones.some((extension) => nombre.endsWith(extension));
}

export function nombreSeguroDocumento(originalname: string): string {
  const basename = originalname.split(/[\\/]/).pop() || 'documento';
  return basename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-180) || 'documento';
}

/** Comprueba la firma binaria para no confiar solo en MIME/extensión del cliente. */
export async function firmaDocumentoValida(filePath: string, mimetype: string): Promise<boolean> {
  const handle = await fs.promises.open(filePath, 'r');
  try {
    const header = Buffer.alloc(12);
    const { bytesRead } = await handle.read(header, 0, header.length, 0);
    const bytes = header.subarray(0, bytesRead);
    if (mimetype === 'application/pdf') return bytes.subarray(0, 5).toString('ascii') === '%PDF-';
    if (mimetype === 'image/jpeg') return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    if (mimetype === 'image/png') return bytes.equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    return false;
  } finally {
    await handle.close();
  }
}
