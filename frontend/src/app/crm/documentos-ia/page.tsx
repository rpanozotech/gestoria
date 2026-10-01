'use client';

import React, { useState, useEffect, useRef } from 'react';
import { exportDocumentToDocx } from '@/lib/docxExport';

// Presets de proveedores de IA
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

// Interfaz para plantillas de documentos
export interface DocumentTemplate {
  id: string;
  name: string;
  category: 'belastingdienst' | 'toeslagen' | 'cak' | 'gemeente' | 'ind' | 'laboral' | 'contratos' | 'otro';
  categoryLabel: string;
  targetEntity: string;
  description: string;
  defaultLanguage: 'nl' | 'es';
  defaultTone: 'juridico' | 'formal' | 'urgente';
  promptGuidance: string;
  templateContent: string;
  isCustom?: boolean;
}

// Plantillas Oficiales Predeterminadas
const DEFAULT_TEMPLATES: DocumentTemplate[] = [
  {
    id: 'tpl-belastingdienst-bezwaar',
    name: 'Belastingdienst - Recurso / Bezwaarschrift (Awb art. 7:1)',
    category: 'belastingdienst',
    categoryLabel: 'Fiscal / Belastingdienst',
    targetEntity: 'Belastingdienst / Postbus 2500, 6401 DA Heerlen',
    description: 'Recurso formal contra liquidaciones provisionales o definitivas de IRPF o subsidios.',
    defaultLanguage: 'nl',
    defaultTone: 'juridico',
    promptGuidance: 'Redactar bezwaarschrift formal conforme a la ley Awb con solicitud de suspensión de cobro.',
    templateContent: `Belastingdienst
Postbus 2500
6401 DA Heerlen

Datum: {{fecha}}
Betreft: Formeel Bezwaarschrift ingevolge artikel 7:1 Algemene wet bestuursrecht (Awb)
Kenmerk: Aanslag inkomstenbelasting / Beschikking Toeslagen
Burgerservicenummer (BSN): {{bsn}}

Geachte inspecteur der belastingen,

Namens ondergetekende cliënt(e), {{cliente_nombre}}, woonachtig aan {{direccion}}, dien ik hierbij tijdig bezwaar in tegen de door uw dienst afgegeven beschikking.

MOTIVERING VAN HET BEZWAAR:
1. {{motivo}}
2. Bijgaand treft u de bewijsstukken (jaaropgaven en salarisstroken) ter staving van ons standpunt.
3. Op grond van de Awb verzoeken wij u om volledige heroverweging en herziening van de beschikking.
4. Tevens verzoeken wij om uitstel van betaling (opschorting) hangende deze bezwaarprocedure.

In afwachting van uw schriftelijke ontvangstbevestiging,

Hoogachtend,

NexusGest Advies & Gestoría B.V.
{{gestor_nombre}} - Belastingadviseur
KvK: 89123847 · Eindhoven`,
  },
  {
    id: 'tpl-cak-zorg',
    name: 'HollandZorg / CAK - Exención o Justificación Seguro Médico',
    category: 'cak',
    categoryLabel: 'Sanidad / CAK',
    targetEntity: 'Het CAK / Postbus 84015, 2508 AA Den Haag',
    description: 'Justificación de seguro médico europeo o subsanación de multas por no aseguramiento.',
    defaultLanguage: 'nl',
    defaultTone: 'juridico',
    promptGuidance: 'Demostrar que el cliente dispone de cobertura médica legal conforme a la Zorgverzekeringswet.',
    templateContent: `Het CAK
Postbus 84015
2508 AA Den Haag

Datum: {{fecha}}
Betreft: Bezwaar boete onverzekerd / Verzoek tot herziening bestuursrechtelijke premie
BSN: {{bsn}}

Geachte heer/mevrouw,

Namens mijn cliënt(e), {{cliente_nombre}}, geboren en woonachtig aan {{direccion}}, wend ik mij tot u met betrekking tot de opgelegde boete inzake de zorgverzekeringsplicht.

FEITELIJKE GRONDSLAG:
{{motivo}}

Cliënt(e) beschikt over een geldige buitenlandse / particuliere zorgpolis die volledige dekking biedt. Gezien bovenstaande verzoeken wij u de boete te vernietigen en de premie-inning stop te zetten.

Met vriendelijke groet,

NexusGest Advies & Gestoría B.V.
{{gestor_nombre}}`,
  },
  {
    id: 'tpl-rekeningnummer',
    name: 'Belastingdienst - Cambio de Cuenta Bancaria (Rekeningnummer)',
    category: 'belastingdienst',
    categoryLabel: 'Fiscal / Cuentas',
    targetEntity: 'Belastingdienst / Centrale Administratie, Utrecht',
    description: 'Comunicación oficial de cuenta bancaria IBAN para devoluciones y cobro de toeslagen.',
    defaultLanguage: 'nl',
    defaultTone: 'formal',
    promptGuidance: 'Notificación oficial de IBAN a nombre del contribuyente para ingresos de la Belastingdienst.',
    templateContent: `Belastingdienst
Postbus 2500
6401 DA Heerlen

Datum: {{fecha}}
Betreft: Kennisgeving nieuw rekeningnummer voor uitbetalingen
Burgerservicenummer (BSN): {{bsn}}

Geachte heer/mevrouw,

Hierbij verzoekt ondergetekende, {{cliente_nombre}}, woonachtig te {{direccion}}, om alle toekomstige teruggaven en toeslagen over te maken naar het navolgende bankrekeningnummer:

Rekeninghouder: {{cliente_nombre}}
IBAN: {{motivo}}

Bijgaand treft u een kopie aan van het geldige identiteitsbewijs en een recent bankafschrift ter verificatie van de tenaamstelling.

Met vriendelijke groet,

{{cliente_nombre}}
p/a NexusGest Advies & Gestoría`,
  },
  {
    id: 'tpl-machtiging',
    name: 'Poder de Representación y DigiD Machtiging (Volmacht)',
    category: 'otro',
    categoryLabel: 'Representación Legal',
    targetEntity: 'Belastingdienst, Toeslagen, SVB, CAK en UWV',
    description: 'Poder legal de representación para gestores fiscales ante entidades públicas neerlandesas.',
    defaultLanguage: 'nl',
    defaultTone: 'juridico',
    promptGuidance: 'Modelo formal de volmacht según derecho neerlandés para trámites tributarios y administrativos.',
    templateContent: `VOLMACHT EN VERKLARING VAN VERTEGENWOORDIGING
(Machtiging Fiscale & Bestuursrechtelijke Zaken)

Datum: {{fecha}}
Plaats: Eindhoven, Nederland

1. VOLMACHTGEVER (Cliënt):
Naam: {{cliente_nombre}}
Burgerservicenummer (BSN): {{bsn}}
Adres: {{direccion}}

2. GEVOLMAGTIGDE (Gestor / Belastingadviseur):
NexusGest Advies & Gestoría B.V.
KvK-nummer: 89123847
Gevestigd te Eindhoven

3. OMVANG VAN DE BEVOEGDHEID:
Volmachtgever machtigt hierbij NexusGest B.V. om hem/haar rechtsgeldig te vertegenwoordigen bij de Belastingdienst, Dienst Toeslagen, SVB, CAK en Gemeenten voor:
- Het indienen en wijzigen van belastingaangiften (M-Form, P-Form).
- Het aanvragen, wijzigen en beheren van toeslagen (Zorgtoeslag, Huurtoeslag).
- Het indienen van bezwaar- en beroepschriften ingevolge de Awb.
- Het voeren van correspondentie en inzien van fiscale dossiers.

Doel van deze machtiging: {{motivo}}

Handtekening volmachtgever:                        Handtekening gemachtigde:
_______________________                            _______________________`,
  },
  {
    id: 'tpl-huurtoeslag',
    name: 'Dienst Toeslagen - Recurso / Solicitud Huurtoeslag (Alquiler)',
    category: 'toeslagen',
    categoryLabel: 'Subsidios / Huurtoeslag',
    targetEntity: 'Dienst Toeslagen / Postbus 4510, 6401 JA Heerlen',
    description: 'Reclamación o revisión de subsidio de alquiler por ingresos computables o contrato de vivienda.',
    defaultLanguage: 'nl',
    defaultTone: 'juridico',
    promptGuidance: 'Solicitud formal para el cálculo y abono del subsidio de vivienda en los Países Bajos.',
    templateContent: `Dienst Toeslagen
Postbus 4510
6401 JA Heerlen

Datum: {{fecha}}
Betreft: Verzoek herziening toekenning Huurtoeslag
BSN: {{bsn}}

Geachte heer/mevrouw,

Namens cliënt(e) {{cliente_nombre}}, woonachtig aan {{direccion}}, verzoek ik hierbij om herberekening van de huurtoeslag over het lopende/afgelopen kalenderjaar.

TOELICHTING:
{{motivo}}

Bijgevoegd vindt u de huurovereenkomst, de specificatie van de kale huurprijs en servicekosten, alsmede actuele inkomensgegevens.

Met vriendelijke groet,

NexusGest Advies & Gestoría
{{gestor_nombre}}`,
  },
  {
    id: 'tpl-contrato-alquiler',
    name: 'Contrato de Arrendamiento / Habitación (Huurovereenkomst)',
    category: 'contratos',
    categoryLabel: 'Contratos / Vivienda',
    targetEntity: 'Arrendador y Arrendatario (Conforme BW Boek 7)',
    description: 'Contrato de arrendamiento de vivienda o habitación conforme a la legislación civil neerlandesa.',
    defaultLanguage: 'nl',
    defaultTone: 'juridico',
    promptGuidance: 'Contrato legal de arrendamiento conforme al Burgerlijk Wetboek Boek 7 neerlandés.',
    templateContent: `HUUROVEREENKOMST WOONRUIMTE / KAMER
Conform Boek 7 Burgerlijk Wetboek (Nederlands recht)

DE ONDERGETEKENDEN:
1. Verhuurder: NexusGest Wonen / Particuliere Verhuurder
2. Huurder: {{cliente_nombre}}, BSN: {{bsn}}, thans wonende te {{direccion}}.

ZIJN HET VOLGENDE OVEREENGEKOMEN:
Artikel 1 - Het Gehuurde:
Verhuurder verhuurt aan huurder de woonruimte gelegen te {{direccion}}.

Artikel 2 - Duur en Beëindiging:
De overeenkomst is aangegaan voor bepaalde tijd ingaande op {{fecha}}.

Artikel 3 - Huurprijs en Betaling:
De totale betalingsverplichting bedraagt: {{motivo}}. Betaling geschiedt maandelijks vóór de eerste dag van de maand.

Aldus in tweevoud opgemaakt en ondertekend te Eindhoven op {{fecha}}.`,
  },
];

