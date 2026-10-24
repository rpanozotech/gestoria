/** Only file bytes or extractor output may become analysis input, never a filename. */
export interface DocumentExtractors {
  image: (file: File) => Promise<string>;
  pdf: (file: File) => Promise<string>;
}

export async function extractDocumentText(file: File, extractors: DocumentExtractors): Promise<string> {
  const lower = file.name.toLowerCase();
  let text: string;
  if (file.type.startsWith('text/') || lower.endsWith('.txt') || lower.endsWith('.md')) {
    text = await file.text();
  } else if (file.type === 'application/pdf' || lower.endsWith('.pdf')) {
    text = (await extractors.pdf(file)).replace(/--\s*\d+\s+of\s+\d+\s*--/g, '');
  } else if (file.type.startsWith('image/')) {
    text = await extractors.image(file);
  } else {
    throw new Error('Formato no compatible. Usa PDF, imagen, TXT o Markdown.');
  }
  text = text.trim();
  if (!new RegExp('[\\p{L}\\p{N}]', 'u').test(text)) {
    throw new Error('No se ha podido extraer texto legible. Revisa el archivo o pega el texto manualmente.');
  }
  return text;
}
