'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { exportDocumentToDocx } from '@/lib/docxExport';
import { apiFetch } from '@/lib/api';
import { getToken } from '@/lib/session';

/**
 * Cabeceras para los route handlers /api/ai/*.
 *
 * Esos handlers exigen sesion de gestor (ver lib/server-auth.ts): hacen fetch
 * a una URL que elige el usuario y adjuntan OPENAI_API_KEY del servidor. Sin
 * esta cabecera, el servidor responde 401.
 *
 * El token va en la cabecera Authorization en vez de en el body para no
 * repetirlo en cada llamada ni arriesgarlo a que quede en un log.
 */
function aiAuthHeaders(): Record<string, string> {
  const token = getToken();
  return token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { 'Content-Type': 'application/json' };
}

// Presets de proveedores de IA (sincronizados con el resto del sistema)
const AI_PRESETS = [
  {
    id: 'openai',
    name: 'OpenAI Oficial',
    badge: 'Recomendado',
    defaultUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'],
    keyHelp: 'Obtén tu clave en platform.openai.com/api-keys',
    keyPlaceholder: 'sk-proj-...',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter (Claude, Llama, etc.)',
    badge: 'Multi-Modelo',
    defaultUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'anthropic/claude-3.5-sonnet',
    models: ['anthropic/claude-3.5-sonnet', 'deepseek/deepseek-chat', 'meta-llama/llama-3.3-70b-instruct'],
    keyHelp: 'Obtén tu clave en openrouter.ai/keys',
    keyPlaceholder: 'sk-or-v1-...',
  },
  {
    id: 'groq',
    name: 'Groq Cloud',
    badge: 'Ultra Rápido',
    defaultUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
    keyHelp: 'Claves gratuitas en console.groq.com/keys',
    keyPlaceholder: 'gsk_...',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    badge: 'Económico',
    defaultUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    keyHelp: 'Obtén tu clave en platform.deepseek.com/api_keys',
    keyPlaceholder: 'sk-...',
  },
  {
    id: 'ollama',
    name: 'Ollama Local (Sin clave / Privado)',
    badge: '100% Local',
    defaultUrl: 'http://ollama:11434/v1',
    defaultModel: 'llama3.2:1b',
    models: ['llama3.2:1b', 'qwen2.5-coder:1.5b', 'qwen3:1.7b'],
    keyHelp: 'Ejecuta Ollama en tu equipo local con ollama run llama3',
    keyPlaceholder: 'No se requiere clave (dejar en blanco o test)',
  },
  {
    id: 'custom',
    name: 'URL Personalizada / Proxy Propio',
    badge: 'Custom',
    defaultUrl: 'https://api.tu-servidor.com/v1',
    defaultModel: 'modelo-personalizado',
    models: ['modelo-personalizado'],
    keyHelp: 'Cualquier endpoint compatible con la API de OpenAI',
    keyPlaceholder: 'Tu clave de autorización Bearer',
  },
];

interface AIConfig {
  provider: string;
  apiUrl: string;
  apiKey: string;
  model: string;
}

const DEFAULT_CONFIG: AIConfig = {
  provider: 'ollama',
  apiUrl: 'http://ollama:11434/v1',
  apiKey: '',
  model: 'llama3.2:1b',
};

