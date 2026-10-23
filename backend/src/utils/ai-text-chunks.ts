export function splitAiText(text: string, maxChars = 12000): string[] {
  const clean = String(text || '').trim();
  if (!clean) return [];
  const chunks: string[] = [];
  for (let index = 0; index < clean.length; index += maxChars) chunks.push(clean.slice(index, index + maxChars));
  return chunks;
}
