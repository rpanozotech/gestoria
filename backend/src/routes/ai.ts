import { Router, Request, Response } from 'express';
import { splitAiText } from '../utils/ai-text-chunks.js';
import { parseStructuredAiResponse } from '../utils/structured-ai-response.js';
import { query } from '../db/index.js';
import { PDFParse } from 'pdf-parse';
import { reconcileExplicitClientFields, extractExplicitClients } from '../utils/explicit-client-fields.js';
import { validarEndpointIA, EndpointNoPermitido } from './ai-endpoint-guard.js';
import { safeAiFetch, UnsafeAiDestination, aiCredential, isLocalAi } from '../utils/safe-ai-fetch.js';

const router = Router();

// Historial independiente de importaciones IA: conserva evidencia de revisión
// sin mezclarla con las notas operativas del cliente.
router.post('/history', async (req: Request, res: Response) => {
  const sourceText = typeof req.body?.source_text === 'string' ? req.body.source_text.trim() : '';
  const result = req.body?.result;
  const clientIds = Array.isArray(req.body?.client_ids) ? req.body.client_ids : [];
  if (!sourceText || !result || clientIds.length === 0) {
    return res.status(400).json({ error: 'source_text, result y client_ids son obligatorios' });
  }
  const saved = await query(
    `INSERT INTO ai_import_history (source_text, result_json, confirmed_by, client_ids)
     VALUES ($1, $2::jsonb, $3, $4::jsonb)
     RETURNING id, confirmed_by, confirmed_at`,
    [sourceText, JSON.stringify(result), req.user?.id || null, JSON.stringify(clientIds)]
  );
  return res.status(201).json({ history: saved.rows[0] });
});

// Extractor local de PDF: no llama a IA ni necesita autenticacion de gestor.
// Se usa solo para leer el texto de un documento en el propio servidor local.
export const localPdfRouter = Router();
localPdfRouter.post('/extract', async (req: Request, res: Response) => {
  try {
    const { dataUrl } = req.body || {};
    if (typeof dataUrl !== 'string' || !dataUrl.includes('base64,')) {
      return res.status(400).json({ error: 'Falta el contenido PDF en base64' });
    }
    const base64 = dataUrl.slice(dataUrl.indexOf('base64,') + 7);
    const parser = new PDFParse({ data: Buffer.from(base64, 'base64') });
    const result = await parser.getText({ pageJoiner: '' });
    await parser.destroy();
    return res.json({ success: true, text: result.text || '' });
  } catch (error) {
    console.error('No se pudo extraer el PDF local:', error);
    return res.status(422).json({ error: 'El PDF no se pudo leer localmente' });
  }
});

function normalizeChatUrl(rawUrl?: string): string {
  let url = (rawUrl || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').trim().replace(/\/+$/, '');
  if (url.endsWith('/chat/completions')) return url;
  return `${url}/chat/completions`;
}

/**
 * Normaliza la URL de la API de IA validandola antes.
 *
 * Cuando el cliente no envia `apiUrl` se usa OPENAI_BASE_URL del servidor, que
 * es de fiar y no necesita pasar por el filtro. Cuando si lo envia, pasa por
 * validarEndpointIA: sin eso, el body controla el destino del fetch y el
 * Authorization con la OPENAI_API_KEY del servidor viaja a el.
 */
async function resolveChatUrl(rawUrl?: string): Promise<string> {
  const supplied = (rawUrl || '').trim();
  if (!supplied) return normalizeChatUrl(undefined);
  await validarEndpointIA(supplied, { permitirHostsLocales: true });
  return normalizeChatUrl(supplied);
}

/**
 * fetch que revalida cada salto de redireccion.
 *
 * Validar solo la URL inicial no basta: `fetch` sigue redirecciones por
 * defecto, asi que un host aparentemente legitimo (attacker.com) puede
 * responder 302 hacia http://169.254.169.254/ y el fetch acabaria ahi. Como la
 * cabecera Authorization se reenvia automaticamente en el salto, la
 * OPENAI_API_KEY del servidor llegaria al destino interno.
 *
 * Se usa `redirect: 'manual'` y se resuelve la cadena a mano, pasando cada
 * destino por el mismo filtro. El limite de 4 saltos evita bucles.
 */
async function fetchConRedireccionesSeguras(url: string, options: RequestInit, timeoutMs?: number): Promise<globalThis.Response> {
  try { return await safeAiFetch(url, options, timeoutMs); }
  catch (error) { if (error instanceof UnsafeAiDestination) throw new EndpointNoPermitido(error.message);throw error; }
}

function extractMultilingualFields(text: string) {
  const clean = text.replace(/\r/g, ' ').replace(/\s+/g, ' ').trim();
  const lineValue = (labels: string[]) => {
    const pattern = new RegExp('(?:' + labels.join('|') + ')\\s*[:#-]?\\s*([^,;|\\n]{2,100})', 'i');
    return clean.match(pattern)?.[1]?.trim() || '';
  };
  const bsn = clean.match(/(?:bsn|burgerservicenummer|citizen service number|citizen\s+number|n[uú]mero\s+de\s+servicio)\D{0,24}(\d{8,9})/i)?.[1]
    || clean.match(/\b\d{9}\b/)?.[0] || '';
  const email = clean.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)?.[0] || '';
  const phone = clean.match(/(?:\+31|\+34|0031|0034|06)\s?[\d\s().-]{7,16}/)?.[0]?.trim() || '';
  const fullName = lineValue(['full name', 'name', 'naam', 'volledige naam', 'nombre completo', 'nombre y apellidos', 'nombre']);
  const address = lineValue(['address', 'adres', 'woonadres', 'direcci[oó]n', 'domicilio']);
  const city = lineValue(['city', 'plaats', 'woonplaats', 'ciudad', 'localidad']);
  const idDocument = lineValue(['passport', 'paspoort', 'pasaporte', 'id document', 'documento de identidad', 'dni']);
  return { bsn, email, phone, fullName, address, city, idDocument };
}

