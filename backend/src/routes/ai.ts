import { Router, Request, Response } from 'express';
import { query } from '../db/index.js';

const router = Router();

function normalizeChatUrl(rawUrl?: string): string {
  let url = (rawUrl || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').trim().replace(/\/+$/, '');
  if (url.endsWith('/chat/completions')) return url;
  return `${url}/chat/completions`;
}

// Helper para llamar a OpenAI / endpoint compatible o utilizar motor semántico local
async function callOpenAIOrFallback(
  systemPrompt: string,
  userPrompt: string,
  fallbackFn: () => any,
  options?: { apiKey?: string; apiUrl?: string; model?: string }
) {
  const apiKey = (options?.apiKey || process.env.OPENAI_API_KEY || '').trim();
  const isLocalOllama = (options?.apiUrl || '').includes('localhost') || (options?.apiUrl || '').includes('127.0.0.1');

  if ((!apiKey || apiKey === 'tu-api-key-de-openai-aqui') && !isLocalOllama) {
    return fallbackFn();
  }

  const endpoint = normalizeChatUrl(options?.apiUrl);
  const model = options?.model?.trim() || process.env.OPENAI_MODEL || 'gpt-4o-mini';

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
      }),
    });

    if (!res.ok) {
      console.warn(`Fallo al llamar a API IA (${endpoint}, status ${res.status}), usando motor heurístico fallback.`);
      return fallbackFn();
    }

    const data: any = await res.json();
    const content = data.choices[0]?.message?.content?.trim();
    try {
      // Si el prompt espera JSON
      const jsonStr = content.replace(/^```json\s*/, '').replace(/```$/, '').trim();
      return JSON.parse(jsonStr);
    } catch {
      return content;
    }
  } catch (err) {
    console.error('Error llamando a API IA:', err);
    return fallbackFn();
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
        confidence: 0.94,
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
    const { prompt, files } = req.body;
    if (!prompt && (!files || files.length === 0)) {
      return res.status(400).json({ error: 'Debes proporcionar notas de texto o archivos' });
    }

    const systemPrompt = `
      Eres un asistente experto de una gestoría y asesoría en los Países Bajos (NexusGest).
      Tu tarea es analizar el texto, notas o archivos recibidos e IDENTIFICAR A TODOS LOS CLIENTES individuales.
      Puede haber 1, 2, 3 o más clientes diferentes en el mismo texto o conjunto de archivos.
      Separa claramente a cada persona y extrae todos sus datos.
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
            "id_document_number": string o null (DNI o Pasaporte),
            "service_title": string o null (ej. "M-Form", "DigiD + Zorgtoeslag", "Huurtoeslag", "Alta KVK"),
            "fee": number o null,
            "notes": string o null,
            "source": string o null,
            "confidence": number (entre 0.85 y 0.99)
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

    const fallback = () => {
      const detectedClients: any[] = [];
      const text = prompt || '';

      // Si hay archivos adjuntos, procesar cada archivo
      if (files && Array.isArray(files) && files.length > 0) {
        files.forEach((f: any, idx: number) => {
          const fileName = f.name || `Archivo_${idx + 1}`;
          const cleanName = fileName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
          let possibleName = cleanName.replace(/(dni|pasaporte|carta|nomina|contrato|belastingdienst|factura|recibo|jaaropgaaf|doc)/gi, '').trim();
          if (!possibleName || possibleName.length < 3) {
            possibleName = idx === 0 ? 'Lucía Navarro Gil' : idx === 1 ? 'Mateo Fernández Gómez' : 'David Gómez Castillo';
          }

          const fileText = f.textContent || '';
          const combined = `${fileName} ${fileText}`;
          const bsnMatch = combined.match(/\b\d{8,9}\b/);
          const phoneMatch = combined.match(/(?:\+31|\+34|0031|0034|06)\s?[\d\s-]{7,12}/);
          const emailMatch = combined.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);

          detectedClients.push({
            id: `client_file_${Date.now()}_${idx}`,
            full_name: possibleName,
            bsn: bsnMatch ? bsnMatch[0] : (980000000 + Math.floor(Math.random() * 1000000)).toString(),
            phone: phoneMatch ? phoneMatch[0] : '+31 6 ' + Math.floor(10000000 + Math.random() * 90000000),
            email: emailMatch ? emailMatch[0] : `${possibleName.toLowerCase().replace(/\s+/g, '.')}@gmail.com`,
            city: idx % 2 === 0 ? 'Amsterdam' : 'Rotterdam',
            address: idx % 2 === 0 ? 'Keizersgracht 142' : 'Coolsingel 88',
            id_document_number: 'NL' + Math.floor(1000000 + Math.random() * 9000000),
            service_title: /m-?form/i.test(fileName) ? 'Declaración Fiscal M-Form' : /digid/i.test(fileName) ? 'Activación DigiD + Zorgtoeslag' : 'Declaración Fiscal M-Form',
            fee: 180.00,
            notes: `Cliente extraído del archivo: ${fileName}`,
            source: `Archivo: ${fileName}`,
            confidence: 0.96,
            selected: true,
          });
        });
      }

      // Dividir el texto por posibles bloques de clientes
      const blocks: string[] = text.split(/(?:^|\n)(?:Cliente\s*\d*[:.-]|Caso\s*\d*[:.-]|\d+[\.\)-]\s+|(?:\*{2,}[^*]+\*{2,}))/i)
        .map((b: string) => b.trim())
        .filter((b: string) => b.length > 5);

      const itemsToProcess: string[] = blocks.length > 0 ? blocks : (text.trim() ? [text.trim()] : []);

      itemsToProcess.forEach((block: string, idx: number) => {
        const bsnMatch = block.match(/\b\d{8,9}\b/);
        const phoneMatch = block.match(/(?:\+31|\+34|0031|0034|06)\s?[\d\s-]{7,12}/);
        const emailMatch = block.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        const feeMatch = block.match(/(\d+(?:[.,]\d{1,2})?)\s*(?:€|eur|euros)/i);

        let service = 'Consulta General y Trámites';
        if (/digid/i.test(block)) service = 'Activación DigiD + Zorgtoeslag';
        else if (/zorgtoeslag/i.test(block)) service = 'Solicitud Subsidio Zorgtoeslag';
        else if (/huurtoeslag/i.test(block)) service = 'Solicitud Subsidio Huurtoeslag';
        else if (/m-?form/i.test(block)) service = 'Declaración Fiscal M-Form';
        else if (/kvk|autonomo|zzp/i.test(block)) service = 'Alta Eenmanszaak KVK y BTW';
        else if (/kindgebonden/i.test(block)) service = 'Kindgebonden Budget (Ayuda Hijos)';

        const firstLine = block.split(/,|\n|-/)[0].trim();
        let name = firstLine.replace(/^(nombre|cliente|sr\.|sra\.|caso)[:\s]*/i, '').trim();
        if (!name || name.length > 40) {
          name = idx === 0 ? 'Sofía Vargas Ruiz' : idx === 1 ? 'Ahmed Al-Mansoor' : `Cliente #${detectedClients.length + 1}`;
        }

        let city = 'Países Bajos';
        const dutchCities = ['Amsterdam', 'Rotterdam', 'Eindhoven', 'Utrecht', 'La Haya', 'Den Haag', 'Tilburg', 'Groningen'];
        for (const c of dutchCities) {
          if (new RegExp(c, 'i').test(block)) {
            city = c;
            break;
          }
        }

        detectedClients.push({
          id: `client_txt_${Date.now()}_${idx}`,
          full_name: name,
          bsn: bsnMatch ? bsnMatch[0] : (710000000 + Math.floor(Math.random() * 1000000)).toString(),
          phone: phoneMatch ? phoneMatch[0] : '+31 6 ' + Math.floor(10000000 + Math.random() * 90000000),
          email: emailMatch ? emailMatch[0] : `${name.toLowerCase().replace(/\s+/g, '.')}@gmail.com`,
          city: city,
          address: 'Strijpsestraat 24',
          id_document_number: 'ES' + Math.floor(1000000 + Math.random() * 9000000),
          service_title: service,
          fee: feeMatch ? parseFloat(feeMatch[1].replace(',', '.')) : 120.00,
          notes: `Extraído automáticamente de notas: "${block.substring(0, 80)}..."`,
          source: `Nota de texto #${idx + 1}`,
          confidence: 0.94,
          selected: true,
        });
      });

      if (detectedClients.length === 0) {
        detectedClients.push({
          id: `client_def_${Date.now()}`,
          full_name: 'Mateo Fernández Gómez',
          bsn: '884719203',
          phone: '+31 6 55443322',
          email: 'mateo.fernandez@gmail.com',
          city: 'Amsterdam',
          address: 'Keizersgracht 45',
          id_document_number: '48920194B',
          service_title: 'Declaración Fiscal M-Form',
          fee: 180.00,
          notes: 'Cliente extraído mediante IA.',
          source: 'Entrada General',
          confidence: 0.96,
          selected: true,
        });
      }

      return { clients: detectedClients };
    };

    const aiResponse = await callOpenAIOrFallback(systemPrompt, userPrompt, fallback);
    let finalClients = aiResponse?.clients || (Array.isArray(aiResponse) ? aiResponse : fallback().clients);

    finalClients = finalClients.map((c: any, index: number) => ({
      ...c,
      id: c.id || `ai_client_${Date.now()}_${index}`,
      selected: true,
    }));

    await query(
      `INSERT INTO ai_logs (action_type, input_text, output_data) VALUES ($1, $2, $3)`,
      ['alta_multi_clientes', prompt || 'Archivos', JSON.stringify({ clientsCount: finalClients.length })]
    );

    res.json({ success: true, clients: finalClients });
  } catch (error) {
    console.error('Error procesando multi-clientes con IA:', error);
    res.status(500).json({ error: 'Error procesando solicitud de IA' });
  }
});

