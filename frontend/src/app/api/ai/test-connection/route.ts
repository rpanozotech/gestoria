import { NextResponse } from 'next/server';

function normalizeChatUrl(rawUrl?: string): string {
  let url = (rawUrl || 'https://api.openai.com/v1').trim().replace(/\/+$/, '');
  if (url.endsWith('/chat/completions')) {
    return url;
  }
  return `${url}/chat/completions`;
}

export async function POST(request: Request) {
  const startTime = Date.now();
  try {
    const body = await request.json();
    const { apiKey, apiUrl, model = 'gpt-4o-mini' } = body;

    const key = apiKey || process.env.OPENAI_API_KEY;
    const isLocalOllama = (apiUrl || '').includes('localhost') || (apiUrl || '').includes('127.0.0.1');

    if (!key && !isLocalOllama) {
      return NextResponse.json(
        {
          success: false,
          error: 'No se ha proporcionado ninguna API Key. Introduce tu clave o configura OPENAI_API_KEY.',
        },
        { status: 400 }
      );
    }

    const endpoint = normalizeChatUrl(apiUrl);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (key && key.trim()) {
      headers['Authorization'] = `Bearer ${key.trim()}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        model: model.trim() || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a test ping for API connectivity verification.' },
          { role: 'user', content: 'Respond with the word OK.' },
        ],
        max_tokens: 10,
        temperature: 0.1,
      }),
    });

    clearTimeout(timeoutId);
    const latencyMs = Date.now() - startTime;

    if (!res.ok) {
      let errMessage = `Error HTTP ${res.status}: ${res.statusText}`;
      try {
        const errJson = await res.json();
        if (errJson?.error?.message) {
          errMessage = errJson.error.message;
        } else if (typeof errJson === 'string') {
          errMessage = errJson;
        }
      } catch {
        // no readable json
      }

      return NextResponse.json(
        {
          success: false,
          status: res.status,
          error: errMessage,
          latencyMs,
          endpoint,
        },
        { status: res.status >= 400 && res.status < 600 ? res.status : 500 }
      );
    }

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content?.trim() || 'OK';

    return NextResponse.json({
      success: true,
      message: 'Conexión con el proveedor de IA establecida correctamente.',
      latencyMs,
      modelUsed: model,
      reply,
      endpoint,
    });
  } catch (error: any) {
    const latencyMs = Date.now() - startTime;
    const isTimeout = error.name === 'AbortError';
    return NextResponse.json(
      {
        success: false,
        error: isTimeout
          ? 'Tiempo de espera agotado (12s). Comprueba que la URL sea accesible.'
          : error.message || 'Error de red o conexión al endpoint de IA',
        latencyMs,
      },
      { status: 500 }
    );
  }
}
