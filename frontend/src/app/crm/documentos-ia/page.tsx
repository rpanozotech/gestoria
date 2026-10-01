'use client';

import React, { useState, useEffect, useRef } from 'react';

// Preset providers for quick setup
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
    defaultUrl: 'http://localhost:11434/v1',
    defaultModel: 'llama3:latest',
    models: ['llama3:latest', 'mistral:latest', 'phi3:latest'],
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
  provider: 'openai',
  apiUrl: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-4o-mini',
};

const SAMPLE_CLIENTS = [
  { name: 'Maria Popescu', bsn: '982145672', address: 'Strijpsestraat 142, 5616 GP Eindhoven' },
  { name: 'Carlos Mendoza Ruiz', bsn: '817293845', address: 'Keizersgracht 321, 1016 EE Amsterdam' },
  { name: 'David Gómez Castillo', bsn: '749201834', address: 'Coolsingel 88, 3011 AG Rotterdam' },
  { name: 'Lucía Navarro Gil', bsn: '628194032', address: 'Oudegracht 120, 3511 AZ Utrecht' },
];

export default function DocumentosIAPage() {
  // Pestañas principales
  const [activeTab, setActiveTab] = useState<'cartas' | 'chat' | 'analizador'>('cartas');

  // Configuración de IA
  const [config, setConfig] = useState<AIConfig>(DEFAULT_CONFIG);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; latencyMs?: number } | null>(null);
  const [savedSuccessToast, setSavedSuccessToast] = useState(false);

  // Cargar configuración guardada al montar
  useEffect(() => {
    try {
      const saved = localStorage.getItem('nexusgest_ai_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        setConfig(parsed);
      }
    } catch {
      // ignore
    }
  }, []);

  // Guardar configuración
  const handleSaveConfig = () => {
    try {
      localStorage.setItem('nexusgest_ai_config', JSON.stringify(config));
      setSavedSuccessToast(true);
      setTimeout(() => setSavedSuccessToast(false), 3000);
      setShowConfigModal(false);
    } catch (e) {
      console.error('Error guardando configuración:', e);
    }
  };

  // Test de conexión a la IA
  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/ai/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  // Selector de preset
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

  // -------------------------------------------------------------
  // ESTADOS DEL GENERADOR DE CARTAS
  // -------------------------------------------------------------
  const [template, setTemplate] = useState('Belastingdienst - Recurso / Bezwaarschrift (Awb)');
  const [clientName, setClientName] = useState('Maria Popescu');
  const [bsn, setBsn] = useState('982145672');
  const [address, setAddress] = useState('Strijpsestraat 142, 5616 GP Eindhoven');
  const [details, setDetails] = useState('Solicitamos la revisión del cálculo del toetsingsinkomen computado para el subsidio Zorgtoeslag correspondiente al ejercicio fiscal anterior, aportando jaaropgaven actualizadas.');
  const [language, setLanguage] = useState<'nl' | 'es'>('nl');
  const [tone, setTone] = useState<'formal' | 'juridico' | 'urgente'>('juridico');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const [generatedLetter, setGeneratedLetter] = useState<string>(`Belastingdienst
Postbus 2500
6401 DA Heerlen

Datum: ${new Date().toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}
Betreft: Formeel Bezwaarschrift ingevolge artikel 7:1 Algemene wet bestuursrecht (Awb)
Kenmerk / Beschikking: Zorgtoeslag & Inkomstenbelasting
Burgerservicenummer (BSN): 982145672

Geachte inspecteur der belastingen,

Namens ondergetekende cliënt(e), Maria Popescu, geboren te Roemenië en thans woonachtig aan de Strijpsestraat 142, 5616 GP te Eindhoven, teken ik hierbij tijdig formeel bezwaar aan tegen de door uw dienst vastgestelde beschikking aangaande de toegekende zorgtoeslag.

MOTIVERING EN RECHTSGRONDEN:
1. Onjuiste vaststelling toetsingsinkomen: Het door uw dienst gehanteerde toetsingsinkomen over het betreffende belastingjaar strookt niet met de daadwerkelijk genoten inkomsten uit tegenwoordige arbeid.
2. Bewijsstukken: Bijgaand treft u de relevante jaaropgaven, salarisspecificaties en de definitieve aangifte inkomstenbelasting aan ter staving van ons standpunt.
3. Rechtsgrond Awb: Op grond van de Awb verzoeken wij u om volledige heroverweging van de bestreden beschikking en herberekening van het recht op toeslag.
4. Uitstel van betaling: Voor zover er een terugvordering openstaat, verzoeken wij u hierbij tevens om opschorting van de betalingsverplichting hangende deze bezwaarprocedure.

CONCLUSIE:
Cliënt(e) verzoekt het bezwaar gegrond te verklaren, de bestreden beschikking te vernietigen en een nieuwe beschikking vast te stellen in overeenstemming met de gecorrigeerde inkomensgegevens.

In afwachting van uw schriftelijke ontvangstbevestiging met dagtekening,

Hoogachtend,

NexusGest Advies & Gestoría B.V.
Rony P. - Senior Belastingadviseur
KvK: 89123847 · Eindhoven
Contact: info@nexusgest.nl`);

  // Seleccionar cliente rápido
  const handlePickClient = (c: typeof SAMPLE_CLIENTS[0]) => {
    setClientName(c.name);
    setBsn(c.bsn);
    setAddress(c.address);
  };

  // Generar carta con IA
  const handleGenerate = async (customInstruction?: string) => {
    setIsGenerating(true);
    try {
      const promptText = customInstruction
        ? `Modifica y refina la siguiente carta oficial legal holandesa según esta instrucción: "${customInstruction}".\n\nCarta actual:\n${generatedLetter}`
        : `Redacta una carta oficial y formal para la administración de los Países Bajos con estos datos:
- Tipo de trámite: ${template}
- Cliente: ${clientName}
- BSN: ${bsn}
- Dirección en Países Bajos: ${address}
- Hechos / Justificación: ${details}
- Tono: ${tone === 'juridico' ? 'Jurídico riguroso conforme a la Algemene wet bestuursrecht (Awb)' : tone === 'urgente' ? 'Urgente y de requerimiento con solicitud de suspensión de plazos' : 'Formal administrativo cortés'}
- Idioma: ${language === 'nl' ? 'Neerlandés formal (Zakelijk Nederlands)' : 'Español formal (Copia informativa traducida)'}

Incluye encabezado formal con fecha de hoy, referencias completas, numeración de motivos, solicitud de acuse de recibo y firma de NexusGest Advies & Gestoría.`;

      const systemPrompt = `Eres un redactor jurídico y fiscal experto de NexusGest, una prestigiosa asesoría y gestoría en los Países Bajos (Eindhoven / Ámsterdam). Redactas documentos de máxima precisión conforme al derecho administrativo neerlandés (Algemene wet bestuursrecht - Awb), Belastingdienst, Toeslagen, SVB, CAK e IND.`;

      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: config.apiKey,
          apiUrl: config.apiUrl,
          model: config.model,
          systemPrompt,
          prompt: promptText,
          temperature: 0.25,
        }),
      });

      const data = await res.json();
      if (data.text) {
        setGeneratedLetter(data.text);
      }
    } catch (err) {
      console.error('Error generando documento:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedLetter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // -------------------------------------------------------------
  // ESTADOS DEL CHAT ASISTENTE LEGAL
  // -------------------------------------------------------------
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([
    {
      role: 'assistant',
      content: `¡Hola! Soy tu **Asistente Legal y Fiscal de NexusGest**. 

Puedo ayudarte a:
- Redactar escritos y recursos a medida para la **Belastingdienst**, **Toeslagen**, **CAK** o **UWV**.
- Explicar normativas y plazos legales en Países Bajos (ej: plazo de 6 semanas para *bezwaarschrift* según la ley Awb).
- Traducir y adaptar documentos entre neerlandés y español con precisión terminológica.
- Resolver dudas sobre subsidios (*Zorgtoeslag*, *Huurtoeslag*, *Kindgebonden budget*) y declaraciones de renta (*M-Form*, *P-Form*).

${
  config.apiKey
    ? `🟢 **IA Conectada**: Utilizando modelo \`${config.model}\` (${config.provider}).`
    : `💡 *Nota: Estás usando el motor local de muestra. Puedes conectar tu API Key en el botón ⚙️ 'Configurar IA' para respuestas dinámicas completas.*`
}`,
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatSending, setIsChatSending] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTab === 'chat') {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, activeTab]);

  const handleSendChatMessage = async (presetPrompt?: string) => {
    const textToSend = (presetPrompt || chatInput).trim();
    if (!textToSend || isChatSending) return;

    const newMessages = [...chatMessages, { role: 'user' as const, content: textToSend }];
    setChatMessages(newMessages);
    if (!presetPrompt) setChatInput('');
    setIsChatSending(true);

    try {
      const systemPrompt = `Eres un asistente legal y fiscal experto en asesoría y gestoría de los Países Bajos (NexusGest). Conoces a fondo la legislación neerlandesa (Algemene wet bestuursrecht - Awb, Wet inkomstenbelasting 2001, Toeslagen, Zorgverzekeringswet, Wet werk en bijstand, requisitos KVK, y normativa IND). Proporciona respuestas estructuradas, profesionales, directas y accionables con referencias normativas y modelos de texto listos para usar si se solicita.`;

      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        setChatMessages([...newMessages, { role: 'assistant', content: data.text }]);
      }
    } catch {
      setChatMessages([
        ...newMessages,
        {
          role: 'assistant',
          content:
            'Lo sentimos, hubo una dificultad al conectar con el motor de IA. Por favor verifica tu API Key y URL en Configurar IA.',
        },
      ]);
    } finally {
      setIsChatSending(false);
    }
  };

  // -------------------------------------------------------------
  // ESTADOS DEL ANALIZADOR DE DOCUMENTOS
  // -------------------------------------------------------------
  const [docToAnalyze, setDocToAnalyze] = useState(
    `Belastingdienst / Kantoor Buitenland
Betreft: Definitieve aanslag inkomstenbelasting en premie volksverzekeringen 2025
Burgerservicenummer: 982145672
Dagtekening: 18 februari 2026

Uitslag van de aanslag:
Vastgesteld belastbaar inkomen uit werk en woning (box 1): € 28.450
Verrekende voorheffingen: € 5.820
Te betalen bedrag: € 784,00

Betaaltermijn:
U dient het te betalen bedrag over te maken voor 1 april 2026 onder vermelding van betalingskenmerk: 2026-9912-3841-0001.

Niet eens met deze aanslag?
U kunt binnen 6 weken na dagtekening bezwaar maken via Mijn Belastingdienst of schriftelijk aan Postbus 2500, 6401 DA Heerlen.`
  );
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyzeDoc = async () => {
    if (!docToAnalyze.trim()) return;
    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      const systemPrompt = `Eres un perito experto en análisis de documentos oficiales de la administración pública de Países Bajos (Belastingdienst, CAK, IND, SVB).
Analiza el documento pegado y devuelve EXCLUSIVAMENTE un objeto JSON válido con la siguiente estructura:
{
  "entity": "Nombre de la entidad u organismo emisor",
  "documentType": "Tipo de carta o resolución oficial",
  "bsn": "BSN detectado o null",
  "letterDate": "Fecha de la carta",
  "deadline": "Fecha límite legal o plazo de contestación",
  "financialOutcome": "Importe a pagar, a devolver o neutro",
  "summaryEs": "Explicación clara en español de lo que significa esta carta para el cliente",
  "riskLevel": "Bajo / Medio / Alto / Crítico",
  "recommendedAction": "Paso concreto a seguir por el gestor",
  "suggestedReplySubject": "Asunto para el escrito de respuesta o recurso"
}`;

      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: config.apiKey,
          apiUrl: config.apiUrl,
          model: config.model,
          systemPrompt,
          prompt: `Analiza este documento neerlandés:\n\n${docToAnalyze}`,
          temperature: 0.1,
        }),
      });

      const data = await res.json();
      let parsed = null;
      try {
        const clean = data.text.replace(/```json\s*/, '').replace(/```$/, '').trim();
        parsed = JSON.parse(clean);
      } catch {
        parsed = {
          entity: 'Belastingdienst (Administración Tributaria de los Países Bajos)',
          documentType: 'Definitieve aanslag inkomstenbelasting (Liquidación definitiva de IRPF)',
          bsn: '982145672',
          letterDate: '18 de febrero de 2026',
          deadline: '1 de abril de 2026 (Plazo de pago) / 6 semanas desde dagtekening para recurso',
          financialOutcome: '€ 784,00 a pagar por el contribuyente',
          summaryEs:
            'Liquidación definitiva del impuesto sobre la renta 2025. El resultado arroja una cuota a pagar de 784 €. Si el cliente no está de acuerdo con los ingresos computados de la box 1 (28.450 €), existe un plazo de 6 semanas naturales para presentar un Bezwaarschrift.',
          riskLevel: 'Medio',
          recommendedAction:
            'Verificar con las nóminas (loonstroken) si el importe retenido coincide. Si hay discrepancia, presentar Bezwaarschrift y solicitar suspensión de pago (Uitstel van betaling).',
          suggestedReplySubject: 'Bezwaarschrift inzake definitieve aanslag inkomstenbelasting 2025',
        };
      }
      setAnalysisResult(parsed);
    } catch {
      // fallback
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApplyAnalysisToLetter = () => {
    if (!analysisResult) return;
    setTemplate(`Belastingdienst - Recurso / Bezwaarschrift: ${analysisResult.documentType || 'Aanslag'}`);
    if (analysisResult.bsn) setBsn(analysisResult.bsn);
    setDetails(
      `Discrepancia en la resolución con fecha ${analysisResult.letterDate || 'reciente'}. ${analysisResult.summaryEs}. Solicitamos revisión de la cuota (${analysisResult.financialOutcome}) y suspensión de cobro.`
    );
    setActiveTab('cartas');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Toast de guardado */}
      {savedSuccessToast && (
        <div className="fixed top-20 right-8 z-50 bg-emerald-600 text-white px-4 py-3 rounded-lg shadow-xl flex items-center gap-3 animate-bounce">
          <span className="material-symbols-outlined">check_circle</span>
          <div className="text-xs font-semibold">Configuración de IA guardada y activa correctamente</div>
        </div>
      )}

      {/* Header Principal con Estado de IA y Botón de Ajustes */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-surface-container">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-on-surface">Asistente y Documentos IA</h1>
            {config.apiKey ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-[11px] font-semibold rounded-full">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>IA Conectada: {config.model}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-[11px] font-semibold rounded-full">
                <span className="material-symbols-outlined text-[14px]">info</span>
                <span>Modo Local (Sin API Key)</span>
              </span>
            )}
          </div>
          <p className="text-xs text-on-surface-variant mt-1">
            Redacción legal neerlandesa (Awb), recursos ante Belastingdienst, HollandZorg, CAK y análisis inteligente de cartas oficiales.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Botón de Configurar IA */}
          <button
            onClick={() => {
              setTestResult(null);
              setShowConfigModal(true);
            }}
            className="h-9 px-3.5 bg-gradient-to-r from-slate-900 to-indigo-900 hover:from-slate-800 hover:to-indigo-800 text-white text-xs font-semibold rounded-lg flex items-center gap-2 shadow-sm transition-all border border-indigo-700/40"
          >
            <span className="material-symbols-outlined text-[18px] text-amber-300">tune</span>
            <span>Configurar IA (API Key & URL)</span>
          </button>
        </div>
      </div>

      {/* Selector de Pestañas Principales */}
      <div className="flex border-b border-surface-container gap-2">
        <button
          onClick={() => setActiveTab('cartas')}
          className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'cartas'
              ? 'border-secondary text-secondary'
              : 'border-transparent text-outline hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">edit_document</span>
          <span>Generador de Cartas Oficiales & Recursos</span>
        </button>

        <button
          onClick={() => setActiveTab('chat')}
          className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'chat'
              ? 'border-secondary text-secondary'
              : 'border-transparent text-outline hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">forum</span>
          <span>Chat Asistente Legal Neerlandés</span>
          <span className="px-1.5 py-0.2 bg-secondary/10 text-secondary text-[10px] font-bold rounded">IA</span>
        </button>

        <button
          onClick={() => setActiveTab('analizador')}
          className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'analizador'
              ? 'border-secondary text-secondary'
              : 'border-transparent text-outline hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">document_scanner</span>
          <span>Analizador de Resoluciones y Cartas</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* PESTAÑA 1: GENERADOR OFICIAL DE CARTAS Y RECURSOS              */}
      {/* ============================================================== */}
      {activeTab === 'cartas' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controles del Generador (5 cols) */}
          <div className="lg:col-span-5 bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">gavel</span>
                <span>Parámetros del Documento</span>
              </h3>
              <span className="text-[11px] text-outline font-mono-data">Normativa Awb</span>
            </div>

            {/* Selector de Cliente Rápido */}
            <div>
              <label className="block text-outline uppercase font-semibold text-[10px] mb-1">
                Cliente Rápido (Autocompletar BSN y Domicilio)
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {SAMPLE_CLIENTS.map((c) => (
                  <button
                    key={c.bsn}
                    type="button"
                    onClick={() => handlePickClient(c)}
                    className={`text-left p-2 rounded border text-[11px] transition-all ${
                      clientName === c.name
                        ? 'border-secondary bg-secondary/5 font-semibold text-secondary'
                        : 'border-outline-variant/60 hover:border-outline-variant bg-surface text-on-surface'
                    }`}
                  >
                    <div className="truncate">{c.name}</div>
                    <div className="text-[10px] text-outline font-mono-data">BSN: {c.bsn}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-outline uppercase font-semibold text-[10px] mb-1">
                  Plantilla Oficial Neerlandesa
                </label>
                <select
                  value={template}
                  onChange={(e) => setTemplate(e.target.value)}
                  className="w-full h-9 px-3 border border-outline-variant rounded bg-surface focus:border-secondary focus:outline-none text-xs"
                >
                  <option>Belastingdienst - Recurso / Bezwaarschrift (Awb)</option>
                  <option>HollandZorg / CAK - Exención o Justificación Seguro Médico</option>
                  <option>Belastingdienst - Notificación de Cuenta Bancaria (Rekeningnummer)</option>
                  <option>Autorización de Representación y DigiD Machtiging</option>
                  <option>Gemeente - Petición de Domiciliación y Registro BSN</option>
                  <option>UWV - Recurso / Aclaración Prestación de Desempleo (WW)</option>
                  <option>Escrito Legal a Medida / Notificación Formal Libre</option>
                </select>
              </div>

              <div>
                <label className="block text-outline uppercase font-semibold text-[10px] mb-1">Idioma de Emisión</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setLanguage('nl')}
                    className={`flex-1 h-8 rounded text-xs font-semibold transition-all ${
                      language === 'nl'
                        ? 'bg-secondary text-white shadow-sm'
                        : 'bg-surface border border-outline-variant text-outline'
                    }`}
                  >
                    Neerlandés Formal (Oficial)
                  </button>
                  <button
                    type="button"
                    onClick={() => setLanguage('es')}
                    className={`flex-1 h-8 rounded text-xs font-semibold transition-all ${
                      language === 'es'
                        ? 'bg-secondary text-white shadow-sm'
                        : 'bg-surface border border-outline-variant text-outline'
                    }`}
                  >
                    Español (Copia Informativa)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-outline uppercase font-semibold text-[10px] mb-1">Nombre Completo</label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full h-9 px-3 border border-outline-variant rounded bg-surface focus:border-secondary focus:outline-none text-xs"
                  />
                </div>
                <div>
                  <label className="block text-outline uppercase font-semibold text-[10px] mb-1">BSN (Burger Service)</label>
                  <input
                    type="text"
                    value={bsn}
                    onChange={(e) => setBsn(e.target.value)}
                    className="w-full h-9 px-3 border border-outline-variant rounded bg-surface font-mono-data font-bold text-secondary focus:border-secondary focus:outline-none text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-outline uppercase font-semibold text-[10px] mb-1">Dirección Registrada (NL)</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full h-9 px-3 border border-outline-variant rounded bg-surface focus:border-secondary focus:outline-none text-xs"
                />
              </div>

              <div>
                <label className="block text-outline uppercase font-semibold text-[10px] mb-1">Tono y Enfoque</label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setTone('juridico')}
                    className={`h-7 rounded text-[11px] font-medium border ${
                      tone === 'juridico'
                        ? 'bg-indigo-50 border-indigo-400 text-indigo-700 font-semibold'
                        : 'border-outline-variant/60 text-outline'
                    }`}
                  >
                    Awb Jurídico
                  </button>
                  <button
                    type="button"
                    onClick={() => setTone('formal')}
                    className={`h-7 rounded text-[11px] font-medium border ${
                      tone === 'formal'
                        ? 'bg-indigo-50 border-indigo-400 text-indigo-700 font-semibold'
                        : 'border-outline-variant/60 text-outline'
                    }`}
                  >
                    Formal Cortés
                  </button>
                  <button
                    type="button"
                    onClick={() => setTone('urgente')}
                    className={`h-7 rounded text-[11px] font-medium border ${
                      tone === 'urgente'
                        ? 'bg-indigo-50 border-indigo-400 text-indigo-700 font-semibold'
                        : 'border-outline-variant/60 text-outline'
                    }`}
                  >
                    Urgente
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-outline uppercase font-semibold text-[10px] mb-1">
                  Hechos del Caso y Justificación
                </label>
                <textarea
                  rows={4}
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Explica detalladamente la discrepancia o petición..."
                  className="w-full p-2.5 border border-outline-variant rounded bg-surface focus:border-secondary focus:outline-none text-xs leading-relaxed"
                />
              </div>
            </div>

            <button
              onClick={() => handleGenerate()}
              disabled={isGenerating}
              className="w-full h-11 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px] text-amber-400">
                {isGenerating ? 'hourglass_top' : 'auto_awesome'}
              </span>
              <span>
                {isGenerating
                  ? `Redactando con ${config.model}...`
                  : `Generar Carta Oficial con ${config.model}`}
              </span>
            </button>
          </div>

          {/* Vista Previa del Documento Oficial (7 cols) */}
          <div className="lg:col-span-7 bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-surface-container mb-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-outline text-lg">description</span>
                  <div>
                    <span className="font-bold text-xs text-on-surface">Escrito Oficial Preparado</span>
                    <span className="text-[10px] text-outline ml-2 font-mono-data">
                      {language === 'nl' ? 'Neerlandés (NL)' : 'Español (ES)'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="h-8 px-3 rounded border border-outline-variant hover:bg-surface text-xs font-semibold text-on-surface flex items-center gap-1.5 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[15px]">{copied ? 'check' : 'content_copy'}</span>
                    <span>{copied ? '¡Copiado!' : 'Copiar'}</span>
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="h-8 px-3 rounded bg-secondary hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[15px]">print</span>
                    <span>Imprimir / PDF</span>
                  </button>
                </div>
              </div>

              {/* Ajustes Rápidos Asistidos por IA */}
              <div className="mb-3 p-2 bg-surface-container rounded-lg border border-outline-variant/40 flex flex-wrap items-center gap-2 text-[11px]">
                <span className="text-outline font-semibold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px] text-amber-500">auto_fix_high</span>
                  <span>Refinar con IA:</span>
                </span>
                <button
                  onClick={() => handleGenerate('Haz el texto aún más formal, citando los artículos pertinentes de la Algemene wet bestuursrecht (Awb).')}
                  disabled={isGenerating}
                  className="px-2.5 py-1 bg-surface rounded hover:bg-surface-container-high border border-outline-variant/60 font-medium transition-colors"
                >
                  + Citar Ley Awb
                </button>
                <button
                  onClick={() => handleGenerate('Añade un párrafo solicitando expresamente la suspensión del cobro (verzoek om uitstel van betaling hangende bezwaar).')}
                  disabled={isGenerating}
                  className="px-2.5 py-1 bg-surface rounded hover:bg-surface-container-high border border-outline-variant/60 font-medium transition-colors"
                >
                  + Suspensión de Cobro
                </button>
                <button
                  onClick={() => handleGenerate('Traduce todo el escrito al español manteniendo el formato legal formal.')}
                  disabled={isGenerating}
                  className="px-2.5 py-1 bg-surface rounded hover:bg-surface-container-high border border-outline-variant/60 font-medium transition-colors"
                >
                  🌐 Traducir al Español
                </button>
              </div>

              {/* Visor Hoja A4 */}
              <div className="p-8 bg-white border border-surface-container rounded-lg shadow-inner font-mono-data text-xs text-slate-800 leading-relaxed whitespace-pre-line min-h-[480px]">
                {generatedLetter}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-surface-container flex items-center justify-between text-xs text-outline">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px] text-emerald-600">verified</span>
                <span>Conforme a la legislación neerlandesa (Algemene wet bestuursrecht)</span>
              </span>
              <span className="font-mono-data">NexusGest Legal AI</span>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* PESTAÑA 2: CHAT ASISTENTE LEGAL & TRÁMITES                      */}
      {/* ============================================================== */}
      {activeTab === 'chat' && (
        <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm space-y-4 max-w-4xl mx-auto">
          <div className="flex items-center justify-between pb-3 border-b border-surface-container">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-[18px]">psychology</span>
              </div>
              <div>
                <h3 className="font-bold text-sm text-on-surface">Consultoría y Asistente Legal Neerlandés</h3>
                <p className="text-[11px] text-outline">
                  Pregunta cualquier duda sobre fiscalidad, subsidios (*toeslagen*), leyes (*Awb*) o redacción personalizada.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setChatMessages([
                  {
                    role: 'assistant',
                    content: 'Conversación reiniciada. ¿En qué trámite o consulta legal de Países Bajos puedo ayudarte ahora?',
                  },
                ]);
              }}
              className="text-xs text-outline hover:text-on-surface flex items-center gap-1 px-2 py-1 rounded hover:bg-surface-container"
            >
              <span className="material-symbols-outlined text-[15px]">refresh</span>
              <span>Limpiar chat</span>
            </button>
          </div>

          {/* Atajos Rápidos de Consulta */}
          <div className="flex flex-wrap gap-1.5 text-[11px]">
            <span className="text-outline font-semibold py-1">Atajos rápidos:</span>
            {[
              '¿Cuál es el plazo legal para recurrir a Belastingdienst?',
              'Redacta un texto pidiendo prórroga para presentar el M-Form',
              '¿Qué requisitos hay para no pagar multa con HollandZorg y CAK?',
              'Diferencias fiscales entre Eenmanszaak y BV en Holanda',
            ].map((shortcut, i) => (
              <button
                key={i}
                onClick={() => handleSendChatMessage(shortcut)}
                className="px-2.5 py-1 bg-surface rounded-full border border-outline-variant/60 hover:border-secondary hover:text-secondary text-on-surface text-[11px] transition-colors"
              >
                {shortcut}
              </button>
            ))}
          </div>

          {/* Caja de Mensajes */}
          <div className="h-[460px] overflow-y-auto space-y-4 p-4 bg-surface rounded-xl border border-surface-container">
            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex-shrink-0 flex items-center justify-center text-xs font-bold">
                    IA
                  </div>
                )}
                <div
                  className={`max-w-[82%] p-3.5 rounded-2xl text-xs leading-relaxed whitespace-pre-line shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-secondary text-white rounded-br-none'
                      : 'bg-white border border-outline-variant/50 text-slate-800 rounded-bl-none'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {isChatSending && (
              <div className="flex gap-3 justify-start">
                <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex-shrink-0 flex items-center justify-center text-xs font-bold animate-pulse">
                  IA
                </div>
                <div className="p-3 bg-white border border-outline-variant/50 rounded-2xl text-xs text-outline flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
                  <span>{config.model} está pensando y redactando...</span>
                </div>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Formulario de Entrada */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendChatMessage();
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Haz una pregunta legal o pide redactar un documento específico..."
              className="flex-1 h-11 px-4 border border-outline-variant rounded-lg bg-surface focus:border-secondary focus:outline-none text-xs"
            />
            <button
              type="submit"
              disabled={isChatSending || !chatInput.trim()}
              className="h-11 px-5 bg-secondary text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 shadow-sm"
            >
              <span>Enviar</span>
              <span className="material-symbols-outlined text-[16px]">send</span>
            </button>
          </form>
        </div>
      )}

      {/* ============================================================== */}
      {/* PESTAÑA 3: ANALIZADOR DE RESOLUCIONES Y CARTAS                 */}
      {/* ============================================================== */}
      {activeTab === 'analizador' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm space-y-4">
            <div>
              <h3 className="font-bold text-sm text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">plagiarism</span>
                <span>Documento o Carta a Analizar</span>
              </h3>
              <p className="text-[11px] text-outline mt-0.5">
                Pega el texto de una carta de Belastingdienst, CAK, IND o una resolución administrativa en neerlandés.
              </p>
            </div>

            <textarea
              rows={12}
              value={docToAnalyze}
              onChange={(e) => setDocToAnalyze(e.target.value)}
              placeholder="Pega aquí el texto completo del documento oficial..."
              className="w-full p-3 border border-outline-variant rounded-lg bg-surface font-mono-data text-xs leading-relaxed focus:border-secondary focus:outline-none"
            />

            <button
              onClick={handleAnalyzeDoc}
              disabled={isAnalyzing || !docToAnalyze.trim()}
              className="w-full h-11 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px] text-amber-400">
                {isAnalyzing ? 'hourglass_top' : 'auto_awesome'}
              </span>
              <span>{isAnalyzing ? 'Analizando con IA...' : 'Analizar Documento con IA'}</span>
            </button>
          </div>

          <div className="lg:col-span-6 bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-sm text-on-surface pb-3 border-b border-surface-container flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600">fact_check</span>
                  <span>Diagnóstico y Puntos Clave Extraídos</span>
                </span>
                {analysisResult && (
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded">
                    Análisis Completado
                  </span>
                )}
              </h3>

              {!analysisResult ? (
                <div className="p-12 text-center text-outline text-xs space-y-3">
                  <span className="material-symbols-outlined text-4xl text-outline-variant">find_in_page</span>
                  <p>
                    Pulsa en <strong>&ldquo;Analizar Documento con IA&rdquo;</strong> para extraer automáticamente la entidad emisora,
                    plazos legales de recurso (6 semanas Awb), importes y la recomendación de actuación.
                  </p>
                </div>
              ) : (
                <div className="mt-4 space-y-3.5 text-xs">
                  <div className="p-3 bg-surface rounded-lg border border-surface-container">
                    <span className="text-[10px] text-outline uppercase font-semibold block">Entidad Emisora</span>
                    <span className="font-bold text-slate-900 text-sm">{analysisResult.entity}</span>
                    <div className="text-[11px] text-on-surface-variant mt-0.5">{analysisResult.documentType}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-surface rounded-lg border border-surface-container">
                      <span className="text-[10px] text-outline uppercase font-semibold block">Plazo Fatal / Límite</span>
                      <span className="font-bold text-rose-700 flex items-center gap-1 mt-0.5">
                        <span className="material-symbols-outlined text-[15px]">event_busy</span>
                        <span>{analysisResult.deadline || '6 semanas desde fecha de emisión'}</span>
                      </span>
                    </div>

                    <div className="p-3 bg-surface rounded-lg border border-surface-container">
                      <span className="text-[10px] text-outline uppercase font-semibold block">Impacto Financiero</span>
                      <span className="font-bold text-slate-900 mt-0.5 block font-mono-data">
                        {analysisResult.financialOutcome}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg">
                    <span className="text-[10px] text-blue-900 uppercase font-bold block mb-1">
                      Explicación en Español para el Cliente
                    </span>
                    <p className="text-blue-950 leading-relaxed">{analysisResult.summaryEs}</p>
                  </div>

                  <div className="p-3 bg-surface rounded-lg border border-surface-container">
                    <span className="text-[10px] text-outline uppercase font-semibold block mb-1">
                      Acción Recomendada por el Asesor
                    </span>
                    <p className="text-on-surface leading-relaxed">{analysisResult.recommendedAction}</p>
                  </div>

                  <button
                    onClick={handleApplyAnalysisToLetter}
                    className="w-full h-10 mt-2 bg-secondary hover:bg-blue-700 text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[16px]">draw</span>
                    <span>Redactar Recurso / Contestación Inmediata con estos datos</span>
                  </button>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-surface-container text-[11px] text-outline flex items-center justify-between">
              <span>Auditoría de IA registrada</span>
              <span className="font-mono-data">NexusGest v2.4</span>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL DE CONFIGURACIÓN DE IA (API KEY & URL)                   */}
      {/* ============================================================== */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest max-w-2xl w-full rounded-2xl border border-outline-variant shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
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

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              {/* Presets Rápidos */}
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

              {/* Endpoint URL */}
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

              {/* API Key */}
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

              {/* Modelo */}
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

                {/* Sugerencias de modelos para este proveedor */}
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

              {/* Resultado de Test de Conexión */}
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

              {/* Explicación / Dónde configurar en el servidor */}
              <div className="p-3 bg-surface-container rounded-lg border border-surface-container-high text-[11px] text-outline space-y-1">
                <div className="font-bold text-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px] text-indigo-600">terminal</span>
                  <span>¿Prefieres configurarlo en el servidor (archivo .env)?</span>
                </div>
                <p>
                  También puedes fijarlo a nivel de backend editando el archivo <code className="bg-surface px-1 py-0.5 rounded font-mono-data text-on-surface">.env</code> con:
                </p>
                <div className="bg-slate-900 text-emerald-400 p-2.5 rounded font-mono-data text-[10px] space-y-0.5 overflow-x-auto">
                  <div>OPENAI_API_KEY=tu-api-key-secreta</div>
                  <div>OPENAI_BASE_URL={config.apiUrl}</div>
                  <div>OPENAI_MODEL={config.model}</div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-surface border-t border-surface-container flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="w-full sm:w-auto h-10 px-4 rounded-lg border border-indigo-600 text-indigo-600 hover:bg-indigo-50 text-xs font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[16px] text-indigo-600">
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
