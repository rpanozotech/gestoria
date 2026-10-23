export function parseStructuredAiResponse(value: unknown): unknown | null {
  if (typeof value !== 'string') return value && typeof value === 'object' ? value : null;
  const clean = value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try { return JSON.parse(clean); } catch { return null; }
}
