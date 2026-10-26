/** A provider failure or template is not evidence about the uploaded document. */
export async function readDocumentAnalysis(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'No se pudo analizar el documento.');
  if (data.success !== true || data.isLiveAI !== true || data.isFallback === true || typeof data.text !== 'string') {
    throw new Error('El proveedor no ha devuelto un análisis real. Configura la IA o revisa el documento manualmente.');
  }
  let result: any;
  try { result = JSON.parse(data.text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')); }
  catch { throw new Error('El proveedor no ha devuelto un análisis estructurado válido.'); }
  const required = ['entity', 'documentType', 'summaryEs', 'recommendedAction'];
  const optional = ['bsn', 'letterDate', 'deadline', 'financialOutcome', 'suggestedReplySubject'];
  if (!result || Array.isArray(result) || required.some(key => typeof result[key] !== 'string' || !result[key].trim()) || optional.some(key => result[key] != null && typeof result[key] !== 'string')) {
    throw new Error('El análisis recibido está incompleto. No se han aplicado datos al documento.');
  }
  return result;
}