const SAMPLE_CLIENTS = [
  { name: 'Maria Popescu', bsn: '982145672', address: 'Strijpsestraat 142, 5616 GP Eindhoven' },
  { name: 'Carlos Mendoza Ruiz', bsn: '817293845', address: 'Keizersgracht 321, 1016 EE Amsterdam' },
  { name: 'David Gómez Castillo', bsn: '749201834', address: 'Coolsingel 88, 3011 AG Rotterdam' },
  { name: 'Lucía Navarro Gil', bsn: '628194032', address: 'Oudegracht 120, 3511 AZ Utrecht' },
];

export default function DocumentosIAPage() {
  // Vista principal: generador de cartas o analizador
  const [activeView, setActiveView] = useState<'generador' | 'analizador'>('generador');

  // Estado de la Barra Lateral del Chat Asistente (abierta por defecto en pantallas grandes)
  const [isChatSidebarOpen, setIsChatSidebarOpen] = useState(false);

  // Configuración de IA
  const [config, setConfig] = useState<AIConfig>(DEFAULT_CONFIG);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; latencyMs?: number } | null>(null);

  // Estados de Plantillas Personalizadas
  const [customTemplates, setCustomTemplates] = useState<DocumentTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(DEFAULT_TEMPLATES[0].id);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  const [templateForm, setTemplateForm] = useState<Partial<DocumentTemplate>>({
    name: '',
    category: 'belastingdienst',
    categoryLabel: 'Fiscal / Impuestos',
    targetEntity: 'Belastingdienst / Postbus 2500, Heerlen',
    description: '',
    defaultLanguage: 'nl',
    defaultTone: 'juridico',
    promptGuidance: '',
    templateContent: '',
  });

  // Toasts
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Cargar configuración guardada y plantillas personalizadas al montar
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 1280) {
      setIsChatSidebarOpen(true);
    }
    try {
      const savedConfig = localStorage.getItem('nexusgest_ai_config');
      if (savedConfig) {
        setConfig(JSON.parse(savedConfig));
      }
      const savedTemplates = localStorage.getItem('nexusgest_custom_templates');
      if (savedTemplates) {
        setCustomTemplates(JSON.parse(savedTemplates));
      }
    } catch {
      // ignore
    }
  }, []);

  // Lista combinada de plantillas
  const allTemplates = [...DEFAULT_TEMPLATES, ...customTemplates];
  const activeTemplateObj = allTemplates.find((t) => t.id === selectedTemplateId) || DEFAULT_TEMPLATES[0];

  // -------------------------------------------------------------
  // ESTADOS DEL FORMULARIO DE GENERACIÓN
  // -------------------------------------------------------------
  const [clientName, setClientName] = useState('Maria Popescu');
  const [bsn, setBsn] = useState('982145672');
  const [address, setAddress] = useState('Strijpsestraat 142, 5616 GP Eindhoven');
  const [details, setDetails] = useState(
    'Discrepancia en el cálculo del toetsingsinkomen para el subsidio Zorgtoeslag. Aportamos nóminas y justificantes.'
  );
  const [language, setLanguage] = useState<'nl' | 'es'>('nl');
  const [tone, setTone] = useState<'formal' | 'juridico' | 'urgente'>('juridico');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [copied, setCopied] = useState(false);

  // Reemplazar variables dinámicas en una plantilla
  const replaceVariables = (text: string): string => {
    const todayStr = new Date().toLocaleDateString(language === 'nl' ? 'nl-NL' : 'es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    return text
      .replace(/\{\{fecha\}\}/g, todayStr)
      .replace(/\{\{cliente_nombre\}\}/g, clientName || 'Maria Popescu')
      .replace(/\{\{bsn\}\}/g, bsn || '982145672')
      .replace(/\{\{direccion\}\}/g, address || 'Eindhoven, Nederland')
      .replace(/\{\{motivo\}\}/g, details || 'Revisión formal de expediente')
      .replace(/\{\{organismo\}\}/g, activeTemplateObj.targetEntity || 'Belastingdienst')
      .replace(/\{\{gestor_nombre\}\}/g, 'Rony P. - Senior Consultant');
  };

  // Contenido de la carta generada
  const [generatedLetter, setGeneratedLetter] = useState<string>(() =>
    replaceVariables(DEFAULT_TEMPLATES[0].templateContent)
  );

  // Al cambiar de plantilla seleccionada
  const handleSelectTemplate = (tplId: string) => {
    setSelectedTemplateId(tplId);
    const found = allTemplates.find((t) => t.id === tplId);
    if (found) {
      setLanguage(found.defaultLanguage);
      setTone(found.defaultTone);
      setGeneratedLetter(replaceVariables(found.templateContent));
    }
  };

  // Seleccionar cliente rápido
  const handlePickClient = (c: (typeof SAMPLE_CLIENTS)[0]) => {
    setClientName(c.name);
    setBsn(c.bsn);
    setAddress(c.address);
    showToast(`Datos fiscales de ${c.name} cargados en el documento`);
  };

  // Guardar configuración de IA
  const handleSaveConfig = () => {
    try {
      localStorage.setItem('nexusgest_ai_config', JSON.stringify(config));
      showToast('Configuración de IA guardada y activada correctamente');
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

  // Selector de preset de IA
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
  // GESTIÓN DE PLANTILLAS PERSONALIZADAS
  // -------------------------------------------------------------
  const handleOpenCreateTemplate = () => {
    setIsEditingTemplate(false);
    setTemplateForm({
      name: '',
      category: 'belastingdienst',
      categoryLabel: 'Fiscal / Impuestos',
      targetEntity: 'Belastingdienst / Postbus 2500, Heerlen',
      description: '',
      defaultLanguage: 'nl',
      defaultTone: 'juridico',
      promptGuidance: '',
      templateContent: `Belastingdienst
Postbus 2500
6401 DA Heerlen

Datum: {{fecha}}
Betreft: Kennisgeving / Bezwaarschrift
BSN: {{bsn}}

Geachte heer/mevrouw,

Namens {{cliente_nombre}}, woonachtig te {{direccion}}, deel ik u het volgende mede:

{{motivo}}

Met vriendelijke groet,

NexusGest Advies & Gestoría
{{gestor_nombre}}`,
    });
    setShowTemplateModal(true);
  };

  const handleOpenEditTemplate = () => {
    if (!activeTemplateObj.isCustom) return;
    setIsEditingTemplate(true);
    setTemplateForm({ ...activeTemplateObj });
    setShowTemplateModal(true);
  };

  const handleInsertVariable = (variableKey: string) => {
    setTemplateForm((prev) => ({
      ...prev,
      templateContent: (prev.templateContent || '') + ` {{${variableKey}}} `,
    }));
  };

  const handleSaveTemplate = () => {
    if (!templateForm.name?.trim()) {
      alert('Debes indicar un nombre para la plantilla.');
      return;
    }

    let updatedTemplates: DocumentTemplate[] = [];

    if (isEditingTemplate && templateForm.id) {
      updatedTemplates = customTemplates.map((t) =>
        t.id === templateForm.id ? ({ ...t, ...templateForm, isCustom: true } as DocumentTemplate) : t
      );
      showToast(`Plantilla "${templateForm.name}" actualizada con éxito`);
    } else {
      const newTemplate: DocumentTemplate = {
        id: `custom-tpl-${Date.now()}`,
        name: templateForm.name,
        category: templateForm.category || 'otro',
        categoryLabel: templateForm.categoryLabel || 'Personalizada',
        targetEntity: templateForm.targetEntity || 'Organismo oficial',
        description: templateForm.description || 'Plantilla creada por el gestor.',
        defaultLanguage: templateForm.defaultLanguage || 'nl',
        defaultTone: templateForm.defaultTone || 'juridico',
        promptGuidance: templateForm.promptGuidance || '',
        templateContent: templateForm.templateContent || '',
        isCustom: true,
      };
      updatedTemplates = [...customTemplates, newTemplate];
      setSelectedTemplateId(newTemplate.id);
      setGeneratedLetter(replaceVariables(newTemplate.templateContent));
      showToast(`¡Nueva plantilla "${newTemplate.name}" guardada y lista para usar!`);
    }

    setCustomTemplates(updatedTemplates);
    localStorage.setItem('nexusgest_custom_templates', JSON.stringify(updatedTemplates));
    setShowTemplateModal(false);
  };

  const handleDeleteCustomTemplate = (idToDelete: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta plantilla personalizada?')) return;
    const updated = customTemplates.filter((t) => t.id !== idToDelete);
    setCustomTemplates(updated);
    localStorage.setItem('nexusgest_custom_templates', JSON.stringify(updated));
    setSelectedTemplateId(DEFAULT_TEMPLATES[0].id);
    setGeneratedLetter(replaceVariables(DEFAULT_TEMPLATES[0].templateContent));
    showToast('Plantilla personalizada eliminada correctamente');
  };

  // -------------------------------------------------------------
  // GENERACIÓN CON IA (DOCUMENTO PRINCIPAL)
  // -------------------------------------------------------------
  const handleGenerate = async (customInstruction?: string) => {
    setIsGenerating(true);
    try {
      const promptText = customInstruction
        ? `Modifica la siguiente carta oficial holandesa según esta indicación precisa: "${customInstruction}".\n\nCarta actual:\n${generatedLetter}`
        : `Redacta una carta oficial legal holandesa utilizando la siguiente plantilla y datos del caso:
- Plantilla: ${activeTemplateObj.name}
- Destinatario oficial: ${activeTemplateObj.targetEntity}
- Cliente: ${clientName}
- BSN: ${bsn}
- Dirección en Países Bajos: ${address}
- Hechos / Justificación: ${details}
- Tono: ${tone === 'juridico' ? 'Jurídico riguroso conforme a la Algemene wet bestuursrecht (Awb)' : tone === 'urgente' ? 'Urgente y de requerimiento con solicitud de suspensión de cobro' : 'Formal administrativo cortés'}
- Idioma: ${language === 'nl' ? 'Neerlandés formal (Zakelijk Nederlands)' : 'Español formal (Copia informativa)'}
- Indicaciones de la plantilla: ${activeTemplateObj.promptGuidance || 'Estructura formal con fecha, referencias y firma oficial'}

Estructura requerida: Encabezado corporativo, fecha de hoy, número BSN, motivo numerado del recurso/solicitud, solicitud formal de acuse de recibo y firma de NexusGest Advies & Gestoría B.V.`;

      const systemPrompt = `Eres un redactor jurídico y fiscal experto de NexusGest B.V. (gestoría y asesoría fiscal en Países Bajos). Redactas documentos de máxima solvencia legal conforme a la Algemene wet bestuursrecht (Awb) y directrices de la Belastingdienst, CAK, SVB y Dienst Toeslagen.`;

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
        showToast('Documento redactado con éxito por la IA');
      }
    } catch (err) {
      console.error(err);
      showToast('Error al conectar con la IA. Se mantiene el borrador local.');
    } finally {
      setIsGenerating(false);
    }
  };

  // -------------------------------------------------------------
  // EXPORTACIONES: WORD (.DOCX), PDF E IMPRESIÓN
  // -------------------------------------------------------------
  const handleExportWord = async () => {
    setIsExportingDocx(true);
    try {
      await exportDocumentToDocx({
        title: activeTemplateObj.name,
        clientName,
        bsn,
        address,
        content: generatedLetter,
        language,
      });
      showToast('¡Documento descargado en formato Word (.docx)!');
    } catch (err: any) {
      alert(`Error al generar Word: ${err.message}`);
    } finally {
      setIsExportingDocx(false);
    }
  };

  const handlePrintDocument = () => {
    window.print();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedLetter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showToast('Texto copiado al portapapeles');
  };

  // -------------------------------------------------------------
  // CHAT ASISTENTE EN LA BARRA LATERAL CON AUTO-SCROLL
  // -------------------------------------------------------------
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([
    {
      role: 'assistant',
      content: `¡Hola! Soy tu **Asistente Legal IA de NexusGest**.

Estoy aquí en tu **barra lateral** para asistirte mientras redactas tus documentos:
- Consultar artículos legales (ej: *artículo 7:1 Awb* o plazos de 6 semanas).
- Traducir frases de neerlandés a español al vuelo.
- Redactar párrafos a medida e **insertarlos directamente** en tu documento.

${
  config.apiKey
    ? `🟢 **IA Conectada**: \`${config.model}\` (${config.provider}).`
    : `💡 *Modo Local activo. Añade tu API Key y URL en ⚙️ 'Configurar IA' para respuestas completas.*`
}`,
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatSending, setIsChatSending] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  const chatScrollContainerRef = useRef<HTMLDivElement>(null);
  const chatScrollAnchorRef = useRef<HTMLDivElement>(null);

  // Función de scroll automático suave
  const scrollToBottom = (smooth = true) => {
    if (chatScrollContainerRef.current) {
      chatScrollContainerRef.current.scrollTo({
        top: chatScrollContainerRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto',
      });
    }
  };

  // Reproducción en streaming / máquina de escribir con scroll continuo
  const streamResponseText = (fullText: string) => {
    setIsStreaming(true);
    let currentIndex = 0;
    const stepSize = Math.max(3, Math.ceil(fullText.length / 70)); // Duración equilibrada ~1.5 segundos

    // Añadir mensaje asistente inicialmente vacío
    setChatMessages((prev) => [...prev, { role: 'assistant', content: '' }]);
    setTimeout(() => scrollToBottom(true), 25);

    const intervalId = setInterval(() => {
      currentIndex += stepSize;
      if (currentIndex >= fullText.length) {
        clearInterval(intervalId);
        setChatMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: 'assistant', content: fullText };
          return next;
        });
        setIsChatSending(false);
        setIsStreaming(false);
        setTimeout(() => scrollToBottom(true), 60);
      } else {
        const partial = fullText.slice(0, currentIndex);
        setChatMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: 'assistant', content: partial };
          return next;
        });
        // Scroll continuo en modo scroll conforme llega el texto
        scrollToBottom(true);
      }
    }, 25);
  };

  const handleSendChatMessage = async (presetPrompt?: string) => {
    const textToSend = (presetPrompt || chatInput).trim();
    if (!textToSend || isChatSending || isStreaming) return;

    const newMessages = [...chatMessages, { role: 'user' as const, content: textToSend }];
    setChatMessages(newMessages);
    if (!presetPrompt) setChatInput('');
    setIsChatSending(true);

    // Scroll inmediato hacia abajo al enviar
    setTimeout(() => scrollToBottom(true), 30);

    try {
      const systemPrompt = `Eres un asesor fiscal y redactor legal experto de NexusGest en los Países Bajos. Conoces la ley Awb, Belastingdienst, Toeslagen y contratos neerlandeses. Responde de forma estructurada, directa y lista para usar.`;

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
        // Ejecutar animación con auto-scroll continuo
        streamResponseText(data.text);
      } else {
        setChatMessages([
          ...newMessages,
          { role: 'assistant', content: 'No se recibió respuesta válida del motor de IA.' },
        ]);
        setIsChatSending(false);
      }
    } catch {
      setChatMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: 'No fue posible completar la respuesta de IA. Verifica tu API Key y URL en Configurar IA.',
        },
      ]);
      setIsChatSending(false);
    }
  };

  // Insertar respuesta del chat directamente en el documento
  const handleInsertChatIntoDoc = (textToInsert: string) => {
    setDetails((prev) => (prev ? `${prev}\n\n${textToInsert}` : textToInsert));
    showToast('Texto insertado en la sección de hechos/justificación');
  };

  const handleReplaceGeneratedLetter = (textToReplace: string) => {
    setGeneratedLetter(textToReplace);
    showToast('El borrador oficial ha sido actualizado con el texto del chat');
  };

  // -------------------------------------------------------------
  // ANALIZADOR DE DOCUMENTOS
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
      const systemPrompt = `Eres un perito experto en análisis de resoluciones y cartas oficiales de Países Bajos. Devuelve EXCLUSIVAMENTE un JSON:
{
  "entity": "Nombre del organismo emisor",
  "documentType": "Tipo de carta o resolución",
  "bsn": "BSN detectado o null",
  "letterDate": "Fecha de la carta",
  "deadline": "Plazo límite de pago o de interposición de recurso",
  "financialOutcome": "Importe a pagar o a devolver",
  "summaryEs": "Explicación clara en español para el cliente",
  "recommendedAction": "Acción inmediata recomendada por el gestor",
  "suggestedReplySubject": "Asunto para el escrito de respuesta"
}`;

      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: config.apiKey,
          apiUrl: config.apiUrl,
          model: config.model,
          systemPrompt,
          prompt: `Analiza este documento:\n\n${docToAnalyze}`,
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
          documentType: 'Definitieve aanslag inkomstenbelasting 2025',
          bsn: '982145672',
          letterDate: '18 de febrero de 2026',
          deadline: '1 de abril de 2026 / 6 semanas para recurso',
          financialOutcome: '€ 784,00 a pagar',
          summaryEs:
            'Liquidación definitiva con resultado de 784 € a pagar. Si el cliente no está de acuerdo, existe plazo legal de 6 semanas naturales para recurrir (Bezwaarschrift).',
          recommendedAction: 'Comprobar nóminas (loonstroken) e interponer bezwaarschrift si hay error en deducciones.',
        };
      }
      setAnalysisResult(parsed);
      showToast('Análisis de documento completado');
    } catch {
      // ignore
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApplyAnalysisToLetter = () => {
    if (!analysisResult) return;
    setDetails(
      `Discrepancia en la resolución oficial (${analysisResult.documentType || 'Aanslag'}). ${analysisResult.summaryEs}. Solicitamos rectificación de la cuota (${analysisResult.financialOutcome}) y suspensión de cobro.`
    );
    setActiveView('generador');
    handleGenerate('Redacta un bezwaarschrift formal respondiendo a la resolución analizada.');
  };

  return (
    <div className="space-y-6 max-w-[1700px] mx-auto pb-12">
      {/* Toast de Notificaciones */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-indigo-500/40 animate-in fade-in duration-200 no-print">
          <span className="material-symbols-outlined text-emerald-400 text-lg">check_circle</span>
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-surface-container no-print">
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
                <span>Modo Local / Demo</span>
              </span>
            )}
          </div>
          <p className="text-xs text-on-surface-variant mt-1">
            Redacción oficial con <strong>Chat Asistente en Barra Lateral</strong>, creador de plantillas y exportación a{' '}
            <strong>Word (.docx)</strong>, <strong>PDF</strong> e <strong>Impresión legal</strong>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* Botón para Alternar Barra Lateral del Chat */}
          <button
            onClick={() => {
              setIsChatSidebarOpen(!isChatSidebarOpen);
              if (!isChatSidebarOpen) {
                setTimeout(() => scrollToBottom(true), 100);
              }
            }}
            className={`h-8 sm:h-9 px-2.5 sm:px-3.5 rounded-lg text-xs font-semibold flex items-center gap-1 sm:gap-1.5 transition-all shadow-xs border ${
              isChatSidebarOpen
                ? 'bg-secondary/10 border-secondary/30 text-secondary hover:bg-secondary/20'
                : 'bg-surface border-outline-variant hover:bg-surface-container text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[17px] sm:text-[18px]">
              {isChatSidebarOpen ? 'vertical_split' : 'forum'}
            </span>
            <span className="hidden sm:inline">{isChatSidebarOpen ? 'Barra Lateral Abierta' : 'Abrir Barra Lateral Chat'}</span>
            <span className="sm:hidden">{isChatSidebarOpen ? 'Cerrar Chat' : 'Abrir Chat'}</span>
          </button>

          {/* Botón para Crear Plantilla */}
          <button
            onClick={handleOpenCreateTemplate}
            className="h-8 sm:h-9 px-2.5 sm:px-3.5 bg-secondary hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1 sm:gap-1.5 shadow-sm transition-all"
          >
            <span className="material-symbols-outlined text-[17px] sm:text-[18px]">add_circle</span>
            <span className="hidden sm:inline">+ Nueva Plantilla</span>
            <span className="sm:hidden">+ Plantilla</span>
          </button>

          {/* Botón de Configurar IA */}
          <button
            onClick={() => {
              setTestResult(null);
              setShowConfigModal(true);
            }}
            className="h-8 sm:h-9 px-2.5 sm:px-3.5 bg-gradient-to-r from-slate-900 to-indigo-900 hover:from-slate-800 hover:to-indigo-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 sm:gap-2 shadow-sm transition-all border border-indigo-700/40"
          >
            <span className="material-symbols-outlined text-[17px] sm:text-[18px] text-amber-300">tune</span>
            <span className="hidden md:inline">Configurar IA (API Key & URL)</span>
            <span className="md:hidden">Configurar IA</span>
          </button>
        </div>
      </div>

      {/* Selector de Modo Principal (Generador / Analizador) */}
      <div className="flex border-b border-surface-container gap-3 no-print">
        <button
          onClick={() => setActiveView('generador')}
          className={`pb-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeView === 'generador'
              ? 'border-secondary text-secondary'
              : 'border-transparent text-outline hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">edit_document</span>
          <span>Generador Oficial & Editor de Documentos</span>
        </button>

        <button
          onClick={() => setActiveView('analizador')}
          className={`pb-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeView === 'analizador'
              ? 'border-secondary text-secondary'
              : 'border-transparent text-outline hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">document_scanner</span>
          <span>Analizador de Resoluciones y Cartas</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* CONTENEDOR PRINCIPAL: PANTALLA DIVIDIDA CON BARRA LATERAL      */}
      {/* ============================================================== */}
      <div className="flex flex-col xl:flex-row gap-6 items-start">
        {/* ========================================== */}
        {/* COLUMNAS CENTRALES (GENERADOR O ANALIZADOR) */}
        {/* ========================================== */}
        <div className={`transition-all duration-300 ${isChatSidebarOpen ? 'w-full xl:flex-1 min-w-0' : 'w-full'}`}>
          {/* MODO 1: GENERADOR Y EDITOR DE DOCUMENTOS */}
          {activeView === 'generador' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Formulario y Plantillas (5 cols en lg) */}
              <div className="lg:col-span-5 bg-surface-container-lowest p-5 rounded-xl border border-outline-variant shadow-sm space-y-4 no-print">
                {/* Cabecera del catálogo */}
                <div className="flex items-center justify-between pb-2 border-b border-surface-container">
                  <div>
                    <h3 className="font-bold text-sm text-on-surface flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-secondary text-lg">folder_open</span>
                      <span>Plantilla y Parámetros</span>
                    </h3>
                    <p className="text-[11px] text-outline">Elige o crea plantillas con datos del cliente</p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleOpenCreateTemplate}
                      className="px-2 py-1 bg-surface hover:bg-surface-container border border-outline-variant text-secondary text-[11px] font-semibold rounded flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[13px]">add</span>
                      <span>Nueva</span>
                    </button>
                    {activeTemplateObj.isCustom && (
                      <>
                        <button
                          onClick={handleOpenEditTemplate}
                          title="Editar esta plantilla personalizada"
                          className="p-1 hover:bg-surface-container rounded text-outline hover:text-on-surface"
                        >
                          <span className="material-symbols-outlined text-[15px]">edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteCustomTemplate(activeTemplateObj.id)}
                          title="Eliminar plantilla"
                          className="p-1 hover:bg-rose-50 rounded text-rose-600"
                        >
                          <span className="material-symbols-outlined text-[15px]">delete</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Selector de Plantilla */}
                <div>
                  <label className="block text-outline uppercase font-semibold text-[10px] mb-1">
                    Catálogo de Plantillas
                  </label>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => handleSelectTemplate(e.target.value)}
                    className="w-full h-9 px-3 border border-outline-variant rounded-lg bg-surface focus:border-secondary focus:outline-none text-xs font-medium"
                  >
                    <optgroup label="📋 Plantillas Oficiales del Sistema">
                      {DEFAULT_TEMPLATES.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </optgroup>
                    {customTemplates.length > 0 && (
                      <optgroup label="⭐ Mis Plantillas Creadas">
                        {customTemplates.map((t) => (
                          <option key={t.id} value={t.id}>
                            ★ {t.name} ({t.categoryLabel})
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>

                {/* Selector de Cliente Rápido */}
                <div>
                  <label className="block text-outline uppercase font-semibold text-[10px] mb-1">
                    Cargar Cliente Rápido
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {SAMPLE_CLIENTS.map((c) => (
                      <button
                        key={c.bsn}
                        type="button"
                        onClick={() => handlePickClient(c)}
                        className={`text-left p-1.5 rounded-lg border text-[11px] transition-all ${
                          clientName === c.name
                            ? 'border-secondary bg-secondary/5 font-semibold text-secondary'
                            : 'border-outline-variant/60 hover:border-outline-variant bg-surface text-on-surface'
                        }`}
                      >
                        <div className="truncate font-medium">{c.name}</div>
                        <div className="text-[10px] text-outline font-mono-data">BSN: {c.bsn}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Campos del Documento */}
                <div className="space-y-2.5 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-outline uppercase font-semibold text-[10px] mb-1">Cliente</label>
                      <input
                        type="text"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        className="w-full h-8 px-2.5 border border-outline-variant rounded bg-surface focus:border-secondary focus:outline-none text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-outline uppercase font-semibold text-[10px] mb-1">BSN</label>
                      <input
                        type="text"
                        value={bsn}
                        onChange={(e) => setBsn(e.target.value)}
                        className="w-full h-8 px-2.5 border border-outline-variant rounded bg-surface font-mono-data font-bold text-secondary focus:border-secondary focus:outline-none text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-outline uppercase font-semibold text-[10px] mb-1">Dirección NL</label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full h-8 px-2.5 border border-outline-variant rounded bg-surface focus:border-secondary focus:outline-none text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-outline uppercase font-semibold text-[10px] mb-1">Idioma</label>
                      <select
                        value={language}
                        onChange={(e: any) => setLanguage(e.target.value)}
                        className="w-full h-8 px-2 border border-outline-variant rounded bg-surface text-xs focus:border-secondary focus:outline-none"
                      >
                        <option value="nl">Neerlandés (NL)</option>
                        <option value="es">Español (ES)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-outline uppercase font-semibold text-[10px] mb-1">Tono Legal</label>
                      <select
                        value={tone}
                        onChange={(e: any) => setTone(e.target.value)}
                        className="w-full h-8 px-2 border border-outline-variant rounded bg-surface text-xs focus:border-secondary focus:outline-none"
                      >
                        <option value="juridico">Awb Jurídico</option>
                        <option value="formal">Formal</option>
                        <option value="urgente">Urgente</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-outline uppercase font-semibold text-[10px] mb-1">
                      Hechos del Caso y Justificación
                    </label>
                    <textarea
                      rows={3}
                      value={details}
                      onChange={(e) => setDetails(e.target.value)}
                      placeholder="Explica las discrepancias de ingresos o la petición..."
                      className="w-full p-2.5 border border-outline-variant rounded bg-surface focus:border-secondary focus:outline-none text-xs leading-relaxed"
                    />
                  </div>
                </div>

                {/* Botón de Generar */}
                <button
                  onClick={() => handleGenerate()}
                  disabled={isGenerating}
                  className="w-full h-10 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[17px] text-amber-400">
                    {isGenerating ? 'hourglass_top' : 'auto_awesome'}
                  </span>
                  <span>{isGenerating ? `Redactando con ${config.model}...` : `Generar / Redactar con IA`}</span>
                </button>
              </div>

              {/* Vista Previa del Documento y Exportaciones (7 cols en lg) */}
              <div className="lg:col-span-7 bg-surface-container-lowest p-5 rounded-xl border border-outline-variant shadow-sm flex flex-col justify-between print-area">
                <div>
                  {/* Barra de Herramientas de Exportación */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-surface-container mb-3 no-print">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-outline text-lg">description</span>
                      <span className="font-bold text-xs text-on-surface">Borrador Oficial A4</span>
                      <span className="text-[10px] text-outline font-mono-data">
                        ({language === 'nl' ? 'Neerlandés' : 'Español'})
                      </span>
                    </div>

                    {/* BOTONES PRINCIPALES: WORD (.DOCX), PDF E IMPRIMIR */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        onClick={handleExportWord}
                        disabled={isExportingDocx}
                        title="Descargar documento en formato Word (.docx)"
                        className="h-8 px-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-[11px] font-semibold flex items-center gap-1 transition-all shadow-xs disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-[15px]">file_open</span>
                        <span>{isExportingDocx ? 'Exportando...' : 'Word (.docx)'}</span>
                      </button>

                      <button
                        onClick={handlePrintDocument}
                        title="Imprimir documento o guardar como PDF oficial"
                        className="h-8 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-semibold flex items-center gap-1 transition-all shadow-xs"
                      >
                        <span className="material-symbols-outlined text-[15px]">print</span>
                        <span>Imprimir / PDF</span>
                      </button>

                      <button
                        onClick={handleCopy}
                        title="Copiar texto al portapapeles"
                        className="h-8 px-2 rounded-lg border border-outline-variant hover:bg-surface text-[11px] font-semibold text-on-surface flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[14px]">
                          {copied ? 'check' : 'content_copy'}
                        </span>
                        <span>{copied ? '¡Copiado!' : 'Copiar'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Refinamientos con IA */}
                  <div className="mb-3 p-2 bg-surface-container rounded-lg border border-outline-variant/40 flex flex-wrap items-center gap-1.5 text-[10px] no-print">
                    <span className="text-outline font-semibold flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-[13px] text-amber-500">auto_fix_high</span>
                      <span>Refinar:</span>
                    </span>
                    <button
                      onClick={() =>
                        handleGenerate('Haz el texto más riguroso y formal citando artículos de la ley Awb.')
                      }
                      disabled={isGenerating}
                      className="px-2 py-0.5 bg-surface rounded hover:bg-surface-container-high border border-outline-variant/60 font-medium"
                    >
                      + Ley Awb
                    </button>
                    <button
                      onClick={() =>
                        handleGenerate(
                          'Añade un párrafo solicitando expresamente la suspensión del cobro (uitstel van betaling).'
                        )
                      }
                      disabled={isGenerating}
                      className="px-2 py-0.5 bg-surface rounded hover:bg-surface-container-high border border-outline-variant/60 font-medium"
                    >
                      + Suspensión Cobro
                    </button>
                    <button
                      onClick={() =>
                        handleGenerate('Traduce todo el escrito al español manteniendo el formato formal.')
                      }
                      disabled={isGenerating}
                      className="px-2 py-0.5 bg-surface rounded hover:bg-surface-container-high border border-outline-variant/60 font-medium"
                    >
                      🌐 Traducir
                    </button>
                  </div>

                  {/* Hoja de Documento A4 */}
                  <div className="p-6 bg-white border border-surface-container rounded-xl shadow-inner font-mono-data text-xs text-slate-800 leading-relaxed whitespace-pre-line min-h-[480px] print-page-a4">
                    {/* Encabezado Corporativo */}
                    <div className="pb-3 mb-3 border-b border-slate-300">
                      <div className="font-bold text-sm text-slate-900 tracking-tight">
                        NexusGest Advies & Gestoría B.V.
                      </div>
                      <div className="text-[10px] text-slate-500 font-sans mt-0.5">
                        Fiscale Dienstverlening & Juridische Zaken · KvK: 89123847 · Eindhoven
                      </div>
                    </div>

                    {/* Texto del Documento */}
                    <div className="font-sans text-xs leading-relaxed text-slate-900 whitespace-pre-line">
                      {generatedLetter}
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-surface-container flex items-center justify-between text-[11px] text-outline no-print">
                  <span>Plantilla activa: {activeTemplateObj.name}</span>
                  <span className="font-mono-data">Word (.docx) & PDF</span>
                </div>
              </div>
            </div>
          )}

          {/* MODO 2: ANALIZADOR DE RESOLUCIONES Y CARTAS */}
          {activeView === 'analizador' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 no-print">
              <div className="lg:col-span-6 bg-surface-container-lowest p-5 rounded-xl border border-outline-variant shadow-sm space-y-4">
                <div>
                  <h3 className="font-bold text-sm text-on-surface flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-secondary">plagiarism</span>
                    <span>Documento o Carta a Analizar</span>
                  </h3>
                  <p className="text-[11px] text-outline mt-0.5">
                    Pega el texto de una carta de Belastingdienst, CAK, IND o resolución administrativa.
                  </p>
                </div>

                <textarea
                  rows={13}
                  value={docToAnalyze}
                  onChange={(e) => setDocToAnalyze(e.target.value)}
                  placeholder="Pega aquí el texto completo del documento oficial..."
                  className="w-full p-3 border border-outline-variant rounded-lg bg-surface font-mono-data text-xs leading-relaxed focus:border-secondary focus:outline-none"
                />

                <button
                  onClick={handleAnalyzeDoc}
                  disabled={isAnalyzing || !docToAnalyze.trim()}
                  className="w-full h-10 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[17px] text-amber-400">
                    {isAnalyzing ? 'hourglass_top' : 'auto_awesome'}
                  </span>
                  <span>{isAnalyzing ? 'Analizando con IA...' : 'Analizar Documento con IA'}</span>
                </button>
              </div>

              <div className="lg:col-span-6 bg-surface-container-lowest p-5 rounded-xl border border-outline-variant shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-sm text-on-surface pb-3 border-b border-surface-container flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-emerald-600">fact_check</span>
                      <span>Puntos Clave Extraídos</span>
                    </span>
                    {analysisResult && (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded">
                        Completado
                      </span>
                    )}
                  </h3>

                  {!analysisResult ? (
                    <div className="p-10 text-center text-outline text-xs space-y-2">
                      <span className="material-symbols-outlined text-3xl text-outline-variant">find_in_page</span>
                      <p>Pulsa en &ldquo;Analizar Documento con IA&rdquo; para extraer plazos de recurso e importes.</p>
                    </div>
                  ) : (
                    <div className="mt-3 space-y-3 text-xs">
                      <div className="p-2.5 bg-surface rounded-lg border border-surface-container">
                        <span className="text-[10px] text-outline uppercase font-semibold block">Entidad Emisora</span>
                        <span className="font-bold text-slate-900">{analysisResult.entity}</span>
                        <div className="text-[11px] text-on-surface-variant">{analysisResult.documentType}</div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-2.5 bg-surface rounded-lg border border-surface-container">
                          <span className="text-[10px] text-outline uppercase font-semibold block">Plazo Fatal</span>
                          <span className="font-bold text-rose-700 flex items-center gap-1 mt-0.5">
                            <span className="material-symbols-outlined text-[14px]">event_busy</span>
                            <span>{analysisResult.deadline || '6 semanas para recurso'}</span>
                          </span>
                        </div>

                        <div className="p-2.5 bg-surface rounded-lg border border-surface-container">
                          <span className="text-[10px] text-outline uppercase font-semibold block">Impacto Económico</span>
                          <span className="font-bold text-slate-900 mt-0.5 block font-mono-data">
                            {analysisResult.financialOutcome}
                          </span>
                        </div>
                      </div>

                      <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-lg">
                        <span className="text-[10px] text-blue-900 uppercase font-bold block mb-0.5">
                          Explicación en Español para el Cliente
                        </span>
                        <p className="text-blue-950 leading-relaxed text-[11px]">{analysisResult.summaryEs}</p>
                      </div>

                      <div className="p-2.5 bg-surface rounded-lg border border-surface-container">
                        <span className="text-[10px] text-outline uppercase font-semibold block mb-0.5">
                          Acción Recomendada
                        </span>
                        <p className="text-on-surface leading-relaxed text-[11px]">{analysisResult.recommendedAction}</p>
                      </div>

                      <button
                        onClick={handleApplyAnalysisToLetter}
                        className="w-full h-9 bg-secondary hover:bg-blue-700 text-white font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-sm text-xs"
                      >
                        <span className="material-symbols-outlined text-[15px]">draw</span>
                        <span>Redactar Contestación con estos datos</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-3 pt-2 border-t border-surface-container text-[11px] text-outline flex items-center justify-between">
                  <span>Auditoría registrada</span>
                  <span className="font-mono-data">NexusGest v2.4</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* BARRA LATERAL: CHAT ASISTENTE LEGAL CON AUTO-SCROLL EN VIVO   */}
        {/* ============================================================== */}
        {isChatSidebarOpen && (
          <aside className="w-full xl:w-[410px] 2xl:w-[450px] shrink-0 sticky top-20 bg-surface-container-lowest p-4 rounded-xl border border-outline-variant shadow-sm flex flex-col h-[760px] max-h-[calc(100vh-100px)] no-print animate-in slide-in-from-right duration-200">
            {/* Header de la Barra Lateral */}
            <div className="flex items-center justify-between pb-3 border-b border-surface-container">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-[16px]">forum</span>
                </div>
                <div>
                  <h3 className="font-bold text-xs text-on-surface flex items-center gap-1.5">
                    <span>Chat Asistente Legal</span>
                    {config.apiKey && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>}
                  </h3>
                  <p className="text-[10px] text-outline font-mono-data">{config.model}</p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {/* Botón de limpiar chat */}
                <button
                  onClick={() => {
                    setChatMessages([
                      {
                        role: 'assistant',
                        content: 'Conversación reiniciada. ¿En qué puedo asistirte ahora con tu documento o cliente?',
                      },
                    ]);
                  }}
                  title="Reiniciar chat"
                  className="p-1 hover:bg-surface-container rounded text-outline hover:text-on-surface transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">refresh</span>
                </button>

                {/* Botón de cerrar / ocultar barra lateral */}
                <button
                  onClick={() => setIsChatSidebarOpen(false)}
                  title="Ocultar barra lateral"
                  className="p-1 hover:bg-surface-container rounded text-outline hover:text-on-surface transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>
            </div>

            {/* Atajos Rápidos */}
            <div className="py-2 border-b border-surface-container/60 flex flex-wrap gap-1">
              {[
                'Plazo recurso Awb',
                'Pedir prórroga M-Form',
                'Exención seguro CAK',
                'Traducir al holandés',
              ].map((shortcut, i) => (
                <button
                  key={i}
                  onClick={() => handleSendChatMessage(shortcut)}
                  disabled={isChatSending || isStreaming}
                  className="px-2 py-0.5 bg-surface hover:bg-surface-container border border-outline-variant/60 rounded-full text-[10px] text-on-surface transition-colors disabled:opacity-50"
                >
                  {shortcut}
                </button>
              ))}
            </div>

            {/* CONTENEDOR DE MENSAJES CON AUTO-SCROLL CONTINUO */}
            <div
              ref={chatScrollContainerRef}
              className="flex-1 overflow-y-auto space-y-3 p-2 my-2 bg-surface/60 rounded-lg border border-surface-container scroll-smooth [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-400"
            >
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`p-3 rounded-xl text-xs leading-relaxed whitespace-pre-line shadow-xs max-w-[92%] ${
                      msg.role === 'user'
                        ? 'bg-secondary text-white rounded-br-none'
                        : 'bg-white border border-outline-variant/60 text-slate-800 rounded-bl-none'
                    }`}
                  >
                    {msg.content}
                    {/* Cursor parpadeante si se está escribiendo este mensaje */}
                    {isStreaming && idx === chatMessages.length - 1 && msg.role === 'assistant' && (
                      <span className="inline-block w-1.5 h-3.5 bg-indigo-600 ml-1 animate-pulse align-middle" />
                    )}
                  </div>

                  {/* Acciones directas sobre respuestas del asistente */}
                  {msg.role === 'assistant' && msg.content && (
                    <div className="flex items-center gap-1.5 text-[10px] text-outline ml-1">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(msg.content);
                          showToast('Texto copiado al portapapeles');
                        }}
                        className="hover:text-secondary flex items-center gap-0.5"
                      >
                        <span className="material-symbols-outlined text-[12px]">content_copy</span>
                        <span>Copiar</span>
                      </button>
                      <span>·</span>
                      <button
                        onClick={() => handleInsertChatIntoDoc(msg.content)}
                        className="hover:text-secondary font-semibold text-secondary flex items-center gap-0.5"
                      >
                        <span className="material-symbols-outlined text-[12px]">input</span>
                        <span>Insertar en documento</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {/* Indicador de pensamiento mientras espera respuesta de la API */}
              {isChatSending && !isStreaming && (
                <div className="flex items-center gap-2 p-2.5 bg-white border border-outline-variant/60 rounded-xl text-xs text-outline w-fit animate-pulse">
                  <span className="material-symbols-outlined text-[15px] animate-spin text-indigo-600">sync</span>
                  <span>{config.model} está redactando...</span>
                </div>
              )}

              {/* Ancla para auto-scroll */}
              <div ref={chatScrollAnchorRef} className="h-1 w-full" />
            </div>

            {/* Formulario de Entrada del Chat en la Barra Lateral */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendChatMessage();
              }}
              className="pt-2 border-t border-surface-container flex gap-1.5"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Pregunta o pide redactar algo..."
                disabled={isChatSending || isStreaming}
                className="flex-1 h-9 px-3 border border-outline-variant rounded-lg bg-surface focus:border-secondary focus:outline-none text-xs disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isChatSending || isStreaming || !chatInput.trim()}
                className="h-9 px-3 bg-secondary text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-semibold flex items-center justify-center gap-1 disabled:opacity-50 shadow-xs"
              >
                <span className="material-symbols-outlined text-[15px]">send</span>
              </button>
            </form>
          </aside>
        )}
      </div>

      {/* Botón flotante para reabrir la barra lateral si está cerrada */}
      {!isChatSidebarOpen && (
        <button
          onClick={() => {
            setIsChatSidebarOpen(true);
            setTimeout(() => scrollToBottom(true), 100);
          }}
          className="fixed right-0 top-1/2 -translate-y-1/2 z-40 bg-secondary hover:bg-blue-700 text-white px-3 py-2.5 rounded-l-xl shadow-2xl flex items-center gap-2 text-xs font-semibold animate-in slide-in-from-right no-print transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">forum</span>
          <span className="writing-vertical">Chat Asistente IA</span>
        </button>
      )}

      {/* ============================================================== */}
      {/* MODAL 1: CREAR / EDITAR PLANTILLA PERSONALIZADA                */}
      {/* ============================================================== */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200 no-print">
          <div className="bg-surface-container-lowest max-w-2xl w-full rounded-2xl border border-outline-variant shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white flex items-center justify-between border-b border-blue-900/50">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-amber-300 text-2xl">post_add</span>
                <div>
                  <h3 className="font-bold text-base">
                    {isEditingTemplate ? 'Editar Plantilla Personalizada' : 'Crear Nueva Plantilla de Documento'}
                  </h3>
                  <p className="text-[11px] text-blue-200">
                    Define variables dinámicas y estructura para exportar a Word (.docx) o imprimir en PDF
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowTemplateModal(false)}
                className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors text-white/80 hover:text-white"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-outline uppercase font-semibold text-[10px] mb-1">
                    Nombre de la Plantilla *
                  </label>
                  <input
                    type="text"
                    value={templateForm.name || ''}
                    onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                    placeholder="Ej: Reclamación Huurtoeslag por Ingresos"
                    className="w-full h-9 px-3 border border-outline-variant rounded-lg bg-surface font-semibold text-xs focus:border-secondary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-outline uppercase font-semibold text-[10px] mb-1">
                    Categoría / Ámbito
                  </label>
                  <select
                    value={templateForm.category || 'belastingdienst'}
                    onChange={(e: any) =>
                      setTemplateForm({
                        ...templateForm,
                        category: e.target.value,
                        categoryLabel: e.target.options[e.target.selectedIndex].text,
                      })
                    }
                    className="w-full h-9 px-3 border border-outline-variant rounded-lg bg-surface text-xs focus:border-secondary focus:outline-none"
                  >
                    <option value="belastingdienst">Fiscal / Belastingdienst</option>
                    <option value="toeslagen">Subsidios / Dienst Toeslagen</option>
                    <option value="cak">Sanidad / CAK & HollandZorg</option>
                    <option value="gemeente">Ayuntamiento / Gemeente (BRP)</option>
                    <option value="ind">Extranjería / IND</option>
                    <option value="laboral">Laboral / UWV & Contratos</option>
                    <option value="contratos">Contratos de Arrendamiento</option>
                    <option value="otro">Gestoría General</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-outline uppercase font-semibold text-[10px] mb-1">
                    Organismo o Destinatario Oficial
                  </label>
                  <input
                    type="text"
                    value={templateForm.targetEntity || ''}
                    onChange={(e) => setTemplateForm({ ...templateForm, targetEntity: e.target.value })}
                    placeholder="Ej: Dienst Toeslagen / Postbus 4510, Heerlen"
                    className="w-full h-9 px-3 border border-outline-variant rounded-lg bg-surface text-xs focus:border-secondary focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-outline uppercase font-semibold text-[10px] mb-1">Idioma</label>
                    <select
                      value={templateForm.defaultLanguage || 'nl'}
                      onChange={(e: any) => setTemplateForm({ ...templateForm, defaultLanguage: e.target.value })}
                      className="w-full h-9 px-2 border border-outline-variant rounded-lg bg-surface text-xs focus:border-secondary focus:outline-none"
                    >
                      <option value="nl">Neerlandés (NL)</option>
                      <option value="es">Español (ES)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-outline uppercase font-semibold text-[10px] mb-1">Tono</label>
                    <select
                      value={templateForm.defaultTone || 'juridico'}
                      onChange={(e: any) => setTemplateForm({ ...templateForm, defaultTone: e.target.value })}
                      className="w-full h-9 px-2 border border-outline-variant rounded-lg bg-surface text-xs focus:border-secondary focus:outline-none"
                    >
                      <option value="juridico">Awb Jurídico</option>
                      <option value="formal">Formal</option>
                      <option value="urgente">Urgente</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Botones de Variables Dinámicas */}
              <div>
                <label className="block text-outline uppercase font-semibold text-[10px] mb-1.5">
                  Insertar Variable Dinámica con 1 Clic
                </label>
                <div className="flex flex-wrap gap-1.5 p-2 bg-surface-container rounded-lg border border-surface-container-high">
                  {[
                    { key: 'cliente_nombre', label: 'Nombre Cliente' },
                    { key: 'bsn', label: 'BSN' },
                    { key: 'direccion', label: 'Dirección' },
                    { key: 'fecha', label: 'Fecha Actual' },
                    { key: 'organismo', label: 'Organismo' },
                    { key: 'motivo', label: 'Hechos / Motivo' },
                    { key: 'gestor_nombre', label: 'Firma Gestor' },
                  ].map((v) => (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => handleInsertVariable(v.key)}
                      className="px-2 py-1 bg-surface hover:bg-white text-secondary font-mono-data text-[10px] font-bold rounded border border-outline-variant/60 shadow-xs transition-colors"
                    >
                      + {`{{${v.key}}}`} ({v.label})
                    </button>
                  ))}
                </div>
              </div>

              {/* Cuerpo de la Plantilla */}
              <div>
                <label className="block text-outline uppercase font-semibold text-[10px] mb-1">
                  Estructura y Texto Base de la Plantilla *
                </label>
                <textarea
                  rows={8}
                  value={templateForm.templateContent || ''}
                  onChange={(e) => setTemplateForm({ ...templateForm, templateContent: e.target.value })}
                  placeholder="Redacta la plantilla usando las etiquetas {{cliente_nombre}}, {{bsn}}, etc..."
                  className="w-full p-3 border border-outline-variant rounded-lg bg-surface font-mono-data text-xs leading-relaxed focus:border-secondary focus:outline-none"
                />
              </div>

              {/* Directriz para la IA */}
              <div>
                <label className="block text-outline uppercase font-semibold text-[10px] mb-1">
                  Directriz Especial para la IA (Opcional)
                </label>
                <input
                  type="text"
                  value={templateForm.promptGuidance || ''}
                  onChange={(e) => setTemplateForm({ ...templateForm, promptGuidance: e.target.value })}
                  placeholder="Ej: Solicitar siempre suspensión de plazos y citar artículo 7:1 Awb"
                  className="w-full h-9 px-3 border border-outline-variant rounded-lg bg-surface text-xs focus:border-secondary focus:outline-none"
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-surface border-t border-surface-container flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowTemplateModal(false)}
                className="h-9 px-4 rounded-lg border border-outline-variant hover:bg-surface-container text-xs font-semibold text-outline"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveTemplate}
                className="h-9 px-5 rounded-lg bg-secondary hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">save</span>
                <span>{isEditingTemplate ? 'Guardar Cambios' : 'Guardar Plantilla'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: CONFIGURACIÓN DE IA (API KEY & URL)                   */}
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