function detectMultilingualService(text: string) {
  if (/digid|zorgtoeslag|healthcare allowance|subsidio.*m[eé]dico/i.test(text)) return 'DigiD / Zorgtoeslag';
  if (/huurtoeslag|rent allowance|subsidio.*alquiler/i.test(text)) return 'Huurtoeslag / subsidio de alquiler';
  if (/m-?form|income tax|inkomstenbelasting|declaraci[oó]n fiscal|renta/i.test(text)) return 'M-Form / declaración fiscal';
  if (/bezwaarschrift|appeal|recurso|objection/i.test(text)) return 'Bezwaarschrift / recurso';
  if (/kvk|eenmanszaak|zzp|aut[oó]nomo|self-employed/i.test(text)) return 'Alta KVK / autónomo';
  return 'Consulta general';
}

async function extractPdfText(files: any[]) {
  return Promise.all(files.map(async (file) => {
    if (file?.textContent || !String(file?.type || '').includes('pdf') || typeof file?.dataUrl !== 'string') {
      return file;
    }
    try {
      const base64 = file.dataUrl.replace(/^data:application\/pdf;base64,/, '');
      const parser = new PDFParse({ data: Buffer.from(base64, 'base64') });
      const result = await parser.getText({ pageJoiner: '' });
      await parser.destroy();
      return { ...file, textContent: result.text || '' };
    } catch (error) {
      console.warn('No se pudo extraer texto del PDF:', file?.name, error);
      return { ...file, textContent: '' };
    }
  }));
}

