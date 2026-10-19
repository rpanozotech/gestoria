export type OcrMethod = 'OCR' | 'Extractor alternativo';

export interface OcrReviewInput {
  text: string;
  confidence: number;
  method: OcrMethod;
  fileName: string;
}

export interface OcrReviewResult {
  extractedText: string;
  confidence: number;
  method: OcrMethod;
  canContinue: boolean;
  warning: boolean;
  manualReviewRequired: boolean;
  message?: string;
}

const NO_TEXT_MESSAGE = 'No hemos podido leer el documento. Revisa la imagen o introduce los datos manualmente.';

export function reviewOcrResult(input: OcrReviewInput): OcrReviewResult {
  const extractedText = input.text.trim();
  const confidence = Number.isFinite(input.confidence) ? Math.max(0, Math.min(100, input.confidence)) : 0;
  const hasText = extractedText.length > 0;
  return {
    extractedText,
    confidence,
    method: input.method,
    canContinue: hasText,
    warning: !hasText || confidence < 80,
    manualReviewRequired: !hasText || confidence < 80,
    message: hasText ? undefined : NO_TEXT_MESSAGE,
  };
}

export function canConfirmFicha(result: OcrReviewResult, gestorConfirmed: boolean): boolean {
  return result.canContinue && gestorConfirmed;
}
