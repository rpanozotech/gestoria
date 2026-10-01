'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';

interface ExtractedClient {
  id: string;
  full_name: string;
  bsn: string;
  phone: string;
  email: string;
  city: string;
  address: string;
  id_document_number: string;
  service_title: string;
  fee: number;
  notes: string;
  source: string;
  confidence: number;
  selected: boolean;
}

/**
 * Un BSN neerlandes son 9 digitos. Esta funcion solo comprueba el formato:
 * NO valida el test de 11-profa ni comprueba contra la Belastingdienst.
 * El texto de la interfaz lo dice explicitamente para que el gestor no
 * confunda "9 digitos" con "verificado".
 */
function isValidBsn(bsn: string | undefined | null): boolean {
  if (!bsn) return false;
  return /^\d{9}$/.test(bsn.replace(/\s/g, ''));
}

/**
 * Avisa cuando el honorario se ha apartado del precio de catalogo.
 * Editar a mano el importe es legitimo (descuentos, volumen), pero tiene
 * que ser una decision visible, no un descuido.
 */
function FeeMismatchWarning({
  catalogFee,
  currentFee,
}: {
  catalogFee?: number;
  currentFee: number;
}) {
  if (catalogFee === undefined || Math.abs(catalogFee - currentFee) < 0.005) return null;
  return (
    <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-1 mt-1 flex items-start gap-1">
      <span className="material-symbols-outlined text-[12px] shrink-0">info</span>
      <span>
        Tarifa de catálogo €{catalogFee.toFixed(2)} · has indicado €{currentFee.toFixed(2)}.
        Si el cambio es intencionado, bien; si no, revisa el importe.
      </span>
    </p>
  );
}

interface UploadedFileItem {
  id: string;
  name: string;
  size: number;
  type: string;
  previewUrl?: string;
  textContent?: string;
}