// Helper para llamar a OpenAI / endpoint compatible o utilizar motor semántico local
async function callOpenAIOrFallback(
  systemPrompt: string,
  userPrompt: string | Array<{ type: string; text?: string; image_url?: { url: string } }>,
  fallbackFn: () => any,
  options?: { apiKey?: string; apiUrl?: string; model?: string; jsonResponse?: boolean; onFallback?: (reason: string) => void; signal?: AbortSignal }
) {
  const fail = (reason: string) => { options?.onFallback?.(reason); return fallbackFn(); };
  const apiKey = aiCredential(options?.apiKey, options?.apiUrl);
  const isLocalOllama = isLocalAi(options?.apiUrl);

  if ((!apiKey || apiKey === 'tu-api-key-de-openai-aqui') && !isLocalOllama) {
    return fail('provider_unavailable');
  }

  // Una URL de cliente invalida cae al motor local en vez de propagar el error:
  // el fallback heuristico siempre existe, y una URL rechazada no debe dejar
  // al gestor sin respuesta. La URL del servidor (OPENAI_BASE_URL) no pasa por
  // aqui porque resolverChatUrl solo filtra lo que el cliente envia.
  let endpoint: string;
  try {
    endpoint = await resolveChatUrl(options?.apiUrl);
  } catch (error) {
    if (error instanceof EndpointNoPermitido) {
      console.warn('ai_provider_failure', JSON.stringify({ reasonCode: 'endpoint_rejected' }));
      return fail('endpoint_rejected');
    }
    throw error;
  }

  const model = options?.model?.trim() || process.env.OPENAI_MODEL || 'gpt-4o-mini';

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const startedAt = Date.now();
    // OpenAI-compatible Ollama silently uses the runner's 4096-token context.
    // Native requests set a per-request context without changing shared services.
    const nativeLocalJson = Boolean(options?.jsonResponse && isLocalOllama);
    if (nativeLocalJson && !['/v1/chat/completions', '/chat/completions'].includes(new URL(endpoint).pathname)) return fail('endpoint_rejected');
    const messages = [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }];
    const requestBody = nativeLocalJson ? {
      model, messages, stream: false, think: false, format: 'json',
      options: { temperature: 0, num_ctx: 16384, num_predict: 2048 },
    } : {
      model, messages, temperature: options?.jsonResponse ? 0 : 0.2,
      ...(options?.jsonResponse ? { response_format: { type: 'json_object' } } : {}),
    };
    const res = await fetchConRedireccionesSeguras(nativeLocalJson ? new URL('/api/chat', endpoint).href : endpoint, {
      method: 'POST',
      headers,
      ...(options?.jsonResponse && isLocalOllama ? { signal: options?.signal || AbortSignal.timeout(120_000) } : {}),
      body: JSON.stringify(requestBody),
    }, options?.jsonResponse && isLocalOllama ? 120_000 : undefined);

    if (!res.ok) {
      console.warn('ai_provider_failure', JSON.stringify({ reasonCode: 'provider_http_error', status: res.status, durationMs: Date.now() - startedAt }));
      return fail('provider_http_' + res.status);
    }

    const data: any = await res.json();
    const content = nativeLocalJson ? data.message?.content : data.choices?.[0]?.message?.content;
    if (options?.jsonResponse) console.info('ai_provider_result', JSON.stringify({
      provider: isLocalOllama ? 'local' : 'external', durationMs: Date.now() - startedAt,
      finishReason: nativeLocalJson ? (data.done_reason === 'stop' ? 'stop' : 'length') : ['stop','length','content_filter'].includes(data.choices?.[0]?.finish_reason) ? data.choices[0].finish_reason : 'other',
      promptTokens: Number(nativeLocalJson ? data.prompt_eval_count : data.usage?.prompt_tokens) || 0, completionTokens: Number(nativeLocalJson ? data.eval_count : data.usage?.completion_tokens) || 0,
      contentChars: typeof content === 'string' ? content.length : 0,
      reasoningChars: typeof data.choices?.[0]?.message?.reasoning === 'string' ? data.choices[0].message.reasoning.length : 0,
    }));
    if (options?.jsonResponse) {
      const parsed = parseStructuredAiResponse(content);
      if (!parsed) return fail((nativeLocalJson ? data.done_reason : data.choices?.[0]?.finish_reason) === 'length' ? 'output_truncated' : 'invalid_json');
      return parsed;
    }
    if (typeof content !== 'string' || !content.trim()) return fail('empty_response');
    return parseStructuredAiResponse(content) || content.trim();
  } catch (err) {
    const reason = err instanceof Error && /Tiempo de espera|timeout|aborted/i.test(err.message) ? 'provider_timeout' : 'provider_request_failed';
    console.warn('ai_provider_failure', JSON.stringify({ reasonCode: reason }));
    return fail(reason);
  }
}

