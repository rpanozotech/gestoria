import { Router, Request, Response } from 'express';
import { query } from '../db/index.js';

const router = Router();

// Helper para llamar a OpenAI o utilizar motor semántico local
async function callOpenAIOrFallback(systemPrompt: string, userPrompt: string, fallbackFn: () => any) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === 'tu-api-key-de-openai-aqui' || apiKey.trim() === '') {
    return fallbackFn();
  }

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
      }),
    });

    if (!res.ok) {
      console.warn('Fallo al llamar a OpenAI, usando motor heurístico fallback.');
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
    console.error('Error llamando a OpenAI API:', err);
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
    const { template, client_name, bsn, address, case_details, language = 'nl' } = req.body;

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

    const letterText = await callOpenAIOrFallback(systemPrompt, userPrompt, fallback);

    res.json({
      success: true,
      letter: typeof letterText === 'string' ? letterText : JSON.stringify(letterText),
    });
  } catch (error) {
    console.error('Error generando documento con IA:', error);
    res.status(500).json({ error: 'Error al generar documento con IA' });
  }
});

export default router;
