'use client';

/* eslint-disable @next/next/no-img-element */

import React, { useEffect, useState, useRef } from 'react';
import { useEscapeKey } from '@/lib/a11y';
import { useRouter } from 'next/navigation';
import { apiFetch, apiUrl } from '@/lib/api';
import { createPortalAccess } from '@/lib/portal';
import { reviewOcrResult } from '@/lib/ocr-review';
import { buildMultiClientAiConfig } from '@/lib/multi-client-ai-config';
import { extractExplicitClients } from '@/lib/explicit-client-fields';
import { prepareImageForOcr, startLocalOcrWorker } from '@/lib/local-ocr-worker';
import { CheckCircle2, LoaderCircle } from 'lucide-react';

interface ExtractedClient {
  id: string;
  full_name: string;
  bsn: string;
  phone: string;
  email: string;
  city: string;
  address: string;
  postal_code?: string;
  country?: string;
  nationality?: string;
  birth_country?: string;
  street_number?: string;
  municipality?: string;
  address_type?: string;
  brp_first_registration?: string;
  previous_registration?: string;
  origin?: string;
  previous_registration_date?: string;
  iban?: string;
  digid_status?: string;
  verifiedFields?: string[];
  fieldIssues?: Record<string, string>;
  preferred_language?: string;
  client_type?: string;
  organism?: string;
  dates?: string;
  status?: string;
  id_document_number: string;
  service_title: string;
  fee: number;
  notes: string;
  source: string;
  extractionMethod?: 'OCR' | 'Extractor alternativo' | 'Texto pegado' | 'IA' | 'IA + texto verificado';
  confidence: number;
  selected: boolean;
  sourceFileIds?: string[];
}