// 1. POST /api/ai/parse-client - Alta de cliente por lenguaje natural
router.post('/parse-client', async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Debes proporcionar un texto descriptivo' });
    }

    const systemPrompt = `
      Eres un asistente experto de una gestoría y asesoría en los Países Bajos (NexusGest).
      Extrae los datos del cliente y trámite a partir del texto ingresado por el gestor.
      Responde EXCLUSIVAMENTE con un JSON estructurado con estas claves:
      {
        "full_name": string o null,
        "bsn": string o null (número de 8 o 9 dígitos),
        "phone": string o null,
        "email": string o null,
        "city": string o null,
        "address": string o null,
        "service_title": string o null (ej. "DigiD", "Zorgtoeslag", "M-Form"),
        "fee": number o null,
        "notes": string o null,
        "confidence": number (entre 0.8 y 1.0)
      }
    `;

    const fallback = () => {
      // Parser heurístico inteligente
      const text = prompt;
      const bsnMatch = text.match(/\b\d{8,9}\b/);
      const phoneMatch = text.match(/(?:\+31|\+34|0031|0034|06)\s?[\d\s-]{7,12}/);
      const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      const feeMatch = text.match(/(\d+(?:[.,]\d{1,2})?)\s*(?:€|eur|euros)/i);

      let service = 'Consulta General / Trámite';
      if (/digid/i.test(text)) service = 'Solicitud y Activación DigiD';
      else if (/zorgtoeslag/i.test(text)) service = 'Solicitud Zorgtoeslag (Seguro Médico)';
      else if (/huurtoeslag/i.test(text)) service = 'Solicitud Huurtoeslag (Alquiler)';
      else if (/m-?form/i.test(text)) service = 'Declaración Fiscal M-Form';
      else if (/kvk|autonomo|zzp/i.test(text)) service = 'Alta KVK Eenmanszaak';

      // Extraer posible nombre (primeras palabras o antes de coma)
      let name = text.split(/,|\n|-/)[0].trim();
      if (name.length > 50) name = name.substring(0, 30);

      let city = 'Países Bajos';
      const dutchCities = ['Amsterdam', 'Rotterdam', 'Eindhoven', 'Utrecht', 'La Haya', 'Den Haag', 'Tilburg', 'Groningen'];
      for (const c of dutchCities) {
        if (new RegExp(c, 'i').test(text)) {
          city = c;
          break;
        }
      }

      return {
        full_name: name || 'Nuevo Cliente',
        bsn: bsnMatch ? bsnMatch[0] : null,
        phone: phoneMatch ? phoneMatch[0] : null,
        email: emailMatch ? emailMatch[0] : null,
        city: city,
        address: null,
        service_title: service,
        fee: feeMatch ? parseFloat(feeMatch[1].replace(',', '.')) : 75.00,
        notes: `Información extraída automáticamente por IA: "${text}"`,
        confidence: 0,
            isFallback: true,
            isLiveAI: false,
      };
    };

    const parsedData = await callOpenAIOrFallback(systemPrompt, prompt, fallback);

    // Registrar log de IA para auditoría
    await query(
      `INSERT INTO ai_logs (action_type, input_text, output_data) VALUES ($1, $2, $3)`,
      ['alta_cliente_nlp', prompt, JSON.stringify(parsedData)]
    );

    res.json({ success: true, data: parsedData });
  } catch (error) {
    console.error('Error procesando lenguaje natural con IA:', error);
    res.status(500).json({ error: 'Error procesando solicitud de IA' });
  }
});

