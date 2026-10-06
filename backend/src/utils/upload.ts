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