function normalizeIdentity(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function createBlankExtractedClient(serviceTitle = '', fee = 0): ExtractedClient {
  return {
    id: `manual_review_${Date.now()}`,
    full_name: '', bsn: '', phone: '', email: '', city: '', address: '',
    postal_code: '', country: 'Países Bajos', nationality: '', birth_country: '',
    street_number: '', municipality: '', address_type: 'Woonadres',
    brp_first_registration: '', previous_registration: '', origin: '',
    previous_registration_date: '', iban: '', digid_status: '',
    verifiedFields: [], fieldIssues: {}, preferred_language: 'Español',
    client_type: '', organism: '', dates: '', status: 'activo',
    id_document_number: '', service_title: serviceTitle, fee, notes: '',
    source: 'Alta manual', extractionMethod: 'Texto pegado', confidence: 1,
    selected: true,
  };
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

function ReviewStatus({ value, required = false }: { value?: string; required?: boolean }) {
  const state = value?.trim() ? 'detectado' : required ? 'revisar' : 'pendiente';
  const styles = {
    detectado: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    revisar: 'bg-amber-50 text-amber-700 border-amber-200',
    pendiente: 'bg-slate-50 text-slate-500 border-slate-200',
  }[state];
  const labels = { detectado: 'Detectado', revisar: 'Revisar', pendiente: 'No detectado' };
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[13px] font-semibold ${styles}`}>{labels[state]}</span>;
}

interface UploadedFileItem {
  id: string;
  name: string;
  size: number;
  type: string;
  previewUrl?: string;
  textContent?: string;
  ocrConfidence?: number;
  ocrMethod?: 'OCR' | 'Extractor alternativo';
  ocrError?: string;
  dataUrl?: string;
}

interface LocalOcrResult {
  text: string;
  confidence: number;
  method: 'OCR' | 'Extractor alternativo';
}

async function extractLocalOcr(file: File | UploadedFileItem, onProgress: (message: string) => void): Promise<LocalOcrResult> {
  let worker: Awaited<ReturnType<typeof startLocalOcrWorker>> | undefined;
  const getWorker = async () => {
    if (!worker) {
      const { createWorker } = await import('tesseract.js');
      worker = await startLocalOcrWorker(createWorker, onProgress);
    }
    return worker;
  };
  let confidenceTotal = 0;
  let confidenceCount = 0;

  try {
    const inputFile = file instanceof File
      ? file
      : file.dataUrl
        ? new File([await (await fetch(file.dataUrl)).blob()], file.name, { type: file.type })
        : new File([], file.name, { type: file.type });
    if (inputFile.type === 'application/pdf' || inputFile.name.toLowerCase().endsWith('.pdf')) {
      const pdfjs: any = await import('pdfjs-dist/legacy/build/pdf.mjs');
      pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/legacy/build/pdf.worker.min.mjs', import.meta.url).toString();
      const pdf = await pdfjs.getDocument({ data: await inputFile.arrayBuffer() }).promise;
      const pages: string[] = [];
      const pageCount = Math.min(pdf.numPages, 5);

      for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const textContent = await page.getTextContent();
        const embeddedText = textContent.items
          .map((item: any) => (item.str || '') + (item.hasEOL ? '\n' : ' '))
          .join('')
          .trim();
        if (embeddedText) pages.push(embeddedText);

        // Los PDF oficiales suelen contener texto interno. Solo renderiza
        // la página y ejecuta OCR si no hay texto seleccionable.
        if (embeddedText.length > 40) continue;
        const viewport = page.getViewport({ scale: 1.6 });
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const context = canvas.getContext('2d');
        if (!context) continue;
        await page.render({ canvasContext: context, viewport }).promise;
        const result = await (await getWorker()).recognize(canvas);
        pages.push(result.data.text);
        confidenceTotal += Number(result.data.confidence) || 0;
        confidenceCount += 1;
      }

      return {
        text: pages.join('\n').trim(),
        confidence: confidenceCount ? confidenceTotal / confidenceCount : 0,
        method: confidenceCount ? 'OCR' : 'Extractor alternativo',
      };
    }

    const imageInput = inputFile.type.startsWith('image/') ? await prepareImageForOcr(inputFile) : inputFile;
    const result = await (await getWorker()).recognize(imageInput);
    return {
      text: result.data.text.trim(),
      confidence: Number(result.data.confidence) || 0,
      method: 'OCR',
    };
  } finally {
    await worker?.terminate();
  }
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
  const [ocrPending, setOcrPending] = useState(false);
  const [ocrProgress, setOcrProgress] = useState('Preparando OCR local...');
  const [nlpPrompt, setNlpPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Clientes detectados por la IA para revisión
  const [detectedClients, setDetectedClients] = useState<ExtractedClient[]>([{
    id: 'draft_client', full_name: 'Ahmed Dicko Gaye', bsn: '595796953', phone: '+31 6 12345678', email: 'ahmed.dickogaye@example.com', city: 'Waalwijk', address: 'Pompweg 4',
    postal_code: '5145 NC', country: 'Países Bajos', nationality: 'Pendiente de confirmar', birth_country: 'Mauritania', street_number: '4', municipality: 'Waalwijk', address_type: 'Woonadres', brp_first_registration: '15/03/2024', previous_registration: 'RNI (Registro de No Residentes)', origin: 'España', previous_registration_date: '10/01/2024', iban: '', digid_status: '',
    verifiedFields: ['full_name', 'bsn', 'city', 'address', 'postal_code', 'country'], fieldIssues: {}, preferred_language: 'Español', client_type: '', organism: '',
    dates: '28/11/1996', status: 'activo', id_document_number: '', service_title: '', fee: 0, notes: '',
    source: 'Datos introducidos manualmente · demo', extractionMethod: 'Texto pegado', confidence: 1,
    selected: true,
  }]);
  // La ficha se abre únicamente después de pulsar «Leer documento» o
  // «Leer y abrir ficha», para que el flujo empiece siempre en la lectura.
  const [isReviewMode, setIsReviewMode] = useState(false);

  // Estado de guardado masivo
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessModal, setSaveSuccessModal] = useState<any>(null);
  const [aviso, setAviso] = useState<{ texto: string; tipo: 'error' | 'info' } | null>(null);
  const [usadoFallback, setUsadoFallback] = useState(false);
  const [extraccionLocal, setExtraccionLocal] = useState(false);

  // Escape cierra el modal de resultado.
  useEscapeKey(!!saveSuccessModal, () => {
    setSaveSuccessModal(null);
    if (saveSuccessModal?.count > 0) router.push('/crm/clientes');
  });

  // Aviso local. Los errores van en rojo: un fallo de guardado nunca debe
  // comunicarse con el mismo tono que un exito.
  const showToast = (texto: string, tipo: 'error' | 'info' = 'info') => {
    setAviso({ texto, tipo });
    window.setTimeout(() => setAviso(null), 6000);
  };

  // Catálogo de trámites para desplegable
  const [servicesCatalog, setServicesCatalog] = useState([
    { title: 'Declaración Fiscal M-Form', defaultFee: 180.0, configured: true },
    { title: 'Activación DigiD + Zorgtoeslag', defaultFee: 85.0, configured: true },
    { title: 'Solicitud Subsidio Huurtoeslag (Alquiler)', defaultFee: 95.0, configured: true },
    { title: 'Alta Eenmanszaak KVK y BTW-nummer', defaultFee: 250.0, configured: true },
    { title: 'Recurso Bezwaarschrift Belastingdienst', defaultFee: 120.0, configured: true },
    { title: 'Kindgebonden Budget (Ayuda Hijos)', defaultFee: 80.0, configured: true },
    { title: 'Cambio de Cuenta Bancaria Belastingdienst', defaultFee: 45.0, configured: true },
  ]);

  useEffect(() => {
    if (typeof window === 'undefined' || new URLSearchParams(window.location.search).get('mode') !== 'manual') return;
    setActiveTab('manual');
    setDetectedClients([createBlankExtractedClient(servicesCatalog[0]?.title || '', servicesCatalog[0]?.defaultFee || 0)]);
    setIsReviewMode(true);
  }, []);

  // El alta inteligente usa el mismo catálogo persistente que Tarifas.
  useEffect(() => {
    apiFetch('/services')
      .then(async (response) => {
        if (!response.ok) return;
        const data = await response.json();
        if (Array.isArray(data.services) && data.services.length > 0) {
          setServicesCatalog(data.services.map((service: any) => ({
            title: service.title,
            defaultFee: Number(service.basePrice ?? service.priceFinal) || 0,
            configured: Boolean(service.active !== false && (service.basePrice ?? service.priceFinal) != null && Number(service.basePrice ?? service.priceFinal) > 0),
          })));
        }
      })
      .catch(() => {
        // Conserva el catálogo inicial si el API no está disponible.
      });
  }, []);

  const catalogFee = (title: string, fallback: number) =>
    servicesCatalog.find((service) => service.title === title)?.defaultFee ?? fallback;

  // ==========================================
  // MANEJO DE ARCHIVOS (PDFs, FOTOS, DOCUMENTOS)
  // ==========================================
  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const validFiles = Array.from(files).filter((file) => {
      if (file.size === 0) {
        showToast(`No se puede cargar "${file.name}": el archivo pesa 0 KB. Vuelve a seleccionarlo.`, 'error');
        return false;
      }
      return true;
    });
    if (validFiles.length === 0) return;

    const newItems: UploadedFileItem[] = [];
    validFiles.forEach((file) => {
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

      // Las imágenes se envían al modelo vision local/remoto como data URL.
      // Se limita el tamaño para no saturar el JSON ni Ollama.
      if ((isImg || file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) && file.size <= 10 * 1024 * 1024) {
        const reader = new FileReader();
        reader.onload = (e) => {
          item.dataUrl = (e.target?.result as string) || '';
        };
        reader.readAsDataURL(file);
      }

      newItems.push(item);
    });

    setUploadedFiles((prev) => [...prev, ...newItems]);

    // OCR local para fotos y PDF escaneados. No usa API Key ni ningún modelo IA.
    setOcrProgress('Preparando OCR local...');
    setOcrPending(true);
    void Promise.all(
      validFiles.map(async (file, index) => {
        if (!file.type.startsWith('image/') && file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
          return;
        }
        try {
          const result = await extractLocalOcr(file, setOcrProgress);
          const review = reviewOcrResult({
            text: result.text,
            confidence: result.confidence,
            method: result.method,
            fileName: file.name,
          });
          const itemId = newItems[index].id;
          setUploadedFiles((prev) => prev.map((item) => (item.id === itemId
            ? { ...item, textContent: review.extractedText, ocrConfidence: review.confidence, ocrMethod: review.method, ocrError: review.message }
            : item)));
        } catch (error) {
          console.warn('OCR local no disponible para', file.name, error);
          const itemId = newItems[index].id;
          setUploadedFiles((prev) => prev.map((item) => (item.id === itemId
            ? { ...item, textContent: '', ocrConfidence: 0, ocrMethod: 'OCR', ocrError: 'No hemos podido leer el documento. Comprueba la conexión y vuelve a cargarlo, o introduce los datos manualmente.' }
            : item)));
        }
      })
    ).finally(() => setOcrPending(false));
  };

  const handleRemoveFile = (fileId: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  // ==========================================
  // SOLO OCR: extrae texto de archivos sin llamar a IA
  // ==========================================
  const handleProcessOcrOnly = async () => {
    // El botón también sirve como entrada directa a la ficha cuando el gestor
    // quiere completar los datos manualmente o revisar el cliente demo.
    if (uploadedFiles.length === 0) {
      setIsReviewMode(true);
      showToast('Ficha abierta. Revisa o completa los datos del cliente.', 'info');
      return;
    }
    setIsProcessing(true);
    setOcrProgress('Extrayendo texto con OCR...');
    setOcrPending(true);

    try {
      // Ejecutar OCR local en todos los archivos que no tengan texto
      const updatedFiles: UploadedFileItem[] = await Promise.all(
        uploadedFiles.map(async (file) => {
          if (!file.type.startsWith('image/') && file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
            return file;
          }
          if (file.textContent && file.textContent.trim().length > 0) {
            return file; // Ya tiene texto
          }
          try {
            const result = await extractLocalOcr(file, setOcrProgress);
            const review = reviewOcrResult({
              text: result.text,
              confidence: result.confidence,
              method: result.method,
              fileName: file.name,
            });
            return {
              ...file,
              textContent: review.extractedText,
              ocrConfidence: review.confidence,
              ocrMethod: review.method,
              ocrError: review.message,
            };
          } catch (error) {
            console.warn('OCR local no disponible para', file.name, error);
            return {
              ...file,
              textContent: '',
              ocrConfidence: 0,
              ocrMethod: 'OCR' as const,
              ocrError: 'No hemos podido leer el documento. Comprueba la conexión y vuelve a cargarlo, o introduce los datos manualmente.',
            };
          }
        })
      );
      setUploadedFiles(updatedFiles);
      // La lectura debe terminar en la misma ficha de revisión que el flujo IA.
      // Así el gestor puede corregir y confirmar los datos antes de crear el cliente.
      fallbackMultiParse(updatedFiles);
      setExtraccionLocal(true);
      showToast('Documento leído. Revisa los datos extraídos en la ficha.', 'info');
    } finally {
      setOcrPending(false);
      setIsProcessing(false);
    }
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

    // Recupera texto del PDF antes de enviarlo al modelo. Leerlo localmente
    // no sustituye el análisis IA ni demuestra un fallo del proveedor.
    let analysisFiles = uploadedFiles;
    if (uploadedFiles.length > 0) {
      analysisFiles = await Promise.all(uploadedFiles.map(async (file) => {
        if (!file.dataUrl || !file.name.toLowerCase().endsWith('.pdf')) return file;
        try {
          const response = process.env.NODE_ENV === 'production'
            ? await apiFetch('/ai-local/extract', {
                method: 'POST',
                body: JSON.stringify({ dataUrl: file.dataUrl }),
              })
            : await fetch(apiUrl('/ai-local/extract'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dataUrl: file.dataUrl }),
              });
          if (!response.ok) return file;
          const data = await response.json();
          // El parser puede devolver solo separadores de página para un PDF escaneado.
          // Nunca sustituir el OCR legible del navegador por ese texto vacío.
          const pdfText = typeof data.text === 'string' ? data.text.replace(/--\s*\d+\s+of\s+\d+\s*--/g, '').trim() : '';
          return pdfText ? { ...file, textContent: pdfText } : file;
        } catch {
          return file;
        }
      }));
      setUploadedFiles(analysisFiles);
    }

    try {
      const savedConfig = typeof window !== 'undefined' ? localStorage.getItem('nexusgest_ai_config') : null;
      let aiConfig: Record<string, any> = {};
      try { aiConfig = savedConfig ? JSON.parse(savedConfig) || {} : {}; } catch { /* Corrupt saved settings must not disable local analysis. */ }
      const aiRequestConfig = buildMultiClientAiConfig(aiConfig);
      const res = await apiFetch('/ai/parse-multi-clients', {
        method: 'POST',
        body: JSON.stringify({
          prompt: nlpPrompt,
          ...aiRequestConfig,
          apiKey: aiConfig.apiKey || '',
          files: analysisFiles.map((f) => ({
            name: f.name,
            type: f.type,
            size: f.size,
            textContent: f.textContent,
            // OCR/PDF text is sufficient for analysis; keep original bytes in UI for later review/upload.
            dataUrl: f.textContent?.trim() ? undefined : f.dataUrl,
          })),
        }),
      });

      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        throw new Error(errorBody.error || `El servidor respondió con HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data.success && Array.isArray(data.clients) && data.clients.length > 0) {
        setDetectedClients(
          data.clients.map((c: any, idx: number) => ({
            id: c.id || `ai_${Date.now()}_${idx}`,
            full_name: c.full_name || '',
            bsn: c.bsn || '',
            phone: c.phone || '',
            email: c.email || '',
            city: c.city || '',
            address: c.address || '',
            postal_code: c.postal_code || '',
            country: c.country || '',
            nationality: c.nationality || '',
            iban: c.iban || '',
            digid_status: c.digid_status || '',
            verifiedFields: c.verifiedFields || [],
            fieldIssues: c.fieldIssues || {},
            preferred_language: c.preferred_language || c.language || '',
            client_type: c.client_type || '',
            organism: c.organism || '',
            dates: c.dates || '',
            status: c.status || '',
            id_document_number: c.id_document_number || '',
            service_title: c.service_title || '',
            fee: typeof c.fee === 'number' ? c.fee : 0,
            notes: c.notes || '',
            source: c.source || 'Análisis IA',
            extractionMethod: c.extractionMethod || (data.localOnly ? 'Extractor alternativo' : 'IA'),
            // Si la API no manda confianza, se asume la MAS BAJA posible.
            // Un dato ausente no es un dato fiable: mostrar 95 % inventa
            // una garantia que nadie ha medido.
            confidence: typeof c.confidence === 'number' ? c.confidence : 0,
            selected: true,
          }))
        );
        setIsReviewMode(true);
        setUsadoFallback(Boolean(data.localOnly));
        setExtraccionLocal(false);
      } else {
        fallbackMultiParse(analysisFiles);
        setExtraccionLocal(false);
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'No se pudo conectar con el motor IA.', 'error');
      fallbackMultiParse(analysisFiles);
      setExtraccionLocal(false);
    } finally {
      setIsProcessing(false);
    }
  };

  // Parser de respaldo inteligente en cliente (soporta múltiples clientes en offline)
  const fallbackMultiParse = (sourceFiles: UploadedFileItem[] = uploadedFiles) => {
    // Marca el resultado como coming del extractor local, no de la IA, para
    // que el gestor no confunda ambos en la pantalla de revision.
    setUsadoFallback(true);
    const sources = [nlpPrompt, ...sourceFiles.map(file => file.textContent || '')];
    const clients: ExtractedClient[] = extractExplicitClients(sources).filter(c => c.full_name).map((c, idx) => ({
      id: `local_${Date.now()}_${idx}`, full_name: c.full_name || '',
      bsn: c.bsn || '', phone: c.phone || '', email: c.email || '',
      address: c.address || '', city: c.city || '', postal_code: c.postal_code || '',
      nationality: c.nationality || '', country: c.country || '', iban: c.iban || '', dates: c.dates || '',
      id_document_number: c.id_document_number || '', notes: c.notes || '',
      verifiedFields: c.verifiedFields, fieldIssues: c.fieldIssues,
      status: c.status || '', digid_status: c.digid_status || '',
      service_title: '', fee: 0, confidence: 0, selected: true,
      source: 'Texto explícito del documento · revisión obligatoria', extractionMethod: 'Extractor alternativo',
    }));
    const reviewClients: ExtractedClient[] = clients.length > 0
      ? clients
      : [{
          ...createBlankExtractedClient(servicesCatalog[0]?.title || '', servicesCatalog[0]?.defaultFee || 0),
          source: 'Lectura OCR/IA sin datos identificables · completar manualmente',
          extractionMethod: 'Extractor alternativo',
          confidence: 0,
        }];
    setDetectedClients(reviewClients);
    setIsReviewMode(true);
    if (!clients.length) showToast('No se identificó un nombre completo inequívoco. Completa los datos manualmente.', 'error');
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
      prev.map((c) => (c.id === id ? { ...c, [field]: value, verifiedFields: c.verifiedFields?.filter(name => name !== field), fieldIssues: { ...c.fieldIssues, [field]: 'Editado manualmente · revisar' } } : c))
    );
  };

  const handleRemoveDetectedClient = (id: string) => {
    setDetectedClients((prev) => prev.filter((c) => c.id !== id));
  };

  const handleAddManualClientToBatch = () => {
    const newClient: ExtractedClient = {
      id: `manual_batch_${Date.now()}`,
      full_name: '',
      bsn: '',
      phone: '',
      email: '',
      city: '',
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

    // El BSN identifica con máxima seguridad. Si no aparece en el documento,
    // permitimos el alta por nombre completo para poder enlazarlo después;
    // nunca aceptamos un BSN presente con formato inválido.
    const invalidIdentity = toSave.filter((c) => c.bsn && !/^\d{9}$/.test(c.bsn.trim()) || !c.full_name.trim());
    if (invalidIdentity.length > 0) {
      showToast(`Revisa el BSN o el nombre completo en ${invalidIdentity.length} cliente(s) antes de guardar.`, 'error');
      return;
    }

    setIsSaving(true);
    const persistedClients: any[] = [];
    const failedClients: { name: string; reason: string }[] = [];
    const originalImportText = [nlpPrompt, ...uploadedFiles.map((file) => file.textContent || `${file.name} (${file.type})`)]
      .filter(Boolean).join('\n\n');

    try {
      // 1. Intentar persistir en PostgreSQL mediante API Backend
      for (const client of toSave) {
        try {
          const matchRes = await apiFetch(`/clients/match?bsn=${encodeURIComponent(client.bsn.trim())}&full_name=${encodeURIComponent(client.full_name)}`);
          const matchData = await matchRes.json().catch(() => ({}));
          if (!matchRes.ok) throw new Error(matchData.error || 'No se pudo resolver la identidad existente; revisa antes de crear otra ficha.');
          let clientData: any;

          if (matchRes.ok && matchData?.match?.id) {
            // Nunca actualizar ni crear un duplicado en silencio: el gestor decide.
            const existing = matchData.match;
            const useExisting = window.confirm(
              `Posible cliente duplicado: ${existing.full_name || client.full_name}.\n\n` +
              `BSN/email coincidente. Aceptar = comparar y actualizar la ficha existente.`
            );
            if (!useExisting) {
              const createNew = window.confirm(
                'No se actualizará la ficha existente.\n\nAceptar = crear como cliente nuevo. Cancelar = omitir este cliente.'
              );
              if (!createNew) throw new Error('Cliente omitido durante la revisión de duplicados');
            }
            if (useExisting) {
            const updateRes = await apiFetch(`/clients/${existing.id}`, {
              method: 'PUT',
              body: JSON.stringify({
                full_name: client.full_name || existing.full_name,
                email: client.email || existing.email || null,
                phone: client.phone || existing.phone || null,
                bsn: client.bsn || existing.bsn || null,
                id_document_number: client.id_document_number || existing.id_document_number || null,
                postal_code: client.postal_code || existing.postal_code || null,
                nationality: client.nationality || existing.nationality || null,
                country: client.country || existing.country || null,
                status: client.status || existing.status || null,
                digid_status: client.digid_status || existing.digid_status || null,
                iban: client.iban || existing.iban || null,
                city: client.city || existing.city || null,
                address: client.address || existing.address || null,
                notes: [existing.notes, client.notes].filter(Boolean).join('\n'),
              }),
            });
            if (!updateRes.ok) throw new Error('No se pudo actualizar la ficha existente. No se ha confirmado el alta.');
            clientData = await updateRes.json();
            clientData.client = clientData.client || existing;
            const accessRes = await apiFetch(`/clients/${clientData.client.id}/portal-access`, { method: 'POST' });
            clientData.portal_access = accessRes.ok ? (await accessRes.json()).portal_access : null;
            }
          }
          if (!clientData) {
            const clientRes = await apiFetch('/clients', {
            method: 'POST',
            body: JSON.stringify({
              full_name: client.full_name,
              email: client.email,
              phone: client.phone,
              bsn: client.bsn,
              id_document_number: client.id_document_number,
              postal_code: client.postal_code || null,
              nationality: client.nationality || null,
              country: client.country || null,
              iban: client.iban || null,
              document_review: true,
              city: client.city,
              address: client.address,
              status: client.status || 'activo',
              digid_status: client.digid_status || null,
              notes: client.notes || null,
            }),
          });
          clientData = await clientRes.json();

          if (!clientRes.ok) {
            throw new Error(clientData?.error || `No se pudo guardar el cliente (HTTP ${clientRes.status})`);
          }
          }

          if (!clientData?.client?.id) {
            throw new Error('La API no devolvió el id del cliente resuelto');
          }

          if (client.service_title) {
          const dossierRes = await apiFetch('/dossiers', {
            method: 'POST',
            body: JSON.stringify({
              client_id: clientData.client.id,
              title: client.service_title,
              category: 'Trámite IA',
              fee: client.fee,
              priority: 'alta',
            }),
          });
          if (!dossierRes.ok) throw new Error('La ficha existe, pero no se pudo crear el nuevo expediente');
          const dossierData = await dossierRes.json().catch(() => ({}));

          // Asociar también los PDFs que formaron este registro al cliente y
          // al expediente recién creado. El archivo nunca se envía a la IA.
          for (const fileId of client.sourceFileIds || []) {
            const sourceFile = uploadedFiles.find((file) => file.id === fileId);
            if (!sourceFile?.dataUrl) continue;
            const blob = await (await fetch(sourceFile.dataUrl)).blob();
            const form = new FormData();
            form.append('file', blob, sourceFile.name);
            form.append('client_id', clientData.client.id);
            if (dossierData?.dossier?.id) form.append('dossier_id', dossierData.dossier.id);
            form.append('category', 'Documento importado');
            const documentRes = await apiFetch('/documents/upload', { method: 'POST', body: form });
            if (!documentRes.ok) throw new Error(`No se pudo asociar el documento ${sourceFile.name}`);
          }

          }

          // Solo entra en la lista de persistidos lo que la API confirmó.
          persistedClients.push({
            ...client,
            id: clientData.client.id,
            digid_status: client.digid_status || null,
            status: client.status || 'activo',
            portal_username: clientData.client.portal_username || clientData.portal_access?.username,
            portal_password: clientData.portal_access?.password,
          });
        } catch (apiErr) {
          console.warn('No se pudo persistir el cliente en la base de datos:', apiErr);
          failedClients.push({
            name: client.full_name,
            reason: apiErr instanceof Error ? apiErr.message : 'Error desconocido',
          });
        }
      }

      if (persistedClients.length > 0) {
        const historyRes = await apiFetch('/ai/history', {
          method: 'POST',
          body: JSON.stringify({
            source_text: originalImportText || 'Alta manual asistida por IA',
            result: { clients: persistedClients.map((client) => ({ ...client, bsn: client.bsn ? '••••••••' : '' })) },
            client_ids: persistedClients.map((client) => client.id),
          }),
        });
        if (!historyRes.ok) {
          showToast('Las fichas se guardaron, pero no se pudo registrar el historial independiente de IA.', 'error');
        }
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
    id_document_number: '',
    phone: '',
    email: '',
    city: 'Amsterdam',
    address: '',
    postal_code: '',
    country: 'Países Bajos',
    nationality: '',
    iban: '',
    service_title: 'Declaración Fiscal M-Form',
    fee: 180.0,
  });
  const [manualPortalAccess, setManualPortalAccess] = useState<{ portal_username: string; portal_password: string } | null>(null);
  const [manualFeeCustomized, setManualFeeCustomized] = useState(false);
  const selectedManualService = servicesCatalog.find((service) => service.title === manualClient.service_title);
  const configuredManualFee = selectedManualService?.configured !== false && (selectedManualService?.defaultFee || 0) > 0
    ? selectedManualService.defaultFee
    : null;

  // Cuando Tarifas y precios web devuelve el catálogo persistente, alinear el
  // trámite inicial y su precio para no mostrar una combinación contradictoria.
  useEffect(() => {
    const firstConfigured = servicesCatalog.find((service) => service.configured !== false && service.defaultFee > 0) || servicesCatalog[0];
    if (!firstConfigured) return;
    setManualClient((current) => {
      if (servicesCatalog.some((service) => service.title === current.service_title)) return current;
      return { ...current, service_title: firstConfigured.title, fee: firstConfigured.defaultFee };
    });
  }, [servicesCatalog]);

  const handleSaveSingleManual = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedManualService || configuredManualFee === null) {
      showToast('Tarifa pendiente de configurar. Introduce un precio final manualmente.', 'error');
      if (!Number.isFinite(manualClient.fee) || manualClient.fee < 0) return;
    }
    if (!Number.isFinite(manualClient.fee) || manualClient.fee < 0) {
      showToast('El precio final debe ser numérico y no puede ser negativo.', 'error');
      return;
    }

    if (!isValidBsn(manualClient.bsn)) {
      showToast('El BSN debe tener 9 dígitos. Revísalo antes de guardar.', 'error');
      return;
    }

    try {
      const clientRes = await apiFetch('/clients', {
        method: 'POST',
        body: JSON.stringify({
          full_name: manualClient.full_name,
          email: manualClient.email,
          phone: manualClient.phone,
          bsn: manualClient.bsn.replace(/\s/g, ''),
          city: manualClient.city,
          address: manualClient.address,
          postal_code: manualClient.postal_code,
          country: manualClient.country,
          nationality: manualClient.nationality,
          id_document_number: manualClient.id_document_number,
          iban: manualClient.iban,
          status: 'activo',
          digid_status: 'pendiente_activar',
          notes: 'Alta manual directa.',
        }),
      });
      const clientData = await clientRes.json().catch(() => ({}));
      if (!clientRes.ok || !clientData?.client?.id) {
        throw new Error(clientData?.error || 'No se pudo guardar el cliente en la base de datos.');
      }

      const dossierRes = await apiFetch('/dossiers', {
        method: 'POST',
        body: JSON.stringify({
          client_id: clientData.client.id,
          title: manualClient.service_title,
          category: 'Gestoría',
          fee: manualClient.fee,
          priority: 'alta',
        }),
      });
      if (!dossierRes.ok) {
        throw new Error('El cliente se guardó, pero no se pudo crear su expediente inicial.');
      }

      const accessRes = await apiFetch(`/clients/${clientData.client.id}/portal-access`, { method: 'POST' });
      const accessData = accessRes.ok ? await accessRes.json().catch(() => ({})) : {};
      setManualPortalAccess(accessData.portal_access || null);
      showToast('Cliente, expediente y acceso al portal guardados en la base de datos.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'No se pudo guardar el cliente.', 'error');
    }

    showToast('Cliente creado y credenciales de portal generadas.');
  };

  const selectedCount = detectedClients.filter((c) => c.selected).length;
  const canSaveSelected = selectedCount > 0 && detectedClients.filter((c) => c.selected).every((c) => c.full_name.trim().length > 0);
  const totalFees = detectedClients
    .filter((c) => c.selected)
    .reduce((sum, c) => sum + (c.fee || 0), 0);

  const handleSaveDraft = () => {
    try {
      localStorage.setItem('nexusgest_client_draft', JSON.stringify(detectedClients));
      showToast('Ficha guardada como borrador.', 'info');
    } catch {
      showToast('No se pudo guardar el borrador.', 'error');
    }
  };

  const handleConfirmData = () => {
    showToast('Datos confirmados. Ya puedes crear la ficha del cliente.', 'info');
  };

  return (
    <div data-review-mode={isReviewMode} className="crm-new-client-page w-full h-full max-h-[calc(100vh-4.3rem)] overflow-hidden flex flex-col gap-2.5">
      {!isReviewMode && <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-surface-container shrink-0">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-on-surface flex items-center gap-2">
            <span>Alta Inteligente de Clientes con IA</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-secondary/10 text-secondary">
              Multi-Cliente
            </span>
          </h1>
          <p className="text-[11px] text-on-surface-variant">
            Sube archivos (PDF, fotos, DNI, cartas) o notas de texto/WhatsApp. La IA extrae los datos automáticamente.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 text-xs font-semibold bg-blue-50 text-secondary rounded-lg border border-secondary/20 flex items-center gap-1.5 shadow-xs">
            <span className="material-symbols-outlined text-[15px]">psychology</span>
            <span>Motor IA Multi-Cliente Activo</span>
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-surface-container gap-2 overflow-x-auto whitespace-nowrap scrollbar-none shrink-0">
        <button
          type="button"
          onClick={() => {
            setActiveTab('ia_multi');
            setIsReviewMode(false);
          }}
          aria-pressed={activeTab === 'ia_multi'}
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
          type="button"
          onClick={() => {
            setActiveTab('manual');
            setDetectedClients([createBlankExtractedClient(servicesCatalog[0]?.title || '', servicesCatalog[0]?.defaultFee || 0)]);
            setIsReviewMode(true);
          }}
          aria-pressed={activeTab === 'manual'}
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
      </>}

      <div className={`flex-1 min-h-0 pr-1 ${isReviewMode ? 'overflow-hidden pl-3 pr-[45px]' : 'overflow-y-auto no-scrollbar space-y-4'}`}>
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
                    <h3 className="font-bold text-sm text-on-surface">Subir documentos para analizar</h3>
                    <p className="text-[11px] text-outline">PDF, fotos, DNI, cartas y documentos escaneados. El OCR solo se usa aquí.</p>
                  </div>
                </div>

                {process.env.NEXT_PUBLIC_CRM_PREVIEW === 'true' && <button
                  type="button"
                  onClick={handleLoadSampleFiles}
                  className="text-[11px] text-secondary hover:underline font-semibold flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[13px]">folder_zip</span>
                  <span>+ Cargar archivos demo</span>
                </button>}
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
                  aria-label="Subir documentos para analizar"
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
                              {(file.size / 1024).toFixed(0)} KB · Método: {file.ocrMethod || 'pendiente'} · Confianza: {typeof file.ocrConfidence === 'number' ? `${file.ocrConfidence.toFixed(0)}%` : 'no disponible'}
                            </p>
                            {file.ocrError && (
                              <p className="text-[10px] text-red-700 bg-red-50 rounded px-1.5 py-1 mt-1" role="alert">{file.ocrError}</p>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          aria-label={`Eliminar archivo ${file.name}`}
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
                      <h3 className="font-bold text-sm text-on-surface">Pega aquí información de uno o varios clientes</h3>
                      <p className="text-[11px] text-outline">Puedes utilizar español, inglés o holandés. La IA separará automáticamente cada cliente.</p>
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
                    aria-label="Información de uno o varios clientes"
                    aria-describedby="ai-text-help"
                    value={nlpPrompt}
                    onChange={(e) => setNlpPrompt(e.target.value)}
                    placeholder="Pega aquí texto desordenado: nombres, BSN, emails, teléfonos, trámites, fechas o importes. La IA lo separará por cliente..."
                    className="w-full p-3.5 border border-outline-variant rounded-xl bg-surface font-body-md text-xs text-on-surface focus:border-secondary focus:outline-none"
                  />
                  <p id="ai-text-help" className="text-[10px] text-outline mt-1.5 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px] text-secondary">info</span>
                    <span>
                      El texto pegado se analiza directamente, sin OCR. Para PDF, fotos o escaneos utiliza el panel de documentos.
                    </span>
                  </p>
                </div>
              </div>

              {/* Botones de Procesamiento: OCR solo / OCR + IA */}
              <div className="pt-2 border-t border-surface-container flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-outline font-medium w-full sm:w-auto">
                  {uploadedFiles.length > 0 || nlpPrompt.trim() ? (
                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                      <span aria-hidden="true">{ocrPending ? <LoaderCircle size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}</span>
                      <span>
                        {ocrPending ? ocrProgress : `Listo: ${uploadedFiles.length} archivos · ${nlpPrompt.trim().length > 0 ? 'notas incluidas' : 'sin texto adicional'}`}
                      </span>
                    </span>
                  ) : (
                    <span>Añade archivos o escribe notas para comenzar</span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  {/* Botón Solo OCR */}
                  <button
                    type="button"
                    onClick={handleProcessOcrOnly}
                    disabled={ocrPending || isProcessing}
                    className="w-full sm:w-auto h-11 px-5 bg-green-600 text-white text-xs font-semibold rounded-xl hover:bg-green-700 transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined text-lg">text_snippet</span>
                    <span>{ocrPending ? ocrProgress : 'Leer documento'}</span>
                  </button>

                  {/* Botón OCR + IA */}
                  <button
                    type="button"
                    onClick={handleProcessMultiAI}
                    disabled={isProcessing || ocrPending || (uploadedFiles.length === 0 && !nlpPrompt.trim())}
                    className="w-full sm:w-auto h-11 px-6 bg-secondary text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined text-lg">
                      {isProcessing ? 'hourglass_top' : 'auto_awesome'}
                    </span>
                    <span>
                      {isProcessing ? 'Leyendo datos...' : 'Leer y abrir ficha'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VISTA 2: PANTALLA DE REVISIÓN Y VALIDACIÓN MULTI-CLIENTE (PASO OBLIGATORIO) */}
      {/* ========================================================================= */}
      {(activeTab === 'ia_multi' || activeTab === 'manual') && isReviewMode && (
        <div
          className="-mt-10 h-full min-h-0 overflow-visible space-y-3 animate-in fade-in zoom-in-95"
          style={{ zoom: detectedClients.length === 1 ? 0.78 : 1 }}
        >
          {detectedClients.length === 1 && (
            <div className="flex items-end justify-between gap-4 pb-2 shrink-0">
              <div>
                <p className="text-[13px] text-[#536987] mb-2">Clientes <span className="mx-2">›</span> Alta inteligente de cliente</p>
                <h1 className="text-[34px] font-bold tracking-tight text-[#071b46]">Alta inteligente de cliente</h1>
                <p className="text-[16px] text-[#536987]">Los datos se han precompletado automáticamente. Revísalos y confirma la información.</p>
              </div>
            </div>
          )}
          {detectedClients.length > 1 && usadoFallback && !extraccionLocal && (
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex items-start gap-3">
              <span className="material-symbols-outlined text-amber-600 text-xl shrink-0">warning</span>
              <div className="text-xs text-amber-900 leading-relaxed">
                <p className="font-bold mb-1">
                  El análisis IA no ha podido procesar los documentos.
                </p>
                <p>
                  La aplicación ha usado el extractor local al no obtener un resultado
                  IA válido. Esto no demuestra que el servidor esté desconectado.
                  Contrasta los campos con el documento original; si no hay texto
                  legible, revisa el PDF mediante OCR o introduce los datos manualmente.
                </p>
              </div>
            </div>
          )}
          {detectedClients.length > 1 && extraccionLocal && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-start gap-3">
              <span className="material-symbols-outlined text-blue-600 text-xl shrink-0">verified_user</span>
              <div className="text-xs text-blue-900 leading-relaxed">
                <p className="font-bold mb-1">Extracción local completada sin IA</p>
                <p>No se utilizó un modelo de IA en este análisis. El extractor local puede omitir o confundir datos; revisa los campos con el texto original antes de continuar.</p>
              </div>
            </div>
          )}

          {/* Banner Superior con Acciones de Lote */}
          <div className={isReviewMode ? 'hidden' : 'bg-surface-container-lowest p-6 rounded-2xl border border-secondary/30 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4'}>
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
                  {detectedClients.length === 1 ? 'Alta inteligente de cliente' : `${detectedClients.length} clientes detectados`}
                </h2>
              </div>
              <p className="text-xs text-on-surface-variant mt-1">
                Los datos se han precompletado automáticamente. Revísalos y confirma la información antes de crear la ficha.
                {detectedClients.length > 1 && ' Puedes desmarcar o añadir más clientes antes de confirmar el alta.'}
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
          <div className={isReviewMode ? 'hidden' : 'flex flex-wrap items-center justify-between gap-2 px-2 text-xs'}>
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
              <span className="text-outline">Total final (IVA incluido): </span>
              <span className="font-bold text-secondary text-sm">€ {totalFees.toFixed(2)}</span>
            </div>
          </div>

          {/* Tarjetas Editables de cada Cliente Identificado */}
          <div className="min-h-0 h-[calc(100%-3.5rem)] overflow-hidden">
            {detectedClients.map((client, idx) => (
              <div
                key={client.id}
                className={`p-5 rounded-2xl border transition-all ${
                  detectedClients.length === 1
                    ? 'border-0 bg-transparent shadow-none p-0'
                    : client.selected
                      ? 'border-secondary/50 bg-surface-container-lowest shadow-sm'
                      : 'border-outline-variant/60 bg-surface-container-low opacity-70'
                }`}
              >
                {/* Cabecera del Cliente */}
                <div className={isReviewMode ? 'hidden' : 'flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-surface-container'}>
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
                        <span>{client.full_name || 'No detectado'}</span>
                        <span className="text-[10px] font-mono-data bg-blue-50 text-secondary px-2 py-0.5 rounded font-semibold">
                          Cliente #{idx + 1}
                        </span>
                      </h4>
                      <p className="text-[11px] text-outline flex items-center gap-1.5 mt-0.5">
                        <span className="material-symbols-outlined text-[13px]">description</span>
                        <span>Origen: {client.source}</span>
                        {client.extractionMethod && <span>· {client.extractionMethod}</span>}
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
                {detectedClients.length === 1 && isReviewMode && (
                  <div className="mt-4 grid w-full xl:grid-cols-[minmax(0,1fr)_520px] gap-4 items-start">
                    <div className="min-w-0 space-y-3">
                      <section className="rounded-2xl border border-outline-variant bg-white p-3 shadow-sm">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="material-symbols-outlined text-secondary">person</span>
                          <h5 className="text-sm font-bold text-on-surface">Identidad</h5>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          <label className="text-[13px] font-semibold text-outline uppercase">Nombre *<input required value={client.full_name.trim().split(/\s+/)[0] || ''} onChange={e => { const surname = client.full_name.trim().split(/\s+/).slice(1).join(' '); handleUpdateClientField(client.id, 'full_name', `${e.target.value} ${surname}`.trim()); }} className="mt-1 w-full h-7 px-2.5 border border-outline-variant rounded bg-surface text-[13px] normal-case font-semibold" /></label>
                          <label className="text-[13px] font-semibold text-outline uppercase">Apellidos *<input required value={client.full_name.trim().split(/\s+/).slice(1).join(' ')} onChange={e => { const firstName = client.full_name.trim().split(/\s+/)[0] || ''; handleUpdateClientField(client.id, 'full_name', `${firstName} ${e.target.value}`.trim()); }} className="mt-1 w-full h-7 px-2.5 border border-outline-variant rounded bg-surface text-[13px] normal-case font-semibold" /></label>
                          <label className="text-[13px] font-semibold text-outline uppercase">BSN (Burgerservicenummer)<input type="password" value={client.bsn} onChange={e => handleUpdateClientField(client.id, 'bsn', e.target.value)} className="mt-1 w-full h-7 px-2.5 border border-outline-variant rounded bg-surface text-[13px] normal-case font-mono-data" /></label>
                          <label className="text-[13px] font-semibold text-outline uppercase">Fecha de nacimiento<input value={client.dates || ''} onChange={e => handleUpdateClientField(client.id, 'dates', e.target.value)} className="mt-1 w-full h-7 px-2.5 border border-outline-variant rounded bg-surface text-[13px] normal-case" /></label>
                          <label className="text-[13px] font-semibold text-outline uppercase">Nacionalidad<input value={client.nationality || ''} onChange={e => handleUpdateClientField(client.id, 'nationality', e.target.value)} className="mt-1 w-full h-7 px-2.5 border border-outline-variant rounded bg-surface text-[13px] normal-case" /></label>
                          <label className="text-[13px] font-semibold text-outline uppercase">País de nacimiento<input value={client.birth_country || ''} onChange={e => handleUpdateClientField(client.id, 'birth_country', e.target.value)} className="mt-1 w-full h-7 px-2.5 border border-outline-variant rounded bg-surface text-[13px] normal-case" /></label>
                          <label className="text-[13px] font-semibold text-outline uppercase md:col-span-2">Documento de identidad<div className="mt-1 flex gap-2"><select value={client.id_document_number || ''} onChange={e => handleUpdateClientField(client.id, 'id_document_number', e.target.value)} className="h-8 min-w-0 flex-1 border border-outline-variant rounded bg-surface px-2 text-[13px] normal-case"><option value="">Seleccionar tipo de documento</option><option value="Documento de viaje español">Documento de viaje español</option><option value="Pasaporte">Pasaporte</option><option value="DNI">DNI</option></select><button type="button" className="h-8 w-8 shrink-0 rounded border border-outline-variant bg-surface text-secondary" aria-label="Adjuntar documento"><span className="material-symbols-outlined text-[16px]">description</span></button></div></label>
                        </div>
                      </section>

                      <section className="rounded-2xl border border-outline-variant bg-white p-3 shadow-sm">
                        <div className="flex items-center gap-2 mb-3"><span className="material-symbols-outlined text-secondary">call</span><h5 className="text-sm font-bold text-on-surface">Contacto</h5></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          <label className="text-[13px] font-semibold text-outline uppercase">Teléfono<div className="mt-1 flex h-8"><select aria-label="Prefijo telefónico" className="w-14 rounded-l border border-outline-variant bg-surface px-1 text-[13px]"><option>🇳🇱</option><option>🇪🇸</option></select><input type="tel" value={client.phone} onChange={e => handleUpdateClientField(client.id, 'phone', e.target.value)} placeholder="No detectado" className="min-w-0 flex-1 rounded-r border border-l-0 border-outline-variant bg-surface px-2.5 text-[13px] normal-case" /></div></label>
                          <label className="text-[13px] font-semibold text-outline uppercase">Correo electrónico<input type="email" value={client.email} onChange={e => handleUpdateClientField(client.id, 'email', e.target.value)} placeholder="No detectado" className="mt-1 w-full h-8 px-2.5 border border-outline-variant rounded bg-surface text-[13px] normal-case" /></label>
                          <label className="text-[13px] font-semibold text-outline uppercase md:col-span-2">Idioma de comunicación<select value={client.preferred_language || 'Español'} onChange={e => handleUpdateClientField(client.id, 'preferred_language', e.target.value)} className="mt-1 w-full h-8 px-2.5 border border-outline-variant rounded bg-surface text-[13px] normal-case"><option>Español</option><option>Neerlandés</option><option>Inglés</option></select></label>
                        </div>
                      </section>

                      <section className="rounded-2xl border border-outline-variant bg-white p-3 shadow-sm">
                        <div className="flex items-center gap-2 mb-3"><span className="material-symbols-outlined text-secondary">home</span><h5 className="text-sm font-bold text-on-surface">Domicilio en Países Bajos</h5></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          <label className="text-[13px] font-semibold text-outline uppercase">Calle *<input value={client.address?.replace(/\s+\d+$/, '') || ''} onChange={e => handleUpdateClientField(client.id, 'address', `${e.target.value} ${client.street_number || ''}`.trim())} className="mt-1 w-full h-8 px-2.5 border border-outline-variant rounded bg-surface text-[13px] normal-case" /></label>
                          <label className="text-[13px] font-semibold text-outline uppercase">Número *<input value={client.street_number || ''} onChange={e => handleUpdateClientField(client.id, 'street_number', e.target.value)} className="mt-1 w-full h-8 px-2.5 border border-outline-variant rounded bg-surface text-[13px] normal-case" /></label>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs mt-3">
                          <label className="text-[13px] font-semibold text-outline uppercase">Código postal *<input value={client.postal_code || ''} onChange={e => handleUpdateClientField(client.id, 'postal_code', e.target.value)} className="mt-1 w-full h-8 px-2.5 border border-outline-variant rounded bg-surface text-[13px] normal-case" /></label>
                          <label className="text-[13px] font-semibold text-outline uppercase">Localidad *<input value={client.city || ''} onChange={e => handleUpdateClientField(client.id, 'city', e.target.value)} className="mt-1 w-full h-8 px-2.5 border border-outline-variant rounded bg-surface text-[13px] normal-case" /></label>
                          <label className="text-[13px] font-semibold text-outline uppercase">Municipio *<input value={client.municipality || client.city || ''} onChange={e => handleUpdateClientField(client.id, 'municipality', e.target.value)} className="mt-1 w-full h-8 px-2.5 border border-outline-variant rounded bg-surface text-[13px] normal-case" /></label>
                        </div>
                        <label className="block text-[13px] font-semibold text-outline uppercase mt-3">Tipo de dirección<select value={client.address_type || 'Woonadres'} onChange={e => handleUpdateClientField(client.id, 'address_type', e.target.value)} className="mt-1 w-full h-8 px-2.5 border border-outline-variant rounded bg-surface text-[13px] normal-case"><option>Woonadres</option><option>Correspondencia</option><option>Empresa</option></select></label>
                      </section>

                      <section className="rounded-2xl border border-outline-variant bg-white p-3 shadow-sm">
                        <div className="flex items-center gap-2 mb-3"><span className="material-symbols-outlined text-secondary">description</span><h5 className="text-sm font-bold text-on-surface">Registro administrativo</h5></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          <label className="text-[13px] font-semibold text-outline uppercase">Primera inscripción BRP<div className="mt-1 flex h-8"><input value={client.brp_first_registration || ''} onChange={e => handleUpdateClientField(client.id, 'brp_first_registration', e.target.value)} className="min-w-0 flex-1 rounded-l border border-outline-variant bg-surface px-2.5 text-[13px] normal-case" /><span className="flex w-8 items-center justify-center rounded-r border border-l-0 border-outline-variant bg-surface text-secondary"><span className="material-symbols-outlined text-[15px]">calendar_month</span></span></div></label>
                          <label className="text-[13px] font-semibold text-outline uppercase">Registro anterior<select value={client.previous_registration || ''} onChange={e => handleUpdateClientField(client.id, 'previous_registration', e.target.value)} className="mt-1 w-full h-8 px-2.5 border border-outline-variant rounded bg-surface text-[13px] normal-case"><option>RNI (Registro de No Residentes)</option><option>BRP</option><option>No consta</option></select></label>
                          <label className="text-[13px] font-semibold text-outline uppercase">Procedencia<select value={client.origin || ''} onChange={e => handleUpdateClientField(client.id, 'origin', e.target.value)} className="mt-1 w-full h-8 px-2.5 border border-outline-variant rounded bg-surface text-[13px] normal-case"><option>España</option><option>Mauritania</option><option>Otro país</option></select></label>
                          <label className="text-[13px] font-semibold text-outline uppercase">Fecha registro anterior<div className="mt-1 flex h-8"><input value={client.previous_registration_date || ''} onChange={e => handleUpdateClientField(client.id, 'previous_registration_date', e.target.value)} className="min-w-0 flex-1 rounded-l border border-outline-variant bg-surface px-2.5 text-[13px] normal-case" /><span className="flex w-8 items-center justify-center rounded-r border border-l-0 border-outline-variant bg-surface text-secondary"><span className="material-symbols-outlined text-[15px]">calendar_month</span></span></div></label>
                        </div>
                        <div className="mt-4 flex items-center justify-end gap-3 border-t border-surface-container pt-3">
                          <button type="button" onClick={handleSaveDraft} className="h-9 px-3 border border-outline-variant rounded-xl text-[11px] font-semibold hover:bg-surface-container flex items-center gap-2">
                            <span className="material-symbols-outlined text-[16px]">description</span>
                            Guardar como borrador
                          </button>
                          <button type="button" onClick={handleConfirmData} className="h-9 px-3 border border-outline-variant rounded-xl text-[11px] font-semibold hover:bg-surface-container flex items-center gap-2">
                            <span className="material-symbols-outlined text-[16px]">task_alt</span>
                            Confirmar datos
                          </button>
                          <button type="button" onClick={handleSaveSelectedClients} disabled={isSaving || !canSaveSelected} className="h-9 px-4 bg-secondary text-white rounded-xl text-[11px] font-semibold hover:bg-blue-700 shadow-md transition-all flex items-center gap-2 disabled:opacity-50">
                            <span className="material-symbols-outlined text-[16px]">{isSaving ? 'hourglass_top' : 'how_to_reg'}</span>
                            {isSaving ? 'Guardando...' : 'Crear ficha de cliente'}
                          </button>
                        </div>
                      </section>
                    </div>

                    <aside className="w-full max-w-none rounded-2xl border border-outline-variant bg-white p-4 shadow-sm xl:sticky xl:top-2 xl:-mt-[120px]">
                      <div className="flex items-center gap-2 mb-3"><span className="material-symbols-outlined text-secondary">fact_check</span><div><h5 className="text-[13px] font-bold text-on-surface">Revisión de datos</h5><p className="text-[13px] text-outline">Estado de los datos extraídos y verificados automáticamente.</p></div></div>
                      <div className="space-y-2">{([['Nombre y apellidos', client.full_name, true], ['BSN', client.bsn, true], ['Fecha de nacimiento', client.dates, true], ['Nacionalidad', client.nationality, false], ['País de nacimiento', client.birth_country, true], ['Documento de identidad', client.id_document_number, false], ['Teléfono', client.phone, false], ['Correo electrónico', client.email, false], ['Calle', client.address, true], ['Código postal', client.postal_code, true], ['Localidad', client.city, true], ['Municipio', client.municipality || client.city, true], ['Tipo de dirección', client.address_type, true], ['Primera inscripción BRP', client.brp_first_registration, false], ['Registro anterior', client.previous_registration, false], ['Procedencia', client.origin, false]] as [string, string | undefined, boolean][]).map(([label, value, required]) => <div key={label} className="flex items-center justify-between gap-2 border-b border-surface-container pb-2"><span className="text-[13px] text-on-surface-variant">{label}</span><ReviewStatus value={value} required={required} /></div>)}</div>
                    </aside>
                  </div>
                )}

                <div className={isReviewMode ? 'hidden' : 'mt-4 grid xl:grid-cols-[minmax(0,1fr)_250px] gap-4 items-start'}>
                <div className="min-w-0">
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
                  <strong>Revisión necesaria:</strong> los campos vacíos muestran <em>No detectado</em>. Confirma o corrige los datos antes de crear la ficha. La confianza es un indicador, no un bloqueo automático.
                  {client.confidence < 0.8 && <span className="block mt-1 font-semibold">Advertencia: revisa manualmente el texto y los datos detectados antes de confirmar.</span>}
                  <span className="block mt-1">OCR: español, inglés y neerlandés. Solo se rellenan valores explícitos asociados a esta persona; los ausentes o ambiguos quedan vacíos.</span>
                  <span className="block mt-1">Campos pendientes: {[!client.full_name && 'nombre', !client.email && 'correo', !client.phone && 'teléfono', !client.city && 'ciudad', !client.address && 'dirección', !client.bsn && 'BSN', !client.service_title && 'trámite'].filter(Boolean).join(', ') || 'ninguno'}</span>
                </div>
                <div className="flex items-center gap-2 pt-1 px-4 pt-3 rounded-t-2xl border border-b-0 border-outline-variant bg-white">
                  <span className="material-symbols-outlined text-secondary text-base">person</span>
                  <h5 className="text-xs font-bold text-on-surface">Identidad</h5>
                  <span className="h-px flex-1 bg-surface-container" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 p-4 text-xs border-x border-b border-outline-variant rounded-b-2xl bg-white">
                  <div>
                    <label className="block text-outline uppercase text-[10px] font-semibold mb-1">
                      Nombre completo *
                    </label>
                    <input
                      type="text"
                      required
                      value={client.full_name}
                      onChange={(e) => handleUpdateClientField(client.id, 'full_name', e.target.value)}
                      className="w-full h-8 px-2.5 border border-outline-variant rounded bg-surface font-semibold text-on-surface focus:border-secondary focus:outline-none"
                    />
                  </div>

                  <div className="hidden">
                    <label className="block text-outline uppercase text-[10px] font-semibold mb-1">Apellidos *</label>
                    <input
                      type="text"
                      required
                      value={client.full_name.trim().split(/\s+/).slice(1).join(' ')}
                      onChange={(e) => {
                        const firstName = client.full_name.trim().split(/\s+/)[0] || '';
                        handleUpdateClientField(client.id, 'full_name', `${firstName} ${e.target.value}`.trim());
                      }}
                      className="w-full h-8 px-2.5 border border-outline-variant rounded bg-surface font-semibold text-on-surface focus:border-secondary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-outline uppercase text-[10px] font-semibold mb-1">
                      Fecha de nacimiento
                    </label>
                    <input
                      type="text"
                      value={client.dates || ''}
                      onChange={(e) => handleUpdateClientField(client.id, 'dates', e.target.value)}
                      placeholder="No detectado"
                      className="w-full h-8 px-2.5 border border-outline-variant rounded bg-surface focus:border-secondary focus:outline-none"
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
                      type="password"
                      autoComplete="off"
                      value={client.bsn}
                      onChange={(e) => handleUpdateClientField(client.id, 'bsn', e.target.value)}
                      placeholder="Ej. 884719203"
                      className="w-full h-8 px-2.5 border border-outline-variant rounded bg-surface font-mono-data font-bold text-secondary focus:border-secondary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-outline uppercase text-[10px] font-semibold mb-1">
                      Nacionalidad
                    </label>
                    <input
                      type="text"
                      value={client.nationality || ''}
                      onChange={(e) => handleUpdateClientField(client.id, 'nationality', e.target.value)}
                      placeholder="No detectado"
                      className="w-full h-8 px-2.5 border border-outline-variant rounded bg-surface focus:border-secondary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-outline uppercase text-[10px] font-semibold mb-1">
                      País de nacimiento
                    </label>
                    <input
                      type="text"
                      value={client.birth_country || ''}
                      onChange={(e) => handleUpdateClientField(client.id, 'birth_country', e.target.value)}
                      placeholder="No detectado"
                      className="w-full h-8 px-2.5 border border-outline-variant rounded bg-surface focus:border-secondary focus:outline-none"
                    />
                  </div>

                  <div className="md:col-span-3 flex items-center gap-2 pt-2">
                    <span className="material-symbols-outlined text-secondary text-sm">call</span>
                    <h6 className="text-[11px] font-bold text-on-surface">Contacto</h6>
                    <span className="h-px flex-1 bg-surface-container" />
                  </div>

                  <div>
                    <label className="block text-outline uppercase text-[10px] font-semibold mb-1">
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      value={client.phone}
                      onChange={(e) => handleUpdateClientField(client.id, 'phone', e.target.value)}
                      placeholder="No detectado"
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
                      placeholder="No detectado"
                      className="w-full h-8 px-2.5 border border-outline-variant rounded bg-surface focus:border-secondary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-outline uppercase text-[10px] font-semibold mb-1">
                      Idioma de comunicación
                    </label>
                    <input
                      type="text"
                      value={client.preferred_language || ''}
                      onChange={(e) => handleUpdateClientField(client.id, 'preferred_language', e.target.value)}
                      placeholder="Español"
                      className="w-full h-8 px-2.5 border border-outline-variant rounded bg-surface focus:border-secondary focus:outline-none"
                    />
                  </div>

                  <div className="hidden">
                    <label className="block text-outline uppercase text-[10px] font-semibold mb-1">
                      Ciudad en Países Bajos
                    </label>
                    <input
                      type="text"
                      value={client.city}
                      onChange={(e) => handleUpdateClientField(client.id, 'city', e.target.value)}
                      placeholder="No detectado"
                      className="w-full h-8 px-2.5 border border-outline-variant rounded bg-surface focus:border-secondary focus:outline-none"
                    />
                  </div>

                  <div className="hidden">
                    <label className="block text-outline uppercase text-[10px] font-semibold mb-1">
                      Dirección Completa
                    </label>
                    <input
                      type="text"
                      value={client.address}
                      onChange={(e) => handleUpdateClientField(client.id, 'address', e.target.value)}
                      placeholder="No detectado"
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

                </div>

                <div className="flex items-center gap-2 pt-4 px-4 pt-3 rounded-t-2xl border border-b-0 border-outline-variant bg-white">
                  <span className="material-symbols-outlined text-secondary text-base">home</span>
                  <h5 className="text-xs font-bold text-on-surface">Domicilio y datos administrativos</h5>
                  <span className="h-px flex-1 bg-surface-container" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 p-4 text-xs border-x border-b border-outline-variant rounded-b-2xl bg-white">
                  {([['address', 'Calle y número'], ['city', 'Localidad'], ['postal_code', 'Código postal'], ['country', 'País de residencia'], ['nationality', 'Nacionalidad'], ['iban', 'IBAN']] as const).map(([field, label]) => (
                    <label key={field} className="block text-outline text-[10px] font-semibold">
                      {label}
                      <input aria-label={label} type="text" value={client[field] || ''} onChange={e => handleUpdateClientField(client.id, field, e.target.value)} placeholder="No detectado" className="w-full h-8 px-2.5 border border-outline-variant rounded bg-surface text-xs" />
                      <span>{client.verifiedFields?.includes(field) ? 'Texto explícito · revisar' : client.fieldIssues?.[field] || 'Completar manualmente'}</span>
                    </label>
                  ))}
                  <label className="block text-outline text-[10px] font-semibold">
                    Número de calle
                    <input aria-label="Número de calle" type="text" value={client.street_number || ''} onChange={e => handleUpdateClientField(client.id, 'street_number', e.target.value)} placeholder="No detectado" className="w-full h-8 px-2.5 border border-outline-variant rounded bg-surface text-xs" />
                    <span>{client.street_number ? 'Texto explícito · revisar' : 'Completar manualmente'}</span>
                  </label>
                  <label className="block text-outline text-[10px] font-semibold">
                    Municipio
                    <input aria-label="Municipio" type="text" value={client.municipality || ''} onChange={e => handleUpdateClientField(client.id, 'municipality', e.target.value)} placeholder="No detectado" className="w-full h-8 px-2.5 border border-outline-variant rounded bg-surface text-xs" />
                    <span>{client.municipality ? 'Texto explícito · revisar' : 'Completar manualmente'}</span>
                  </label>
                  <label className="block text-outline text-[10px] font-semibold">
                    Tipo de dirección
                    <select aria-label="Tipo de dirección" value={client.address_type || 'Woonadres (residencia)'} onChange={e => handleUpdateClientField(client.id, 'address_type', e.target.value)} className="w-full h-8 px-2.5 border border-outline-variant rounded bg-surface text-xs">
                      <option>Woonadres (residencia)</option>
                      <option>Correspondencia</option>
                      <option>Empresa</option>
                    </select>
                    <span>Confirmar con el documento</span>
                  </label>
                </div>
                <p className="text-[10px] text-outline pt-2">Campos con evidencia explícita: {client.verifiedFields?.join(', ') || 'ninguno'}. Fecha de nacimiento: no es un campo de la ficha; si procede, añádela a notas.</p>

                <div className="flex items-center gap-2 pt-4 px-4 pt-3 rounded-t-2xl border border-b-0 border-outline-variant bg-white">
                  <span className="material-symbols-outlined text-secondary text-base">fact_check</span>
                  <h5 className="text-xs font-bold text-on-surface">Registro administrativo</h5>
                  <span className="h-px flex-1 bg-surface-container" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 p-4 text-xs border-x border-b border-outline-variant rounded-b-2xl bg-white">
                  {([['brp_first_registration', 'Primera inscripción BRP'], ['previous_registration', 'Registro anterior'], ['origin', 'Procedencia'], ['previous_registration_date', 'Fecha de regreso a Países Bajos']] as const).map(([field, label]) => (
                    <label key={field} className="block text-outline text-[10px] font-semibold">
                      {label}
                      <input aria-label={label} type="text" value={client[field] || ''} onChange={e => handleUpdateClientField(client.id, field, e.target.value)} placeholder="No detectado" className="w-full h-8 px-2.5 border border-outline-variant rounded bg-surface text-xs" />
                    </label>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-4 px-4 pt-3 rounded-t-2xl border border-b-0 border-outline-variant bg-white">
                  <span className="material-symbols-outlined text-secondary text-base">tune</span>
                  <h5 className="text-xs font-bold text-on-surface">Gestión de la ficha</h5>
                  <span className="h-px flex-1 bg-surface-container" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 text-xs">
                  <label>Estado administrativo de la ficha
                    <select aria-label="Estado del cliente" value={client.status || 'activo'} onChange={e => handleUpdateClientField(client.id, 'status', e.target.value)} className="w-full h-8 border border-outline-variant rounded bg-surface">
                      <option value="activo">Activo (alta de ficha)</option><option value="inactivo">Inactivo</option><option value="prospecto">Prospecto</option>
                    </select>
                  </label>
                  <label>Estado DigiD (no se deduce del trámite)
                    <select aria-label="Estado DigiD" value={client.digid_status || ''} onChange={e => handleUpdateClientField(client.id, 'digid_status', e.target.value)} className="w-full h-8 border border-outline-variant rounded bg-surface">
                      <option value="">No detectado</option><option value="sin_digid">Sin DigiD</option><option value="pendiente_activar">Pendiente de activar</option><option value="activo">Activo</option><option value="bloqueado">Bloqueado</option>
                    </select>
                  </label>
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
                      <option value="">Sin expediente inicial · elegir trámite si procede</option>
                      {servicesCatalog.map((s) => (
                        <option key={s.title} value={s.title}>
                          {s.title} ({s.configured === false || s.defaultFee <= 0 ? 'Tarifa pendiente de configurar' : `€${s.defaultFee.toFixed(2)} · IVA incluido`})
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

                <aside className="rounded-2xl border border-outline-variant bg-surface-container-low p-4 xl:sticky xl:top-2">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div>
                      <p className="text-xs font-bold text-on-surface">Revisión de datos</p>
                      <p className="text-[10px] text-outline mt-0.5">Comprueba los campos antes de crear la ficha</p>
                    </div>
                    <span className="material-symbols-outlined text-secondary">fact_check</span>
                  </div>
                  <div className="space-y-2">
                    {([
                      ['Nombre y apellidos', client.full_name, true],
                      ['BSN', client.bsn, true],
                      ['Teléfono', client.phone, false],
                      ['Correo electrónico', client.email, false],
                      ['Domicilio', client.address || client.city, true],
                      ['Código postal', client.postal_code, false],
                      ['Nacionalidad', client.nationality, false],
                      ['Trámite inicial', client.service_title, false],
                    ] as [string, string | undefined, boolean][]).map(([label, value, required]) => (
                      <div key={label} className="flex items-center justify-between gap-2 border-b border-outline-variant/60 pb-2 last:border-0 last:pb-0">
                        <span className="text-[11px] text-on-surface-variant">{label}</span>
                        <ReviewStatus value={value} required={required} />
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 rounded-xl bg-white border border-outline-variant p-3">
                    <p className="text-[10px] font-semibold text-on-surface">Origen de la información</p>
                    <p className="text-[10px] text-outline mt-1 leading-relaxed">{client.source}{client.extractionMethod ? ` · ${client.extractionMethod}` : ''}</p>
                  </div>
                </aside>
                </div>
              </div>
            ))}
          </div>

          {/* Barra de Confirmación y Guardado en Base de Datos */}
          <div className={`${detectedClients.length === 1 && isReviewMode ? 'hidden' : detectedClients.length === 1 ? 'fixed left-2 md:left-[280px] right-2 bottom-2' : 'sticky bottom-4'} bg-surface-container-lowest p-3 rounded-2xl border border-secondary shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3 z-50`}>
            <div>
              <p className="font-bold text-sm text-on-surface">
                ¿Todo listo para dar de alta en NexusGest?
              </p>
              <p className="text-[11px] text-outline">
                Nunca se crea una ficha sin confirmación. Se crearán {selectedCount} fichas de cliente. Solo se abrirá expediente si has elegido un trámite.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSaveDraft}
                className="h-10 px-4 border border-outline-variant rounded-xl text-xs font-semibold hover:bg-surface-container flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[17px]">description</span>
                Guardar como borrador
              </button>
              <button
                type="button"
                onClick={handleConfirmData}
                className="h-10 px-4 border border-outline-variant rounded-xl text-xs font-semibold hover:bg-surface-container flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[17px]">task_alt</span>
                Confirmar datos
              </button>
              <button
                type="button"
                onClick={handleSaveSelectedClients}
                disabled={isSaving || !canSaveSelected}
                className="h-10 px-6 bg-secondary text-white rounded-xl text-xs font-semibold hover:bg-blue-700 shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[17px]">
                  {isSaving ? 'hourglass_top' : 'how_to_reg'}
                </span>
                <span>
                  {isSaving
                    ? 'Guardando en Base de Datos...'
                    : 'Crear ficha de cliente'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VISTA 3: FORMULARIO MANUAL INDIVIDUAL */}
      {/* ========================================================================= */}
      {/* El alta manual usa la misma ficha de revisión que el flujo IA.
          Este formulario legacy queda solo como respaldo para estados sin cliente. */}
      {activeTab === 'manual' && !isReviewMode && detectedClients.length !== 1 && (
        <>
        <form
          onSubmit={handleSaveSingleManual}
          className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-sm space-y-4 w-full"
        >
          <div className="flex items-center gap-2 pb-2 border-b border-surface-container">
            <span className="material-symbols-outlined text-secondary">person_add</span>
            <h3 className="font-bold text-sm text-on-surface">Alta Manual de Cliente</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 text-xs">
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
              <label className="block text-outline uppercase font-semibold mb-1">DNI / Pasaporte</label>
              <input
                type="text"
                value={manualClient.id_document_number}
                onChange={(e) => setManualClient({ ...manualClient, id_document_number: e.target.value })}
                placeholder="Número de documento"
                className="w-full h-9 px-3 border border-outline-variant rounded-lg bg-surface font-mono-data focus:border-secondary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-outline uppercase font-semibold mb-1">Teléfono</label>
              <input
                type="tel"
                value={manualClient.phone}
                onChange={(e) => setManualClient({ ...manualClient, phone: e.target.value })}
                placeholder="No detectado"
                className="w-full h-9 px-3 border border-outline-variant rounded-lg bg-surface focus:border-secondary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-outline uppercase font-semibold mb-1">Correo Electrónico</label>
              <input
                type="email"
                value={manualClient.email}
                onChange={(e) => setManualClient({ ...manualClient, email: e.target.value })}
                placeholder="No detectado"
                className="w-full h-9 px-3 border border-outline-variant rounded-lg bg-surface focus:border-secondary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-outline uppercase font-semibold mb-1">Ciudad</label>
              <input
                type="text"
                value={manualClient.city}
                onChange={(e) => setManualClient({ ...manualClient, city: e.target.value })}
                placeholder="No detectado"
                className="w-full h-9 px-3 border border-outline-variant rounded-lg bg-surface focus:border-secondary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-outline uppercase font-semibold mb-1">Dirección</label>
              <input
                type="text"
                value={manualClient.address}
                onChange={(e) => setManualClient({ ...manualClient, address: e.target.value })}
                placeholder="No detectado"
                className="w-full h-9 px-3 border border-outline-variant rounded-lg bg-surface focus:border-secondary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-outline uppercase font-semibold mb-1">Código postal</label>
              <input
                type="text"
                value={manualClient.postal_code}
                onChange={(e) => setManualClient({ ...manualClient, postal_code: e.target.value })}
                placeholder="Ej. 5145 NC"
                className="w-full h-9 px-3 border border-outline-variant rounded-lg bg-surface focus:border-secondary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-outline uppercase font-semibold mb-1">País de residencia</label>
              <input
                type="text"
                value={manualClient.country}
                onChange={(e) => setManualClient({ ...manualClient, country: e.target.value })}
                className="w-full h-9 px-3 border border-outline-variant rounded-lg bg-surface focus:border-secondary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-outline uppercase font-semibold mb-1">Nacionalidad</label>
              <input
                type="text"
                value={manualClient.nationality}
                onChange={(e) => setManualClient({ ...manualClient, nationality: e.target.value })}
                placeholder="Ej. Mauritania"
                className="w-full h-9 px-3 border border-outline-variant rounded-lg bg-surface focus:border-secondary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-outline uppercase font-semibold mb-1">IBAN</label>
              <input
                type="text"
                value={manualClient.iban}
                onChange={(e) => setManualClient({ ...manualClient, iban: e.target.value })}
                placeholder="Opcional"
                className="w-full h-9 px-3 border border-outline-variant rounded-lg bg-surface font-mono-data focus:border-secondary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-outline uppercase font-semibold mb-1">Trámite Inicial</label>
              <select
                value={manualClient.service_title}
                onChange={(e) => {
                  const serviceTitle = e.target.value;
                  const service = servicesCatalog.find((item) => item.title === serviceTitle);
                  setManualClient({
                    ...manualClient,
                    service_title: serviceTitle,
                    fee: service?.configured !== false && (service?.defaultFee || 0) > 0 ? service.defaultFee : 0,
                  });
                  setManualFeeCustomized(false);
                }}
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
              <label className="block text-outline uppercase font-semibold mb-1">Precio final — IVA incluido</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={manualClient.fee}
                onChange={(e) => { setManualClient({ ...manualClient, fee: Number(e.target.value) }); setManualFeeCustomized(true); }}
                className="w-full h-9 px-3 border border-outline-variant rounded-lg bg-surface font-mono-data font-bold text-secondary focus:border-secondary focus:outline-none"
              />
              <p className={`text-[10px] mt-1 font-semibold ${manualFeeCustomized ? 'text-amber-700' : configuredManualFee === null ? 'text-amber-700' : 'text-emerald-700'}`}>
                {configuredManualFee === null ? 'Tarifa pendiente de configurar' : manualFeeCustomized ? 'Precio personalizado' : `Tarifa configurada: €${configuredManualFee.toFixed(2)} · IVA incluido`}
              </p>
              <p className="text-[10px] text-outline mt-1">El importe es final. No se añade IVA adicional.</p>
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

        {manualPortalAccess && (
          <div className="mt-4 p-4 rounded-2xl border border-emerald-300 bg-emerald-50 shadow-sm">
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-emerald-600">vpn_key</span>
              <div>
                <h4 className="text-sm font-bold text-emerald-900">Acceso del cliente generado</h4>
                <p className="text-[11px] text-emerald-800 mt-0.5">Envíale estos datos por WhatsApp:</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 text-xs font-mono-data">
              <div className="rounded-lg bg-white border border-emerald-200 px-3 py-2 text-emerald-900">
                Usuario: <strong>{manualPortalAccess.portal_username}</strong>
              </div>
              <div className="rounded-lg bg-white border border-emerald-200 px-3 py-2 text-emerald-900">
                Contraseña: <strong>{manualPortalAccess.portal_password}</strong>
              </div>
            </div>
            <button
              type="button"
              onClick={() => router.push('/crm/clientes')}
              className="mt-3 text-xs font-bold text-emerald-700 hover:text-emerald-900"
            >
              Ir al directorio de clientes →
            </button>
          </div>
        )}
        </>
      )}
      </div>

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
              aria-label="Cerrar aviso"
              onClick={() => setAviso(null)}
              className="material-symbols-outlined text-sm shrink-0 opacity-60 hover:opacity-100"
            >
              close
            </button>
          </div>
        </div>
      )}

      {saveSuccessModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-alta-ia-titulo"
        >
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
              <h3 id="modal-alta-ia-titulo" className="font-bold text-lg text-on-surface">
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
                  <div key={i} className="py-1 border-b border-surface-container last:border-0">
                    <span className="block font-semibold text-on-surface truncate">{c.full_name}</span>
                    <span className="block text-[10px] text-secondary font-mono-data">
                      Usuario: {c.portal_username || 'pendiente'} · Clave: {c.portal_password || 'pendiente'}
                    </span>
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