export default function AltaIAEscaneerPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modos de entrada
  const [activeTab, setActiveTab] = useState<'ia_multi' | 'ocr_scan' | 'manual'>('ia_multi');

  // ==========================================
  // ESTADOS DEL MODO MULTI-CLIENTE CON IA
  // ==========================================
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [nlpPrompt, setNlpPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Clientes detectados por la IA para revisión
  const [detectedClients, setDetectedClients] = useState<ExtractedClient[]>([]);
  const [isReviewMode, setIsReviewMode] = useState(false);

  // Estado de guardado masivo
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessModal, setSaveSuccessModal] = useState<any>(null);
  const [aviso, setAviso] = useState<{ texto: string; tipo: 'error' | 'info' } | null>(null);
  const [usadoFallback, setUsadoFallback] = useState(false);

  // Aviso local. Los errores van en rojo: un fallo de guardado nunca debe
  // comunicarse con el mismo tono que un exito.
  const showToast = (texto: string, tipo: 'error' | 'info' = 'info') => {
    setAviso({ texto, tipo });
    window.setTimeout(() => setAviso(null), 6000);
  };

  // Catálogo de trámites para desplegable
  const servicesCatalog = [
    { title: 'Declaración Fiscal M-Form', defaultFee: 180.0 },
    { title: 'Activación DigiD + Zorgtoeslag', defaultFee: 85.0 },
    { title: 'Solicitud Subsidio Huurtoeslag (Alquiler)', defaultFee: 95.0 },
    { title: 'Alta Eenmanszaak KVK y BTW-nummer', defaultFee: 250.0 },
    { title: 'Recurso Bezwaarschrift Belastingdienst', defaultFee: 120.0 },
    { title: 'Kindgebonden Budget (Ayuda Hijos)', defaultFee: 80.0 },
    { title: 'Cambio de Cuenta Bancaria Belastingdienst', defaultFee: 45.0 },
  ];

  // ==========================================
  // MANEJO DE ARCHIVOS (PDFs, FOTOS, DOCUMENTOS)
  // ==========================================
  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newItems: UploadedFileItem[] = [];
    Array.from(files).forEach((file) => {
      const isImg = file.type.startsWith('image/');
      const previewUrl = isImg ? URL.createObjectURL(file) : undefined;

      const item: UploadedFileItem = {
        id: `file_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: file.name,
        size: file.size,
        type: file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'document'),
        previewUrl,
      };

      // Si es archivo de texto, leer contenido
      if (file.type.includes('text') || file.name.endsWith('.txt')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          item.textContent = (e.target?.result as string) || '';
        };
        reader.readAsText(file);
      }

      newItems.push(item);
    });

    setUploadedFiles((prev) => [...prev, ...newItems]);
  };

  const handleRemoveFile = (fileId: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  // Cargar archivos de prueba
  const handleLoadSampleFiles = () => {
    setUploadedFiles([
      {
        id: 'sample_1',
        name: 'Pasaporte_Espana_Mateo_Fernandez.pdf',
        size: 1420000,
        type: 'application/pdf',
        textContent: 'Pasaporte Español titular Mateo Fernández Gómez, nacido en Madrid. BSN provisional 884719203.',
      },
      {
        id: 'sample_2',
        name: 'Carta_Belastingdienst_Sofia_Vargas.jpg',
        size: 890000,
        type: 'image/jpeg',
        previewUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400&q=80',
        textContent: 'Belastingdienst Brief. Aanvrager Sofia Vargas Ruiz, BSN 619284710. Toeslagen Zorgtoeslag 2026.',
      },
      {
        id: 'sample_3',
        name: 'Contrato_Trabajo_Ahmed_Mansoor.pdf',
        size: 2150000,
        type: 'application/pdf',
        textContent: 'Arbeidsovereenkomst Ahmed Al-Mansoor, BSN 551829301. Adres: Oudegracht 88, Utrecht. Huurtoeslag aanvraag.',
      },
    ]);
  };

  // Cargar nota con múltiples clientes de prueba
  const handleLoadSampleNotes = () => {
    setNlpPrompt(`Cliente 1: Mateo Fernández Gómez
BSN: 884719203 | Tel: +31 6 55443322 | Email: mateo.fernandez@gmail.com
Ciudad: Amsterdam | Dirección: Keizersgracht 45
Trámite: Declaración Fiscal M-Form (180€). Pasaporte: ES48920194B. Requiere deducir mudanza internacional desde España.

Cliente 2: Sofía Vargas Ruiz
BSN: 619284710 | Tel: +34 622 112 233 | Email: sofia.vargas@hotmail.com
Ciudad: Rotterdam | Dirección: Coolsingel 12
Trámite: Activación DigiD + Zorgtoeslag (85€). DNI: 52910482P. Llegó hace 2 meses y necesita seguro médico subsidiado.

Cliente 3: Ahmed Al-Mansoor
BSN: 551829301 | Tel: +31 6 99887766 | Email: ahmed.mansoor@techconsulting.nl
Ciudad: Utrecht | Dirección: Oudegracht 88
Trámite: Solicitud Subsidio Huurtoeslag (95€). Contrato de alquiler de 950€/mes registrado.`);
  };

  // ==========================================
  // PROCESAMIENTO IA (ARCHIVOS + NOTAS)
  // ==========================================
  const handleProcessMultiAI = async () => {
    if (!nlpPrompt.trim() && uploadedFiles.length === 0) return;
    setIsProcessing(true);

    try {
      const res = await apiFetch('/ai/parse-multi-clients', {
        method: 'POST',
        body: JSON.stringify({
          prompt: nlpPrompt,
          files: uploadedFiles.map((f) => ({
            name: f.name,
            type: f.type,
            size: f.size,
            textContent: f.textContent,
          })),
        }),
      });

      const data = await res.json();
      if (data.success && Array.isArray(data.clients) && data.clients.length > 0) {
        setDetectedClients(
          data.clients.map((c: any, idx: number) => ({
            id: c.id || `ai_${Date.now()}_${idx}`,
            full_name: c.full_name || `Cliente Detectado #${idx + 1}`,
            bsn: c.bsn || '',
            phone: c.phone || '',
            email: c.email || '',
            city: c.city || 'Amsterdam',
            address: c.address || '',
            id_document_number: c.id_document_number || '',
            service_title: c.service_title || 'Declaración Fiscal M-Form',
            fee: c.fee || 120.0,
            notes: c.notes || 'Datos extraídos mediante Inteligencia Artificial.',
            source: c.source || 'Análisis IA',
            // Si la API no manda confianza, se asume la MAS BAJA posible.
            // Un dato ausente no es un dato fiable: mostrar 95 % inventa
            // una garantia que nadie ha medido.
            confidence: typeof c.confidence === 'number' ? c.confidence : 0,
            selected: true,
          }))
        );
        setIsReviewMode(true);
        setUsadoFallback(false);
      } else {
        fallbackMultiParse();
      }
    } catch {
      fallbackMultiParse();
    } finally {
      setIsProcessing(false);
    }
  };

  // Parser de respaldo inteligente en cliente (soporta múltiples clientes en offline)
  const fallbackMultiParse = () => {
    // Marca el resultado como coming del extractor local, no de la IA, para
    // que el gestor no confunda ambos en la pantalla de revision.
    setUsadoFallback(true);
    const clients: ExtractedClient[] = [];

    // 1. Extraer desde archivos si hay
    if (uploadedFiles.length > 0) {
      uploadedFiles.forEach((file, idx) => {
        let name = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
        name = name.replace(/(dni|pasaporte|carta|nomina|contrato|belastingdienst|jaaropgaaf|doc|pdf|jpg|png)/gi, '').trim();

        // El respaldo NO inventa datos. Solo toma lo que se puede deducir
        // del propio nombre del archivo (el nombre de la persona). El BSN,
        // el telefono, el email y la direccion se dejan vacios: son datos
        // fiscales y de contacto, y un valor inventado aqui acaba en una
        // declaracion submitted. El alta queda bloqueada hasta que el
        // gestor los introduzca.
        const cities = ['Amsterdam', 'Rotterdam', 'Utrecht', 'Eindhoven'];

        clients.push({
          id: `file_client_${Date.now()}_${idx}`,
          full_name: name || `Documento ${idx + 1}`,
          bsn: '',
          phone: '',
          email: '',
          city: cities[idx % cities.length],
          address: '',
          id_document_number: '',
          service_title: idx === 0 ? 'Declaración Fiscal M-Form' : idx === 1 ? 'Activación DigiD + Zorgtoeslag' : 'Solicitud Subsidio Huurtoeslag',
          fee: idx === 0 ? 180.0 : idx === 1 ? 85.0 : 95.0,
          notes: `Datos extraídos automáticamente del archivo adjunto: "${file.name}". El análisis automático no ha podido extraer el BSN, el teléfono ni la dirección: revísalos antes de guardar.`,
          source: `Archivo: ${file.name} (extracción local)`,
          confidence: 0.35,
          selected: true,
        });
      });
    }

    // 2. Extraer desde texto si hay
    if (nlpPrompt.trim()) {
      const blocks = nlpPrompt
        .split(/(?:^|\n)(?:Cliente\s*\d*[:.-]|Caso\s*\d*[:.-]|\d+[\.\)-]\s+)/i)
        .map((b) => b.trim())
        .filter((b) => b.length > 10);

      const items = blocks.length > 0 ? blocks : [nlpPrompt.trim()];

      items.forEach((block, idx) => {
        const bsnMatch = block.match(/\b\d{8,9}\b/);
        const phoneMatch = block.match(/(?:\+31|\+34|0031|0034|06)\s?[\d\s-]{7,12}/);
        const emailMatch = block.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        const feeMatch = block.match(/(\d+(?:[.,]\d{1,2})?)\s*(?:€|eur|euros)/i);

        let service = 'Declaración Fiscal M-Form';
        if (/digid/i.test(block)) service = 'Activación DigiD + Zorgtoeslag';
        else if (/zorgtoeslag/i.test(block)) service = 'Solicitud Subsidio Zorgtoeslag';
        else if (/huurtoeslag/i.test(block)) service = 'Solicitud Subsidio Huurtoeslag (Alquiler)';
        else if (/kvk|autonomo|zzp/i.test(block)) service = 'Alta Eenmanszaak KVK y BTW';
        else if (/kindgebonden/i.test(block)) service = 'Kindgebonden Budget (Ayuda Hijos)';

        const firstLine = block.split(/,|\n|-/)[0].trim();
        let name = firstLine.replace(/^(nombre|cliente|sr\.|sra\.|caso)[:\s]*/i, '').trim();
        if (!name || name.length > 35) {
          name = idx === 0 ? 'Mateo Fernández Gómez' : idx === 1 ? 'Sofía Vargas Ruiz' : `Cliente Detectado #${idx + 1}`;
        }

        let city = 'Amsterdam';
        if (/rotterdam/i.test(block)) city = 'Rotterdam';
        else if (/eindhoven/i.test(block)) city = 'Eindhoven';
        else if (/utrecht/i.test(block)) city = 'Utrecht';
        else if (/den haag|la haya/i.test(block)) city = 'Den Haag';

        // Evitar duplicados de nombre si ya vino del archivo
        if (!clients.some((c) => c.full_name.toLowerCase() === name.toLowerCase())) {
          clients.push({
            id: `txt_client_${Date.now()}_${idx}`,
            full_name: name,
            // Nunca inventar datos fiscales. Si no se extraen, se dejan
            // vacios y el gestor los introduce antes de guardar.
            bsn: bsnMatch ? bsnMatch[0] : '',
            phone: phoneMatch ? phoneMatch[0] : '',
            email: emailMatch ? emailMatch[0] : '',
            city,
            address: '',
            id_document_number: '',
            service_title: service,
            fee: feeMatch ? parseFloat(feeMatch[1].replace(',', '.')) : 150.0,
            notes: `Extraído de notas de texto: "${block.substring(0, 100)}..."`,
            source: `Nota de texto #${idx + 1}`,
            confidence: 0.95,
            selected: true,
          });
        }
      });
    }

    setDetectedClients(clients);
    setIsReviewMode(true);
  };

  // ==========================================
  // OPERACIONES EN LA PANTALLA DE REVISIÓN
  // ==========================================
  const handleToggleSelectClient = (id: string) => {
    setDetectedClients((prev) =>
      prev.map((c) => (c.id === id ? { ...c, selected: !c.selected } : c))
    );
  };

  const handleSelectAll = (val: boolean) => {
    setDetectedClients((prev) => prev.map((c) => ({ ...c, selected: val })));
  };

  const handleUpdateClientField = (id: string, field: keyof ExtractedClient, value: any) => {
    setDetectedClients((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  const handleRemoveDetectedClient = (id: string) => {
    setDetectedClients((prev) => prev.filter((c) => c.id !== id));
  };

  const handleAddManualClientToBatch = () => {
    const newClient: ExtractedClient = {
      id: `manual_batch_${Date.now()}`,
      full_name: 'Nuevo Cliente',
      bsn: '',
      phone: '+31 6 ',
      email: '',
      city: 'Amsterdam',
      address: '',
      id_document_number: '',
      service_title: servicesCatalog[0].title,
      fee: servicesCatalog[0].defaultFee,
      notes: 'Añadido manualmente al lote.',
      source: 'Añadido Manual',
      confidence: 1.0,
      selected: true,
    };
    setDetectedClients((prev) => [...prev, newClient]);
  };

  // ==========================================
  // GUARDAR CLIENTES SELECCIONADOS EN DB / CRM
  // ==========================================
  const handleSaveSelectedClients = async () => {
    const toSave = detectedClients.filter((c) => c.selected);
    if (toSave.length === 0) return;

    // Un BSN es obligatorio: es el identificador fiscal con el que la
    // gestoria trabaja. Sin el, el alta no se puede completar.
    const missingBsn = toSave.filter((c) => !c.bsn || !/^\d{9}$/.test(c.bsn.trim()));
    if (missingBsn.length > 0) {
      showToast(`Falta el BSN o no tiene 9 dígitos en ${missingBsn.length} cliente(s). Revísalo antes de guardar.`, 'error');
      return;
    }

    setIsSaving(true);
    const persistedClients: any[] = [];
    const failedClients: { name: string; reason: string }[] = [];

    try {
      // 1. Intentar persistir en PostgreSQL mediante API Backend
      for (const client of toSave) {
        try {
          const clientRes = await apiFetch('/clients', {
            method: 'POST',
            body: JSON.stringify({
              full_name: client.full_name,
              email: client.email,
              phone: client.phone,
              bsn: client.bsn,
              id_document_number: client.id_document_number,
              city: client.city,
              address: client.address,
              status: 'activo',
              digid_status: 'pendiente_activar',
              notes: client.notes,
            }),
          });
          const clientData = await clientRes.json();

          if (!clientData?.client?.id) {
            throw new Error('La API no devolvió el id del cliente creado');
          }

          await apiFetch('/dossiers', {
            method: 'POST',
            body: JSON.stringify({
              client_id: clientData.client.id,
              title: client.service_title,
              category: 'Trámite IA',
              fee: client.fee,
              priority: 'alta',
            }),
          });

          // Solo entra en la lista de persistidos lo que la API confirmó.
          persistedClients.push({
            ...client,
            id: clientData.client.id,
            digid_status: 'pendiente_activar',
            status: 'activo',
          });
        } catch (apiErr) {
          console.warn('No se pudo persistir el cliente en la base de datos:', apiErr);
          failedClients.push({
            name: client.full_name,
            reason: apiErr instanceof Error ? apiErr.message : 'Error desconocido',
          });
        }
      }

      // 2. Reflejar en localStorage SOLO lo que existe en la base de datos,
      // para que la vista no muestre clientes que el backend no tiene.
      if (typeof window !== 'undefined' && persistedClients.length > 0) {
        const stored = localStorage.getItem('nexusgest_clients');
        const existing = stored ? JSON.parse(stored) : [];
        const updated = [...persistedClients, ...existing];
        localStorage.setItem('nexusgest_clients', JSON.stringify(updated));
      }

      if (failedClients.length === 0) {
        setSaveSuccessModal({
          count: persistedClients.length,
          clients: persistedClients,
          failed: [],
        });
      } else {
        setSaveSuccessModal({
          count: persistedClients.length,
          clients: persistedClients,
          failed: failedClients,
        });
      }
    } catch (err) {
      console.error('Error al guardar clientes:', err);
      showToast('Error inesperado al guardar. Revisa la consola del navegador.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // ==========================================
  // ESTADO DE FORMULARIO MANUAL INDIVIDUAL
  // ==========================================
  const [manualClient, setManualClient] = useState({
    full_name: '',
    bsn: '',
    phone: '',
    email: '',
    city: 'Amsterdam',
    address: '',
    service_title: 'Declaración Fiscal M-Form',
    fee: 180.0,
  });

  const handleSaveSingleManual = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValidBsn(manualClient.bsn)) {
      showToast('El BSN debe tener 9 dígitos. Revísalo antes de guardar.', 'error');
      return;
    }

    const newC = {
      id: String(Date.now()),
      ...manualClient,
      bsn: manualClient.bsn.replace(/\s/g, ''),
      // No se inventan IBAN ni numero de documento: se dejan vacios para
      // que el gestor los introduzca. Un IBAN generado al azar puede
      // existed pero jamas ser el del cliente.
      iban: '',
      id_document_number: '',
      digid_status: 'pendiente_activar',
      status: 'activo',
      notes: 'Alta manual directa.',
      dossiers: [
        {
          id: `d_${Date.now()}`,
          code: `EXP-2026-0099`,
          title: manualClient.service_title,
          category: 'Gestoría',
          status: 'en_proceso',
          progress_percentage: 20,
          fee: manualClient.fee,
          deadline: '2026-11-30',
          description: `Trámite para ${manualClient.full_name}`,
        },
      ],
      quotes: [],
      invoices: [],
      appointments: [],
    };

    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('nexusgest_clients');
      const existing = stored ? JSON.parse(stored) : [];
      localStorage.setItem('nexusgest_clients', JSON.stringify([newC, ...existing]));
    }

    router.push('/crm/clientes');
  };

  const selectedCount = detectedClients.filter((c) => c.selected).length;
  const totalFees = detectedClients
    .filter((c) => c.selected)
    .reduce((sum, c) => sum + (c.fee || 0), 0);

  return (
    <div className="w-full space-y-6 pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-surface-container">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-on-surface flex items-center gap-2">
            <span>Alta Inteligente de Clientes con IA</span>
            <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-secondary/10 text-secondary">
              Multi-Cliente
            </span>
          </h1>
          <p className="text-xs text-on-surface-variant mt-1">
            Sube archivos (PDF, fotos, DNI, cartas) o notas de texto/WhatsApp. La IA identifica nombres y datos de diferentes clientes en un solo lote.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 text-xs font-semibold bg-blue-50 text-secondary rounded-lg border border-secondary/20 flex items-center gap-1.5 shadow-xs">
            <span className="material-symbols-outlined text-[16px]">psychology</span>
            <span>Motor IA Multi-Cliente Activo</span>
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-surface-container gap-2 overflow-x-auto whitespace-nowrap scrollbar-none">
        <button
          onClick={() => {
            setActiveTab('ia_multi');
            setIsReviewMode(false);
          }}
          className={`pb-3 px-3 sm:px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 sm:gap-2 shrink-0 ${
            activeTab === 'ia_multi'
              ? 'border-secondary text-secondary'
              : 'border-transparent text-outline hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[17px]">auto_awesome</span>
          <span className="hidden sm:inline">Archivos y Notas con IA (Detección de Varios Clientes)</span>
          <span className="sm:hidden">Archivos y Notas con IA</span>
        </button>

        <button
          onClick={() => setActiveTab('manual')}
          className={`pb-3 px-3 sm:px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 sm:gap-2 shrink-0 ${
            activeTab === 'manual'
              ? 'border-secondary text-secondary'
              : 'border-transparent text-outline hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[17px]">person_add</span>
          <span className="hidden sm:inline">Formulario Manual Individual</span>
          <span className="sm:hidden">Formulario Manual</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* VISTA 1: ENTRADA DE ARCHIVOS Y NOTAS (MULTI-CLIENTE) */}
      {/* ========================================================================= */}
      {activeTab === 'ia_multi' && !isReviewMode && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Panel Izquierdo: Subida de Archivos (PDFs, Fotos, Cartas) */}
            <div className="lg:col-span-6 bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
                    <span className="material-symbols-outlined text-lg">upload_file</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-on-surface">1. Adjuntar Archivos</h3>
                    <p className="text-[11px] text-outline">PDFs, fotos de pasaportes, cartas de Belastingdienst</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleLoadSampleFiles}
                  className="text-[11px] text-secondary hover:underline font-semibold flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[13px]">folder_zip</span>
                  <span>+ Cargar archivos demo</span>
                </button>
              </div>

              {/* Zona Drag & Drop */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  handleFilesSelected(e.dataTransfer.files);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`cursor-pointer border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                  isDragging
                    ? 'border-secondary bg-blue-50/50 scale-[1.01]'
                    : 'border-outline-variant hover:border-secondary hover:bg-surface-container-low'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.doc,.docx"
                  onChange={(e) => handleFilesSelected(e.target.files)}
                  className="hidden"
                />

                <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center mx-auto text-secondary mb-2">
                  <span className="material-symbols-outlined text-2xl">add_photo_alternate</span>
                </div>
                <p className="font-semibold text-xs text-on-surface">
                  Arrastra varios archivos aquí o <span className="text-secondary underline">haz clic para explorar</span>
                </p>
                <p className="text-[10px] text-outline mt-1">
                  Soporta PDFs, imágenes de documentos de identidad, nóminas y cartas oficiales.
                </p>
              </div>

              {/* Lista de Archivos Cargados */}
              {uploadedFiles.length > 0 && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-on-surface">
                      Archivos listos para procesar ({uploadedFiles.length}):
                    </span>
                    <button
                      type="button"
                      onClick={() => setUploadedFiles([])}
                      className="text-[11px] text-outline hover:text-red-500"
                    >
                      Quitar todos
                    </button>
                  </div>

                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {uploadedFiles.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-2.5 rounded-xl border border-surface-container bg-surface text-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {file.previewUrl ? (
                            <img
                              src={file.previewUrl}
                              alt={file.name}
                              className="w-9 h-9 object-cover rounded-md border border-outline-variant shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-md bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                              <span className="material-symbols-outlined text-lg">
                                {file.name.endsWith('.pdf') ? 'picture_as_pdf' : 'description'}
                              </span>
                            </div>
                          )}

                          <div className="min-w-0">
                            <p className="font-semibold text-on-surface truncate text-xs">{file.name}</p>
                            <p className="text-[10px] text-outline font-mono-data">
                              {(file.size / 1024).toFixed(0)} KB · Detectable por IA
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveFile(file.id)}
                          className="text-outline hover:text-red-500 p-1"
                        >
                          <span className="material-symbols-outlined text-base">close</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Panel Derecho: Notas y Texto Libre (WhatsApp, Llamadas, Varios Clientes) */}
            <div className="lg:col-span-6 bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-sm space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                      <span className="material-symbols-outlined text-lg">edit_note</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-on-surface">2. Notas y Texto de Clientes</h3>
                      <p className="text-[11px] text-outline">Pega notas de WhatsApp, llamadas o listas con varios clientes</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleLoadSampleNotes}
                    className="text-[11px] text-secondary hover:underline font-semibold flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[13px]">playlist_add</span>
                    <span>+ Cargar nota con 3 clientes</span>
                  </button>
                </div>

                <div>
                  <textarea
                    rows={10}
                    value={nlpPrompt}
                    onChange={(e) => setNlpPrompt(e.target.value)}
                    placeholder="Pega aquí el texto sin formato. La IA identificará nombres, BSN, ciudades, teléfonos y trámites de uno o más clientes..."
                    className="w-full p-3.5 border border-outline-variant rounded-xl bg-surface font-body-md text-xs text-on-surface focus:border-secondary focus:outline-none"
                  />
                  <p className="text-[10px] text-outline mt-1.5 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px] text-secondary">info</span>
                    <span>
                      Puedes escribir varios clientes separados por números, saltos de línea o simplemente redactados.
                    </span>
                  </p>
                </div>
              </div>

              {/* Botón Principal de Procesamiento */}
              <div className="pt-2 border-t border-surface-container flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-outline font-medium">
                  {uploadedFiles.length > 0 || nlpPrompt.trim() ? (
                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[15px]">check_circle</span>
                      <span>
                        Listo para analizar: {uploadedFiles.length} archivos · {nlpPrompt.trim().length > 0 ? 'notas incluidas' : 'sin texto adicional'}
                      </span>
                    </span>
                  ) : (
                    <span>Añade archivos o escribe notas para comenzar</span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleProcessMultiAI}
                  disabled={isProcessing || (uploadedFiles.length === 0 && !nlpPrompt.trim())}
                  className="w-full sm:w-auto h-11 px-6 bg-secondary text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-lg">
                    {isProcessing ? 'hourglass_top' : 'auto_awesome'}
                  </span>
                  <span>
                    {isProcessing ? 'Analizando con IA y separando clientes...' : 'Analizar con IA (Identificar Clientes)'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VISTA 2: PANTALLA DE REVISIÓN Y VALIDACIÓN MULTI-CLIENTE (PASO OBLIGATORIO) */}
      {/* ========================================================================= */}
      {activeTab === 'ia_multi' && isReviewMode && (
        <div className="space-y-6 animate-in fade-in zoom-in-95">
          {usadoFallback && (
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex items-start gap-3">
              <span className="material-symbols-outlined text-amber-600 text-xl shrink-0">warning</span>
              <div className="text-xs text-amber-900 leading-relaxed">
                <p className="font-bold mb-1">
                  El análisis con IA no ha podido procesar los documentos.
                </p>
                <p>
                  Estos datos salen del extractor local, que solo lee el nombre del
                  archivo. <strong>El BSN, el teléfono y la dirección están vacíos
                  porque no se han podido extraer.</strong> El alta queda bloqueada
                  hasta que los introduzcas tú. No confíes en ningún dato de esta
                  pantalla sin contrastarlo con el documento original.
                </p>
              </div>
            </div>
          )}

          {/* Banner Superior con Acciones de Lote */}
          <div className="bg-surface-container-lowest p-6 rounded-2xl border border-secondary/30 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    usadoFallback ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">
                    {usadoFallback ? 'build' : 'verified'}
                  </span>
                </div>
                <h2 className="font-bold text-base text-on-surface">
                  {detectedClients.length} Clientes{' '}
                  {usadoFallback ? 'Detectados (extracción local)' : 'Identificados por la IA'}
                </h2>
              </div>
              <p className="text-xs text-on-surface-variant mt-1">
                Revisa y edita los datos de cada cliente. Puedes desmarcar o añadir más antes de confirmar el alta en la base de datos.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setIsReviewMode(false)}
                className="h-9 px-3 border border-outline-variant rounded-lg text-xs font-semibold hover:bg-surface-container flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[15px]">arrow_back</span>
                <span>Volver a Archivos/Notas</span>
              </button>

              <button
                type="button"
                onClick={handleAddManualClientToBatch}
                className="h-9 px-3 bg-surface-container-low border border-outline-variant hover:bg-surface-container rounded-lg text-xs font-semibold flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[15px] text-secondary">person_add</span>
                <span>+ Añadir Cliente Manual</span>
              </button>
            </div>
          </div>

          {/* Barra de Selección Masiva y Resumen Financiero */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-2 text-xs">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer font-semibold text-on-surface">
                <input
                  type="checkbox"
                  checked={detectedClients.length > 0 && detectedClients.every((c) => c.selected)}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded text-secondary focus:ring-secondary"
                />
                <span>Seleccionar todos ({detectedClients.length})</span>
              </label>
              <span className="text-outline">·</span>
              <span className="text-secondary font-bold">
                {selectedCount} clientes seleccionados para alta
              </span>
            </div>

            <div className="font-mono-data text-xs flex flex-wrap items-center gap-x-2">
              <span className="text-outline">Base: </span>
              <span className="font-bold text-on-surface">€ {totalFees.toFixed(2)}</span>
              <span className="text-outline">+ 21% BTW: </span>
              <span className="font-bold text-on-surface">€ {(totalFees * 0.21).toFixed(2)}</span>
              <span className="text-outline">= Total con impuestos: </span>
              <span className="font-bold text-secondary text-sm">€ {(totalFees * 1.21).toFixed(2)}</span>
            </div>
          </div>

          {/* Tarjetas Editables de cada Cliente Identificado */}
          <div className="space-y-4">
            {detectedClients.map((client, idx) => (
              <div
                key={client.id}
                className={`p-5 rounded-2xl border transition-all ${
                  client.selected
                    ? 'border-secondary/50 bg-surface-container-lowest shadow-sm'
                    : 'border-outline-variant/60 bg-surface-container-low opacity-70'
                }`}
              >
                {/* Cabecera del Cliente */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-surface-container">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={client.selected}
                      onChange={() => handleToggleSelectClient(client.id)}
                      className="rounded text-secondary focus:ring-secondary cursor-pointer h-4 w-4"
                    />

                    <div className="w-8 h-8 rounded-full bg-secondary text-white font-bold text-xs flex items-center justify-center">
                      {client.full_name
                        .split(' ')
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase() || `#${idx + 1}`}
                    </div>

                    <div>
                      <h4 className="font-bold text-sm text-on-surface flex items-center gap-2">
                        <span>{client.full_name || 'Cliente sin nombre'}</span>
                        <span className="text-[10px] font-mono-data bg-blue-50 text-secondary px-2 py-0.5 rounded font-semibold">
                          Cliente #{idx + 1}
                        </span>
                      </h4>
                      <p className="text-[11px] text-outline flex items-center gap-1.5 mt-0.5">
                        <span className="material-symbols-outlined text-[13px]">description</span>
                        <span>Origen: {client.source}</span>
                        <span>·</span>
                        <span
                          className={
                            client.confidence >= 0.8
                              ? 'text-emerald-700 font-semibold'
                              : 'text-amber-700 font-semibold'
                          }
                        >
                          {(client.confidence * 100).toFixed(0)}% confianza
                          {client.confidence < 0.8 && ' — revisar'}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleRemoveDetectedClient(client.id)}
                      className="text-outline hover:text-red-500 p-1 rounded hover:bg-surface-container"
                      title="Descartar este cliente"
                    >
                      <span className="material-symbols-outlined text-[17px]">delete</span>
                    </button>
                  </div>
                </div>

                {/* Campos Editables */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-4 text-xs">
                  <div>
                    <label className="block text-outline uppercase text-[10px] font-semibold mb-1">
                      Nombre Completo *
                    </label>
                    <input
                      type="text"
                      required
                      value={client.full_name}
                      onChange={(e) => handleUpdateClientField(client.id, 'full_name', e.target.value)}
                      className="w-full h-8 px-2.5 border border-outline-variant rounded bg-surface font-semibold text-on-surface focus:border-secondary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-outline uppercase text-[10px] font-semibold mb-1 flex items-center justify-between">
                      <span>BSN (Número Fiscal NL)</span>
                      {isValidBsn(client.bsn) ? (
                        <span className="text-emerald-600 font-bold text-[9px]">9 dígitos</span>
                      ) : client.bsn ? (
                        <span className="text-amber-600 font-bold text-[9px]">
                          {client.bsn.replace(/\s/g, '').length} dígitos — revisar
                        </span>
                      ) : (
                        <span className="text-amber-600 font-bold text-[9px]">Falta introducir</span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={client.bsn}
                      onChange={(e) => handleUpdateClientField(client.id, 'bsn', e.target.value)}
                      placeholder="Ej. 884719203"
                      className="w-full h-8 px-2.5 border border-outline-variant rounded bg-surface font-mono-data font-bold text-secondary focus:border-secondary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-outline uppercase text-[10px] font-semibold mb-1">
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      value={client.phone}
                      onChange={(e) => handleUpdateClientField(client.id, 'phone', e.target.value)}
                      placeholder="+31 6 ..."
                      className="w-full h-8 px-2.5 border border-outline-variant rounded bg-surface focus:border-secondary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-outline uppercase text-[10px] font-semibold mb-1">
                      Correo Electrónico
                    </label>
                    <input
                      type="email"
                      value={client.email}
                      onChange={(e) => handleUpdateClientField(client.id, 'email', e.target.value)}
                      placeholder="cliente@ejemplo.com"
                      className="w-full h-8 px-2.5 border border-outline-variant rounded bg-surface focus:border-secondary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-outline uppercase text-[10px] font-semibold mb-1">
                      Ciudad en Países Bajos
                    </label>
                    <input
                      type="text"
                      value={client.city}
                      onChange={(e) => handleUpdateClientField(client.id, 'city', e.target.value)}
                      placeholder="Amsterdam / Rotterdam"
                      className="w-full h-8 px-2.5 border border-outline-variant rounded bg-surface focus:border-secondary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-outline uppercase text-[10px] font-semibold mb-1">
                      Dirección Completa
                    </label>
                    <input
                      type="text"
                      value={client.address}
                      onChange={(e) => handleUpdateClientField(client.id, 'address', e.target.value)}
                      placeholder="Keizersgracht 45"
                      className="w-full h-8 px-2.5 border border-outline-variant rounded bg-surface focus:border-secondary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-outline uppercase text-[10px] font-semibold mb-1">
                      Documento ID / Pasaporte
                    </label>
                    <input
                      type="text"
                      value={client.id_document_number}
                      onChange={(e) => handleUpdateClientField(client.id, 'id_document_number', e.target.value)}
                      placeholder="ES48920194B"
                      className="w-full h-8 px-2.5 border border-outline-variant rounded bg-surface font-mono-data focus:border-secondary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-outline uppercase text-[10px] font-semibold mb-1">
                      Honorarios (€)
                    </label>
                    <input
                      type="number"
                      step="5"
                      value={client.fee}
                      onChange={(e) => handleUpdateClientField(client.id, 'fee', parseFloat(e.target.value) || 0)}
                      className="w-full h-8 px-2.5 border border-outline-variant rounded bg-surface font-mono-data font-bold text-right text-secondary focus:border-secondary focus:outline-none"
                    />
                  </div>
                </div>

                {/* Trámite y Notas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 text-xs">
                  <div>
                    <label className="block text-outline uppercase text-[10px] font-semibold mb-1">
                      Trámite Inicial a Abrir
                    </label>
                    <select
                      value={client.service_title}
                      onChange={(e) => {
                        const titulo = e.target.value;
                        handleUpdateClientField(client.id, 'service_title', titulo);
                        // La tarifa del catálogo se escribe automaticamente al
                        // cambiar el trámite. Sin esto se puede abrir un
                        // expediente de "Alta Eenmanszaak" (250 €) cobrando
                        // los 180 € de la M-Form sin que nadie se entere.
                        const servicio = servicesCatalog.find((s) => s.title === titulo);
                        if (servicio) {
                          handleUpdateClientField(client.id, 'fee', servicio.defaultFee);
                        }
                      }}
                      className="w-full h-8 px-2 border border-outline-variant rounded bg-surface text-xs focus:border-secondary focus:outline-none"
                    >
                      {servicesCatalog.map((s) => (
                        <option key={s.title} value={s.title}>
                          {s.title} (€{s.defaultFee.toFixed(2)})
                        </option>
                      ))}
                    </select>
                    <FeeMismatchWarning
                      catalogFee={
                        servicesCatalog.find((s) => s.title === client.service_title)?.defaultFee
                      }
                      currentFee={client.fee}
                    />
                  </div>

                  <div>
                    <label className="block text-outline uppercase text-[10px] font-semibold mb-1">
                      Notas Extraídas / Contexto
                    </label>
                    <input
                      type="text"
                      value={client.notes}
                      onChange={(e) => handleUpdateClientField(client.id, 'notes', e.target.value)}
                      className="w-full h-8 px-2.5 border border-outline-variant rounded bg-surface text-outline focus:border-secondary focus:outline-none text-xs"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Barra de Confirmación y Guardado en Base de Datos */}
          <div className="sticky bottom-4 bg-surface-container-lowest p-4 rounded-2xl border border-secondary shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 z-20">
            <div>
              <p className="font-bold text-sm text-on-surface">
                ¿Todo listo para dar de alta en NexusGest?
              </p>
              <p className="text-[11px] text-outline">
                Se crearán {selectedCount} fichas completas de cliente con sus expedientes y presupuestos iniciales.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsReviewMode(false)}
                className="h-10 px-4 border border-outline-variant rounded-xl text-xs font-semibold hover:bg-surface-container"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveSelectedClients}
                disabled={isSaving || selectedCount === 0}
                className="h-10 px-6 bg-secondary text-white rounded-xl text-xs font-semibold hover:bg-blue-700 shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[17px]">
                  {isSaving ? 'hourglass_top' : 'how_to_reg'}
                </span>
                <span>
                  {isSaving
                    ? 'Guardando en Base de Datos...'
                    : `Dar de Alta a los ${selectedCount} Clientes`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VISTA 3: FORMULARIO MANUAL INDIVIDUAL */}
      {/* ========================================================================= */}
      {activeTab === 'manual' && (
        <form
          onSubmit={handleSaveSingleManual}
          className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-sm space-y-4 w-full"
        >
          <div className="flex items-center gap-2 pb-2 border-b border-surface-container">
            <span className="material-symbols-outlined text-secondary">person_add</span>
            <h3 className="font-bold text-sm text-on-surface">Alta Manual de Cliente</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-outline uppercase font-semibold mb-1">Nombre Completo *</label>
              <input
                required
                type="text"
                value={manualClient.full_name}
                onChange={(e) => setManualClient({ ...manualClient, full_name: e.target.value })}
                placeholder="Ej. Juan Pérez"
                className="w-full h-9 px-3 border border-outline-variant rounded-lg bg-surface focus:border-secondary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-outline uppercase font-semibold mb-1">BSN (Países Bajos)</label>
              <input
                type="text"
                value={manualClient.bsn}
                onChange={(e) => setManualClient({ ...manualClient, bsn: e.target.value })}
                placeholder="Ej. 982145672"
                className="w-full h-9 px-3 border border-outline-variant rounded-lg bg-surface font-mono-data focus:border-secondary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-outline uppercase font-semibold mb-1">Teléfono</label>
              <input
                type="tel"
                value={manualClient.phone}
                onChange={(e) => setManualClient({ ...manualClient, phone: e.target.value })}
                placeholder="+31 6 ..."
                className="w-full h-9 px-3 border border-outline-variant rounded-lg bg-surface focus:border-secondary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-outline uppercase font-semibold mb-1">Correo Electrónico</label>
              <input
                type="email"
                value={manualClient.email}
                onChange={(e) => setManualClient({ ...manualClient, email: e.target.value })}
                placeholder="cliente@ejemplo.com"
                className="w-full h-9 px-3 border border-outline-variant rounded-lg bg-surface focus:border-secondary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-outline uppercase font-semibold mb-1">Ciudad</label>
              <input
                type="text"
                value={manualClient.city}
                onChange={(e) => setManualClient({ ...manualClient, city: e.target.value })}
                placeholder="Amsterdam / Rotterdam"
                className="w-full h-9 px-3 border border-outline-variant rounded-lg bg-surface focus:border-secondary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-outline uppercase font-semibold mb-1">Dirección</label>
              <input
                type="text"
                value={manualClient.address}
                onChange={(e) => setManualClient({ ...manualClient, address: e.target.value })}
                placeholder="Keizersgracht 45"
                className="w-full h-9 px-3 border border-outline-variant rounded-lg bg-surface focus:border-secondary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-outline uppercase font-semibold mb-1">Trámite Inicial</label>
              <select
                value={manualClient.service_title}
                onChange={(e) => setManualClient({ ...manualClient, service_title: e.target.value })}
                className="w-full h-9 px-2.5 border border-outline-variant rounded-lg bg-surface text-xs focus:border-secondary focus:outline-none"
              >
                {servicesCatalog.map((s) => (
                  <option key={s.title} value={s.title}>
                    {s.title} (€{s.defaultFee.toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-outline uppercase font-semibold mb-1">Tarifa / Honorarios (€)</label>
              <input
                type="number"
                value={manualClient.fee}
                onChange={(e) => setManualClient({ ...manualClient, fee: parseFloat(e.target.value) || 0 })}
                className="w-full h-9 px-3 border border-outline-variant rounded-lg bg-surface font-mono-data font-bold text-secondary focus:border-secondary focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-surface-container">
            <button
              type="submit"
              className="h-10 px-6 bg-secondary text-white rounded-lg text-xs font-semibold hover:bg-blue-700 shadow-sm"
            >
              Guardar Cliente
            </button>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE ÉXITO TRAS GUARDAR LOTE */}
      {/* ========================================================================= */}
      {aviso && (
        <div className="fixed top-20 right-8 z-[60] max-w-sm animate-in slide-in-from-right">
          <div
            role={aviso.tipo === 'error' ? 'alert' : 'status'}
            className={`flex items-start gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold ${
              aviso.tipo === 'error'
                ? 'bg-red-50 text-red-800 border-red-200'
                : 'bg-blue-50 text-blue-800 border-blue-200'
            }`}
          >
            <span className="material-symbols-outlined text-base shrink-0">
              {aviso.tipo === 'error' ? 'error' : 'info'}
            </span>
            <span className="leading-relaxed">{aviso.texto}</span>
            <button
              type="button"
              onClick={() => setAviso(null)}
              className="material-symbols-outlined text-sm shrink-0 opacity-60 hover:opacity-100"
            >
              close
            </button>
          </div>
        </div>
      )}

      {saveSuccessModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest max-w-md w-full rounded-2xl border border-secondary shadow-2xl p-6 space-y-4 animate-in zoom-in-95 text-center">
            <div
              className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto ${
                saveSuccessModal.failed?.length
                  ? 'bg-amber-50 text-amber-600'
                  : 'bg-emerald-50 text-emerald-600'
              }`}
            >
              <span className="material-symbols-outlined text-3xl">
                {saveSuccessModal.failed?.length ? 'warning' : 'task_alt'}
              </span>
            </div>

            <div>
              <h3 className="font-bold text-lg text-on-surface">
                {saveSuccessModal.failed?.length
                  ? `${saveSuccessModal.count} guardados, ${saveSuccessModal.failed.length} sin guardar`
                  : `¡${saveSuccessModal.count} Nuevos Clientes Registrados!`}
              </h3>
              <p className="text-xs text-on-surface-variant mt-1">
                {saveSuccessModal.failed?.length
                  ? 'Solo los clientes guardados están en la base de datos. Los que fallaron no se han creado.'
                  : 'Se han creado los perfiles en la base de datos con sus respectivos expedientes y presupuestos iniciales.'}
              </p>
            </div>

            {saveSuccessModal.count > 0 && (
              <div className="p-3 bg-surface-container-low rounded-xl text-left space-y-1.5 max-h-32 overflow-y-auto text-xs">
                {saveSuccessModal.clients.map((c: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-surface-container last:border-0">
                    <span className="font-semibold text-on-surface truncate">{c.full_name}</span>
                    <span className="text-[10px] text-secondary font-mono-data">BSN: {c.bsn || 'N/A'}</span>
                  </div>
                ))}
              </div>
            )}

            {saveSuccessModal.failed?.length > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-left space-y-1.5 max-h-32 overflow-y-auto text-xs">
                <p className="font-semibold text-amber-900 text-[11px] mb-1">
                  No guardados — vuelve a intentarlo:
                </p>
                {saveSuccessModal.failed.map((f: any, i: number) => (
                  <div key={i} className="text-amber-900">
                    <span className="font-semibold">{f.name}</span>
                    <span className="text-amber-700"> — {f.reason}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setSaveSuccessModal(null);
                  if (saveSuccessModal.count > 0) {
                    router.push('/crm/clientes');
                  } else {
                    setIsReviewMode(false);
                  }
                }}
                className="w-full h-10 bg-secondary text-white text-xs font-semibold rounded-xl hover:bg-blue-700 shadow-sm flex items-center justify-center gap-1.5"
              >
                <span>
                  {saveSuccessModal.count > 0
                    ? 'Ir al Directorio de Clientes (Ficha 360°)'
                    : 'Volver a la revisión'}
                </span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