export default function ChatIAPage() {
  const router = useRouter();

  // Configuración de IA
  const [config, setConfig] = useState<AIConfig>(DEFAULT_CONFIG);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; latencyMs?: number } | null>(null);

  // Visibilidad del panel de atajos (para dar 100% de ancho total si el usuario lo desea)
  const [showTopicsSidebar, setShowTopicsSidebar] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      setShowTopicsSidebar(true);
    }
  }, []);

  // Clientes siempre cargados desde PostgreSQL.
  const [clients, setClients] = useState<any[]>([]);
  useEffect(() => { apiFetch('/clients').then((res) => res.ok ? res.json() : Promise.reject(new Error('clients'))).then((data) => setClients(Array.isArray(data.clients) ? data.clients : [])).catch(() => setClients([])); }, []);

  // Estados del Chat
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string; timestamp?: string }>>([
    {
      role: 'assistant',
      content: `¡Bienvenido al **Chat Asistente Integral NexusGest IA**!

Tengo **acceso en tiempo real a todo el directorio de clientes**, expedientes, documentos, presupuestos, facturas y agenda.

**Acciones que puedo ejecutar de forma autónoma:**
1. **Emitir Facturas**: *"Crea una factura de 180€ para Cliente seleccionado por M-Form"*
2. **Generar Presupuestos**: *"Genera un presupuesto de 95€ para Cliente seleccionado"*
3. **Agendar Citas**: *"Agenda una llamada para Cliente seleccionado el 18 de octubre a las 16:00"*
4. **Archivar Documentos / Informes**: *"Redacta un dictamen fiscal para Cliente seleccionado y archívalo en sus documentos"*
5. **Modificar Clientes**: *"Actualiza el teléfono de Cliente seleccionado a +34 654 000 111"*
6. **Asesoría Legal & Fiscal**: Consultas sobre *Awb, Belastingdienst, Toeslagen, KVK y CAK*.

Escribe tu instrucción u orden en la barra inferior para ejecutarla.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatSending, setIsChatSending] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  // Referencias para auto-scroll suave
  const chatScrollContainerRef = useRef<HTMLDivElement>(null);
  const chatBottomAnchorRef = useRef<HTMLDivElement>(null);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Cargar configuración guardada
  useEffect(() => {
    try {
      const savedConfig = localStorage.getItem('nexusgest_ai_config');
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        if (!parsed.apiKey && (parsed.provider === 'openai' || parsed.apiUrl === 'https://api.openai.com/v1')) {
          setConfig({ provider: 'ollama', apiUrl: 'http://ollama:11434/v1', apiKey: '', model: 'llama3.2:1b' });
        } else {
          setConfig(parsed);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Función de scroll automático suave continuo
  const scrollToBottom = (smooth = true) => {
    if (chatScrollContainerRef.current) {
      chatScrollContainerRef.current.scrollTo({
        top: chatScrollContainerRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto',
      });
    }
  };

  // Efecto streaming mecanografiado con auto-scroll continuo
  const streamResponseText = (fullText: string) => {
    setIsStreaming(true);
    let currentIndex = 0;
    const stepSize = Math.max(3, Math.ceil(fullText.length / 75));

    // Añadir mensaje asistente vacío
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChatMessages((prev) => [...prev, { role: 'assistant', content: '', timestamp: nowTime }]);
    setTimeout(() => scrollToBottom(true), 25);

    const intervalId = setInterval(() => {
      currentIndex += stepSize;
      if (currentIndex >= fullText.length) {
        clearInterval(intervalId);
        setChatMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: 'assistant', content: fullText, timestamp: nowTime };
          return next;
        });
        setIsChatSending(false);
        setIsStreaming(false);
        setTimeout(() => scrollToBottom(true), 60);
      } else {
        const partial = fullText.slice(0, currentIndex);
        setChatMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: 'assistant', content: partial, timestamp: nowTime };
          return next;
        });
        // Scroll continuo en modo scroll conforme llega el texto
        scrollToBottom(true);
      }
    }, 25);
  };

  // Enviar mensaje
  const handleSendChatMessage = async (presetPrompt?: string) => {
    const textToSend = (presetPrompt || chatInput).trim();
    if (!textToSend || isChatSending || isStreaming) return;

    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newMessages = [...chatMessages, { role: 'user' as const, content: textToSend, timestamp: nowTime }];
    setChatMessages(newMessages);
    if (!presetPrompt) setChatInput('');
    setIsChatSending(true);

    setTimeout(() => scrollToBottom(true), 30);

    // Procesamiento de órdenes sobre clientes (Facturas, Presupuestos, Citas, Documentos, Modificaciones)
    const lower = textToSend.toLowerCase();
    const currentClients = clients;

    const matchedClient = currentClients.find((c: any) => {
      const fn = (c.full_name || '').toLowerCase();
      const first = fn.split(' ')[0];
      return lower.includes(fn) || (first.length > 3 && lower.includes(first));
    });

    if (matchedClient && (
      lower.includes('factura') || lower.includes('facturar') ||
      lower.includes('presupuesto') || lower.includes('presupuestar') ||
      lower.includes('cita') || lower.includes('llamada') || lower.includes('agendar') ||
      lower.includes('documento') || lower.includes('informe') || lower.includes('archivar') ||
      lower.includes('modificar') || lower.includes('cambiar') || lower.includes('actualizar')
    )) {
      // Todas las acciones del asistente se persisten primero en el backend.
      // La respuesta visual solo se muestra después de una confirmación HTTP.
      try {
        let persistedReply = '';
        const dossierId = Array.isArray(matchedClient.dossiers) ? matchedClient.dossiers[0]?.id : undefined;
        if (lower.includes('factura') || lower.includes('facturar')) {
          const amountMatch = textToSend.match(/(\d+(?:[.,]\d+)?)\s*€?/);
          const amount = amountMatch ? parseFloat(amountMatch[1].replace(',', '.')) : 180;
          const quoteResponse = await apiFetch('/quotes', { method: 'POST', body: JSON.stringify({
            client_id: matchedClient.id, dossier_id: dossierId || null,
            items: [{ description: 'Factura emitida desde Chat IA', quantity: 1, unit_price: amount }],
            notes: 'Creada desde Chat IA',
          }) });
          const quoteData = await quoteResponse.json().catch(() => ({}));
          if (!quoteResponse.ok || !quoteData.quote?.id) throw new Error(quoteData.error || 'No se pudo crear el presupuesto previo.');
          const invoiceResponse = await apiFetch(`/quotes/${quoteData.quote.id}/convert`, { method: 'POST' });
          const invoiceData = await invoiceResponse.json().catch(() => ({}));
          if (!invoiceResponse.ok) throw new Error(invoiceData.error || 'No se pudo convertir a factura.');
          persistedReply = `✅ Factura creada y guardada para ${matchedClient.full_name}. Total final (IVA incluido): € ${Number(invoiceData.invoice?.total || amount).toFixed(2)}.`;
        } else if (lower.includes('presupuesto') || lower.includes('presupuestar')) {
          const amountMatch = textToSend.match(/(\d+(?:[.,]\d+)?)\s*€?/);
          const amount = amountMatch ? parseFloat(amountMatch[1].replace(',', '.')) : 120;
          const response = await apiFetch('/quotes', { method: 'POST', body: JSON.stringify({
            client_id: matchedClient.id, dossier_id: dossierId || null,
            items: [{ description: 'Presupuesto creado desde Chat IA', quantity: 1, unit_price: amount }],
            notes: 'Creado desde Chat IA',
          }) });
          const data = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(data.error || 'No se pudo crear el presupuesto.');
          persistedReply = `✅ Presupuesto ${data.quote?.code || ''} creado y guardado para ${matchedClient.full_name}. Total final (IVA incluido): € ${Number(data.quote?.total || amount).toFixed(2)}.`;
        } else if (lower.includes('cita') || lower.includes('llamada') || lower.includes('agendar')) {
          const modality = lower.includes('presencial') ? 'presencial' : lower.includes('meet') || lower.includes('video') ? 'online_meet' : 'llamada';
          const response = await apiFetch('/appointments', { method: 'POST', body: JSON.stringify({
            client_id: matchedClient.id, service_id: null, source: 'chat-ia', full_name: matchedClient.full_name,
            email: matchedClient.email, phone: matchedClient.phone, title: `Cita con ${matchedClient.full_name}`,
            appointment_date: new Date().toISOString().slice(0, 10), appointment_time: '16:00', duration_minutes: 30, modality,
            notes: 'Cita creada desde Chat IA',
          }) });
          const data = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(data.error || 'No se pudo crear la cita.');
          persistedReply = `✅ Cita guardada en la agenda para ${matchedClient.full_name}.`;
        } else if (lower.includes('documento') || lower.includes('informe') || lower.includes('archivar')) {
          const content = `Documento creado desde Chat IA
Cliente: ${matchedClient.full_name}
Fecha: ${new Date().toLocaleDateString('es-ES')}

Solicitud: ${textToSend}`;
          const response = await apiFetch('/documents/text', { method: 'POST', body: JSON.stringify({
            client_id: matchedClient.id, dossier_id: dossierId || null, category: 'nota_ia', file_name: `Nota_IA_${Date.now()}.txt`, content,
          }) });
          const data = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(data.error || 'No se pudo archivar el documento.');
          persistedReply = `✅ Documento archivado en la ficha de ${matchedClient.full_name}.`;
        } else {
          const phoneMatch = textToSend.match(/(\+?\d[\d\s-]{7,}\d)/);
          if (!phoneMatch) throw new Error('Indica una modificación concreta para el cliente.');
          const response = await apiFetch(`/clients/${matchedClient.id}`, { method: 'PUT', body: JSON.stringify({ phone: phoneMatch[1].trim() }) });
          if (!response.ok) throw new Error('No se pudo actualizar el cliente.');
          persistedReply = `✅ Datos de ${matchedClient.full_name} actualizados en PostgreSQL.`;
        }
        streamResponseText(persistedReply);
      } catch (error) {
        streamResponseText(`❌ ${error instanceof Error ? error.message : 'La acción no se pudo guardar.'}`);
      }
      return;
    }

    try {
      const clientsContext = currentClients.map((c: any) => `- Cliente: ${c.full_name}, BSN: ${c.bsn || 'Sin registrar'}, Tel: ${c.phone}, Email: ${c.email}, Ciudad: ${c.city}, DigiD: ${c.digid_status}, Trámites: ${(c.dossiers || []).map((d: any) => d.title).join('; ') || 'Ninguno'}, Facturas: ${(c.invoices || []).length}, Presupuestos: ${(c.quotes || []).length}, Documentos: ${(c.documents || []).length}`).join('\n');

      const systemPrompt = `Eres un asesor fiscal y redactor legal experto de NexusGest, una prestigiosa gestoría en los Países Bajos. Conoces a fondo la legislación neerlandesa (Algemene wet bestuursrecht - Awb, Wet inkomstenbelasting 2001, Toeslagen, Zorgverzekeringswet, requisitos KVK y normativa IND).
Tienes acceso a los clientes actuales de la gestoría:
${clientsContext}
Responde de forma estructurada, profesional, directa y lista para usar. Puedes proponer o ejecutar acciones sobre sus facturas, presupuestos, citas o documentos.`;

      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: aiAuthHeaders(),
        body: JSON.stringify({
          apiKey: config.apiKey,
          apiUrl: config.apiUrl,
          model: config.model,
          systemPrompt,
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          temperature: 0.3,
        }),
      });

      const data = await res.json();
      if (data.text) {
        streamResponseText(data.text);
      } else {
        setChatMessages([
          ...newMessages,
          { role: 'assistant', content: 'No se recibió respuesta válida del motor de IA.', timestamp: nowTime },
        ]);
        setIsChatSending(false);
      }
    } catch {
      setChatMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: 'No fue posible conectar con la IA. Verifica tu API Key y URL en el botón Configurar IA.',
          timestamp: nowTime,
        },
      ]);
      setIsChatSending(false);
    }
  };

  // Exportar conversación a Word (.docx)
  const handleExportChatToWord = async () => {
    try {
      const transcript = chatMessages
        .map((m) => `[${m.timestamp || ''}] ${m.role === 'user' ? 'GESTOR' : 'ASISTENTE NEXUSGEST IA'}:\n${m.content}`)
        .join('\n\n_________________________________________\n\n');

      await exportDocumentToDocx({
        title: 'Consulta_Legal_NexusGest_IA',
        clientName: 'Asesor_Legal',
        content: transcript,
      });
      showToast('¡Historial de chat exportado a Word (.docx)!');
    } catch (err: any) {
      alert(`Error al exportar Word: ${err.message}`);
    }
  };

  // Guardar configuración de IA
  const handleSaveConfig = () => {
    try {
      localStorage.setItem('nexusgest_ai_config', JSON.stringify(config));
      showToast('Configuración de IA guardada y activada');
      setShowConfigModal(false);
    } catch (e) {
      console.error(e);
    }
  };

  // Test de conexión a la IA
  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/ai/test-connection', {
        method: 'POST',
        headers: aiAuthHeaders(),
        body: JSON.stringify({
          apiKey: config.apiKey,
          apiUrl: config.apiUrl,
          model: config.model,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({
          success: true,
          message: `¡Conexión exitosa con ${config.model}! Latencia: ${data.latencyMs} ms.`,
          latencyMs: data.latencyMs,
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || 'Error de conexión. Verifica la URL y la API Key.',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `Error de red: ${err.message}`,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSelectPreset = (presetId: string) => {
    const preset = AI_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setConfig((prev) => ({
      ...prev,
      provider: preset.id,
      apiUrl: preset.defaultUrl,
      model: preset.defaultModel,
    }));
    setTestResult(null);
  };

  const atajosCategorizados = [
    {
      categoria: 'Gestión Integral de Clientes (Acciones IA)',
      icono: 'manage_accounts',
      preguntas: [
        'Crea una factura de 180€ para Cliente seleccionado por M-Form',
        'Genera un presupuesto de 95€ para Cliente seleccionado por Zorgtoeslag',
        'Agenda una llamada para Cliente seleccionado el 18 de octubre a las 16:00',
        'Genera un informe fiscal para Cliente seleccionado y archívalo en sus documentos',
      ],
    },
    {
      categoria: 'Fiscal & Belastingdienst',
      icono: 'gavel',
      preguntas: [
        '¿Cuál es el plazo legal exacto para presentar un Bezwaarschrift ante Belastingdienst?',
        'Redacta un escrito solicitando prórroga para la declaración del M-Form',
        '¿Cómo justificar discrepancias en el toetsingsinkomen según el art. 7:1 Awb?',
      ],
    },
    {
      categoria: 'Subsidios (Toeslagen)',
      icono: 'payments',
      preguntas: [
        'Requisitos de ingresos máximos y patrimonio para cobrar Zorgtoeslag',
        '¿Cómo impugnar una devolución exigida de Huurtoeslag por contrato de alquiler?',
        'Procedimiento oficial para notificar cuenta bancaria IBAN a Toeslagen',
      ],
    },
    {
      categoria: 'Sanidad & CAK',
      icono: 'medical_services',
      preguntas: [
        '¿Cómo recurrir una multa del CAK por no tener seguro holandés si tengo póliza europea?',
        'Documentos necesarios para demostrar exención médica ante HollandZorg',
      ],
    },
    {
      categoria: 'Autónomos & KVK',
      icono: 'store',
      preguntas: [
        'Diferencias fiscales y responsabilidades entre Eenmanszaak y BV en Holanda',
        '¿Cómo solicitar la exención de IVA bajo la regla KOR (Kleineondernemersregeling)?',
      ],
    },
  ];

  return (
    <div className="w-full flex flex-col h-full min-h-0 space-y-3">
      {/* Toast de Notificaciones */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-indigo-500/40 animate-in fade-in duration-200 no-print">
          <span className="material-symbols-outlined text-emerald-400 text-lg">check_circle</span>
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header Superior - Ancho Completo */}
      <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-surface-container shrink-0 no-print">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-700 to-blue-600 text-white flex items-center justify-center shadow-sm">
            <span className="material-symbols-outlined text-[20px]">forum</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-on-surface">Chat Asistente Legal IA</h1>
              {config.apiKey ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 text-[10px] font-semibold rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>{config.model}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-700 text-[10px] font-semibold rounded-full">
                  <span className="material-symbols-outlined text-[12px]">info</span>
                  <span>Modo Local</span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-on-surface-variant">
              Asesoría legal, fiscal y administrativa neerlandesa (Awb / Belastingdienst / Toeslagen).
            </p>
          </div>
        </div>

        {/* Acciones del Header */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* Alternar visibilidad del panel de atajos */}
          <button
            onClick={() => setShowTopicsSidebar(!showTopicsSidebar)}
            className={`h-8 px-2.5 sm:px-3 rounded-lg text-xs font-semibold flex items-center gap-1 sm:gap-1.5 transition-colors border shadow-xs ${
              showTopicsSidebar
                ? 'bg-surface border-outline-variant text-on-surface hover:bg-surface-container'
                : 'bg-secondary/10 border-secondary/30 text-secondary hover:bg-secondary/20'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">
              {showTopicsSidebar ? 'left_panel_close' : 'left_panel_open'}
            </span>
            <span className="hidden sm:inline">{showTopicsSidebar ? 'Ocultar Temas' : 'Mostrar Temas'}</span>
            <span className="sm:hidden">Temas</span>
          </button>

          {/* Enlace a Asistente de Documentos */}
          <Link
            href="/crm/documentos-ia"
            className="h-8 px-2.5 sm:px-3 bg-surface hover:bg-surface-container border border-outline-variant text-on-surface text-xs font-semibold rounded-lg flex items-center gap-1 sm:gap-1.5 transition-colors shadow-xs"
          >
            <span className="material-symbols-outlined text-[16px] text-secondary">document_scanner</span>
            <span className="hidden md:inline">Documentos & Plantillas</span>
            <span className="md:hidden">Plantillas</span>
          </Link>

          {/* Exportar a Word */}
          <button
            onClick={handleExportChatToWord}
            title="Exportar conversación a Microsoft Word (.docx)"
            className="h-8 px-2.5 sm:px-3 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1 sm:gap-1.5 transition-colors shadow-xs"
          >
            <span className="material-symbols-outlined text-[16px]">file_open</span>
            <span className="hidden sm:inline">Exportar Word</span>
            <span className="sm:hidden">Word</span>
          </button>

          {/* Imprimir / PDF */}
          <button
            onClick={() => window.print()}
            title="Imprimir o guardar en PDF"
            className="h-8 px-2.5 sm:px-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1 sm:gap-1.5 transition-colors shadow-xs"
          >
            <span className="material-symbols-outlined text-[16px]">print</span>
            <span className="hidden sm:inline">Imprimir / PDF</span>
            <span className="sm:hidden">PDF</span>
          </button>

          {/* Configurar IA */}
          <button
            onClick={() => {
              setTestResult(null);
              setShowConfigModal(true);
            }}
            className="h-8 px-2.5 sm:px-3 bg-gradient-to-r from-slate-900 to-indigo-900 hover:from-slate-800 hover:to-indigo-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1 sm:gap-1.5 shadow-sm transition-all border border-indigo-700/40"
          >
            <span className="material-symbols-outlined text-[16px] text-amber-300">tune</span>
            <span className="hidden sm:inline">Configurar IA</span>
            <span className="sm:hidden">IA</span>
          </button>
        </div>
      </div>

      {/* ÁREA DE TRABAJO A PANTALLA COMPLETA */}
      <div className="w-full flex-1 min-h-0 flex flex-col lg:flex-row gap-4 items-stretch overflow-hidden">
        {/* PANEL LATERAL DE CONSULTAS FRECUENTES (OPCIONAL/COLAPSABLE) */}
        {showTopicsSidebar && (
          <aside className="w-full lg:w-80 xl:w-96 shrink-0 flex flex-col max-h-56 lg:max-h-none lg:h-full bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant shadow-xs overflow-hidden no-print animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container shrink-0">
              <h3 className="font-bold text-xs text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-secondary text-base">lightbulb</span>
                <span>Consultas Frecuentes de Gestoría</span>
              </h3>
              <button
                onClick={() => setShowTopicsSidebar(false)}
                title="Cerrar panel de temas para ver el chat a pantalla completa"
                className="p-1 hover:bg-surface-container rounded text-outline hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 mt-3 scroll-smooth">
              {atajosCategorizados.map((cat, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-outline">
                    <span className="material-symbols-outlined text-[14px] text-secondary">{cat.icono}</span>
                    <span>{cat.categoria}</span>
                  </div>
                  <div className="space-y-1">
                    {cat.preguntas.map((p, pIdx) => (
                      <button
                        key={pIdx}
                        type="button"
                        onClick={() => handleSendChatMessage(p)}
                        disabled={isChatSending || isStreaming}
                        className="w-full text-left p-2 rounded-lg bg-surface hover:bg-surface-container border border-outline-variant/60 text-[11px] text-on-surface leading-tight transition-colors disabled:opacity-50"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {/* Tarjeta de recordatorio legal */}
              <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl text-xs space-y-1 text-indigo-950 mt-2">
                <div className="font-bold flex items-center gap-1 text-[11px]">
                  <span className="material-symbols-outlined text-[15px] text-indigo-700">policy</span>
                  <span>Plazo Legal Awb:</span>
                </div>
                <p className="text-[10px] leading-relaxed text-indigo-900">
                  Los recursos ante Belastingdienst / Toeslagen deben presentarse dentro del plazo improrrogable de{' '}
                  <strong>6 semanas naturales</strong> desde la fecha de notificación oficial.
                </p>
              </div>
            </div>
          </aside>
        )}

        {/* VENTANA PRINCIPAL DE CHAT (EXPANDIDA AL 100% DE LA PANTALLA) */}
        <section className="flex-1 min-w-0 flex flex-col h-full bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-xs overflow-hidden print-area">
          {/* Cabecera interna del chat */}
          <div className="px-4 py-2.5 bg-surface border-b border-surface-container flex items-center justify-between shrink-0 no-print">
            <div className="flex items-center gap-2">
              {!showTopicsSidebar && (
                <button
                  onClick={() => setShowTopicsSidebar(true)}
                  className="p-1 hover:bg-surface-container rounded text-secondary flex items-center gap-1 text-xs font-semibold"
                  title="Mostrar panel de consultas frecuentes"
                >
                  <span className="material-symbols-outlined text-[18px]">left_panel_open</span>
                  <span className="hidden sm:inline">Temas de Gestoría</span>
                </button>
              )}
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-bold text-xs text-on-surface">Conversación en Vivo</span>
              <span className="text-[10px] text-outline font-mono-data hidden sm:inline">({config.model})</span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  setChatMessages([
                    {
                      role: 'assistant',
                      content: 'Conversación reiniciada. ¿Qué consulta o redacción legal de Países Bajos deseas realizar?',
                      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    },
                  ]);
                }}
                title="Reiniciar chat"
                className="px-2.5 py-1 text-xs text-outline hover:text-on-surface hover:bg-surface-container rounded-md flex items-center gap-1 transition-colors"
              >
                <span className="material-symbols-outlined text-[15px]">refresh</span>
                <span className="hidden sm:inline">Reiniciar chat</span>
              </button>
            </div>
          </div>

          {/* VISOR DE MENSAJES CON AUTO-SCROLL SUAVE CONTINUO */}
          <div
            ref={chatScrollContainerRef}
            className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4 scroll-smooth bg-surface/30 print:bg-white print:border-none"
          >
            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-3 w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-700 to-blue-600 text-white flex-shrink-0 flex items-center justify-center text-xs font-bold shadow-sm no-print">
                    IA
                  </div>
                )}

                <div
                  className={`flex flex-col gap-1 ${
                    msg.role === 'user'
                      ? 'items-end max-w-[85%] lg:max-w-[75%]'
                      : 'items-start max-w-[92%] lg:max-w-[85%]'
                  }`}
                >
                  <div
                    className={`p-4 rounded-2xl text-xs sm:text-[13px] leading-relaxed whitespace-pre-line shadow-xs ${
                      msg.role === 'user'
                        ? 'bg-secondary text-white rounded-br-none'
                        : 'bg-white border border-outline-variant/60 text-slate-800 rounded-bl-none'
                    }`}
                  >
                    {msg.content}
                    {/* Cursor parpadeante si se está escribiendo este mensaje en streaming */}
                    {isStreaming && idx === chatMessages.length - 1 && msg.role === 'assistant' && (
                      <span className="inline-block w-1.5 h-3.5 bg-indigo-600 ml-1 animate-pulse align-middle" />
                    )}
                  </div>

                  {/* Acciones y timestamp debajo del mensaje */}
                  <div className="flex items-center gap-2 px-1 text-[10px] text-outline no-print">
                    {msg.timestamp && <span>{msg.timestamp}</span>}
                    {msg.role === 'assistant' && msg.content && (
                      <>
                        <span>·</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(msg.content);
                            showToast('Respuesta copiada al portapapeles');
                          }}
                          className="hover:text-secondary flex items-center gap-0.5"
                        >
                          <span className="material-symbols-outlined text-[12px]">content_copy</span>
                          <span>Copiar</span>
                        </button>
                        <span>·</span>
                        <Link
                          href="/crm/documentos-ia"
                          className="hover:text-secondary font-semibold text-secondary flex items-center gap-0.5"
                          title="Llevar texto al Asistente de Documentos para redactar carta oficial"
                        >
                          <span className="material-symbols-outlined text-[12px]">edit_document</span>
                          <span>Usar en Documento</span>
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Animación de carga mientras la API responde */}
            {isChatSending && !isStreaming && (
              <div className="flex gap-3 justify-start no-print">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-700 to-blue-600 text-white flex-shrink-0 flex items-center justify-center text-xs font-bold animate-pulse">
                  IA
                </div>
                <div className="p-3 bg-white border border-outline-variant/60 rounded-2xl text-xs text-outline flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] animate-spin text-indigo-600">sync</span>
                  <span>{config.model} está analizando y redactando la respuesta...</span>
                </div>
              </div>
            )}

            <div ref={chatBottomAnchorRef} className="h-2 w-full" />
          </div>

          {/* FORMULARIO DE ENTRADA A PANTALLA COMPLETA */}
          <div className="p-3 sm:p-4 bg-surface-container-lowest border-t border-surface-container shrink-0 no-print">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendChatMessage();
              }}
              className="flex gap-2 w-full"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Escribe tu consulta legal o pide redactar un texto en neerlandés..."
                disabled={isChatSending || isStreaming}
                className="flex-1 h-11 px-4 border border-outline-variant rounded-xl bg-surface focus:border-secondary focus:outline-none text-xs sm:text-[13px] disabled:opacity-50 shadow-inner"
              />
              <button
                type="submit"
                disabled={isChatSending || isStreaming || !chatInput.trim()}
                className="h-11 px-5 bg-secondary hover:bg-blue-700 text-white rounded-xl transition-colors text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 shadow-sm"
              >
                <span>Enviar</span>
                <span className="material-symbols-outlined text-[17px]">send</span>
              </button>
            </form>
          </div>
        </section>
      </div>

      {/* ============================================================== */}
      {/* MODAL: CONFIGURACIÓN DE IA (API KEY & URL)                     */}
      {/* ============================================================== */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200 no-print">
          <div className="bg-surface-container-lowest max-w-2xl w-full rounded-2xl border border-outline-variant shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-indigo-900/50">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-amber-300 text-2xl">tune</span>
                <div>
                  <h3 className="font-bold text-base">Configuración de IA para NexusGest</h3>
                  <p className="text-[11px] text-indigo-200">
                    Añade o cambia tu API Key, Endpoint URL y modelo preferido
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors text-white/80 hover:text-white"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              <div>
                <label className="block text-outline uppercase font-semibold text-[10px] mb-2">
                  Selecciona tu Proveedor de IA o Preset
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {AI_PRESETS.map((p) => {
                    const isSelected = config.provider === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectPreset(p.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all relative ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/50 shadow-sm'
                            : 'border-outline-variant/60 hover:border-outline-variant bg-surface'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-[11px] text-on-surface truncate">{p.name}</span>
                        </div>
                        <span
                          className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                            isSelected ? 'bg-indigo-600 text-white' : 'bg-surface-container text-outline'
                          }`}
                        >
                          {p.badge}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-outline uppercase font-semibold text-[10px]">
                    API URL / Endpoint Base
                  </label>
                  <span className="text-[10px] text-outline">Debe ser compatible con OpenAI API</span>
                </div>
                <input
                  type="text"
                  value={config.apiUrl}
                  onChange={(e) => {
                    setConfig({ ...config, apiUrl: e.target.value });
                    setTestResult(null);
                  }}
                  placeholder="https://api.openai.com/v1"
                  className="w-full h-10 px-3 border border-outline-variant rounded-lg bg-surface font-mono-data text-xs focus:border-secondary focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-outline uppercase font-semibold text-[10px]">
                    API Key (Clave Secreta)
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="text-[11px] text-secondary hover:underline flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[13px]">
                      {showApiKey ? 'visibility_off' : 'visibility'}
                    </span>
                    <span>{showApiKey ? 'Ocultar clave' : 'Mostrar clave'}</span>
                  </button>
                </div>
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={config.apiKey}
                  onChange={(e) => {
                    setConfig({ ...config, apiKey: e.target.value });
                    setTestResult(null);
                  }}
                  placeholder={
                    AI_PRESETS.find((p) => p.id === config.provider)?.keyPlaceholder || 'Introduce tu clave secreta...'
                  }
                  className="w-full h-10 px-3 border border-outline-variant rounded-lg bg-surface font-mono-data text-xs focus:border-secondary focus:outline-none"
                />
                <p className="text-[10px] text-outline mt-1">
                  {AI_PRESETS.find((p) => p.id === config.provider)?.keyHelp ||
                    'Tu clave se guarda localmente en tu navegador de forma segura.'}
                </p>
              </div>

              <div>
                <label className="block text-outline uppercase font-semibold text-[10px] mb-1">
                  Nombre del Modelo
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={config.model}
                    onChange={(e) => {
                      setConfig({ ...config, model: e.target.value });
                      setTestResult(null);
                    }}
                    placeholder="gpt-4o-mini"
                    className="flex-1 h-10 px-3 border border-outline-variant rounded-lg bg-surface font-mono-data text-xs focus:border-secondary focus:outline-none"
                  />
                </div>

                {AI_PRESETS.find((p) => p.id === config.provider)?.models && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <span className="text-[10px] text-outline py-0.5">Sugeridos:</span>
                    {AI_PRESETS.find((p) => p.id === config.provider)?.models.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setConfig({ ...config, model: m })}
                        className={`text-[10px] font-mono-data px-2 py-0.5 rounded border transition-colors ${
                          config.model === m
                            ? 'bg-secondary text-white border-secondary'
                            : 'bg-surface hover:bg-surface-container border-outline-variant/60 text-outline'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {testResult && (
                <div
                  className={`p-3 rounded-lg border flex items-start gap-2.5 text-xs ${
                    testResult.success
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : 'bg-rose-50 border-rose-300 text-rose-900'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px] flex-shrink-0">
                    {testResult.success ? 'check_circle' : 'error'}
                  </span>
                  <div>
                    <div className="font-bold">{testResult.success ? 'Conexión Exitosa' : 'Fallo de Conexión'}</div>
                    <div className="text-[11px] mt-0.5">{testResult.message}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-surface border-t border-surface-container flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="w-full sm:w-auto h-10 px-4 rounded-lg border border-indigo-600 text-indigo-600 hover:bg-indigo-50 text-xs font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {isTesting ? 'hourglass_top' : 'speed'}
                </span>
                <span>{isTesting ? 'Comprobando endpoint...' : 'Probar Conexión Ahora'}</span>
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="flex-1 sm:flex-initial h-10 px-4 rounded-lg border border-outline-variant hover:bg-surface-container text-xs font-semibold text-outline"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  className="flex-1 sm:flex-initial h-10 px-5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">save</span>
                  <span>Guardar y Activar</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
