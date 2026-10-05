import { NextResponse } from 'next/server';

function normalizeChatUrl(rawUrl?: string): string {
  let url = (rawUrl || 'https://api.openai.com/v1').trim().replace(/\/+$/, '');
  if (url.endsWith('/chat/completions')) {
    return url;
  }
  return `${url}/chat/completions`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      apiKey,
      apiUrl,
      model = 'gpt-4o-mini',
      systemPrompt,
      prompt,
      messages: inputMessages,
      temperature = 0.3,
      max_tokens = 2500,
    } = body;

    const key = (apiKey || process.env.OPENAI_API_KEY || '').trim();
    const isLocalOllama = (apiUrl || '').includes('localhost') || (apiUrl || '').includes('127.0.0.1') || (apiUrl || '').includes('ollama:11434');

    // Preparar lista de mensajes
    let messages: Array<{ role: string; content: string }> = [];

    if (inputMessages && Array.isArray(inputMessages) && inputMessages.length > 0) {
      messages = [...inputMessages];
      if (systemPrompt && !messages.some((m) => m.role === 'system')) {
        messages.unshift({ role: 'system', content: systemPrompt });
      }
    } else {
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }
      messages.push({
        role: 'user',
        content: prompt || 'Por favor genera el documento oficial solicitado.',
      });
    }

    // Si hay API Key o es Ollama local, hacer la petición real
    if (key || isLocalOllama) {
      const endpoint = normalizeChatUrl(apiUrl);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (key) {
        headers['Authorization'] = `Bearer ${key}`;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s para generación larga

      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers,
          signal: controller.signal,
          body: JSON.stringify({
            model: model.trim() || 'gpt-4o-mini',
            messages,
            temperature,
            max_tokens,
          }),
        });

        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          const content = data.choices?.[0]?.message?.content || '';
          return NextResponse.json({
            success: true,
            text: content,
            modelUsed: data.model || model,
            usage: data.usage,
            isLiveAI: true,
          });
        }

        // Si falló con código de error, extraer mensaje
        let errText = `Error ${res.status}`;
        try {
          const errData = await res.json();
          errText = errData?.error?.message || JSON.stringify(errData);
        } catch {
          // ignore
        }

        console.warn(`[AI API] Error de proveedor (${endpoint}):`, errText);
        // Continuar abajo con fallback si falla la llamada
      } catch (callError: any) {
        clearTimeout(timeoutId);
        console.warn('[AI API] Excepción en llamada a IA externa:', callError.message);
      }
    }

    // Ollama debe fallar de forma explícita: no sustituir un modelo real por
    // una plantilla que pueda parecer una respuesta generada por IA.
    if (isLocalOllama) {
      return NextResponse.json(
        { success: false, error: 'No se pudo conectar con Ollama. Comprueba que el servicio esté disponible.' },
        { status: 503 }
      );
    }

    // Modo Heurístico Local / Fallback Neerlandés de Alta Precisión
    const lastUserMsg = messages.filter((m) => m.role === 'user').pop()?.content || '';
    const today = new Date().toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });

    let fallbackText = '';

    if (lastUserMsg.toLowerCase().includes('bezwaarschrift') || lastUserMsg.toLowerCase().includes('recurso') || lastUserMsg.toLowerCase().includes('belastingdienst')) {
      fallbackText = `Belastingdienst
Postbus 2500
6401 DA Heerlen

Datum: ${today}
Betreft: Formeel Bezwaarschrift ingevolge de Algemene wet bestuursrecht (Awb)
Kenmerk: Aanslag / Beschikking Zorgtoeslag & Inkomstenbelasting

Geachte inspecteur der belastingen,

Namens ondergetekende cliënt(e) teken ik hierbij formeel bezwaar aan tegen de door uw dienst afgegeven beschikking / aanslag met betrekking tot het afgelopen belastingtijdvak.

MOTIVERING VAN HET BEZWAAR:
1. Feitelijke grondslag: De in de beschikking gehanteerde grondslag voor het toetsingsinkomen strookt niet met de daadwerkelijk genoten inkomsten uit tegenwoordige arbeid.
2. Bewijsstukken: Bijgaand treft u aan de loonstroken en jaaropgaven waaruit genoegzaam blijkt dat het verzamelinkomen lager is vastgesteld dan aangenomen.
3. Rechtsgrond Awb: Op grond van artikel 7:1 e.v. van de Algemene wet bestuursrecht verzoeken wij u om volledige heroverweging van het bestreden besluit.

CONCLUSIE EN VERZOEK:
Wij verzoeken u met inachtneming van het bovenstaande het bezwaar gegrond te verklaren en een herziene beschikking vast te stellen. Tevens verzoeken wij om vergoeding van de in bezwaar gemaakte kosten conform het Besluit proceskosten bestuursrecht indien van toepassing.

In afwachting van uw schriftelijke ontvangstbevestiging en nadere beslissing,

Hoogachtend,

NexusGest Advies & Gestoría B.V.
Afdeling Fiscale & Juridische Zaken
KvK: 89123847 · Eindhoven
info@nexusgest.nl | www.nexusgest.nl`;
    } else if (lastUserMsg.toLowerCase().includes('machtiging') || lastUserMsg.toLowerCase().includes('digid') || lastUserMsg.toLowerCase().includes('autorizacion')) {
      fallbackText = `VOLMACHT EN VERKLARING VAN VERTEGENWOORDIGING
(Machtiging DigiD & Fiscale Zaken)

Datum van afgifte: ${today}
Plaats: Eindhoven, Nederland

1. VOLMACHTGEVER (Cliënt):
Naam: Cliënt NexusGest
BSN: 982145672
Woonplaats: Eindhoven

2. GEVOLMACHTIGDE (Gestoría / Belastingadviseur):
NexusGest Advies B.V.
KvK-nummer: 89123847
Vertegenwoordigd door: Rony P.

3. OMVANG VAN DE VOLMACHT:
Ondergetekende verleent hierbij volledige volmacht aan NexusGest B.V. om hem/haar te vertegenwoordigen bij de Belastingdienst, Toeslagen, SVB, CAK en UWV. Deze machtiging omvat:
a) Het opvragen en inzien van fiscale gegevens en aanslagen.
b) Het indienen van belastingaangiften (M-Form, P-Form, C-Form) en verzoeken om voorlopige teruggaaf.
c) Het indienen van bezwaar- en beroepschriften conform Awb.
d) Het beheren van DigiD Machtigingen namens volmachtgever.

Handtekening volmachtgever:                        Handtekening gemachtigde:
_______________________                            _______________________`;
    } else {
      fallbackText = `NexusGest Legal & Document Assistant (Modo Asesor Holandés)
Datum: ${today}

RESUMEN Y ANÁLISIS DE LA CONSULTA:
Hemos analizado la información aportada conforme a la normativa legal y administrativa de los Países Bajos (Algemene wet bestuursrecht - Awb / Belastingdienst).

PUNTOS CLAVE:
1. Procedimiento aplicable: Gestión administrativa y representación fiscal ante organismos oficiales neerlandeses.
2. Plazos legales: Recuerde que el plazo legal para la interposición de escritos y recursos (bezwaar) ante la administración tributaria es con carácter general de 6 semanas naturales desde la fecha de notificación.
3. Documentación obligatoria: BSN, documento de identidad en vigor (DNI/Pasaporte), Jaaropgaaf o nóminas recientes, y copia de la resolución oficial.

[Nota: Este documento ha sido generado en modo plantilla legal local. Para conectar modelos avanzados de IA en tiempo real (GPT-4o, Claude 3.5, DeepSeek), configura tu API Key y URL en el botón superior ⚙️ 'Configurar IA'].`;
    }

    return NextResponse.json({
      success: true,
      text: fallbackText,
      modelUsed: 'NexusGest Dutch Legal Heuristic Engine (Local Fallback)',
      isFallback: true,
      isLiveAI: false,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error interno al procesar la solicitud de IA',
      },
      { status: 500 }
    );
  }
}
