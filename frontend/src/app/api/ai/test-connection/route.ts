import { NextResponse } from 'next/server';
import { validarEndpointIA, normalizeChatUrl, fetchConRedireccionesSeguras, EndpointNoPermitido } from '@/lib/ai-endpoint-guard';
import { exigeSesionGestor } from '@/lib/server-auth';

export async function POST(request: Request) {
  const startTime = Date.now();

  // Sin sesion no se ejecuta nada. Este endpoint hace un fetch a una URL que
  // elige el llamante, con el Authorization de OPENAI_API_KEY del servidor, y
  // devuelve el cuerpo de la respuesta: sin esta comprobacion es SSRF con
  // lectura de respuesta y robo de la clave, abierto a cualquiera.
  const noAutorizado = exigeSesionGestor(request);
  if (noAutorizado) return noAutorizado;

  try {
    const body = await request.json();
    const { apiKey, apiUrl, model = 'gpt-4o-mini' } = body;

    // Validar ANTES de construir el endpoint ni de hacer fetch. Sin esto, el
    // body decide a donde va la peticion del servidor.
    let destino: URL;
    try {
      destino = validarEndpointIA(apiUrl, { permitirHostsLocales: true });
    } catch (error) {
      if (error instanceof EndpointNoPermitido) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 400 }
        );
      }
      throw error;
    }

    const key = apiKey || process.env.OPENAI_API_KEY;
    const esOllamaLocal = destino.port === '11434';

    if (!key && !esOllamaLocal) {
      return NextResponse.json(
        {
          success: false,
          error: 'No se ha proporcionado ninguna API Key. Introduce tu clave o configura OPENAI_API_KEY.',
        },
        { status: 400 }
      );
    }

    const endpoint = normalizeChatUrl(destino.toString());

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (key && key.trim()) {
      headers['Authorization'] = `Bearer ${key.trim()}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout

    const res = await fetchConRedireccionesSeguras(endpoint, {
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

    // Una redireccion bloqueada por el guard no es un error de red: es un
    // intento de acceso bloqueado, y merece un 400 explicito en vez de un 500
    // que invite a reintentar.
    if (error instanceof EndpointNoPermitido) {
      return NextResponse.json(
        { success: false, error: error.message, latencyMs },
        { status: 400 }
      );
    }

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