// 1b. POST /api/ai/parse-multi-clients - Extracción de múltiples clientes a partir de notas y archivos
router.post('/parse-multi-clients', async (req: Request, res: Response) => {
  try {
    const { prompt, files: rawFiles, apiKey, apiUrl, model, useAI = true } = req.body;
    const files = await extractPdfText(Array.isArray(rawFiles) ? rawFiles : []);
    if (!prompt && (!files || files.length === 0)) {
      return res.status(400).json({ error: 'Debes proporcionar notas de texto o archivos' });
    }

    const systemPrompt = `
      Eres un asistente experto de una gestoría y asesoría en los Países Bajos (NexusGest).
      Tu tarea es analizar el texto, notas o archivos recibidos e IDENTIFICAR A TODOS LOS CLIENTES individuales.
      Los documentos pueden estar en neerlandés, inglés, español o mezclados. Reconoce Naam, Achternaam, Adres,
      Woonadres, Postcode, Plaats, Telefoon, E-mail, BSN/Burgerservicenummer; Name, Surname, Address, City,
      Phone, Email; y Nombre, Apellidos, Dirección, Ciudad, Teléfono, Correo.
      Puede haber 1, 2, 3 o más clientes diferentes en el mismo texto o conjunto de archivos.
      Separa claramente a cada persona y extrae todos sus datos.
      La ausencia de BSN, correo u otro campo no excluye a una persona con nombre explícito: conserva su nombre y usa null en los campos ausentes.
      Extrae también nombres explícitos en documentos de ejemplo o prueba; describir su contenido no certifica una identidad real.
      Nunca inventes, completes ni supongas datos personales, BSN, teléfonos, correos, direcciones, documentos o tarifas.
      Si un dato no aparece de forma verificable, devuelve null. Conserva nombres y direcciones tal como aparecen.
      Responde EXCLUSIVAMENTE con un JSON con la clave "clients":
      {
        "clients": [
          {
            "full_name": string,
            "bsn": string o null (número de 8 o 9 dígitos),
            "phone": string o null,
            "email": string o null,
            "city": string o null,
            "address": string o null,
            "postal_code": string o null,
            "country": string o null,
            "nationality": string o null,
            "iban": string o null,
            "preferred_language": "es", "en" o "nl" o null,
            "client_type": string o null,
            "organism": string o null,
            "dates": string o null,
            "status": string o null,
            "id_document_number": string o null (DNI o Pasaporte),
            "service_title": string o null (ej. "M-Form", "DigiD + Zorgtoeslag", "Huurtoeslag", "Alta KVK"),
            "fee": number o null,
            "notes": string o null,
            "source": string o null,
            "confidence": number (entre 0 y 0.99, según la evidencia disponible)
          }
        ]
      }
    `;

    const userPrompt = `
      Notas de texto:
      ${prompt || 'Sin notas'}

      Archivos adjuntos:
      ${files ? JSON.stringify(files.map((f: any) => ({ name: f.name, type: f.type, summary: f.textContent || 'Documento adjunto' }))) : 'Ninguno'}
    `;

    // OCR-ONLY MODE: IA desactivada por context overflow (6.8k > 4k tokens) y timeout.
    // Usamos solo OCR local + extracción determinista de campos (regex/patrones) sobre texto OCR.
    // 14 campos mapeados, idiomas ES/EN/NL, aiUsed=false, localOnly=true honesto.
    const startedAt = Date.now();
    const sources = [prompt || '', ...files.map((file: any) => file.textContent || '')];
    const explicitClients = extractExplicitClients(sources);

    // Formato de respuesta consistente con el contrato del frontend
    const finalClients = explicitClients.map((c: any, index: number) => ({
      ...c,
      id: c.id || `ocr_client_${Date.now()}_${index}`,
      extractionMethod: 'OCR + Extractor determinista',
      selected: true,
      confidence: 0, // sin IA: no hay confianza modelada; el gestor valida
    }));

    const reasonCode = 'ocr_only';
    const diagnostics = { reasonCode, durationMs: Date.now() - startedAt, sourceChars: sources.reduce((n, t) => n + t.length, 0), fileCount: files.length, clientsCount: finalClients.length, aiUsed: false, localOnly: true };
    console.info('ai_document_analysis', JSON.stringify(diagnostics));
    await query(
      `INSERT INTO ai_logs (action_type, input_text, output_data) VALUES ($1, $2, $3)`,
      ['alta_multi_clientes', 'Análisis de documentos (OCR-only)', JSON.stringify(diagnostics)]
    );

    res.json({ success: true, clients: finalClients, localOnly: true, aiUsed: false, reasonCode });
  } catch (error) {
    console.error('Error procesando multi-clientes con IA:', error);
    res.status(500).json({ error: 'Error procesando solicitud de IA' });
  }
});

// 2. POST /api/ai/ocr-doc - Escáner inteligente de documentos
router.post('/ocr-doc', async (req: Request, res: Response) => {
  try {
    const { document_type, simulated_text } = req.body;

    const analysis = {
      detected_entity: null,
      document_category: document_type || null,
      bsn: null,
      letter_date: null,
      reference_number: null,
      key_amounts: null,
      summary_es: 'No se ha ejecutado un análisis OCR real. Revisa el documento manualmente.',
      action_recommended: 'No tomes decisiones fiscales con este resultado sin validación humana.',
      confidence: 0,
      isFallback: true,
      isLiveAI: false,
      warning: 'Resultado no verificado: el motor OCR/IA no está conectado.',
    };

    res.json({ success: true, analysis });
  } catch (error) {
    res.status(500).json({ error: 'Error al escanear documento' });
  }
});