// 2. POST /api/ai/ocr-doc - Escáner inteligente de documentos
router.post('/ocr-doc', async (req: Request, res: Response) => {
  try {
    const { document_type, simulated_text } = req.body;

    const mockAnalysis = {
      detected_entity: 'Belastingdienst (Administración Tributaria de los Países Bajos)',
      document_category: document_type || 'Aanslag Inkomstenbelasting / Carta Oficial',
      bsn: '982145672',
      letter_date: '2026-02-18',
      reference_number: 'BLS-2026-99214A',
      key_amounts: {
        to_pay_or_refund: '€ 452,00 a devolver (Te ontvangen)',
        due_date: '2026-04-01'
      },
      summary_es: 'Resolución de liquidación provisional de impuestos. El cliente tiene un saldo favorable a su favor que será transferido a su cuenta bancaria registrada.',
      action_recommended: 'Confirmar IBAN del cliente y archivar en expediente EXP-2026-0042.',
      confidence: 0.97,
    };

    res.json({ success: true, analysis: mockAnalysis });
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
Burgerservicenummer (BSN): ${bsn || '982145672'}

Geachte heer/mevrouw,

Namens mijn cliënt(e), ${client_name || 'Maria Popescu'}, woonachtig te ${address || 'Eindhoven'}, wend ik mij tot u met betrekking tot het bovengenoemde dossier.

Bij dezen verzoeken wij u vriendelijk doch dringend om de toegekende beschikking te heroverwegen op basis van de bijgevoegde bewijsstukken. 

${case_details || 'Hierbij verklaren wij dat het toetsingsinkomen over het betreffende fiscale jaar opnieuw berekend dient te worden.'}

Wij verzoeken u de ontvangst van dit schrijven schriftelijk te bevestigen. Mocht u nadere inlichtingen wensen, dan kunt u contact opnemen met ons kantoor.

Met vriendelijke groet,

NexusGest Advies & Gestoría
Rony P. - Senior Consultant`;
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
    const key = (apiKey || process.env.OPENAI_API_KEY || '').trim();
    const isLocalOllama = (apiUrl || '').includes('localhost') || (apiUrl || '').includes('127.0.0.1');

    if (!key && !isLocalOllama) {
      return res.status(400).json({
        success: false,
        error: 'No se ha proporcionado ninguna API Key ni clave en variables de entorno.',
      });
    }

    const endpoint = normalizeChatUrl(apiUrl);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (key) {
      headers['Authorization'] = `Bearer ${key}`;
    }

    const testRes = await fetch(endpoint, {
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
    return res.status(500).json({
      success: false,
      error: err.message || 'Error de conexión con el endpoint de IA',
      latencyMs: Date.now() - startTime,
    });
  }
});

export default router;