// 3. POST /api/ai/generate-letter - Generador de Cartas Oficiales
router.post('/generate-letter', async (req: Request, res: Response) => {
  try {
    const { template, client_name, bsn, address, case_details, language = 'nl', apiKey, apiUrl, model } = req.body;

    const systemPrompt = `
      Eres un redactor legal experto en trámites y derecho administrativo neerlandés.
      Genera una carta oficial con encabezado formal, fecha de hoy, referencias y firma del gestor.
      Idioma: ${language === 'nl' ? 'Neerlandés formal (Zakelijk Nederlands)' : 'Español formal'}.
    `;

    const userPrompt = `
      Tipo de plantilla: ${template || 'Carta a Belastingdienst / Rekeningnummer wijzigen'}
      Cliente: ${client_name}
      BSN: ${bsn || 'No especificado'}
      Dirección: ${address || 'Países Bajos'}
      Detalles del caso: ${case_details || 'Solicitud de revisión'}
    `;

    const fallback = () => {
      const today = new Date().toLocaleDateString('nl-NL');
      return `Belastingdienst
Postbus 2500
6401 DA Heerlen

Datum: ${today}
Betreft: Verzoek tot herziening / Bezwaarschrift
Burgerservicenummer (BSN): ${bsn || 'No especificado'}

Geachte heer/mevrouw,

Namens mijn cliënt(e), ${client_name || 'la persona interesada'}, woonachtig te ${address || 'Países Bajos'}, wend ik mij tot u met betrekking tot het bovengenoemde dossier.

Bij dezen verzoeken wij u vriendelijk doch dringend om de toegekende beschikking te heroverwegen op basis van de bijgevoegde bewijsstukken. 

${case_details || 'Hierbij verklaren wij dat het toetsingsinkomen over het betreffende fiscale jaar opnieuw berekend dient te worden.'}

Wij verzoeken u de ontvangst van dit schrijven schriftelijk te bevestigen. Mocht u nadere inlichtingen wensen, dan kunt u contact opnemen met ons kantoor.

Met vriendelijke groet,

[Nombre y datos de la gestoría configurados en el expediente]
[Nombre del gestor autorizado]`;
    };

    const letterText = await callOpenAIOrFallback(systemPrompt, userPrompt, fallback, { apiKey, apiUrl, model });

    res.json({
      success: true,
      letter: typeof letterText === 'string' ? letterText : JSON.stringify(letterText),
    });
  } catch (error) {
    console.error('Error generando documento con IA:', error);
    res.status(500).json({ error: 'Error al generar documento con IA' });
  }
});

// 4. POST /api/ai/test-connection - Test de conectividad en tiempo real
router.post('/test-connection', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { apiKey, apiUrl, model = 'gpt-4o-mini' } = req.body;
    const key = aiCredential(apiKey, apiUrl);
    const isLocalOllama = isLocalAi(apiUrl);

    if (!key && !isLocalOllama) {
      return res.status(400).json({
        success: false,
        error: 'No se ha proporcionado ninguna API Key ni clave en variables de entorno.',
      });
    }

    // Este endpoint es el mas peligroso de los tres: hace el fetch y devuelve
    // el cuerpo de la respuesta al cliente. Sin validacion, el cuerpo elige el
    // destino, el servidor adjunta el Authorization con OPENAI_API_KEY, y la
    // respuesta vuelve al atacante. Aqui no hay fallback posible — el usuario
    // quiere saber si la conexion funciona — asi que se responde 400 con el
    // motivo en vez de degradar en silencio.
    let endpoint: string;
    try {
      endpoint = await resolveChatUrl(apiUrl);
    } catch (error) {
      if (error instanceof EndpointNoPermitido) {
        return res.status(400).json({ success: false, error: error.message });
      }
      throw error;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (key) {
      headers['Authorization'] = `Bearer ${key}`;
    }

    const testRes = await fetchConRedireccionesSeguras(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: model.trim() || 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Ping test' }],
        max_tokens: 5,
      }),
    });

    const latencyMs = Date.now() - startTime;
    if (!testRes.ok) {
      let errText = `HTTP ${testRes.status}: ${testRes.statusText}`;
      try {
        const d: any = await testRes.json();
        if (d?.error?.message) errText = d.error.message;
      } catch {}
      return res.status(testRes.status >= 400 && testRes.status < 600 ? testRes.status : 500).json({
        success: false,
        error: errText,
        latencyMs,
      });
    }

    return res.json({
      success: true,
      message: 'Conexión verificada con éxito',
      latencyMs,
      modelUsed: model,
    });
  } catch (err: any) {
    return res.status(err instanceof EndpointNoPermitido ? 400 : 500).json({
      success: false,
      error: err.message || 'Error de conexión con el endpoint de IA',
      latencyMs: Date.now() - startTime,
    });
  }
});

export default router;
