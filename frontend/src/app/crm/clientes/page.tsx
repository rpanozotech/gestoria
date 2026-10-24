'use client';

/* eslint-disable @next/next/no-img-element */

import React, { Suspense, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { findContextClient, validateClientDetail } from '@/lib/client-ficha';
import { apiFetch } from '@/lib/api';
import { activableConTeclado, useEscapeKey } from '@/lib/a11y';

interface ClientDocument {
  id: string;
  name: string;
  category: 'identificacion' | 'fiscal_belastingdienst' | 'subsidios' | 'laboral_nominas' | 'bancario' | 'nota_ia' | 'contrato' | 'otro';
  date: string;
  size: string;
  file_type: 'pdf' | 'image' | 'text' | 'word' | 'otro';
  added_by: 'gestor' | 'ia' | 'cliente';
  content_text?: string;
  url?: string;
  file_name?: string;
  mime_type?: string;
}

interface ClientAIAction {
  type: 'invoice_created' | 'quote_created' | 'appointment_created' | 'document_created' | 'data_updated';
  summary: string;
  data: any;
}

interface ClientAIMessage {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  timestamp: string;
  actionExecuted?: ClientAIAction;
}

export default function CRMClientesPage() {
  return <Suspense fallback={<main className="p-6" role="status">Cargando clientes…</main>}><CRMClientesContent /></Suspense>;
}

function CRMClientesContent() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'todos' | 'activos' | 'con_digid' | 'pendientes'>('todos');

  // Control de vista maximizada
  const [isMaximized, setIsMaximized] = useState(false);

  // Toast global
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastTipo, setToastTipo] = useState<'exito' | 'error'>('exito');
  /**
   * Aviso flotante.
   *
   * Antes solo existia la variante de exito: los fallos ("No se pudo
   * eliminar el cliente", "Error de conexion") se mostraban con un
   * check_circle verde. Un check verde sobre un error es la peor
   * combinacion posible — quien glee un visto bueno no lee el texto.
   */
  const showToast = (msg: string, tipo: 'exito' | 'error' = 'exito') => {
    setToastMessage(msg);
    setToastTipo(tipo);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Catálogo único cargado desde PostgreSQL mediante /services.
  const [servicesCatalog, setServicesCatalog] = useState<any[]>([]);

  // Lista de clientes con sus datos, trámites, presupuestos, facturas, citas y documentos
  const [clients, setClients] = useState<any[]>([]);
  const [clientStats, setClientStats] = useState<{ total: number; activos: number; archivados: number; nuevos_este_mes: number; pendientes: number } | null>(null);
  const [directoryLoading, setDirectoryLoading] = useState(true);
  const [directoryError, setDirectoryError] = useState('');
  const [statsError, setStatsError] = useState('');
  const importFileRef = useRef<HTMLInputElement>(null);
  // Copiar al portapapeles con feedback
  const copyToClipboard = (text: string, label: string) => {
    if (!text || text === '—') return;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      showToast(`¡${label} copiado al portapapeles!`);
    }
  };

  // Exportar lista de clientes a CSV universal (compatible con otros CRM y Excel)
  const handleExportClientsCsv = () => {
    let csv = '\uFEFF"ID";"Nombre Completo";"BSN";"Email";"Telefono";"Documento";"Ciudad";"Direccion";"IBAN";"Estado DigiD";"Estado"\r\n';
    clients.forEach((c: any) => {
      csv += `"${c.id}";"${c.full_name}";"${c.bsn || ''}";"${c.email || ''}";"${c.phone || ''}";"${c.id_document_number || ''}";"${c.city || ''}";"${c.address || ''}";"${c.iban || ''}";"${c.digid_status || ''}";"${c.status || ''}"\r\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexusgest-clientes-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    showToast(`¡${clients.length} clientes exportados a CSV con éxito!`);
  };

  const handleRestoreDemoClient = async () => {
    const response = await apiFetch('/clients/restore-demo', { method: 'POST' });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { showToast(data.error || 'No se pudo restaurar el cliente demo.', 'error'); return; }
    const refreshed = await apiFetch('/clients');
    const refreshedData = await refreshed.json().catch(() => ({}));
    if (Array.isArray(refreshedData.clients)) setClients(refreshedData.clients.map((c: any) => ({ ...c, dossiers: [], quotes: [], invoices: [], appointments: [], service_requests: [], documents: [] })));
    showToast('Cliente demo restaurado. Ya puedes probar presupuestos, citas y pagos.');
  };

  const handleImportClientsCsv = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const raw = await file.text();
      const lines = raw.replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) throw new Error('El CSV debe incluir una cabecera y al menos un cliente.');
      const separator = lines[0].includes(';') ? ';' : ',';
      const parseLine = (line: string) => line.split(separator).map((value) => value.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
      const aliases: Record<string, string> = {
        'nombre completo': 'full_name', nombre: 'full_name', full_name: 'full_name',
        email: 'email', correo: 'email', telefono: 'phone', teléfono: 'phone', phone: 'phone',
        bsn: 'bsn', direccion: 'address', dirección: 'address', ciudad: 'city', city: 'city',
        'codigo postal': 'postal_code', 'código postal': 'postal_code', postal_code: 'postal_code',
        pais: 'country', país: 'country', iban: 'iban', notas: 'notes', notes: 'notes',
      };
      const headers = parseLine(lines[0]).map((header) => aliases[header.toLowerCase()] || header.toLowerCase());
      const csv = [headers.join(','), ...lines.slice(1).map((line) => parseLine(line).map((value) => JSON.stringify(value)).join(','))].join('\n');
      const response = await apiFetch('/clients/import', { method: 'POST', body: JSON.stringify({ csv }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'No se pudo importar el CSV.');
      const refreshed = await apiFetch('/clients');
      const refreshedData = await refreshed.json().catch(() => ({}));
      if (Array.isArray(refreshedData.clients)) setClients(refreshedData.clients.map((c: any) => ({ ...c, dossiers: [], quotes: [], invoices: [], appointments: [], service_requests: [], documents: [] })));
      showToast(`Importación completada: ${data.created?.length || 0} clientes creados${data.skipped?.length ? `, ${data.skipped.length} omitidos` : ''}.`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'No se pudo importar el CSV.', 'error');
    }
  };

  useEffect(() => {
    apiFetch('/clients/count').then(async (res) => {
      if (!res.ok) throw new Error('No se pudieron cargar los totales de clientes.');
      return res.json();
    }).then(setClientStats).catch(() => setStatsError('No se pudieron cargar los totales de clientes.'));
    apiFetch('/clients')
      .then(async (res) => {
        if (!res.ok) throw new Error('No se pudo cargar el directorio de clientes.');
        return res.json();
      })
      .then((data) => {
        if (!Array.isArray(data?.clients)) throw new Error('El directorio recibido está incompleto.');
        if (Array.isArray(data?.clients)) {
          setClients(data.clients.map((c: any) => ({ ...c, dossiers: [], quotes: [], invoices: [], appointments: [], service_requests: [], documents: [] })));
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('crm-client-count-updated'));
        }
      })
      .catch(() => setDirectoryError('No se pudo cargar el directorio de clientes. Vuelve a intentarlo.'))
      .finally(() => setDirectoryLoading(false));
  }, []);

  // El catálogo usado por expedientes y presupuestos debe ser el mismo que
  // administra la pantalla de Tarifas. En desarrollo se conserva el catálogo
  // inicial si PostgreSQL no está disponible.
  useEffect(() => {
    apiFetch('/services')
      .then(async (response) => {
        if (!response.ok) throw new Error('No se pudo cargar el catálogo de servicios.');
        const data = await response.json();
        if (!Array.isArray(data.services) || data.services.length === 0) return;
        setServicesCatalog(data.services.map((service: any) => ({
          id: String(service.id),
          title: service.title,
          category: service.category || 'Otros trámites',
          defaultFee: Number(service.basePrice) || 0,
        })));
      })
      .catch((error) => {
        if (process.env.NODE_ENV === 'production') {
          showToast(error instanceof Error ? error.message : 'No se pudo cargar el catálogo.', 'error');
        }
      });
  }, []);


  const router = useRouter();
  const [returnOrigin, setReturnOrigin] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const contextQuery = searchParams.toString();
  const consumedContextRef = useRef<string | null>(null);
  const detailRequestRef = useRef(0);

  useEffect(() => () => { ++detailRequestRef.current; }, []);

  // Cliente seleccionado para la Ficha 360°
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [portalAccess, setPortalAccess] = useState<{ username: string; password: string } | null>(null);
  const [isGeneratingPortalAccess, setIsGeneratingPortalAccess] = useState(false);
  const [showPortalPassword, setShowPortalPassword] = useState(false);
  const [active360Tab, setActive360Tab] = useState<
    'resumen' | 'personales' | 'servicios' | 'documentos' | 'presupuestos' | 'facturas' | 'citas' | 'mensajes' | 'tareas' | 'historial' | 'ia'
  >('resumen');

  // Estados de Tareas e Historial
  const [newTaskInput, setNewTaskInput] = useState('');
  const [taskFilter, setTaskFilter] = useState<'todas' | 'pendientes' | 'completadas'>('todas');
  const [historyFilter, setHistoryFilter] = useState<'todos' | 'ia' | 'gestor' | 'sistema'>('todos');
  const [clientAudit, setClientAudit] = useState<any[]>([]);
  const [clientMessages, setClientMessages] = useState<any[]>([]);
  const [clientActivityLoading, setClientActivityLoading] = useState(false);
  const clientActivityRequestRef = useRef(0);
  const [clientMessageDraft, setClientMessageDraft] = useState('');
  const [clientMessageVisibility, setClientMessageVisibility] = useState<'internal' | 'client'>('internal');
  const [clientMessageSending, setClientMessageSending] = useState(false);

  // Estados de edición de notas
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editedNotes, setEditedNotes] = useState('');

  // MODAL EDICIÓN COMPLETA DEL CLIENTE
  const [showEditClientModal, setShowEditClientModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    bsn: '',
    id_document_number: '',
    city: '',
    address: '',
    iban: '',
    digid_status: 'sin_digid',
    status: 'activo',
    notes: '',
  });

  // MODAL DOCUMENTOS: SUBIDA DE ARCHIVOS
  const [showUploadDocModal, setShowUploadDocModal] = useState(false);
  const [uploadCategory, setUploadCategory] = useState<ClientDocument['category']>('identificacion');
  const [uploadDocName, setUploadDocName] = useState('');
  const [uploadTextNote, setUploadTextNote] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // MODAL NUEVO DOCUMENTO DE TEXTO / NOTA
  const [showNewTextDocModal, setShowNewTextDocModal] = useState(false);
  const [textDocTitle, setTextDocTitle] = useState('');
  const [textDocCategory, setTextDocCategory] = useState<ClientDocument['category']>('nota_ia');
  const [textDocContent, setTextDocContent] = useState('');

  // MODAL VISUALIZADOR DE DOCUMENTO
  const [previewDoc, setPreviewDoc] = useState<ClientDocument | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // CHAT DEL ASISTENTE IA DEL CLIENTE (Ficha 360°)
  const [clientAiMessages, setClientAiMessages] = useState<ClientAIMessage[]>([]);
  const [clientAiInput, setClientAiInput] = useState('');
  const [isClientAiSending, setIsClientAiSending] = useState(false);
  const clientAiScrollRef = useRef<HTMLDivElement>(null);

  // 1. MODAL NUEVO TRÁMITE
  const [showAddDossierModal, setShowAddDossierModal] = useState(false);
  const [selectedCatalogServiceId, setSelectedCatalogServiceId] = useState(servicesCatalog[0]?.id || '');
  const [dossierTitle, setDossierTitle] = useState(servicesCatalog[0]?.title || '');
  const [dossierCategory, setDossierCategory] = useState(servicesCatalog[0]?.category || '');
  const [dossierFee, setDossierFee] = useState<number>(servicesCatalog[0]?.defaultFee || 0);
  const [dossierDeadline, setDossierDeadline] = useState('2026-11-15');
  const [isNewServiceMode, setIsNewServiceMode] = useState(false);
  const [saveToCatalogToo, setSaveToCatalogToo] = useState(true);

  // 2. MODAL NUEVA CITA DIRECTA
  const [showNewAptModal, setShowNewAptModal] = useState(false);
  const [aptTitle, setAptTitle] = useState('Consulta Telefónica Gestoría');
  const [aptDate, setAptDate] = useState('2026-10-15');
  const [aptTime, setAptTime] = useState('11:00');
  const [aptModality, setAptModality] = useState<'llamada' | 'presencial' | 'online_meet'>('llamada');

  // Visualizador oficial de presupuestos y facturas en Ficha 360°
  const [selectedDoc, setSelectedDoc] = useState<{ type: 'quote' | 'invoice'; data: any } | null>(null);
  const [emailSentToast, setEmailSentToast] = useState<string | null>(null);

  // 3. MODAL NUEVO PRESUPUESTO DIRECTO
  const [showNewQuoteModal, setShowNewQuoteModal] = useState(false);
  const [selectedQuoteServiceIds, setSelectedQuoteServiceIds] = useState<string[]>(['1']);
  const [customQuoteFees, setCustomQuoteFees] = useState<{ [id: string]: number }>({});
  const [quoteConcept, setQuoteConcept] = useState('Declaración Fiscal M-Form');
  const [isConceptManuallyEdited, setIsConceptManuallyEdited] = useState(false);
  const [quoteValidUntil, setQuoteValidUntil] = useState('2026-11-30');

  // Abrir Ficha 360° al pulsar sobre el cliente
  const normalizeClientForFicha = (client: any) => ({
    ...(client || {}),
    dossiers: Array.isArray(client?.dossiers) ? client.dossiers : [],
    quotes: Array.isArray(client?.quotes) ? client.quotes : [],
    invoices: Array.isArray(client?.invoices) ? client.invoices : [],
    appointments: Array.isArray(client?.appointments) ? client.appointments : [],
    service_requests: Array.isArray(client?.service_requests) ? client.service_requests : [],
    documents: Array.isArray(client?.documents) ? client.documents : [],
  });

  const loadClientActivity = async (clientId: string) => {
    const requestId = ++clientActivityRequestRef.current;
    setClientActivityLoading(true);
    try {
      const [auditResponse, messagesResponse] = await Promise.all([
        apiFetch(`/clients/${clientId}/audit`),
        apiFetch(`/client-messages/${clientId}`),
      ]);
      const [auditData, messageData] = await Promise.all([
        auditResponse.ok ? auditResponse.json() : Promise.resolve({ audit: [] }),
        messagesResponse.ok ? messagesResponse.json() : Promise.resolve({ messages: [] }),
      ]);
      if (requestId !== clientActivityRequestRef.current) return;
      setClientAudit(Array.isArray(auditData.audit) ? auditData.audit : []);
      setClientMessages(Array.isArray(messageData.messages) ? messageData.messages : []);
    } catch {
      if (requestId === clientActivityRequestRef.current) {
        setClientAudit([]);
        setClientMessages([]);
        showToast('No se pudo cargar la actividad de esta ficha.', 'error');
      }
    } finally {
      if (requestId === clientActivityRequestRef.current) setClientActivityLoading(false);
    }
  };

  const sendClientMessage = async () => {
    if (!selectedClient?.id || !clientMessageDraft.trim() || clientMessageSending) return;
    setClientMessageSending(true);
    try {
      const response = await apiFetch(`/client-messages/${selectedClient.id}`, {
        method: 'POST',
        body: JSON.stringify({ body: clientMessageDraft.trim(), visibility: clientMessageVisibility }),
      });
      if (!response.ok) throw new Error('No se pudo guardar el mensaje.');
      const data = await response.json();
      setClientMessages((current) => [...current, data.message]);
      setClientMessageDraft('');
      await loadClientActivity(String(selectedClient.id));
      showToast(clientMessageVisibility === 'client' ? 'Mensaje compartido con el cliente' : 'Nota interna guardada');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'No se pudo guardar el mensaje.', 'error');
    } finally {
      setClientMessageSending(false);
    }
  };

  const handleOpenClient = (client: any, legacy = false) => {
    if (!legacy) {
      router.push(`/crm/clientes/${encodeURIComponent(String(client.id))}`);
      return;
    }
    // La lista y la ficha pueden devolver contadores, null u objetos parciales.
    const requestId = ++detailRequestRef.current;
    ++clientActivityRequestRef.current;
    const safeClient = normalizeClientForFicha(client);
    setSelectedClient(safeClient);
    setPortalAccess(null);
    setShowPortalPassword(false);
    setEditedNotes(safeClient.notes || '');
    setIsEditingNotes(false);
    setClientAudit([]);
    setClientMessages([]);
    setClientMessageDraft('');
    setClientActivityLoading(false);
    setActive360Tab('resumen');

    // Inicializar chat IA del cliente si está vacío
    setClientAiMessages([
      {
        id: 'init-msg',
        role: 'assistant',
        content: `👋 ¡Hola! Soy tu **Asistente IA especializado para ${safeClient.full_name}**.\n\nTengo acceso en tiempo real a todo su expediente:\n- **BSN Oficial:** \`${client.bsn || 'Sin registrar'}\` · **DigiD:** \`${client.digid_status}\`\n- **Expedientes activos:** ${client.dossiers_count ?? client.dossiers?.length ?? '—'} trámites\n- **Documentos en archivo:** ${client.documents_count ?? (client.documents?.length ? client.documents.length : '—')} archivos\n- **Facturación:** ${client.quotes?.length || 0} presupuestos / ${client.invoices?.length || 0} facturas\n- **Citas agendadas:** ${client.appointments?.length || 0} citas\n\n¿En qué puedo ayudarte? Puedes pedirme que **emita una factura**, **genere un presupuesto**, **agende una cita**, **modifique sus datos** o **redacte y archive un documento** en su carpeta.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);

    // El listado solo trae contadores. Cargar la ficha completa al abrirla
    // evita mostrar presupuestos locales antiguos y permite crear sobre el
    // cliente real de PostgreSQL.
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(client.id))) {
      apiFetch(`/clients/${client.id}`)
        .then(async (response) => {
          const payload = await response.json();
          if (!response.ok) throw new Error(payload.error || 'No se pudo cargar la ficha completa.');
          return validateClientDetail(payload);
        })
        .then((data) => {
          if (requestId !== detailRequestRef.current) return;
          const completeClient = normalizeClientForFicha({
            ...data.client,
            dossiers_count: data.dossiers.length,
            invoices_count: data.invoices.length,
            documents_count: data.documents.length,
            tasks: data.tasks,
            service_requests: data.service_requests,
            dossiers: Array.isArray(data.dossiers) ? data.dossiers : [],
            quotes: Array.isArray(data.quotes) ? data.quotes : [],
            invoices: Array.isArray(data.invoices) ? data.invoices : [],
            appointments: Array.isArray(data.appointments) ? data.appointments : [],
            documents: (Array.isArray(data.documents) ? data.documents : []).map((doc: any) => ({
              ...doc,
              id: String(doc.id),
              name: doc.name || doc.file_name || 'Documento',
              date: doc.date || (doc.created_at ? String(doc.created_at).slice(0, 10) : ''),
              size: doc.size || `${Math.max(1, Math.round(Number(doc.file_size || 0) / 1024))} KB`,
              file_type: doc.file_type || (String(doc.mime_type || '').includes('pdf') ? 'pdf' : String(doc.mime_type || '').startsWith('image/') ? 'image' : 'otro'),
              added_by: doc.added_by || 'gestor',
            })),
          });
          setSelectedClient(completeClient);
          setClients((current) => current.map((item) => item.id === completeClient.id ? { ...item, ...completeClient } : item));
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('crm-client-count-updated'));
          loadClientActivity(String(client.id));
        })
        .catch(() => {
          if (requestId !== detailRequestRef.current) return;
          setSelectedClient(null);
          showToast('No se pudo cargar la ficha completa desde PostgreSQL.', 'error');
        });
    }
  };

  const handlePreviewDocument = async (doc: ClientDocument) => {
    setPreviewDoc(doc);
    setPreviewUrl(null);
    if (doc.content_text || !doc.id) return;
    try {
      const response = await apiFetch(`/documents/${encodeURIComponent(doc.id)}/download`);
      if (!response.ok) throw new Error('No se pudo abrir el archivo.');
      const blob = await response.blob();
      setPreviewUrl(URL.createObjectURL(blob));
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'No se pudo abrir el archivo.', 'error');
    }
  };

  const closeDocumentPreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewDoc(null);
  };

  // Consume each URL context before opening: detail hydration updates the directory too.
  useEffect(() => {
    if (!contextQuery) { consumedContextRef.current = null; return; }
    if (!clients.length || consumedContextRef.current === contextQuery) return;
    const query = new URLSearchParams(contextQuery);
    if (!query.get('client') && !query.get('nombre') && !query.get('id')) return;
    consumedContextRef.current = contextQuery;
    const found = findContextClient(clients, query);
    if (!found) {
      showToast('No se encontró un cliente único para este enlace.', 'error');
      return;
    }
    const origin = query.get('from');
    setReturnOrigin(origin);
    // Only the explicit edit link opens the historical rich editor.
    handleOpenClient(found, origin === 'ficha');
    const tab = query.get('tab');
    if (origin === 'ficha' && tab && ['resumen', 'personales', 'servicios', 'documentos', 'presupuestos', 'facturas', 'citas', 'mensajes', 'tareas', 'historial', 'ia'].includes(tab)) {
      setActive360Tab(tab as any);
    }
  }, [clients, contextQuery]);

  // Cerrar Ficha 360° y retornar al origen o limpiar URL
  const handleCloseFicha = () => {
    ++detailRequestRef.current;
    ++clientActivityRequestRef.current;
    const closingClientId = selectedClient?.id;
    setSelectedClient(null);
    setPortalAccess(null);
    setShowPortalPassword(false);
    if (returnOrigin === 'ficha' && closingClientId) {
      router.push(`/crm/clientes/${encodeURIComponent(String(closingClientId))}`);
    } else if (returnOrigin === 'agenda') {
      router.push('/crm/agenda');
    } else if (typeof window !== 'undefined') {
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  };

  // Escape cierra la Ficha 360°. Sin esto, quien navega solo con teclado
  // no tiene forma de volver al listado.
  useEscapeKey(!!selectedClient, handleCloseFicha);

  // Abrir Modal de Edición de Datos
  const handleOpenEditClient = (client: any) => {
    setEditFormData({
      full_name: client.full_name || '',
      email: client.email || '',
      phone: client.phone || '',
      bsn: client.bsn || '',
      id_document_number: client.id_document_number || '',
      city: client.city || '',
      address: client.address || '',
      iban: client.iban || '',
      digid_status: client.digid_status || 'sin_digid',
      status: client.status || 'activo',
      notes: client.notes || '',
    });
    setShowEditClientModal(true);
  };

  const handleGeneratePortalAccess = async () => {
    if (!selectedClient) return;
    setIsGeneratingPortalAccess(true);
    try {
      const response = await apiFetch(`/clients/${selectedClient.id}/portal-access`, { method: 'POST' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.portal_access) throw new Error(data.error || 'No se pudo generar el acceso del portal.');
      setPortalAccess(data.portal_access);
      setShowPortalPassword(true);
      setSelectedClient((current: any) => ({ ...current, portal_username: data.portal_access.username }));
      showToast('Acceso del portal generado. Guarda la contraseña antes de cerrar esta ficha.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'No se pudo generar el acceso del portal.', 'error');
    } finally {
      setIsGeneratingPortalAccess(false);
    }
  };

  const handlePreparePortalWhatsApp = () => {
    if (!selectedClient?.phone || !portalAccess) return;
    const phone = String(selectedClient.phone).replace(/\D/g, '');
    const message = [
      `Hola ${selectedClient.full_name},`,
      '',
      'Ya tienes acceso a tu Portal Cliente de RP Asesoría:',
      'Enlace: https://portal.rp-gestoria.tech/portal/login',
      `Usuario: ${portalAccess.username}`,
      `Contraseña inicial: ${portalAccess.password}`,
      '',
      'Por seguridad, cambia la contraseña después de entrar.',
    ].join('\n');
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  };

  // Guardar Edición Completa del Cliente
  const handleSaveClientEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;

    const updatedClient = {
      ...selectedClient,
      ...editFormData,
    };

    try {
      const response = await apiFetch(`/clients/${updatedClient.id}`, {
        method: 'PUT',
        body: JSON.stringify(editFormData),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'No se pudieron guardar los datos del cliente.');
    } catch (error) {
      if (process.env.NODE_ENV === 'production') {
        showToast(error instanceof Error ? error.message : 'No se pudieron guardar los datos.', 'error');
        return;
      }
      showToast('Datos actualizados solo en modo local: PostgreSQL no responde.', 'error');
    }

    setSelectedClient(updatedClient);
    setClients(clients.map((c) => (c.id === updatedClient.id ? updatedClient : c)));
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('crm-client-count-updated'));
    setShowEditClientModal(false);
    showToast(`¡Datos de ${updatedClient.full_name} actualizados con éxito!`);
  };

  // Guardar notas internas rápidas
  const handleSaveNotes = async () => {
    if (!selectedClient) return;
    try {
      const response = await apiFetch(`/clients/${selectedClient.id}`, {
        method: 'PUT',
        body: JSON.stringify({ notes: editedNotes }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'No se pudieron guardar las notas.');
    } catch (error) {
      if (process.env.NODE_ENV === 'production') {
        showToast(error instanceof Error ? error.message : 'No se pudieron guardar las notas.', 'error');
        return;
      }
      showToast('Notas guardadas solo en modo local: PostgreSQL no responde.', 'error');
    }
    const updatedClient = { ...selectedClient, notes: editedNotes };
    setSelectedClient(updatedClient);
    setClients(clients.map((c) => (c.id === updatedClient.id ? updatedClient : c)));
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('crm-client-count-updated'));
    setIsEditingNotes(false);
    showToast('Notas del cliente guardadas');
  };

  // Helper para obtener tareas del cliente
  const getClientTasks = (client: any) => (Array.isArray(client.tasks) ? client.tasks : []).map((task: any) => ({
    ...task, completed: task.status ? task.status === 'completada' : !!task.completed,
    due: task.due_date ? String(task.due_date).slice(0, 10) : task.due || 'Sin vencimiento',
  }));

  const getClientActivities = (_client: any) => clientAudit.map((entry: any) => ({
    id: entry.id, time: new Date(entry.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
    date: new Date(entry.created_at).toLocaleDateString('es-ES'), type: entry.actor_role === 'gestor' ? 'gestor' : 'sistema',
    badge: entry.actor_name || entry.actor_role || 'Registro', title: entry.action,
    desc: Object.keys(entry.changes || {}).join(', ') || 'Sin campos detallados',
  }));

  const saveClientTasks = (clientId: string, update: (tasks: any[]) => any[]) => {
    setSelectedClient((current: any) => current?.id === clientId ? { ...current, tasks: update(current.tasks || []) } : current);
    setClients(current => current.map(client => client.id === clientId ? { ...client, tasks: update(client.tasks || []) } : client));
  };

  const handleToggleTask = async (taskId: string) => {
    if (!selectedClient) return;
    const clientId = selectedClient.id;
    const task = getClientTasks(selectedClient).find((row: any) => row.id === taskId);
    if (!task) return;
    try {
      const response = await apiFetch(`/tasks/${encodeURIComponent(taskId)}`, { method: 'PATCH', body: JSON.stringify({ status: task.completed ? 'pendiente' : 'completada' }) });
      const payload = await response.json();
      if (!response.ok || !payload.task) throw new Error(payload.error || 'No se pudo actualizar la tarea.');
      saveClientTasks(clientId, tasks => tasks.map(row => row.id === taskId ? payload.task : row));
    } catch (error) { showToast(error instanceof Error ? error.message : 'No se pudo actualizar la tarea.', 'error'); }
  };

  const handleAddNewTask = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedClient || !newTaskInput.trim()) return;
    const clientId = selectedClient.id;
    try {
      const response = await apiFetch('/tasks', { method: 'POST', body: JSON.stringify({ client_id: clientId, title: newTaskInput.trim() }) });
      const payload = await response.json();
      if (!response.ok || !payload.task) throw new Error(payload.error || 'No se pudo crear la tarea.');
      saveClientTasks(clientId, tasks => [payload.task, ...tasks]);
      setNewTaskInput('');
      showToast('Tarea guardada');
    } catch (error) { showToast(error instanceof Error ? error.message : 'No se pudo crear la tarea.', 'error'); }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!selectedClient) return;
    const clientId = selectedClient.id;
    try {
      const response = await apiFetch(`/tasks/${encodeURIComponent(taskId)}`, { method: 'DELETE' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'No se pudo eliminar la tarea.');
      saveClientTasks(clientId, tasks => tasks.filter(row => row.id !== taskId));
      showToast('Tarea eliminada');
    } catch (error) { showToast(error instanceof Error ? error.message : 'No se pudo eliminar la tarea.', 'error'); }
  };

  // GESTIÓN DE DOCUMENTOS: Subir archivo
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedClient) return;

    const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
    const sizeKb = Math.round(file.size / 1024);
    const sizeStr = file.size > 1024 * 1024 ? `${sizeMb} MB` : `${sizeKb} KB`;
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const fileType: ClientDocument['file_type'] = ext === 'pdf' ? 'pdf' : ['png', 'jpg', 'jpeg'].includes(ext) ? 'image' : ['doc', 'docx'].includes(ext) ? 'word' : 'text';

    if (file.type.startsWith('text') || ext === 'txt' || ext === 'md') {
      const reader = new FileReader();
      reader.onload = (event) => {
        void saveUploadedDoc(file.name, sizeStr, fileType, event.target?.result as string, file);
      };
      reader.readAsText(file);
    } else {
      void saveUploadedDoc(file.name, sizeStr, fileType, undefined, file);
    }
  };

  const saveUploadedDoc = async (name: string, size: string, fileType: ClientDocument['file_type'], textContent?: string, file?: File) => {
    const newDoc: ClientDocument = {
      id: String(Date.now()),
      name: uploadDocName.trim() || name,
      category: uploadCategory,
      date: new Date().toISOString().slice(0, 10),
      size: size,
      file_type: fileType,
      added_by: 'gestor',
      content_text: textContent || uploadTextNote,
    };

    if (file && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(selectedClient.id))) {
      try {
        const form = new FormData();
        form.append('file', file, file.name);
        form.append('client_id', selectedClient.id);
        if (selectedClient.dossiers?.[0]?.id) form.append('dossier_id', selectedClient.dossiers[0].id);
        form.append('category', uploadCategory);
        const response = await apiFetch('/documents/upload', { method: 'POST', body: form });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'No se pudo guardar el documento.');
        newDoc.id = String(data.document?.id || newDoc.id);
      } catch (error) {
        if (process.env.NODE_ENV === 'production') {
          showToast(error instanceof Error ? error.message : 'No se pudo guardar el documento.', 'error');
          return;
        }
        showToast('Documento conservado solo en modo local: PostgreSQL no responde.', 'error');
      }
    } else if (process.env.NODE_ENV === 'production') {
      showToast('No se puede guardar el documento porque la ficha no tiene un ID real de PostgreSQL.', 'error');
      return;
    }

    const updatedClient = {
      ...selectedClient,
      documents: [newDoc, ...(selectedClient.documents || [])],
    };

    setSelectedClient(updatedClient);
    setClients(clients.map((c) => (c.id === updatedClient.id ? updatedClient : c)));
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('crm-client-count-updated'));
    setShowUploadDocModal(false);
    setUploadDocName('');
    setUploadTextNote('');
    showToast(`Documento "${newDoc.name}" añadido al expediente.`);
  };

  // Crear Documento de Texto / Nota Escrita
  const handleSaveTextDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || !textDocTitle.trim()) return;

    const docName = textDocTitle.toLowerCase().endsWith('.txt') ? textDocTitle : `${textDocTitle}.txt`;
    const newDoc: ClientDocument = {
      id: String(Date.now()),
      name: docName,
      category: textDocCategory,
      date: new Date().toISOString().slice(0, 10),
      size: `${Math.max(1, Math.round(textDocContent.length / 100))} KB`,
      file_type: 'text',
      added_by: 'gestor',
      content_text: textDocContent,
    };

    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(selectedClient.id))) {
      try {
        const response = await apiFetch('/documents/text', {
          method: 'POST',
          body: JSON.stringify({
            client_id: selectedClient.id,
            dossier_id: selectedClient.dossiers?.[0]?.id || null,
            category: textDocCategory,
            file_name: docName,
            content: textDocContent,
          }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'No se pudo guardar el documento.');
        newDoc.id = String(data.document?.id || newDoc.id);
      } catch (error) {
        if (process.env.NODE_ENV === 'production') {
          showToast(error instanceof Error ? error.message : 'No se pudo guardar el documento.', 'error');
          return;
        }
        showToast('Documento guardado solo en modo local: PostgreSQL no responde.', 'error');
      }
    } else if (process.env.NODE_ENV === 'production') {
      showToast('La ficha no tiene un ID real de PostgreSQL.', 'error');
      return;
    }

    const updatedClient = {
      ...selectedClient,
      documents: [newDoc, ...(selectedClient.documents || [])],
    };

    setSelectedClient(updatedClient);
    setClients(clients.map((c) => (c.id === updatedClient.id ? updatedClient : c)));
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('crm-client-count-updated'));
    setShowNewTextDocModal(false);
    setTextDocTitle('');
    setTextDocContent('');
    showToast(`Documento de texto "${docName}" guardado.`);
  };

  // Generación Automática de Documentos con IA
  const handleGenerateAIDocument = async (docType: string) => {
    if (!selectedClient) return;

    let title = '';
    let category: ClientDocument['category'] = 'nota_ia';
    let content = '';

    if (docType === 'informe_general') {
      title = `Informe_General_${selectedClient.full_name.replace(/\s+/g, '_')}.txt`;
      category = 'nota_ia';
      content = `========================================================================\nINFORME EJECUTIVO FISCAL Y ADMINISTRATIVO - NEXUSGEST ADVIES B.V.\n========================================================================\nFecha: ${new Date().toLocaleDateString('es-ES')}\nCliente: ${selectedClient.full_name} · BSN: ${selectedClient.bsn || 'No registrado'}\nEmail: ${selectedClient.email} · Teléfono: ${selectedClient.phone}\nDirección: ${selectedClient.address || '—'}, ${selectedClient.city || 'Países Bajos'}\n\n1. ESTADO DE EXPEDIENTES:\n${(selectedClient.dossiers || []).map((d: any) => `- ${d.code}: ${d.title} (${d.status}, Progreso: ${d.progress_percentage}%, Tarifa: € ${d.fee})`).join('\n') || '- Sin expedientes abiertos.'}\n\n2. HISTORIAL DE FACTURACIÓN:\nPresupuestos: ${(selectedClient.quotes || []).length} emitidos.\nFacturas: ${(selectedClient.invoices || []).length} registradas.\n\n3. EVALUACIÓN Y RECOMENDACIÓN IA:\nExpediente auditado bajo normativa de la Belastingdienst y Algemene wet bestuursrecht (Awb). Se aconseja mantener actualizada la cuenta IBAN y verificar notificaciones en Mijn Belastingdienst.`;
    } else if (docType === 'carta_belastingdienst') {
      title = `Escrito_Belastingdienst_${selectedClient.bsn || 'BSN'}.txt`;
      category = 'fiscal_belastingdienst';
      content = `Aan: Belastingdienst / Toeslagen\nPostbus 450, 6400 AL Heerlen\n\nBetreft: Notificatie en verificatie gegevens - BSN ${selectedClient.bsn || '—'}\nDatum: ${new Date().toLocaleDateString('nl-NL')}\n\nGeachte inspecteur,\n\nNamens cliënt(e) ${selectedClient.full_name}, geboren en geregistreerd onder BSN ${selectedClient.bsn || '—'}, delen wij u mede dat de documentatie ter zake van de belastingaangifte en toeslagen is gecontroleerd.\n\nHoogachtend,\nNexusGest Advies B.V.`;
    }

    const newDoc: ClientDocument = {
      id: String(Date.now()),
      name: title,
      category: category,
      date: new Date().toISOString().slice(0, 10),
      size: `${Math.round(content.length / 100)} KB`,
      file_type: 'text',
      added_by: 'ia',
      content_text: content,
    };

    const isRealClientId = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(selectedClient.id));
    if (isRealClientId) {
      try {
        const response = await apiFetch('/documents/text', {
          method: 'POST',
          body: JSON.stringify({
            client_id: selectedClient.id,
            dossier_id: selectedClient.dossiers?.[0]?.id || null,
            category,
            file_name: title,
            content,
          }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'No se pudo archivar el documento generado.');
        newDoc.id = String(data.document?.id || newDoc.id);
      } catch (error) {
        showToast(error instanceof Error ? error.message : 'No se pudo archivar el documento generado.', 'error');
        return;
      }
    } else if (process.env.NODE_ENV === 'production') {
      showToast('No se puede archivar el documento porque la ficha no tiene un ID real de PostgreSQL.', 'error');
      return;
    }

    const updatedClient = {
      ...selectedClient,
      documents: [newDoc, ...(selectedClient.documents || [])],
    };

    setSelectedClient(updatedClient);
    setClients(clients.map((c) => (c.id === updatedClient.id ? updatedClient : c)));
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('crm-client-count-updated'));
    showToast(`Documento generado por IA: "${title}".`);
  };

  // Desactivar cliente (vía recomendada frente a eliminar).
  // El backend marca status='inactivo' sin tocar expedientes ni facturas.
  const handleDeactivateClient = async () => {
    if (!selectedClient) return;
    if (!confirm(`¿Desactivar a ${selectedClient.full_name}?\n\nDejará de aparecer en los listados, pero su expediente, facturas y documentos se conservan intactos. Podrás reactivarlo después.`)) {
      return;
    }

    try {
      const res = await apiFetch(`/clients/${selectedClient.id}/deactivate`, {
        method: 'POST',
        body: JSON.stringify({ status: 'inactivo' }),
      });
      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || 'No se pudo desactivar el cliente.', 'error');
        return;
      }

      const updated = { ...selectedClient, status: 'inactivo' };
      setSelectedClient(updated);
      setClients(clients.map((c) => (c.id === updated.id ? updated : c)));
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('crm-client-count-updated'));
      showToast('Cliente desactivado. Su historial se conserva.');
    } catch {
      showToast('Error de conexión al desactivar.', 'error');
    }
  };

  // Eliminar cliente. El backend bloquea el borrado si hay facturas pagadas
  // (conservación fiscal) y, si hay otros datos asociados, exige ?confirmar=SI.
  const handleDeleteClient = async (clientOverride?: any) => {
    const clientToDelete = clientOverride || selectedClient;
    if (!clientToDelete) return;

    if (
      !confirm(
        `¿Eliminar a ${clientToDelete.full_name}?\n\nSe borrarán también sus expedientes, presupuestos, citas y documentos asociados.\n\nEsta acción no se puede deshacer. Si solo quieres dejar de trabajar con él, desactívalo en su lugar.`
      )
    ) {
      return;
    }

    // En producción el backend exige UUID; en el modo demo se admiten ids demo.
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      String(clientToDelete.id)
    );
    const isDemoId = String(clientToDelete.id).startsWith('demo-');
    if (!isUuid && !isDemoId) { showToast('El cliente no tiene un identificador válido de PostgreSQL.', 'error'); return; }

    const ejecutarBorrado = async (confirmar: boolean) => {
      const url = confirmar ? `/clients/${clientToDelete.id}?confirmar=SI` : `/clients/${clientToDelete.id}`;
      const res = await apiFetch(url, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));

      if (res.status === 409 && data.requiere_confirmacion) {
        const detalle = data.impact
          ? Object.entries(data.impact as Record<string, number>)
              .filter(([, v]) => v > 0)
              .map(([k, v]) => `${v} ${k}`)
              .join(', ')
          : '';

        if (
          confirm(
            `Se eliminará también lo asociado: ${detalle}.\n\n¿Confirmas el borrado definitivo?`
          )
        ) {
          return ejecutarBorrado(true);
        }
        return;
      }

      if (!res.ok) {
        showToast(data.error || 'No se pudo eliminar el cliente.', 'error');
        return;
      }

      setClients((current) => current.filter((c) => c.id !== clientToDelete.id));
      setClientStats((current) => ({
        ...current,
        total: Math.max(0, current.total - 1),
        activos: clientToDelete.status === 'activo' ? Math.max(0, current.activos - 1) : current.activos,
        nuevos_este_mes: Math.max(0, current.nuevos_este_mes - 1),
        pendientes: Math.max(0, current.pendientes - 1),
      }));
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('crm-client-count-updated'));
      if (selectedClient?.id === clientToDelete.id) setSelectedClient(null);
      showToast('Cliente eliminado correctamente.');
    };

    try {
      await ejecutarBorrado(false);
    } catch {
      showToast('Error de conexión al eliminar.', 'error');
    }
  };

// Eliminar Documento
  // El backend no expone DELETE de documentos: el registro se quita solo de
  // la vista local. Para borrarlo de verdad hay que hacerlo por consola.
  const handleDeleteDocument = async (docId: string) => {
    if (!selectedClient) return;
    if (!confirm('¿Eliminar este documento de forma permanente?')) return;
    try {
      const response = await apiFetch(`/documents/${docId}`, { method: 'DELETE' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'No se pudo eliminar el documento.');
      const updatedClient = { ...selectedClient, documents: (selectedClient.documents || []).filter((d: any) => d.id !== docId) };
      setSelectedClient(updatedClient);
      setClients((current) => current.map((c) => c.id === updatedClient.id ? updatedClient : c));
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('crm-client-count-updated'));
      showToast('Documento eliminado correctamente.');
    } catch (error) { showToast(error instanceof Error ? error.message : 'No se pudo eliminar el documento.', 'error'); }
  };

  // ASISTENTE IA: Procesar órdenes sobre el cliente (Facturas, Presupuestos, Citas, Modificaciones, Documentos)
  const handleSendClientAiMessage = async (overridePrompt?: string) => {
    const textToSend = overridePrompt || clientAiInput;
    if (!textToSend.trim() || !selectedClient) return;

    const userMsg: ClientAIMessage = {
      id: String(Date.now()),
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const nextMsgs = [...clientAiMessages, userMsg];
    setClientAiMessages(nextMsgs);
    if (!overridePrompt) setClientAiInput('');
    setIsClientAiSending(true);

    // Motor de ejecución de acciones con IA
    setTimeout(async () => {
      const lower = textToSend.toLowerCase();
      let aiReply = '';
      let executedAction: ClientAIAction | undefined = undefined;
      const isRealClientId = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(selectedClient.id));

      // ACCIÓN 1: CREAR FACTURA
      if (lower.includes('factura') || lower.includes('facturar') || lower.includes('cobro')) {
        const amountMatch = textToSend.match(/(\d+(?:[.,]\d+)?)\s*€?/);
        const fee = amountMatch ? parseFloat(amountMatch[1].replace(',', '.')) : 150.00;
        const total = Math.round(fee * 100) / 100;
        const year = new Date().getFullYear();
        const code = `FAC-${year}-${String((selectedClient.invoices?.length || 0) + 1).padStart(4, '0')}`;
        const concept = lower.includes('m-form')
          ? 'Declaración Fiscal M-Form Belastingdienst'
          : lower.includes('zorgtoeslag')
          ? 'Gestión Solicitud Zorgtoeslag'
          : lower.includes('huurtoeslag')
          ? 'Gestión Subsidio de Alquiler Huurtoeslag'
          : 'Asesoría y Servicios Gestoría Fiscal';

        let newInvoice: any = {
          id: String(Date.now()),
          code,
          concept,
          total,
          status: 'emitida',
          due_date: '2026-11-15',
          payment_method: 'ideal',
          items: [{ description: concept, total: fee }],
        };

        if (isRealClientId) {
          try {
            const quoteResponse = await apiFetch('/quotes', {
              method: 'POST',
              body: JSON.stringify({
                client_id: selectedClient.id,
                dossier_id: selectedClient.dossiers?.[0]?.id || null,
                items: [{ description: concept, quantity: 1, unit_price: fee }],
                valid_until: '2026-11-30',
                notes: 'Generada desde el Asistente IA',
              }),
            });
            const quoteData = await quoteResponse.json().catch(() => ({}));
            if (!quoteResponse.ok || !quoteData.quote?.id) throw new Error(quoteData.error || 'No se pudo guardar la factura base.');
            const invoiceResponse = await apiFetch(`/quotes/${quoteData.quote.id}/convert`, { method: 'POST' });
            const invoiceData = await invoiceResponse.json().catch(() => ({}));
            if (!invoiceResponse.ok || !invoiceData.invoice?.id) throw new Error(invoiceData.error || 'No se pudo guardar la factura.');
            newInvoice = { ...invoiceData.invoice, concept, client_name: selectedClient.full_name };
          } catch (error) {
            aiReply = `⚠️ No se ha creado la factura en PostgreSQL: ${error instanceof Error ? error.message : 'error de persistencia'}.`;
          }
        } else if (process.env.NODE_ENV === 'production') {
          aiReply = '⚠️ No se puede crear la factura porque la ficha no tiene un ID real de PostgreSQL.';
        }

        if (!aiReply) {
          const updated = {
            ...selectedClient,
            invoices: [newInvoice, ...(selectedClient.invoices || [])],
          };
          setSelectedClient(updated);
          setClients((current) => current.map((c) => (c.id === updated.id ? updated : c)));
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('crm-client-count-updated'));

          executedAction = {
            type: 'invoice_created',
            summary: `Factura oficial ${newInvoice.code || code} emitida por € ${total.toFixed(2)}`,
            data: newInvoice,
          };

          aiReply = `✅ **¡Factura oficial emitida con éxito!**\n\nHe generado la factura **${newInvoice.code || code}** para **${selectedClient.full_name}** por un importe base de **€ ${fee.toFixed(2)}** (IVA incluido).\nConcepto: *${concept}*.\nEstado: **Emitida / Pendiente de Pago (Pago coordinado por WhatsApp)**. Puedes verla en la pestaña de facturación o pulsar el botón a continuación.`;
        }
      }
      // ACCIÓN 2: CREAR PRESUPUESTO
      else if (lower.includes('presupuesto') || lower.includes('presupuestar') || lower.includes('cotizacion')) {
        const amountMatch = textToSend.match(/(\d+(?:[.,]\d+)?)\s*€?/);
        const fee = amountMatch ? parseFloat(amountMatch[1].replace(',', '.')) : 120.00;
        const total = Math.round(fee * 100) / 100;
        const tax = Math.round((total - total / 1.21) * 100) / 100;
        const year = new Date().getFullYear();
        const code = `PRE-${year}-${String((selectedClient.quotes?.length || 0) + 1).padStart(4, '0')}`;
        const concept = lower.includes('m-form')
          ? 'Elaboración y Presentación Fiscal M-Form'
          : lower.includes('subsidio') || lower.includes('toeslag')
          ? 'Tramitación de Subsidios ante Belastingdienst'
          : 'Presupuesto de Asesoría y Gestoría Fiscal';

        let newQuote: any = {
          id: String(Date.now()),
          code,
          concept,
          amount: fee,
          tax_amount: tax,
          total,
          status: 'enviado',
          valid_until: '2026-11-30',
          items: [{ description: concept, total: fee }],
        };

        if (isRealClientId) {
          try {
            const response = await apiFetch('/quotes', {
              method: 'POST',
              body: JSON.stringify({
                client_id: selectedClient.id,
                dossier_id: selectedClient.dossiers?.[0]?.id || null,
                items: [{ description: concept, quantity: 1, unit_price: fee }],
                valid_until: '2026-11-30',
                notes: 'Generado desde el Asistente IA',
              }),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok || !data.quote?.id) throw new Error(data.error || 'No se pudo guardar el presupuesto.');
            newQuote = { ...data.quote, concept, client_name: selectedClient.full_name };
          } catch (error) {
            aiReply = `⚠️ No se ha creado el presupuesto en PostgreSQL: ${error instanceof Error ? error.message : 'error de persistencia'}.`;
          }
        } else if (process.env.NODE_ENV === 'production') {
          aiReply = '⚠️ No se puede crear el presupuesto porque la ficha no tiene un ID real de PostgreSQL.';
        }

        if (!aiReply) {
          const updated = {
            ...selectedClient,
            quotes: [newQuote, ...(selectedClient.quotes || [])],
          };
          setSelectedClient(updated);
          setClients((current) => current.map((c) => (c.id === updated.id ? updated : c)));
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('crm-client-count-updated'));

          executedAction = {
            type: 'quote_created',
            summary: `Presupuesto ${newQuote.code || code} generado por € ${total.toFixed(2)}`,
            data: newQuote,
          };

          aiReply = `✅ **Presupuesto creado y registrado:**\n\nHe preparado el presupuesto **${newQuote.code || code}** para **${selectedClient.full_name}** por un total de **€ ${total.toFixed(2)}** (IVA incluido).\nVálido hasta: 30 de noviembre de 2026. Ha quedado guardado en su sección de presupuestos.`;
        }
      }
      // ACCIÓN 3: AGENDAR CITA
      else if (lower.includes('cita') || lower.includes('llamada') || lower.includes('reunión') || lower.includes('agendar')) {
        const modality = lower.includes('presencial') ? 'presencial' : lower.includes('meet') || lower.includes('video') ? 'online_meet' : 'llamada';
        let newApt: any = {
          id: String(Date.now()),
          title: `Cita Asesoría con ${selectedClient.full_name}`,
          date: '2026-10-16',
          time: '11:00',
          modality: modality,
          status: 'confirmada',
          notes: `Cita programada mediante el Asistente IA para ${selectedClient.full_name}.`,
        };

        if (isRealClientId) {
          try {
            const response = await apiFetch('/appointments', {
              method: 'POST',
              body: JSON.stringify({
                client_id: selectedClient.id,
                title: newApt.title,
                appointment_date: newApt.date,
                appointment_time: newApt.time,
                modality: newApt.modality,
                notes: newApt.notes,
              }),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok || !data.appointment?.id) throw new Error(data.error || 'No se pudo guardar la cita.');
            newApt = { ...newApt, ...data.appointment };
          } catch (error) {
            aiReply = `⚠️ No se ha guardado la cita en PostgreSQL: ${error instanceof Error ? error.message : 'error de persistencia'}.`;
          }
        } else if (process.env.NODE_ENV === 'production') {
          aiReply = '⚠️ No se puede guardar la cita porque la ficha no tiene un ID real de PostgreSQL.';
        }

        if (!aiReply) {
          const updated = {
            ...selectedClient,
            appointments: [newApt, ...(selectedClient.appointments || [])],
          };
          setSelectedClient(updated);
          setClients((current) => current.map((c) => (c.id === updated.id ? updated : c)));
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('crm-client-count-updated'));

          executedAction = {
            type: 'appointment_created',
            summary: `Cita registrada para el ${newApt.date} a las ${newApt.time} (${modality})`,
            data: newApt,
          };

          aiReply = `✅ **Cita agendada en calendario:**\n\nHe programado la cita para el **${newApt.date} a las ${newApt.time}** con **${selectedClient.full_name}**.\nModalidad: **${modality === 'llamada' ? 'Llamada Telefónica (Prioritaria)' : modality === 'online_meet' ? 'Videollamada Google Meet' : 'Presencial en Despacho'}**.\nPuedes consultarla en la pestaña Citas o en el módulo Agenda general.`;
        }
      }
      // ACCIÓN 4: GENERAR Y ARCHIVAR DOCUMENTO / NOTA EN SU EXPEDIENTE
      else if (lower.includes('documento') || lower.includes('informe') || lower.includes('archivar') || lower.includes('resumen') || lower.includes('redacta')) {
        const docTitle = `Informe_Asistente_IA_${Date.now().toString().slice(-4)}.txt`;
        const contentText = `INFORME ASISTENCIAL DE EXPEDIENTE - NEXUSGEST IA\nCliente: ${selectedClient.full_name} (BSN: ${selectedClient.bsn})\nFecha: ${new Date().toLocaleDateString('es-ES')}\n\nResumen de Situación:\n- Domicilio: ${selectedClient.address}, ${selectedClient.city}\n- Trámites en curso: ${(selectedClient.dossiers || []).length}\n- Estado DigiD: ${selectedClient.digid_status}\n- Facturas emitidas: ${(selectedClient.invoices || []).length}\n\nConclusiones y Próximos Pasos:\nEl cliente cuenta con expediente regularizado. Se procede al archivo documental en el sistema de gestión.`;

        const newDoc: ClientDocument = {
          id: String(Date.now()),
          name: docTitle,
          category: 'nota_ia',
          date: new Date().toISOString().slice(0, 10),
          size: `${Math.round(contentText.length / 100)} KB`,
          file_type: 'text',
          added_by: 'ia',
          content_text: contentText,
        };

        if (isRealClientId) {
          try {
            const response = await apiFetch('/documents/text', {
              method: 'POST',
              body: JSON.stringify({
                client_id: selectedClient.id,
                dossier_id: selectedClient.dossiers?.[0]?.id || null,
                category: 'nota_ia',
                file_name: docTitle,
                content: contentText,
              }),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok || !data.document?.id) throw new Error(data.error || 'No se pudo archivar el documento.');
            newDoc.id = String(data.document.id);
          } catch (error) {
            aiReply = `⚠️ No se ha archivado el documento en PostgreSQL: ${error instanceof Error ? error.message : 'error de persistencia'}.`;
          }
        } else if (process.env.NODE_ENV === 'production') {
          aiReply = '⚠️ No se puede archivar el documento porque la ficha no tiene un ID real de PostgreSQL.';
        }

        if (!aiReply) {
          const updated = {
            ...selectedClient,
            documents: [newDoc, ...(selectedClient.documents || [])],
          };
          setSelectedClient(updated);
          setClients((current) => current.map((c) => (c.id === updated.id ? updated : c)));
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('crm-client-count-updated'));

          executedAction = {
            type: 'document_created',
            summary: `Documento "${docTitle}" guardado en la carpeta del cliente`,
            data: newDoc,
          };

          aiReply = `✅ **Documento redactado y archivado:**\n\nHe generado el documento **"${docTitle}"** y lo he guardado automáticamente en el apartado **Documentos** de ${selectedClient.full_name}.\nPuedes abrirlo, previsualizarlo o descargarlo desde la pestaña Documentos.`;
        }
      }
      // ACCIÓN 5: MODIFICAR DATOS DEL CLIENTE
      else if (lower.includes('cambiar') || lower.includes('modificar') || lower.includes('actualizar') || lower.includes('telefono') || lower.includes('teléfono') || lower.includes('direccion') || lower.includes('dirección')) {
        let fieldUpdated = 'Datos de contacto';
        let updated = { ...selectedClient };

        const phoneMatch = textToSend.match(/(\+?\d[\d\s-]{7,}\d)/);
        if (phoneMatch) {
          updated.phone = phoneMatch[1].trim();
          fieldUpdated = `Teléfono a ${updated.phone}`;
        }

        setSelectedClient(updated);
        setClients(clients.map((c) => (c.id === updated.id ? updated : c)));
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('crm-client-count-updated'));

        executedAction = {
          type: 'data_updated',
          summary: `Datos actualizados: ${fieldUpdated}`,
          data: updated,
        };

        aiReply = `✅ **Datos modificados:**\n\nHe actualizado la ficha de **${selectedClient.full_name}**. Se ha registrado el cambio (${fieldUpdated}) tanto en la Ficha 360° como en la base de datos del CRM.`;
      }
      // CONSULTA GENERAL SOBRE EL CLIENTE
      else {
        aiReply = `📋 **Expediente de ${selectedClient.full_name}:**\n\n- **Identificación:** BSN: \`${selectedClient.bsn || '—'}\` · Pasaporte/ID: \`${selectedClient.id_document_number || '—'}\`\n- **Contacto:** ${selectedClient.phone} · ${selectedClient.email}\n- **Domicilio:** ${selectedClient.address || '—'}, ${selectedClient.city || '—'}\n- **DigiD:** ${selectedClient.digid_status === 'activo' ? '🟢 Activo' : selectedClient.digid_status === 'pendiente_activar' ? '🟡 Código Pendiente' : '⚪ Sin DigiD'}\n- **Trámites:** ${(selectedClient.dossiers || []).map((d: any) => `\n  • ${d.code}: ${d.title} (${d.status})`).join('') || 'Sin trámites activos'}\n- **Documentos:** ${(selectedClient.documents || []).length} archivos en su carpeta.\n\nPuedo crear facturas, presupuestos, agendar citas o modificar cualquiera de estos campos.`;
      }

      setClientAiMessages((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          role: 'assistant',
          content: aiReply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          actionExecuted: executedAction,
        },
      ]);
      setIsClientAiSending(false);
    }, 600);
  };

  // Helpers para presupuestos
  const getDocTotals = (doc: any) => {
    if (!doc) return { subtotal: 0, tax: 0, total: 0 };
    const total = parseFloat(doc.total || 0);
    const subtotal = doc.subtotal !== undefined
      ? parseFloat(doc.subtotal)
      : doc.amount !== undefined
      ? parseFloat(doc.amount)
      : Math.round((total / 1.21) * 100) / 100;
    const tax = doc.tax_amount !== undefined
      ? parseFloat(doc.tax_amount)
      : Math.round((total - subtotal) * 100) / 100;
    return { subtotal, tax, total };
  };

  const getDocItems = (doc: any) => {
    if (!doc) return [];
    if (doc.items && Array.isArray(doc.items) && doc.items.length > 0) {
      return doc.items.map((it: any) => ({
        description: it.description || it.title || doc.concept || 'Servicio Gestoría',
        total: parseFloat(it.total || it.fee || 0),
      }));
    }
    const { subtotal } = getDocTotals(doc);
    return [
      {
        description: doc.concept || doc.items?.[0]?.description || 'Servicios y Asesoría Fiscal',
        total: subtotal,
      },
    ];
  };

  const getSelectedQuoteItems = () => {
    return servicesCatalog
      .filter((s) => selectedQuoteServiceIds.includes(s.id))
      .map((s) => ({
        id: s.id,
        service_id: s.id,
        title: s.title,
        category: s.category,
        fee: customQuoteFees[s.id] !== undefined ? customQuoteFees[s.id] : s.defaultFee,
      }));
  };

  const quoteTotal = Math.round(getSelectedQuoteItems().reduce((acc, item) => acc + item.fee, 0) * 100) / 100;
  const quoteSubtotal = Math.round((quoteTotal / 1.21) * 100) / 100;
  const quoteTax = Math.round((quoteTotal - quoteSubtotal) * 100) / 100;

  const toggleQuoteService = (serviceId: string) => {
    let nextIds: string[];
    if (selectedQuoteServiceIds.includes(serviceId)) {
      nextIds = selectedQuoteServiceIds.filter((id) => id !== serviceId);
    } else {
      nextIds = [...selectedQuoteServiceIds, serviceId];
    }
    setSelectedQuoteServiceIds(nextIds);

    if (!isConceptManuallyEdited) {
      const selectedTitles = servicesCatalog
        .filter((s) => nextIds.includes(s.id))
        .map((s) => s.title);
      setQuoteConcept(selectedTitles.join(' + '));
    }
  };

  const handleSelectAllQuoteServices = () => {
    const allIds = servicesCatalog.map((s) => s.id);
    setSelectedQuoteServiceIds(allIds);
    if (!isConceptManuallyEdited) {
      setQuoteConcept(servicesCatalog.map((s) => s.title).join(' + '));
    }
  };

  const handleClearQuoteServices = () => {
    setSelectedQuoteServiceIds([]);
    if (!isConceptManuallyEdited) {
      setQuoteConcept('');
    }
  };

  const handleCustomFeeChange = (serviceId: string, val: number) => {
    setCustomQuoteFees((prev) => ({ ...prev, [serviceId]: val }));
  };

  const openQuoteModal = () => {
    const initialIds = selectedQuoteServiceIds.length > 0 ? selectedQuoteServiceIds : [servicesCatalog[0]?.id || '1'];
    setSelectedQuoteServiceIds(initialIds);
    setIsConceptManuallyEdited(false);
    const selectedTitles = servicesCatalog.filter((s) => initialIds.includes(s.id)).map((s) => s.title);
    setQuoteConcept(selectedTitles.join(' + '));
    setShowNewQuoteModal(true);
  };

  const handleCatalogSelectChange = (serviceId: string) => {
    setSelectedCatalogServiceId(serviceId);
    if (serviceId === '__NEW__') {
      setIsNewServiceMode(true);
      setDossierTitle('');
      setDossierFee(100);
      setDossierCategory('Nuevo Servicio');
    } else {
      setIsNewServiceMode(false);
      const s = servicesCatalog.find((x) => x.id === serviceId);
      if (s) {
        setDossierTitle(s.title);
        setDossierCategory(s.category);
        setDossierFee(s.defaultFee);
      }
    }
  };

  const handleSaveDossier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || !dossierTitle.trim()) return;

    if (isNewServiceMode && saveToCatalogToo) {
      const newService = {
        id: String(Date.now()),
        title: dossierTitle,
        category: dossierCategory,
        defaultFee: dossierFee,
      };
      setServicesCatalog([...servicesCatalog, newService]);
    }

    const nextCount = (selectedClient.dossiers?.length || 0) + 1;
    const year = new Date().getFullYear();
    let newDossier: any = null;
    try {
      const response = await apiFetch('/dossiers', {
        method: 'POST',
        body: JSON.stringify({
          client_id: selectedClient.id,
          title: dossierTitle.trim(),
          category: dossierCategory,
          description: `Trámite registrado para ${selectedClient.full_name}.`,
          fee: dossierFee,
          deadline: dossierDeadline || null,
          priority: 'media',
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'No se pudo guardar el expediente.');
      newDossier = data.dossier;
    } catch (error) {
      if (process.env.NODE_ENV === 'production') {
        showToast(error instanceof Error ? error.message : 'No se pudo guardar el expediente.');
        return;
      }
      newDossier = {
        id: String(Date.now()),
        code: `EXP-${year}-${String(nextCount).padStart(4, '0')}`,
        title: dossierTitle,
        category: dossierCategory,
        status: 'en_proceso',
        progress_percentage: 20,
        fee: dossierFee,
        deadline: dossierDeadline,
        description: `Trámite registrado para ${selectedClient.full_name}.`,
      };
      showToast('Expediente guardado solo en modo local: PostgreSQL no responde.');
    }

    const updatedClient = {
      ...selectedClient,
      dossiers: [newDossier, ...(selectedClient.dossiers || [])],
    };

    setSelectedClient(updatedClient);
    setClients(clients.map((c) => (c.id === updatedClient.id ? updatedClient : c)));
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('crm-client-count-updated'));
    setShowAddDossierModal(false);
    showToast(`Trámite ${newDossier.code} asignado.`);
  };

  const handleSaveAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;

    let newApt: any;
    try {
      const response = await apiFetch('/appointments', {
        method: 'POST',
        body: JSON.stringify({
          client_id: selectedClient.id,
          title: aptTitle,
          appointment_date: aptDate,
          appointment_time: `${aptTime}:00`,
          modality: aptModality,
          duration_minutes: 30,
          notes: `Cita con ${selectedClient.full_name} (${selectedClient.phone || ''})`,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'No se pudo guardar la cita.');
      const saved = data.appointment;
      newApt = {
        id: String(saved.id),
        title: saved.title,
        appointment_date: String(saved.appointment_date).slice(0, 10),
        appointment_time: saved.appointment_time,
        modality: saved.modality,
        status: saved.status,
        notes: saved.notes || '',
      };
    } catch (error) {
      if (process.env.NODE_ENV === 'production') {
        showToast(error instanceof Error ? error.message : 'No se pudo guardar la cita.');
        return;
      }
      newApt = {
        id: String(Date.now()),
        title: aptTitle,
        appointment_date: aptDate,
        appointment_time: `${aptTime}:00`,
        modality: aptModality,
        status: 'confirmada',
        notes: `Cita con ${selectedClient.full_name} (${selectedClient.phone || ''})`,
      };
      showToast('Cita guardada solo en modo local: PostgreSQL no responde.');
    }

    const updatedClient = {
      ...selectedClient,
      appointments: [newApt, ...(selectedClient.appointments || [])],
    };

    setSelectedClient(updatedClient);
    setClients(clients.map((c) => (c.id === updatedClient.id ? updatedClient : c)));
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('crm-client-count-updated'));
    setShowNewAptModal(false);
    setActive360Tab('citas');
    showToast('Cita agendada.');
  };

  const handleSaveQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;
    const items = getSelectedQuoteItems();
    const total = quoteTotal || Number(customQuoteFees['manual'] || 0);
    if (items.length === 0 && !quoteConcept.trim()) { showToast('Selecciona un servicio o indica un concepto.', 'error'); return; }
    try {
      const response = await apiFetch('/quotes', {
        method: 'POST',
        body: JSON.stringify({
          client_id: selectedClient.id,
          dossier_id: selectedClient.dossiers?.[0]?.id || null,
          items: items.length > 0 ? items.map((item) => ({ service_id: item.id, description: item.title, quantity: 1, unit_price: item.fee })) : [{ description: quoteConcept.trim(), quantity: 1, unit_price: total }],
          valid_until: quoteValidUntil,
          notes: quoteConcept.trim() || null,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.quote?.id) throw new Error(data.error || 'No se pudo guardar el presupuesto.');
      const persisted = data.quote;
      const updatedClient = { ...selectedClient, quotes: [persisted, ...(selectedClient.quotes || [])] };
      setSelectedClient(updatedClient);
      setClients(clients.map((c) => (c.id === updatedClient.id ? updatedClient : c)));
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('crm-client-count-updated'));
      setShowNewQuoteModal(false);
      setActive360Tab('presupuestos');
      showToast(`Presupuesto ${persisted.code} generado.`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'No se pudo guardar el presupuesto.', 'error');
    }
  };

  const handleConvertQuoteInFicha = async (quote: any) => {
    let newInvoice: any = null;
    try {
      const response = await apiFetch(`/quotes/${quote.id}/convert`, { method: 'POST' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'No se pudo convertir el presupuesto.');
      newInvoice = data.invoice;
    } catch (error) {
      if (process.env.NODE_ENV === 'production') {
        showToast(error instanceof Error ? error.message : 'No se pudo convertir el presupuesto.', 'error');
        return;
      }
      const nextCount = (selectedClient.invoices?.length || 0) + 1;
      const year = new Date().getFullYear();
      newInvoice = {
        id: String(Date.now()),
        code: `FAC-${year}-${String(nextCount).padStart(4, '0')}`,
        concept: quote.concept,
        total: quote.total,
        status: 'emitida',
        due_date: '2026-11-15',
        payment_method: 'ideal',
        items: quote.items || [{ description: quote.concept, total: quote.amount }],
      };
      showToast('Factura creada solo en modo local: PostgreSQL no responde.', 'error');
    }

    const updatedQuotes = selectedClient.quotes.map((q: any) =>
      q.id === quote.id ? { ...q, status: 'convertido' } : q
    );

    const updatedClient = {
      ...selectedClient,
      quotes: updatedQuotes,
      invoices: [newInvoice, ...(selectedClient.invoices || [])],
    };

    setSelectedClient(updatedClient);
    setClients(clients.map((c) => (c.id === updatedClient.id ? updatedClient : c)));
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('crm-client-count-updated'));
    showToast(`Presupuesto convertido a Factura ${newInvoice.code}`);
  };

  // Filtrado de la tabla principal
  const filteredClients = clients.filter((c) => {
    const matchSearch =
      c.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.bsn?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.city?.toLowerCase().includes(searchTerm.toLowerCase());

    if (filterStatus === 'activos') return matchSearch && c.status === 'activo';
    if (filterStatus === 'con_digid') return matchSearch && c.digid_status === 'activo';
    if (filterStatus === 'pendientes') return matchSearch && c.digid_status === 'pendiente_activar';
    return matchSearch;
  });

  return (
    <div className="w-full h-full max-h-[calc(100vh-4.6rem)] overflow-hidden flex flex-col gap-2.5">
      {/* Toast de Notificaciones */}
      {toastMessage && (
        <div
          role={toastTipo === 'error' ? 'alert' : 'status'}
          className={`fixed top-20 right-8 z-[200] px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border animate-in fade-in duration-200 ${
            toastTipo === 'error'
              ? 'bg-red-50 text-red-800 border-red-300'
              : 'bg-slate-900 text-white border-secondary/40'
          }`}
        >
          <span
            className={`material-symbols-outlined text-xl ${
              toastTipo === 'error' ? 'text-red-600' : 'text-secondary'
            }`}
          >
            {toastTipo === 'error' ? 'error' : 'check_circle'}
          </span>
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-surface-container shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-on-surface">Directorio de Clientes</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary/10 text-secondary">
              Gestión Integral 360°
            </span>
          </div>
          <p className="text-[11px] text-on-surface-variant">
            Pulsa sobre cualquier cliente para abrir su Ficha 360°, gestionar documentos o activar al Asistente IA.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-2.5 top-2 text-outline text-sm">search</span>
            <input
              type="text"
              aria-label="Buscar clientes por nombre, BSN o email"
              placeholder="Buscar cliente, BSN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 pl-8 pr-3 text-xs bg-surface-container-lowest border border-outline-variant rounded-md focus:border-secondary focus:outline-none w-48 sm:w-56 shadow-xs"
            />
          </div>

          <button
            type="button"
            onClick={handleExportClientsCsv}
            className="h-8 px-2.5 bg-surface-container-lowest border border-outline-variant text-on-surface hover:border-secondary hover:text-secondary text-xs font-semibold rounded-md shadow-xs transition-colors flex items-center gap-1"
            title="Descargar lista de clientes en CSV"
          >
            <span className="material-symbols-outlined text-[15px]">file_download</span>
            <span className="hidden sm:inline">CSV</span>
          </button>

          <input ref={importFileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleImportClientsCsv} />
          <button
            type="button"
            onClick={() => importFileRef.current?.click()}
            className="h-8 px-2.5 bg-surface-container-lowest border border-outline-variant text-on-surface hover:border-secondary hover:text-secondary text-xs font-semibold rounded-md shadow-xs transition-colors flex items-center gap-1"
            title="Importar clientes desde CSV"
          >
            <span className="material-symbols-outlined text-[15px]">upload_file</span>
            <span className="hidden sm:inline">Importar</span>
          </button>

          <Link
            href="/crm/backup"
            className="h-8 px-2.5 bg-surface-container-lowest border border-outline-variant text-on-surface hover:border-secondary hover:text-secondary text-xs font-semibold rounded-md shadow-xs transition-colors flex items-center gap-1"
            title="Ir al Centro de Copias de Seguridad"
          >
            <span className="material-symbols-outlined text-[15px] text-secondary">cloud_download</span>
            <span className="hidden md:inline">Backup</span>
          </Link>

          <Link href="/crm/clientes/alta-ia" className="h-8 px-3 border border-secondary text-secondary text-xs font-semibold rounded-md hover:bg-blue-50 transition-colors flex items-center gap-1">
            <span className="material-symbols-outlined text-[15px]">auto_awesome</span>
            <span>Alta IA</span>
          </Link>

          <Link
            href="/crm/clientes/alta-ia?mode=manual"
            className="h-8 px-3 bg-secondary text-white text-xs font-semibold rounded-md shadow-sm hover:bg-blue-700 transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[15px]">person_add</span>
            <span>+ Cliente</span>
          </Link>
        </div>
      </div>

      <section aria-label="Resumen de clientes" className="grid grid-cols-2 gap-2 md:grid-cols-4 shrink-0">
        <article className="rounded-lg border border-outline-variant bg-surface-container-lowest p-2.5 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-bold text-on-surface-variant">Total clientes</p>
            <p className="text-lg font-bold text-on-surface leading-tight">{clientStats?.total ?? '—'}</p>
          </div>
          <span className="material-symbols-outlined text-outline/50 text-2xl">groups</span>
        </article>
        <article className="rounded-lg border border-outline-variant bg-surface-container-lowest p-2.5 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-bold text-on-surface-variant">Activos</p>
            <p className="text-lg font-bold text-emerald-700 leading-tight">{clientStats?.activos ?? '—'}</p>
          </div>
          <span className="material-symbols-outlined text-emerald-600/40 text-2xl">check_circle</span>
        </article>
        <article className="rounded-lg border border-outline-variant bg-surface-container-lowest p-2.5 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-bold text-on-surface-variant">Archivados</p>
            <p className="text-lg font-bold text-on-surface leading-tight">{clientStats?.archivados ?? '—'}</p>
          </div>
          <span className="material-symbols-outlined text-outline/50 text-2xl">archive</span>
        </article>
        <article className="rounded-lg border border-outline-variant bg-surface-container-lowest p-2.5 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-bold text-on-surface-variant">Nuevos mes</p>
            <p className="text-lg font-bold text-secondary leading-tight">{clientStats?.nuevos_este_mes ?? '—'}</p>
          </div>
          <span className="material-symbols-outlined text-secondary/40 text-2xl">trending_up</span>
        </article>
      </section>

      {/* Filter Tabs & Counter */}
      <div className="flex items-center justify-between border-b border-surface-container text-xs font-semibold shrink-0 pb-1">
        <div className="flex gap-2">
          <button type="button"
            onClick={() => setFilterStatus('todos')}
            className={`pb-1.5 px-3 border-b-2 text-xs transition-all ${
              filterStatus === 'todos' ? 'border-secondary text-secondary' : 'border-transparent text-outline hover:text-on-surface'
            }`}
          >
            Todos ({clients.length})
          </button>
          <button type="button"
            onClick={() => setFilterStatus('con_digid')}
            className={`pb-1.5 px-3 border-b-2 text-xs transition-all ${
              filterStatus === 'con_digid' ? 'border-secondary text-secondary' : 'border-transparent text-outline hover:text-on-surface'
            }`}
          >
            DigiD Activo
          </button>
          <button type="button"
            onClick={() => setFilterStatus('pendientes')}
            className={`pb-1.5 px-3 border-b-2 text-xs transition-all ${
              filterStatus === 'pendientes' ? 'border-secondary text-secondary' : 'border-transparent text-outline hover:text-on-surface'
            }`}
          >
            Pendientes DigiD
          </button>
        </div>

        <div className="text-[11px] text-outline">
          Mostrando <span className="font-mono-data font-semibold text-on-surface">{filteredClients.length}</span> {filteredClients.length === 1 ? 'cliente' : 'clientes'}
        </div>
      </div>

      {/* Grid: Clients Directory Table (CLICK EN FILA ABRE CLIENTE) */}
      <div className="flex-1 min-h-0 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 z-10 bg-surface-container-low text-outline font-semibold uppercase tracking-wider border-b border-surface-container shadow-xs">
              <tr>
                <th className="px-5 py-3">Cliente / Contacto</th>
                <th className="px-5 py-3">BSN</th>
                <th className="px-5 py-3">Ciudad / Dirección</th>
                <th className="px-5 py-3">Estado DigiD</th>
                <th className="px-5 py-3 text-center">Trámites</th>
                <th className="px-5 py-3 text-center">Documentos</th>
                <th className="px-5 py-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {(directoryError || statsError) && <tr><td colSpan={7} className="p-4 text-red-700" role="alert">{directoryError || statsError}</td></tr>}
              {directoryLoading && <tr><td colSpan={7} className="p-4" role="status">Cargando clientes…</td></tr>}
              {!directoryLoading && !directoryError && filteredClients.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <div className="mx-auto flex max-w-md flex-col items-center">
                      <span className="material-symbols-outlined text-5xl text-secondary/50">groups</span>
                      <h2 className="mt-3 text-base font-bold text-on-surface">Todavía no tienes clientes</h2>
                      <p className="mt-1 text-xs leading-5 text-on-surface-variant">Crea tu primer cliente o importa tu directorio para empezar a gestionar expedientes, documentos y facturación.</p>
                      <div className="mt-4 flex flex-wrap justify-center gap-2">
                        <Link href="/crm/clientes/nuevo" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-secondary px-4 text-xs font-bold text-white hover:bg-blue-700">
                          <span className="material-symbols-outlined text-[16px]">person_add</span>
                          Crear primer cliente
                        </Link>
                        <button type="button" onClick={() => void handleRestoreDemoClient()} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-secondary px-4 text-xs font-bold text-secondary hover:bg-blue-50">
                          <span className="material-symbols-outlined text-[16px]">restore</span>
                          Restaurar cliente demo
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
              {filteredClients.map((client) => (
                <tr
                  key={client.id}
                  onClick={() => handleOpenClient(client)}
                  {...activableConTeclado(() => handleOpenClient(client))}
                  onKeyDown={(event) => {
                    if (event.target === event.currentTarget) activableConTeclado(() => handleOpenClient(client)).onKeyDown(event);
                  }}
                  className="hover:bg-blue-50/50 cursor-pointer transition-colors group"
                  title="Pulsar para abrir Ficha 360° (Enter)"
                >
                  <td className="px-5 py-3.5">
                    <div className="font-bold text-on-surface text-sm group-hover:text-secondary flex items-center gap-1.5 transition-colors">
                      <span className="material-symbols-outlined text-[18px] text-secondary">account_circle</span>
                      <span>{client.full_name}</span>
                    </div>
                    <div className="text-[11px] text-outline mt-0.5">{client.email} · {client.phone}</div>
                  </td>
                  <td className="px-5 py-3.5 font-mono-data font-bold text-secondary">
                    {client.bsn || '—'}
                  </td>
                  <td className="px-5 py-3.5 text-on-surface-variant">
                    <div className="font-semibold text-on-surface">{client.city || 'Sin dato'}</div>
                    <div className="text-[11px] text-outline">{client.address || '—'}</div>
                  </td>
                  <td className="px-5 py-3.5">
                    {client.digid_status === 'activo' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> DigiD Activo
                      </span>
                    ) : client.digid_status === 'pendiente_activar' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Código Pendiente
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-surface-container text-outline">
                        Sin DigiD
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <span className="px-2 py-0.5 bg-surface-container-high rounded-full font-mono-data font-bold text-[11px]">
                      {client.dossiers_count ?? client.dossiers?.length ?? '—'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <span className="px-2 py-0.5 bg-blue-50 text-secondary border border-secondary/20 rounded-full font-mono-data font-bold text-[11px] inline-flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px]">description</span>
                      <span>{client.documents_count ?? (client.documents?.length ? client.documents.length : '—')}</span>
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenClient(client);
                        }}
                        className="h-8 px-3.5 bg-secondary text-white text-xs font-semibold rounded hover:bg-blue-700 transition-colors inline-flex items-center gap-1.5 shadow-xs"
                      >
                        <span className="material-symbols-outlined text-[15px]">visibility</span>
                        <span>Ficha 360°</span>
                      </button>
                      <Link href={`/crm/clientes/${client.id}`} className="inline-flex h-8 items-center rounded border border-outline-variant px-2 text-[11px] font-semibold text-on-surface-variant hover:border-secondary hover:text-secondary" onClick={(event) => event.stopPropagation()} aria-label={`Abrir ficha completa de ${client.full_name}`}>Abrir</Link>
                      <Link href={`/crm/clientes?client=${encodeURIComponent(String(client.id))}&from=ficha`} onClick={(event) => event.stopPropagation()} className="inline-flex h-8 items-center rounded border border-outline-variant px-2 text-[11px] font-semibold text-on-surface-variant hover:border-secondary hover:text-secondary">Editar ficha</Link>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); void handleDeleteClient(client); }}
                        className="inline-flex h-8 w-8 items-center justify-center rounded border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors"
                        aria-label={`Eliminar cliente ${client.full_name}`}
                        title={`Eliminar cliente ${client.full_name}`}
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FICHA 360° DEL CLIENTE (PANTALLA COMPLETA CON DOCUMENTOS, EDICIÓN Y ASISTENTE IA) */}
      {/* ========================================================================= */}
      {selectedClient && (
        <div
          className={`fixed inset-y-0 right-0 ${
            isMaximized ? 'left-0 z-[100]' : 'left-0 lg:left-64 z-40'
          } bg-surface flex flex-col overflow-hidden shadow-2xl border-l border-surface-container-high transition-all`}
          style={{ top: 0, marginTop: 0, paddingTop: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label={`Ficha 360 de ${selectedClient.full_name}`}
        >
          {/* Top Bar de la Ficha 360° */}
          <header className="min-h-16 py-2 px-4 sm:px-6 lg:px-8 bg-surface-container-lowest border-b border-surface-container-high flex flex-wrap items-center justify-between gap-3 shadow-sm shrink-0">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <button
                type="button"
                onClick={handleCloseFicha}
                className="h-8 sm:h-9 px-2.5 sm:px-3 border border-outline-variant bg-surface hover:bg-surface-container text-on-surface rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
                title={returnOrigin === 'agenda' ? 'Volver a la Agenda' : 'Cerrar y volver al listado'}
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                <span>{returnOrigin === 'agenda' ? 'Volver a Agenda' : 'Cerrar'}</span>
              </button>

              <div className="h-6 w-px bg-surface-container-high shrink-0" />

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold tracking-tight text-on-surface truncate">
                    {selectedClient.full_name}
                  </h2>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono-data font-bold bg-blue-50 text-secondary border border-secondary/20">
                    BSN: {selectedClient.bsn || 'Sin BSN'}
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant truncate">
                  {selectedClient.email} · {selectedClient.phone} · {selectedClient.city}
                </p>
              </div>
            </div>

            {/* Acciones principales de cabecera */}
            <div className="flex items-center gap-2">
              {/* BOTÓN EDITAR CLIENTE */}
              <button
                type="button"
                onClick={() => handleOpenEditClient(selectedClient)}
                className="h-8 sm:h-9 px-3 bg-secondary text-white text-xs font-semibold rounded-md shadow-xs hover:bg-blue-700 transition-colors flex items-center gap-1.5"
                title="Editar todos los datos del cliente"
              >
                <span className="material-symbols-outlined text-[16px]">edit</span>
                <span>Editar Datos</span>
              </button>

              {/* Desactivar: alternativa segura a eliminar. El backend solo
                  marca status='inactivo'; el expediente y las facturas quedan
                  intactos. Se muestra únicamente si el cliente está activo. */}
              {selectedClient.status !== 'inactivo' && (
                <button
                  type="button"
                  onClick={handleDeactivateClient}
                  className="h-8 sm:h-9 px-3 border border-outline-variant text-on-surface-variant text-xs font-semibold rounded-md shadow-xs hover:bg-surface-container transition-colors flex items-center gap-1.5"
                  title="Desactivar el cliente sin borrar su historial"
                >
                  <span className="material-symbols-outlined text-[16px]">visibility_off</span>
                  <span className="hidden sm:inline">Desactivar</span>
                </button>
              )}

              {/* Eliminar. El backend lo bloquea si el cliente tiene facturas
                  pagadas, y devuelve el motivo para que se muestre. */}
              <button
                type="button"
                onClick={handleDeleteClient}
                aria-label="Eliminar cliente"
                className="h-8 sm:h-9 w-8 sm:w-9 border border-outline-variant text-outline rounded-md shadow-xs hover:text-error hover:bg-red-50 hover:border-red-200 transition-colors flex items-center justify-center"
                title="Eliminar cliente (bloqueado si tiene facturas pagadas)"
              >
                <span className="material-symbols-outlined text-[17px]">delete</span>
              </button>

              {/* Botón Maximizar / Pantalla completa */}
              <button
                type="button"
                onClick={() => setIsMaximized(!isMaximized)}
                aria-label={isMaximized ? 'Restaurar vista lateral' : 'Ver ficha a pantalla completa'}
                aria-pressed={isMaximized}
                className="h-8 sm:h-9 w-8 sm:w-9 rounded-md border border-outline-variant hover:bg-surface-container text-on-surface-variant flex items-center justify-center transition-colors"
                title={isMaximized ? "Restaurar vista lateral" : "Pantalla completa"}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {isMaximized ? 'fullscreen_exit' : 'fullscreen'}
                </span>
              </button>
            </div>
          </header>

          {/* Sub-Tabs de Navegación de la Ficha 360° */}
          <div className="bg-surface-container-low px-4 sm:px-6 lg:px-8 border-b border-surface-container flex gap-1 sm:gap-2 text-xs font-semibold shrink-0 overflow-x-auto whitespace-nowrap no-scrollbar">
            {/* 1. Resumen */}
            <button
              type="button"
              onClick={() => setActive360Tab('resumen')}
              aria-pressed={active360Tab === 'resumen'}
              className={`py-3 px-2.5 sm:px-3 border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
                active360Tab === 'resumen' ? 'border-secondary text-secondary bg-white/40' : 'border-transparent text-outline hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">dashboard</span>
              <span>Resumen</span>
            </button>

            {/* 2. Datos Personales & BSN */}
            <button
              type="button"
              onClick={() => setActive360Tab('personales')}
              aria-pressed={active360Tab === 'personales'}
              className={`py-3 px-2.5 sm:px-3 border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
                active360Tab === 'personales' ? 'border-secondary text-secondary bg-white/40' : 'border-transparent text-outline hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">badge</span>
              <span>Datos Personales & BSN</span>
            </button>

            {/* 3. Servicios / Trámites */}
            <button
              type="button"
              onClick={() => setActive360Tab('servicios')}
              aria-pressed={active360Tab === 'servicios'}
              className={`py-3 px-2.5 sm:px-3 border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
                active360Tab === 'servicios' ? 'border-secondary text-secondary bg-white/40' : 'border-transparent text-outline hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">business_center</span>
              <span>Expedientes ({selectedClient.dossiers?.length || 0})</span>
            </button>

            {/* 4. Documentos */}
            <button
              type="button"
              onClick={() => setActive360Tab('documentos')}
              aria-pressed={active360Tab === 'documentos'}
              className={`py-3 px-2.5 sm:px-3 border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
                active360Tab === 'documentos' ? 'border-secondary text-secondary bg-white/40' : 'border-transparent text-outline hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">folder_shared</span>
              <span>Documentos ({selectedClient.documents?.length || 0})</span>
            </button>

            {/* 5. Presupuestos */}
            <button
              type="button"
              onClick={() => setActive360Tab('presupuestos')}
              aria-pressed={active360Tab === 'presupuestos'}
              className={`py-3 px-2.5 sm:px-3 border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
                active360Tab === 'presupuestos' ? 'border-secondary text-secondary bg-white/40' : 'border-transparent text-outline hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">request_quote</span>
              <span>Presupuestos ({selectedClient.quotes?.length || 0})</span>
            </button>

            {/* 6. Facturas */}
            <button type="button"
              onClick={() => setActive360Tab('facturas')}
              className={`py-3 px-2.5 sm:px-3 border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
                active360Tab === 'facturas' ? 'border-secondary text-secondary bg-white/40' : 'border-transparent text-outline hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">receipt_long</span>
              <span>Facturas ({selectedClient.invoices?.length || 0})</span>
            </button>

            {/* 7. Citas */}
            <button type="button"
              onClick={() => setActive360Tab('citas')}
              className={`py-3 px-2.5 sm:px-3 border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
                active360Tab === 'citas' ? 'border-secondary text-secondary bg-white/40' : 'border-transparent text-outline hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">calendar_month</span>
              <span>Citas ({selectedClient.appointments?.length || 0})</span>
            </button>

            {/* 8. Mensajes */}
            <button
              type="button"
              onClick={() => setActive360Tab('mensajes')}
              aria-pressed={active360Tab === 'mensajes'}
              className={`py-3 px-2.5 sm:px-3 border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
                active360Tab === 'mensajes' ? 'border-secondary text-secondary bg-white/40' : 'border-transparent text-outline hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">chat</span>
              <span>Mensajes ({clientMessages.length})</span>
            </button>

            {/* 9. Notas & Tareas */}
            <button type="button"
              onClick={() => setActive360Tab('tareas')}
              className={`py-3 px-2.5 sm:px-3 border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
                active360Tab === 'tareas' ? 'border-secondary text-secondary bg-white/40' : 'border-transparent text-outline hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">checklist</span>
              <span>Notas & Tareas ({getClientTasks(selectedClient).filter((t: any) => !t.completed).length})</span>
            </button>

            {/* 9. Historial & Actividad IA */}
            <button type="button"
              onClick={() => setActive360Tab('historial')}
              className={`py-3 px-2.5 sm:px-3 border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
                active360Tab === 'historial' ? 'border-secondary text-secondary bg-white/40' : 'border-transparent text-outline hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[16px] text-secondary">history_edu</span>
              <span>Historial & Actividad IA</span>
            </button>

            {/* 10. Asistente IA (Gestión Total) */}
            <button type="button"
              onClick={() => setActive360Tab('ia')}
              className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
                active360Tab === 'ia'
                  ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                  : 'border-transparent text-outline hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[16px] text-indigo-600 animate-pulse">smart_toy</span>
              <span className="font-bold text-indigo-950">Asistente IA (Gestión Total)</span>
            </button>
          </div>

          {/* Área Principal de Contenido de la Ficha 360° */}
          <div
            className={`flex-1 ${
              active360Tab === 'ia'
                ? 'p-2 sm:p-4 lg:p-6 flex flex-col h-full min-h-0 overflow-hidden'
                : 'overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6'
            } no-scrollbar`}
          >
            {/* TAB 1: RESUMEN GENERAL 360° (DASHBOARD EJECUTIVO) */}
            {active360Tab === 'resumen' && (
              <div className="space-y-6 w-full">
                {/* Main Workspace Grid (7 cols / 5 cols) */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                  {/* Columna Izquierda (7 cols on XL) */}
                  <div className="xl:col-span-7 space-y-6">
                    {/* Widget 1: Servicios Activos */}
                    <div className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-secondary text-2xl">business_center</span>
                          <h3 className="font-bold text-sm text-on-surface">Servicios Activos ({selectedClient.dossiers?.length || 0})</h3>
                        </div>
                        <button type="button"
                          onClick={() => setActive360Tab('servicios')}
                          className="text-xs font-semibold text-secondary hover:underline flex items-center gap-1"
                        >
                          <span>Ver catálogo completo</span>
                          <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                        </button>
                      </div>

                      <div className="space-y-3">
                        {selectedClient.dossiers && selectedClient.dossiers.length > 0 ? (
                          selectedClient.dossiers.map((d: any) => (
                            <div key={d.id} className="p-4 bg-surface rounded-xl border border-surface-container space-y-3">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-outline">{d.category}</span>
                                  <h4 className="font-bold text-xs text-on-surface">{d.title}</h4>
                                </div>
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-secondary border border-secondary/20">
                                  {d.status === 'completado' ? 'Completado' : 'En trámite con Belastingdienst'}
                                </span>
                              </div>

                              {/* Matrix de detalles */}
                              <div className="grid grid-cols-3 gap-2 py-2 bg-surface-container-lowest rounded-lg px-3 text-xs">
                                <div>
                                  <span className="text-[10px] text-outline block">Importe</span>
                                  <span className="font-mono-data font-bold text-on-surface">€ {Number(d.fee || 0).toFixed(2)}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-outline block">Responsable</span>
                                  <span className="font-medium text-on-surface">Elena Martínez</span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-outline block">Plazo Estimado</span>
                                  <span className="font-medium text-on-surface">{d.deadline || '3-5 días'}</span>
                                </div>
                              </div>

                              <div className="flex items-center justify-between text-xs pt-1">
                                <span className="text-on-surface-variant text-[11px] flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[15px] text-emerald-600">check_circle</span>
                                  <span>Formulario DigiD / Trámite telemático enviado</span>
                                </span>
                                <button type="button"
                                  onClick={() => setActive360Tab('servicios')}
                                  className="px-2.5 py-1 bg-surface-container-high hover:bg-surface-container text-on-surface text-[11px] font-semibold rounded"
                                >
                                  Ver expediente
                                </button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-6 text-outline text-xs">
                            No hay servicios activos registrados para este cliente.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Widget 2: Documentación del Cliente */}
                    <div className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-secondary text-2xl">folder_shared</span>
                          <h3 className="font-bold text-sm text-on-surface">Documentación del Cliente</h3>
                        </div>
                        <span className="text-xs font-mono-data text-outline">
                          {selectedClient.documents?.length || 0} Archivos en Expediente
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {(selectedClient.documents || []).length > 0 ? (
                          selectedClient.documents.slice(0, 2).map((doc: any) => (
                            <div key={doc.id} className="p-3 bg-surface rounded-xl border border-surface-container flex flex-col justify-between gap-3">
                              <div className="flex items-start gap-3">
                                <div className="p-2 bg-blue-50 text-secondary rounded-lg">
                                  <span className="material-symbols-outlined text-[20px]">description</span>
                                </div>
                                <div className="min-w-0 flex-1">
                                  <span className="font-bold text-xs text-on-surface block truncate">{doc.name || doc.file_name || 'Documento'}</span>
                                  <span className="text-[10px] text-outline block">{doc.category || 'Documento del cliente'}</span>
                                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 mt-1">
                                    <span className="material-symbols-outlined text-[13px]">verified</span>
                                    <span>{doc.ocr_status === 'completado' ? 'Lectura completada' : 'Registrado'}</span>
                                  </span>
                                </div>
                              </div>
                              <button type="button"
                                onClick={() => setActive360Tab('documentos')}
                                className="w-full py-1 bg-surface-container hover:bg-surface-container-high rounded text-[11px] font-semibold text-on-surface"
                              >
                                Abrir documento
                              </button>
                            </div>
                          ))
                        ) : (
                          <div className="sm:col-span-2 text-center py-6 text-outline text-xs border border-dashed border-outline-variant rounded-xl">
                            No hay documentos registrados para este cliente.
                          </div>
                        )}
                      </div>

                      <div className="pt-1 flex justify-end">
                        <button type="button"
                          onClick={() => setActive360Tab('documentos')}
                          className="text-xs font-semibold text-secondary hover:underline flex items-center gap-1"
                        >
                          <span>Ver todos los documentos ({selectedClient.documents?.length || 0})</span>
                          <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Columna Derecha (5 cols on XL) */}
                  <div className="xl:col-span-5 space-y-6">
                    {/* Widget 3: Presupuesto Activo */}
                    <div className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-secondary text-2xl">receipt</span>
                          <h3 className="font-bold text-sm text-on-surface">Presupuesto Activo</h3>
                        </div>
                        {selectedClient.quotes?.[0]?.code && (
                          <span className="px-2 py-0.5 bg-blue-50 text-secondary font-mono-data font-bold text-xs rounded border border-secondary/20">
                            {selectedClient.quotes[0].code}
                          </span>
                        )}
                      </div>

                      {selectedClient.quotes?.[0] ? (
                        <div className="p-3.5 bg-surface rounded-xl border border-surface-container space-y-2 text-xs">
                          <div className="flex items-center justify-between text-on-surface-variant">
                            <span>{selectedClient.quotes[0].concept || selectedClient.quotes[0].items?.[0]?.description || 'Presupuesto'}</span>
                            <span className="font-mono-data font-semibold text-on-surface">€ {getDocTotals(selectedClient.quotes[0]).subtotal.toFixed(2)}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm font-bold text-on-surface pt-1 border-t border-surface-container"><span>Total presupuesto (IVA incluido)</span><span className="font-mono-data text-secondary">€ {getDocTotals(selectedClient.quotes[0]).total.toFixed(2)}</span></div>
                        </div>
                      ) : (
                        <div className="text-center py-6 text-outline text-xs border border-dashed border-outline-variant rounded-xl">No hay presupuestos registrados para este cliente.</div>
                      )}

                      {selectedClient.quotes && selectedClient.quotes.length > 0 && selectedClient.quotes[0].status !== 'convertido' ? (
                        <button type="button"
                          onClick={() => handleConvertQuoteInFicha(selectedClient.quotes[0])}
                          className="w-full h-9 bg-secondary hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                        >
                          <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                          <span>Convertir en Factura Oficial (1 Clic)</span>
                        </button>
                      ) : (
                        <button type="button"
                          onClick={() => setActive360Tab('presupuestos')}
                          className="w-full h-9 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <span>Ver todos los presupuestos</span>
                        </button>
                      )}
                    </div>

                    {/* Widget 4: Próxima Cita */}
                    <div className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-secondary text-2xl">event</span>
                          <h3 className="font-bold text-sm text-on-surface">Próxima Cita</h3>
                        </div>
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold text-[10px] rounded uppercase">
                          Confirmada
                        </span>
                      </div>

                      {selectedClient.appointments?.[0] ? (
                        <div className="p-3.5 bg-surface rounded-xl border border-surface-container flex items-start gap-3">
                          <div className="w-12 h-12 rounded-lg bg-blue-50 text-secondary flex flex-col items-center justify-center shrink-0 border border-secondary/20">
                            <span className="text-[10px] font-bold uppercase leading-none">{new Date(selectedClient.appointments[0].appointment_date || selectedClient.appointments[0].date).toLocaleDateString('es-ES', { month: 'short' })}</span>
                            <span className="text-base font-bold leading-none mt-1">{new Date(selectedClient.appointments[0].appointment_date || selectedClient.appointments[0].date).getDate()}</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="font-mono-data font-bold text-xs text-on-surface">{selectedClient.appointments[0].appointment_time || selectedClient.appointments[0].time || 'Hora pendiente'}</span>
                            <span className="text-xs text-on-surface-variant flex items-center gap-1 mt-0.5 font-medium"><span className="material-symbols-outlined text-[15px] text-emerald-600">event</span><span>{selectedClient.appointments[0].title || 'Cita'}</span></span>
                            <span className="text-[11px] text-outline block mt-0.5">Estado: {selectedClient.appointments[0].status || 'confirmada'}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-6 text-outline text-xs border border-dashed border-outline-variant rounded-xl">No hay citas registradas para este cliente.</div>
                      )}

                      <div className="flex items-center gap-2">
                        <a
                          href={selectedClient.phone ? `tel:${selectedClient.phone}` : undefined}
                          className="flex-1 h-8 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                        >
                          <span className="material-symbols-outlined text-[15px]">call</span>
                          <span>{selectedClient.phone ? 'Llamar Ahora' : 'Teléfono no configurado'}</span>
                        </a>
                        <button type="button"
                          onClick={() => setActive360Tab('citas')}
                          className="h-8 px-3 border border-outline-variant hover:bg-surface-container rounded-lg text-xs font-semibold text-on-surface"
                          title="Gestionar citas"
                        >
                          Ver Citas
                        </button>
                      </div>
                    </div>

                    {/* Widget 5: Historial & Registro IA (Resumen) */}
                    <div className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-secondary text-2xl">auto_awesome</span>
                          <h3 className="font-bold text-sm text-on-surface">Historial & Registro IA</h3>
                        </div>
                        <span className="text-[10px] font-bold text-outline uppercase">Registro</span>
                      </div>

                      <div className="space-y-3 relative pl-4 before:content-[''] before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-surface-container-high">
                        {getClientActivities(selectedClient).slice(0, 3).map((act: any) => (
                          <div key={act.id} className="relative text-xs">
                            <div className="w-2.5 h-2.5 rounded-full bg-secondary absolute -left-[14px] top-1" />
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono-data font-bold text-[11px] text-on-surface">{act.time}</span>
                              <span className="px-1.5 py-0.2 bg-secondary/10 text-secondary text-[9px] font-bold rounded uppercase">
                                {act.badge}
                              </span>
                            </div>
                            <p className="text-on-surface-variant text-[11px] mt-0.5 leading-relaxed">{act.desc}</p>
                          </div>
                        ))}
                      </div>

                      <button type="button"
                        onClick={() => setActive360Tab('historial')}
                        className="w-full text-center text-xs font-semibold text-secondary hover:underline pt-1 block"
                      >
                        Ver historial completo y auditoría →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: SERVICIOS & TRÁMITES */}
            {active360Tab === 'servicios' && (
              <div className="space-y-6 w-full">
                {/* Notas rápidas */}
                <div className="p-4 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase text-outline">Notas Internas del Gestor:</span>
                    <button type="button"
                      onClick={() => setIsEditingNotes(!isEditingNotes)}
                      className="text-secondary font-semibold text-xs hover:underline flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[14px]">edit</span>
                      <span>{isEditingNotes ? 'Cancelar' : 'Editar Nota'}</span>
                    </button>
                  </div>

                  {isEditingNotes ? (
                    <div className="space-y-2 mt-2">
                      <textarea
                        rows={3}
                        value={editedNotes}
                        onChange={(e) => setEditedNotes(e.target.value)}
                        className="w-full p-3 border border-outline-variant rounded-md bg-surface text-xs focus:border-secondary focus:outline-none"
                      />
                      <button type="button"
                        onClick={handleSaveNotes}
                        className="h-8 px-4 bg-secondary text-white rounded text-xs font-semibold hover:bg-blue-700"
                      >
                        Guardar Nota
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-on-surface leading-relaxed">{selectedClient.notes || 'Sin notas registradas.'}</p>
                  )}
                </div>

                {/* Expedientes Activos */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-sm text-on-surface">Expedientes y Servicios Activos</h3>
                      <p className="text-xs text-on-surface-variant">Gestión de trámites ante Belastingdienst, KVK y Toeslagen.</p>
                    </div>
                    <button type="button"
                      onClick={() => {
                        const first = servicesCatalog[0];
                        setSelectedCatalogServiceId(first.id);
                        setDossierTitle(first.title);
                        setDossierCategory(first.category);
                        setDossierFee(first.defaultFee);
                        setIsNewServiceMode(false);
                        setShowAddDossierModal(true);
                      }}
                      className="h-8 px-3 bg-secondary text-white text-xs font-semibold rounded hover:bg-blue-700 transition-colors flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[15px]">add</span>
                      <span>+ Nuevo Trámite</span>
                    </button>
                  </div>

                  {selectedClient.dossiers && selectedClient.dossiers.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedClient.dossiers.map((dos: any) => (
                        <div
                          key={dos.id}
                          className="p-5 rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono-data font-bold text-secondary text-xs">{dos.code}</span>
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded uppercase">
                              {dos.status}
                            </span>
                          </div>

                          <div>
                            <h4 className="font-bold text-sm text-on-surface">{dos.title}</h4>
                            <p className="text-xs text-on-surface-variant mt-1">{dos.description}</p>
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px] text-outline font-mono-data">
                              <span>Progreso: {dos.progress_percentage}%</span>
                              <span>Plazo: {dos.deadline || 'Sin plazo'}</span>
                            </div>
                            <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden">
                              <div className="bg-secondary h-full rounded-full" style={{ width: `${dos.progress_percentage}%` }}></div>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-surface-container flex items-center justify-between text-xs">
                            <span className="text-outline">Tarifa:</span>
                            <span className="font-mono-data font-bold text-on-surface">€ {Number(dos.fee || 0).toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-surface-container-lowest rounded-xl border border-dashed border-outline-variant text-xs text-outline">
                      No hay trámites abiertos para este cliente todavía.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: DOCUMENTOS & ARCHIVOS POR CLIENTE */}
            {active360Tab === 'documentos' && (
              <div className="space-y-6 w-full">
                {/* Cabecera de gestión documental */}
                <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-sm text-on-surface flex items-center gap-2">
                      <span className="material-symbols-outlined text-secondary text-[18px]">folder_shared</span>
                      <span>Expediente Documental de {selectedClient.full_name}</span>
                    </h3>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      Sube PDFs, fotos, DNI o contratos. También puedes crear notas de texto o permitir a la IA archivar dictámenes.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Input oculto para subida de archivos directa */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileInputChange}
                      className="hidden"
                      accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.txt,.csv"
                    />

                    {/* Botón Subir Archivo */}
                    <button
                      type="button"
                      onClick={() => {
                        setUploadDocName('');
                        setShowUploadDocModal(true);
                      }}
                      className="h-8 px-3 bg-secondary text-white text-xs font-semibold rounded hover:bg-blue-700 transition-colors flex items-center gap-1.5 shadow-xs"
                    >
                      <span className="material-symbols-outlined text-[15px]">upload_file</span>
                      <span>Subir Documento</span>
                    </button>

                    {/* Botón Añadir Nota / Archivo de Texto */}
                    <button
                      type="button"
                      onClick={() => setShowNewTextDocModal(true)}
                      className="h-8 px-3 bg-surface-container-high border border-outline-variant hover:bg-surface-container text-on-surface text-xs font-semibold rounded transition-colors flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[15px] text-emerald-600">note_add</span>
                      <span>+ Nota / Texto</span>
                    </button>

                    {/* Botón Generar con IA */}
                    <button
                      type="button"
                      onClick={() => handleGenerateAIDocument('informe_general')}
                      className="h-8 px-3 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-900 text-xs font-semibold rounded transition-colors flex items-center gap-1.5"
                      title="La IA redacta un informe y lo archiva en los documentos de este cliente"
                    >
                      <span className="material-symbols-outlined text-[15px] text-indigo-600">auto_awesome</span>
                      <span>Generar Informe IA</span>
                    </button>
                  </div>
                </div>

                {/* Lista de Documentos del Cliente */}
                {selectedClient.documents && selectedClient.documents.length > 0 ? (
                  <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden">
                    <div className="divide-y divide-surface-container">
                      {selectedClient.documents.map((doc: ClientDocument) => (
                        <div
                          key={doc.id}
                          className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface-container-low transition-colors"
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            {/* Icono por tipo */}
                            <div className="p-2.5 rounded-lg bg-surface-container text-on-surface shrink-0 flex items-center justify-center">
                              {doc.file_type === 'pdf' ? (
                                <span className="material-symbols-outlined text-red-500 text-2xl">picture_as_pdf</span>
                              ) : doc.file_type === 'image' ? (
                                <span className="material-symbols-outlined text-blue-500 text-2xl">image</span>
                              ) : doc.file_type === 'word' ? (
                                <span className="material-symbols-outlined text-indigo-500 text-2xl">description</span>
                              ) : (
                                <span className="material-symbols-outlined text-emerald-600 text-2xl">article</span>
                              )}
                            </div>

                            <div className="min-w-0">
                              <h4 className="font-bold text-xs sm:text-sm text-on-surface truncate">{doc.name}</h4>
                              <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-outline">
                                <span className="font-mono-data font-semibold text-secondary">{doc.size}</span>
                                <span>·</span>
                                <span>{doc.date}</span>
                                <span>·</span>
                                <span className="px-1.5 py-0.2 rounded font-semibold text-[10px] uppercase bg-surface-container text-on-surface">
                                  {doc.category.replace('_', ' ')}
                                </span>
                                {doc.added_by === 'ia' && (
                                  <span className="px-1.5 py-0.2 rounded font-bold text-[10px] bg-indigo-100 text-indigo-800 flex items-center gap-0.5">
                                    <span className="material-symbols-outlined text-[11px]">auto_awesome</span>
                                    <span>Generado por IA</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Botones de acción sobre el documento */}
                          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                            <button
                              type="button"
                              onClick={() => void handlePreviewDocument(doc)}
                              className="h-7 px-2.5 bg-surface-container border border-outline-variant hover:bg-surface-container-high rounded text-[11px] font-semibold flex items-center gap-1 text-on-surface transition-colors"
                              title="Previsualizar documento"
                            >
                              <span className="material-symbols-outlined text-[13px] text-secondary">visibility</span>
                              <span>Ver / Leer</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (doc.content_text) {
                                  const blob = new Blob([doc.content_text], { type: 'text/plain;charset=utf-8' });
                                  const url = URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = doc.name;
                                  a.click();
                                } else {
                                  alert(`Descargando archivo: ${doc.name}`);
                                }
                              }}
                              className="h-7 px-2.5 border border-outline-variant hover:bg-surface-container rounded text-[11px] font-semibold flex items-center gap-1 text-on-surface transition-colors"
                              title="Descargar archivo"
                            >
                              <span className="material-symbols-outlined text-[13px]">download</span>
                              <span>Descargar</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteDocument(doc.id)}
                              className="h-7 w-7 text-outline hover:text-error hover:bg-red-50 rounded flex items-center justify-center transition-colors"
                              title="Eliminar documento"
                            >
                              <span className="material-symbols-outlined text-[15px]">delete</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-10 text-center bg-surface-container-lowest rounded-xl border border-dashed border-outline-variant space-y-3">
                    <span className="material-symbols-outlined text-4xl text-outline">folder_off</span>
                    <h4 className="font-bold text-sm text-on-surface">No hay documentos en este expediente</h4>
                    <p className="text-xs text-outline max-w-sm mx-auto">
                      Puedes subir fotos, contratos o PDFs, redactar una nota interna o pulsar en &quot;Generar Informe IA&quot; para crear dictámenes automáticos.
                    </p>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-8 px-4 bg-secondary text-white text-xs font-semibold rounded hover:bg-blue-700 transition-colors inline-flex items-center gap-1.5 shadow-xs"
                    >
                      <span className="material-symbols-outlined text-[15px]">upload_file</span>
                      <span>Subir Primer Archivo</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 5: PRESUPUESTOS (DEDICADA) */}
            {active360Tab === 'presupuestos' && (
              <div className="space-y-6 w-full">
                {/* Presupuestos */}
                <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-on-surface">Presupuestos de {selectedClient.full_name}</h3>
                      <p className="text-xs text-on-surface-variant">Generación oficial con precios finales IVA incluido y conversión en 1 clic a factura.</p>
                    </div>
                    <button type="button"
                      onClick={openQuoteModal}
                      className="h-8 px-3 bg-secondary text-white text-xs font-semibold rounded hover:bg-blue-700 transition-colors flex items-center gap-1 shadow-xs"
                    >
                      <span className="material-symbols-outlined text-[15px]">add</span>
                      <span>+ Crear Presupuesto</span>
                    </button>
                  </div>

                  {selectedClient.quotes && selectedClient.quotes.length > 0 ? (
                    <div className="divide-y divide-surface-container">
                      {selectedClient.quotes.map((q: any) => (
                        <div key={q.id} className="py-3 flex items-center justify-between text-xs">
                          <div className="flex-1 pr-4">
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedDoc({
                                  type: 'quote',
                                  data: {
                                    ...q,
                                    client_name: selectedClient.full_name,
                                    client_bsn: selectedClient.bsn,
                                    email: selectedClient.email,
                                    phone: selectedClient.phone,
                                    address: selectedClient.address,
                                    city: selectedClient.city,
                                  },
                                })
                              }
                              className="font-mono-data font-bold text-secondary hover:underline flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-[14px]">request_quote</span>
                              <span>{q.code}</span>
                            </button>
                            <p className="font-semibold text-on-surface mt-0.5">{q.concept}</p>
                            <span className="text-[11px] text-outline font-mono-data">Válido hasta: {q.valid_until}</span>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <span className="font-mono-data font-bold text-sm text-on-surface block">
                                € {parseFloat(q.total).toFixed(2)}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                  q.status === 'convertido'
                                    ? 'bg-blue-50 text-blue-700'
                                    : 'bg-emerald-50 text-emerald-700'
                                }`}
                              >
                                {q.status === 'convertido' ? 'CONVERTIDO A FACTURA' : 'ENVIADO AL CLIENTE'}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                setSelectedDoc({
                                  type: 'quote',
                                  data: {
                                    ...q,
                                    client_name: selectedClient.full_name,
                                    client_bsn: selectedClient.bsn,
                                    email: selectedClient.email,
                                    phone: selectedClient.phone,
                                    address: selectedClient.address,
                                    city: selectedClient.city,
                                  },
                                })
                              }
                              className="h-7 px-2.5 bg-surface-container border border-outline-variant hover:bg-surface-container-high rounded text-[11px] font-semibold flex items-center gap-1 text-on-surface transition-colors"
                              title="Ver detalle de presupuesto"
                            >
                              <span className="material-symbols-outlined text-[13px] text-secondary">visibility</span>
                              <span>Ver Presupuesto</span>
                            </button>

                            {q.status !== 'convertido' && (
                              <button
                                type="button"
                                onClick={() => handleConvertQuoteInFicha(q)}
                                className="h-7 px-2.5 bg-secondary text-white rounded text-[11px] font-semibold flex items-center gap-1 hover:bg-blue-700 transition-colors shadow-2xs"
                                title="Convertir inmediatamente a factura oficial"
                              >
                                <span className="material-symbols-outlined text-[13px]">receipt_long</span>
                                <span>A Factura</span>
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-outline py-2">No hay presupuestos emitidos aún.</p>
                  )}
                </div>
              </div>
            )}

            {/* TAB 6: FACTURAS OFICIALES (DEDICADA) */}
            {active360Tab === 'facturas' && (
              <div className="space-y-6 w-full">
                {/* Facturas */}
                <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-on-surface">Facturas Oficiales de {selectedClient.full_name}</h3>
                      <p className="text-xs text-on-surface-variant">Facturación legal con pasarela Pago coordinado por WhatsApp y registro de cobros.</p>
                    </div>
                  </div>

                  {selectedClient.invoices && selectedClient.invoices.length > 0 ? (
                    <div className="divide-y divide-surface-container">
                      {selectedClient.invoices.map((inv: any) => (
                        <div key={inv.id} className="py-3 flex items-center justify-between text-xs">
                          <div className="flex-1 pr-4">
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedDoc({
                                  type: 'invoice',
                                  data: {
                                    ...inv,
                                    client_name: selectedClient.full_name,
                                    client_bsn: selectedClient.bsn,
                                    email: selectedClient.email,
                                    phone: selectedClient.phone,
                                    address: selectedClient.address,
                                    city: selectedClient.city,
                                  },
                                })
                              }
                              className="font-mono-data font-bold text-secondary hover:underline flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-[14px]">receipt</span>
                              <span>{inv.code}</span>
                            </button>
                            <p className="font-semibold text-on-surface mt-0.5">{inv.concept}</p>
                            <span className="text-[11px] text-outline font-mono-data">Vencimiento: {inv.due_date}</span>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <span className="font-mono-data font-bold text-sm text-on-surface block">
                                € {parseFloat(inv.total).toFixed(2)}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                  inv.status === 'pagada' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                                }`}
                              >
                                {inv.status === 'pagada' ? 'PAGADA (Pago coordinado por WhatsApp)' : 'EMITIDA / PENDIENTE'}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                setSelectedDoc({
                                  type: 'invoice',
                                  data: {
                                    ...inv,
                                    client_name: selectedClient.full_name,
                                    client_bsn: selectedClient.bsn,
                                    email: selectedClient.email,
                                    phone: selectedClient.phone,
                                    address: selectedClient.address,
                                    city: selectedClient.city,
                                  },
                                })
                              }
                              className="h-7 px-2.5 bg-surface-container border border-outline-variant hover:bg-surface-container-high rounded text-[11px] font-semibold flex items-center gap-1 text-on-surface transition-colors"
                              title="Ver detalle de factura"
                            >
                              <span className="material-symbols-outlined text-[13px] text-secondary">visibility</span>
                              <span>Ver Factura</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-outline py-2">No hay facturas emitidas aún.</p>
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: CITAS & AGENDA */}
            {active360Tab === 'citas' && (
              <div className="space-y-6 w-full">
                <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-on-surface">Citas y Llamadas con {selectedClient.full_name}</h3>
                      <p className="text-xs text-on-surface-variant">Llamada telefónica por defecto, o videollamada / reunión presencial.</p>
                    </div>
                    <button type="button"
                      onClick={() => {
                        setAptModality('llamada');
                        setAptTitle(`Consulta Telefónica con ${selectedClient.full_name}`);
                        setShowNewAptModal(true);
                      }}
                      className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded transition-colors flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[15px]">add</span>
                      <span>Agendar Cita</span>
                    </button>
                  </div>

                  {selectedClient.appointments && selectedClient.appointments.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {selectedClient.appointments.map((a: any) => (
                        <div key={a.id} className="p-4 rounded-xl border border-surface-container bg-surface space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-mono-data font-bold text-xs text-secondary">{a.date} · {a.time}</span>
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-bold text-[10px] rounded uppercase">
                              {a.status}
                            </span>
                          </div>
                          <h4 className="font-bold text-xs text-on-surface">{a.title}</h4>
                          <div className="flex items-center gap-2 pt-1 text-xs">
                            {a.modality === 'llamada' ? (
                              <a
                                href={selectedClient.phone ? `tel:${selectedClient.phone}` : undefined}
                                className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-2 py-1 rounded"
                              >
                                <span className="material-symbols-outlined text-[14px]">call</span>
                                <span>Llamar al {selectedClient.phone}</span>
                              </a>
                            ) : a.modality === 'online_meet' ? (
                              <span className="inline-flex items-center gap-1 text-indigo-700 font-semibold bg-indigo-50 px-2 py-1 rounded">
                                <span className="material-symbols-outlined text-[14px]">videocam</span>
                                <span>Videollamada</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-on-surface-variant font-semibold bg-surface-container px-2 py-1 rounded">
                                <span className="material-symbols-outlined text-[14px]">business</span>
                                <span>Solo Presencial</span>
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-outline py-2">No hay citas registradas para este cliente.</p>
                  )}
                </div>
              </div>
            )}

            {/* TAB 5: DATOS FISCALES & PERSONALES */}
            {active360Tab === 'personales' && (
              <div className="w-full bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-on-surface">Datos Fiscales Neerlandeses y de Contacto</h3>
                  <button
                    type="button"
                    onClick={() => handleOpenEditClient(selectedClient)}
                    className="h-8 px-3 bg-secondary text-white text-xs font-semibold rounded hover:bg-blue-700 transition-colors flex items-center gap-1.5 shadow-xs"
                  >
                    <span className="material-symbols-outlined text-[15px]">edit</span>
                    <span>Modificar Datos</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3 bg-surface rounded-xl border border-surface-container flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-outline">Nombre Completo:</span>
                      <p className="font-bold text-sm text-on-surface mt-0.5">{selectedClient.full_name}</p>
                    </div>
                  </div>

                  <div className="p-3 bg-surface rounded-xl border border-surface-container flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-outline">BSN Oficial:</span>
                      <p className="font-mono-data font-bold text-sm text-secondary mt-0.5">{selectedClient.bsn || '—'}</p>
                    </div>
                    {selectedClient.bsn && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(selectedClient.bsn, 'BSN')}
                        className="p-1.5 rounded-lg border border-outline-variant hover:bg-surface-container text-outline hover:text-secondary transition-colors"
                        title="Copiar BSN"
                      >
                        <span className="material-symbols-outlined text-[15px]">content_copy</span>
                      </button>
                    )}
                  </div>

                  <div className="p-3 bg-surface rounded-xl border border-surface-container flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-outline">Documento / Pasaporte:</span>
                      <p className="font-mono-data font-bold text-sm text-on-surface mt-0.5">{selectedClient.id_document_number || '—'}</p>
                    </div>
                    {selectedClient.id_document_number && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(selectedClient.id_document_number, 'Pasaporte')}
                        className="p-1.5 rounded-lg border border-outline-variant hover:bg-surface-container text-outline hover:text-secondary transition-colors"
                        title="Copiar Pasaporte"
                      >
                        <span className="material-symbols-outlined text-[15px]">content_copy</span>
                      </button>
                    )}
                  </div>

                  <div className="p-3 bg-surface rounded-xl border border-surface-container flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-outline">Teléfono de Contacto:</span>
                      <p className="font-semibold text-on-surface mt-0.5">{selectedClient.phone}</p>
                    </div>
                    {selectedClient.phone && (
                      <div className="flex items-center gap-1">
                        <a
                          href={selectedClient.phone ? `tel:${selectedClient.phone}` : undefined}
                          className="p-1.5 rounded-lg border border-outline-variant hover:bg-emerald-50 text-emerald-700 transition-colors"
                          title="Llamar"
                        >
                          <span className="material-symbols-outlined text-[15px]">call</span>
                        </a>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(selectedClient.phone, 'Teléfono')}
                          className="p-1.5 rounded-lg border border-outline-variant hover:bg-surface-container text-outline hover:text-secondary transition-colors"
                          title="Copiar Teléfono"
                        >
                          <span className="material-symbols-outlined text-[15px]">content_copy</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="p-3 bg-surface rounded-xl border border-surface-container flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-outline">Correo Electrónico:</span>
                      <p className="font-semibold text-on-surface mt-0.5">{selectedClient.email}</p>
                    </div>
                    {selectedClient.email && (
                      <div className="flex items-center gap-1">
                        <a
                          href={`mailto:${selectedClient.email}`}
                          className="p-1.5 rounded-lg border border-outline-variant hover:bg-blue-50 text-secondary transition-colors"
                          title="Enviar correo"
                        >
                          <span className="material-symbols-outlined text-[15px]">mail</span>
                        </a>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(selectedClient.email, 'Correo')}
                          className="p-1.5 rounded-lg border border-outline-variant hover:bg-surface-container text-outline hover:text-secondary transition-colors"
                          title="Copiar Correo"
                        >
                          <span className="material-symbols-outlined text-[15px]">content_copy</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="p-3 bg-surface rounded-xl border border-surface-container">
                    <span className="text-[10px] font-bold uppercase text-outline">Ciudad:</span>
                    <p className="font-semibold text-on-surface mt-0.5">{selectedClient.city || 'Países Bajos'}</p>
                  </div>

                  <div className="p-3 bg-surface rounded-xl border border-surface-container">
                    <span className="text-[10px] font-bold uppercase text-outline">Dirección en Países Bajos:</span>
                    <p className="font-semibold text-on-surface mt-0.5">{selectedClient.address || '—'}</p>
                  </div>

                  <div className="p-3 bg-surface rounded-xl border border-surface-container flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-outline">Cuenta Bancaria (IBAN):</span>
                      <p className="font-mono-data font-bold text-on-surface mt-0.5">{selectedClient.iban || '—'}</p>
                    </div>
                    {selectedClient.iban && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(selectedClient.iban, 'IBAN')}
                        className="p-1.5 rounded-lg border border-outline-variant hover:bg-surface-container text-outline hover:text-secondary transition-colors"
                        title="Copiar IBAN"
                      >
                        <span className="material-symbols-outlined text-[15px]">content_copy</span>
                      </button>
                    )}
                  </div>

                  <div className="p-3 bg-surface rounded-xl border border-surface-container">
                    <span className="text-[10px] font-bold uppercase text-outline">Estado DigiD:</span>
                    <p className="font-bold text-sm mt-0.5">
                      {selectedClient.digid_status === 'activo'
                        ? '🟢 Activo'
                        : selectedClient.digid_status === 'pendiente_activar'
                        ? '🟡 Pendiente de activación'
                        : '⚪ Sin DigiD'}
                    </p>
                  </div>

                  <div className="p-3 bg-surface rounded-xl border border-surface-container">
                    <span className="text-[10px] font-bold uppercase text-outline">Estado del Cliente:</span>
                    <p className="font-bold text-sm mt-0.5 uppercase text-secondary">{selectedClient.status}</p>
                  </div>

                  <div className="sm:col-span-2 p-4 rounded-xl border border-blue-200 bg-blue-50/60 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-blue-700">Acceso al Portal Cliente</span>
                        <p className="text-xs text-blue-900 mt-1">Genera o regenera las credenciales para que el cliente entre en su perfil.</p>
                      </div>
                      <span className="material-symbols-outlined text-blue-600">lock_person</span>
                    </div>
                    {portalAccess ? (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
                        <div className="p-2 rounded-lg bg-white border border-blue-200">
                          <span className="block text-[10px] font-bold uppercase text-outline">Usuario</span>
                          <span className="font-mono-data text-xs text-on-surface break-all">{portalAccess.username}</span>
                        </div>
                        <div className="p-2 rounded-lg bg-white border border-blue-200">
                          <span className="block text-[10px] font-bold uppercase text-outline">Contraseña inicial</span>
                          <span className="font-mono-data text-xs text-on-surface">{showPortalPassword ? portalAccess.password : '••••••••••••'}</span>
                        </div>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setShowPortalPassword((value) => !value)} className="h-9 px-3 rounded-lg border border-blue-300 bg-white text-blue-700 text-xs font-semibold">
                            {showPortalPassword ? 'Ocultar' : 'Mostrar'}
                          </button>
                          <button type="button" onClick={handlePreparePortalWhatsApp} disabled={!selectedClient.phone} className="h-9 px-3 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-semibold disabled:opacity-40">
                            WhatsApp
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-3">
                        {selectedClient.portal_username && <span className="text-xs text-blue-900">Usuario existente: <strong>{selectedClient.portal_username}</strong>. La contraseña no se puede recuperar; regénérala si es necesario.</span>}
                        <button type="button" onClick={handleGeneratePortalAccess} disabled={isGeneratingPortalAccess} className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold disabled:opacity-50">
                          {isGeneratingPortalAccess ? 'Generando…' : selectedClient.portal_username ? 'Regenerar acceso' : 'Generar acceso'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 8: NOTAS & TAREAS DEL CLIENTE */}
            {active360Tab === 'mensajes' && (
              <section className="space-y-5 w-full" aria-labelledby="client-messages-tab-title">
                <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div>
                      <h3 id="client-messages-tab-title" className="font-bold text-sm text-on-surface">Mensajes del cliente</h3>
                      <p className="text-xs text-on-surface-variant mt-1">Distingue siempre entre notas internas y mensajes visibles en el Portal.</p>
                    </div>
                    <span className="text-xs text-outline">{clientMessages.length} mensajes</span>
                  </div>
                  <div className="space-y-2 max-h-80 overflow-y-auto" aria-busy={clientActivityLoading}>
                    {clientActivityLoading ? <p className="text-xs text-outline py-6 text-center" role="status">Cargando mensajes…</p> : clientMessages.length === 0 ? <p className="text-xs text-outline py-6 text-center">No hay mensajes compartidos todavía.</p> : clientMessages.map((message) => (
                      <article key={message.id} className="rounded-lg border border-outline-variant bg-surface p-3">
                        <div className="flex justify-between gap-2 text-[10px] text-outline"><span>{message.author_name || 'Gestor'}</span><time dateTime={message.created_at}>{new Date(message.created_at).toLocaleString('es-ES')}</time></div>
                        <p className="text-xs text-on-surface mt-1 whitespace-pre-wrap">{message.body}</p>
                      </article>
                    ))}
                  </div>
                  <div className="mt-4 border-t border-outline-variant pt-4 space-y-2">
                    <label htmlFor="crm-client-message-tab-draft" className="text-[11px] font-bold text-on-surface">Nuevo mensaje o nota</label>
                    <textarea id="crm-client-message-tab-draft" value={clientMessageDraft} onChange={(event) => setClientMessageDraft(event.target.value)} rows={4} maxLength={2000} className="w-full rounded-lg border border-outline-variant bg-surface p-3 text-xs text-on-surface" placeholder="Escribe el contenido..." />
                    <div className="flex flex-wrap items-center gap-2">
                      <select aria-label="Visibilidad del mensaje" value={clientMessageVisibility} onChange={(event) => setClientMessageVisibility(event.target.value as 'internal' | 'client')} className="rounded-lg border border-outline-variant bg-surface p-2 text-xs text-on-surface">
                        <option value="internal">Solo CRM (interno)</option>
                        <option value="client">Compartir con cliente</option>
                      </select>
                      <button type="button" onClick={sendClientMessage} disabled={!clientMessageDraft.trim() || clientMessageSending} className="rounded-lg bg-secondary px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{clientMessageSending ? 'Guardando…' : 'Guardar mensaje'}</button>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {active360Tab === 'tareas' && (
              <div className="space-y-6 w-full">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Columna Izquierda: Notas del Gestor (5 cols) */}
                  <div className="lg:col-span-5 space-y-4">
                    <div className="p-5 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-sm text-on-surface flex items-center gap-2">
                          <span className="material-symbols-outlined text-secondary text-[18px]">edit_note</span>
                          <span>Notas Internas del Gestor</span>
                        </h3>
                        <button type="button"
                          onClick={() => setIsEditingNotes(!isEditingNotes)}
                          className="text-secondary font-semibold text-xs hover:underline flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[14px]">edit</span>
                          <span>{isEditingNotes ? 'Cancelar' : 'Editar Nota'}</span>
                        </button>
                      </div>

                      {isEditingNotes ? (
                        <div className="space-y-3">
                          <textarea
                            rows={6}
                            value={editedNotes}
                            onChange={(e) => setEditedNotes(e.target.value)}
                            placeholder="Escribe anotaciones confidenciales sobre este cliente, acuerdos con Belastingdienst, etc..."
                            className="w-full p-3.5 border border-outline-variant rounded-xl bg-surface text-xs focus:border-secondary focus:outline-none leading-relaxed"
                          />
                          <button type="button"
                            onClick={handleSaveNotes}
                            className="h-9 px-4 bg-secondary text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors shadow-xs"
                          >
                            Guardar Notas del Gestor
                          </button>
                        </div>
                      ) : (
                        <div className="p-4 bg-surface rounded-xl border border-surface-container text-xs text-on-surface leading-relaxed min-h-[120px]">
                          {selectedClient.notes ? (
                            <p className="whitespace-pre-line">{selectedClient.notes}</p>
                          ) : (
                            <p className="text-outline italic">No hay notas registradas para este cliente todavía. Pulsa en Editar Nota para añadir indicaciones internas.</p>
                          )}
                        </div>
                      )}

                      <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-lg text-xs text-secondary flex items-start gap-2">
                        <span className="material-symbols-outlined text-[16px] text-secondary mt-0.5">info</span>
                        <span>Estas notas son 100% privadas y solo visibles para el equipo de gestores y el Asistente IA.</span>
                      </div>
                    </div>
                  </div>

                  {/* Columna Derecha: Checklist de Tareas del Expediente (7 cols) */}
                  <div className="lg:col-span-7 space-y-4">
                    <div className="p-5 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm space-y-4">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <h3 className="font-bold text-sm text-on-surface flex items-center gap-2">
                            <span className="material-symbols-outlined text-secondary text-[18px]">checklist</span>
                            <span>Checklist de Tareas del Expediente</span>
                          </h3>
                          <p className="text-xs text-on-surface-variant mt-0.5">
                            Tareas pendientes de verificar antes de cerrar trámites en Belastingdienst.
                          </p>
                        </div>

                        {/* Filtros de tareas */}
                        <div className="flex items-center gap-1 bg-surface-container p-1 rounded-lg text-xs">
                          <button type="button"
                            onClick={() => setTaskFilter('todas')}
                            className={`px-2.5 py-1 rounded font-semibold transition-colors ${
                              taskFilter === 'todas' ? 'bg-surface text-on-surface shadow-2xs' : 'text-outline hover:text-on-surface'
                            }`}
                          >
                            Todas ({getClientTasks(selectedClient).length})
                          </button>
                          <button type="button"
                            onClick={() => setTaskFilter('pendientes')}
                            className={`px-2.5 py-1 rounded font-semibold transition-colors ${
                              taskFilter === 'pendientes' ? 'bg-secondary text-white shadow-2xs' : 'text-outline hover:text-on-surface'
                            }`}
                          >
                            Pendientes ({getClientTasks(selectedClient).filter((t: any) => !t.completed).length})
                          </button>
                          <button type="button"
                            onClick={() => setTaskFilter('completadas')}
                            className={`px-2.5 py-1 rounded font-semibold transition-colors ${
                              taskFilter === 'completadas' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-outline hover:text-on-surface'
                            }`}
                          >
                            Completadas ({getClientTasks(selectedClient).filter((t: any) => t.completed).length})
                          </button>
                        </div>
                      </div>

                      {/* Formulario para añadir nueva tarea */}
                      <form onSubmit={handleAddNewTask} className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Añadir nueva tarea para este cliente (ej: 'Confirmar IBAN con Belastingdienst')..."
                          value={newTaskInput}
                          onChange={(e) => setNewTaskInput(e.target.value)}
                          className="flex-1 h-10 px-3.5 border border-outline-variant rounded-xl bg-surface text-xs focus:border-secondary focus:outline-none"
                        />
                        <button
                          type="submit"
                          disabled={!newTaskInput.trim()}
                          className="h-10 px-4 bg-secondary hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors shadow-xs shrink-0"
                        >
                          <span className="material-symbols-outlined text-[16px]">add_task</span>
                          <span>Añadir</span>
                        </button>
                      </form>

                      {/* Lista de Tareas */}
                      <div className="space-y-2 pt-2">
                        {getClientTasks(selectedClient)
                          .filter((t: any) => {
                            if (taskFilter === 'pendientes') return !t.completed;
                            if (taskFilter === 'completadas') return t.completed;
                            return true;
                          })
                          .map((task: any) => (
                            <div
                              key={task.id}
                              className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                                task.completed
                                  ? 'bg-surface-container-low/60 border-surface-container text-outline'
                                  : 'bg-surface border-outline-variant text-on-surface hover:shadow-2xs'
                              }`}
                            >
                              <label className="flex items-center gap-3 cursor-pointer min-w-0 flex-1">
                                <input
                                  type="checkbox"
                                  checked={task.completed}
                                  onChange={() => handleToggleTask(task.id)}
                                  className="w-4 h-4 rounded text-secondary focus:ring-secondary cursor-pointer"
                                />
                                <span className={`text-xs font-medium leading-snug ${task.completed ? 'line-through text-outline' : 'text-on-surface'}`}>
                                  {task.title}
                                </span>
                              </label>

                              <div className="flex items-center gap-2 shrink-0">
                                <span
                                  className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                                    task.priority === 'alta'
                                      ? 'bg-red-50 text-red-700 border border-red-200'
                                      : task.priority === 'media'
                                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                      : 'bg-blue-50 text-blue-700 border border-blue-200'
                                  }`}
                                >
                                  {task.priority || 'media'}
                                </span>
                                <span className="text-[10px] font-mono-data text-outline hidden sm:inline">
                                  {task.due || 'Sin vencimiento'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTask(task.id)}
                                  className="p-1 text-outline hover:text-red-600 transition-colors"
                                  title="Eliminar tarea"
                                >
                                  <span className="material-symbols-outlined text-[16px]">delete</span>
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 9: HISTORIAL COMPLETO & ACTIVIDAD IA */}
            {active360Tab === 'historial' && (
              <div className="space-y-6 w-full">
                <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm space-y-6">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <h3 className="font-bold text-sm text-on-surface flex items-center gap-2">
                        <span className="material-symbols-outlined text-secondary text-[20px]">history_edu</span>
                        <span>Historial Completo de Actividad & Registro IA</span>
                      </h3>
                      <p className="text-xs text-on-surface-variant mt-0.5">
                        Registro de auditoría cronológico de todas las interacciones, audios de WhatsApp, trámites y eventos del expediente.
                      </p>
                    </div>

                    {/* Filtros de historial */}
                    <div className="flex items-center gap-1 bg-surface-container p-1 rounded-lg text-xs">
                      <button type="button"
                        onClick={() => setHistoryFilter('todos')}
                        className={`px-3 py-1 rounded font-semibold transition-colors ${
                          historyFilter === 'todos' ? 'bg-surface text-on-surface shadow-2xs' : 'text-outline hover:text-on-surface'
                        }`}
                      >
                        Todos
                      </button>
                      <button type="button"
                        onClick={() => setHistoryFilter('ia')}
                        className={`px-3 py-1 rounded font-semibold transition-colors ${
                          historyFilter === 'ia' ? 'bg-secondary text-white shadow-2xs' : 'text-outline hover:text-on-surface'
                        }`}
                      >
                        Automatizaciones IA
                      </button>
                      <button type="button"
                        onClick={() => setHistoryFilter('gestor')}
                        className={`px-3 py-1 rounded font-semibold transition-colors ${
                          historyFilter === 'gestor' ? 'bg-secondary text-white shadow-2xs' : 'text-outline hover:text-on-surface'
                        }`}
                      >
                        Gestor Manual
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4" aria-labelledby="crm-client-messages-title">
                      <h4 id="crm-client-messages-title" className="font-bold text-sm text-on-surface">Mensajes con el cliente</h4>
                      <p className="text-[11px] text-outline mt-1">Los mensajes visibles en el portal están marcados como compartidos. Las notas internas nunca se envían al cliente.</p>
                      <div className="mt-3 space-y-2 max-h-64 overflow-y-auto" aria-busy={clientActivityLoading}>
                        {clientActivityLoading ? <p className="text-xs text-outline py-4" role="status">Cargando actividad sincronizada…</p> : clientMessages.length === 0 ? <p className="text-xs text-outline py-4">No hay mensajes compartidos.</p> : clientMessages.map((message) => (
                          <article key={message.id} className="rounded-lg border border-outline-variant bg-surface p-3">
                            <div className="flex justify-between gap-2 text-[10px] text-outline"><span>{message.author_name || 'Gestor'}</span><time dateTime={message.created_at}>{new Date(message.created_at).toLocaleString('es-ES')}</time></div>
                            <p className="text-xs text-on-surface mt-1 whitespace-pre-wrap">{message.body}</p>
                          </article>
                        ))}
                      </div>
                      <div className="mt-3 space-y-2 border-t border-outline-variant pt-3">
                        <label htmlFor="crm-client-message-draft" className="text-[11px] font-bold text-on-surface">Nuevo mensaje o nota</label>
                        <textarea id="crm-client-message-draft" value={clientMessageDraft} onChange={(event) => setClientMessageDraft(event.target.value)} rows={3} maxLength={2000} className="w-full rounded-lg border border-outline-variant bg-surface p-2 text-xs text-on-surface" placeholder="Escribe una nota o mensaje..." />
                        <div className="flex items-center gap-2">
                          <select aria-label="Visibilidad del mensaje" value={clientMessageVisibility} onChange={(event) => setClientMessageVisibility(event.target.value as 'internal' | 'client')} className="rounded-lg border border-outline-variant bg-surface p-2 text-xs text-on-surface">
                            <option value="internal">Solo CRM (interno)</option>
                            <option value="client">Compartir con cliente</option>
                          </select>
                          <button type="button" onClick={sendClientMessage} disabled={!clientMessageDraft.trim() || clientMessageSending} className="rounded-lg bg-secondary px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{clientMessageSending ? 'Guardando…' : 'Guardar'}</button>
                        </div>
                      </div>
                    </section>
                    <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4" aria-labelledby="crm-client-audit-title">
                      <h4 id="crm-client-audit-title" className="font-bold text-sm text-on-surface">Cambios de ficha sincronizados por BSN</h4>
                      <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
                        {clientAudit.length === 0 ? <p className="text-xs text-outline py-4">No hay cambios registrados todavía.</p> : clientAudit.map((entry) => (
                          <article key={entry.id} className="rounded-lg border border-outline-variant bg-surface p-3">
                            <div className="flex justify-between gap-2 text-[10px] text-outline"><span>{entry.actor_name || entry.actor_role || 'Sistema'}</span><time dateTime={entry.created_at}>{new Date(entry.created_at).toLocaleString('es-ES')}</time></div>
                            <p className="text-xs text-on-surface mt-1">{entry.action === 'client.updated' ? 'Ficha de cliente actualizada' : entry.action}</p>
                            <p className="text-[10px] text-outline mt-1">{Object.keys(entry.changes || {}).join(', ') || 'Sin detalle'}</p>
                          </article>
                        ))}
                      </div>
                    </section>
                  </div>

                  {/* Timeline Principal */}
                  <div className="space-y-6 relative pl-6 before:content-[''] before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-surface-container-high">
                    {getClientActivities(selectedClient)
                      .filter((act: any) => {
                        if (historyFilter === 'ia') return act.type?.includes('ia');
                        if (historyFilter === 'gestor') return act.type === 'gestor' || act.type === 'sistema';
                        return true;
                      })
                      .map((act: any) => (
                        <div key={act.id} className="relative space-y-1.5">
                          <div className="w-4 h-4 rounded-full bg-secondary border-2 border-surface-container-lowest absolute -left-[22px] top-1 shadow-xs" />
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono-data font-bold text-xs text-on-surface">{act.time}</span>
                            <span className="text-[10px] font-mono-data text-outline">({act.date})</span>
                            <span
                              className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                                act.type === 'ia_audio'
                                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                  : act.type === 'ia'
                                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                  : act.type === 'gestor'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-blue-50 text-blue-700 border border-blue-200'
                              }`}
                            >
                              {act.badge}
                            </span>
                          </div>
                          <h4 className="font-bold text-xs text-on-surface">{act.title}</h4>
                          <p className="text-xs text-on-surface-variant leading-relaxed max-w-3xl bg-surface p-3 rounded-lg border border-surface-container">
                            {act.desc}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 10: ASISTENTE IA DEL CLIENTE (PANTALLA COMPLETA) */}
            {active360Tab === 'ia' && (
              <div className="w-full flex-1 min-h-0 bg-surface-container-lowest rounded-2xl border border-indigo-200/80 shadow-md flex flex-col h-full overflow-hidden">
                {/* Cabecera del Asistente */}
                <div className="p-4 bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center">
                      <span className="material-symbols-outlined text-indigo-300 text-2xl">smart_toy</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
                        <span>Asistente IA para {selectedClient.full_name}</span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-500/30 text-emerald-300 font-mono-data">
                          EN LÍNEA
                        </span>
                      </h4>
                      <p className="text-[11px] text-slate-300 mt-0.5">
                        Capacidad de lectura de expediente, emisión de facturas/presupuestos, citas y archivo documental.
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono-data text-indigo-300 bg-white/10 px-2 py-1 rounded">
                    BSN: {selectedClient.bsn}
                  </span>
                </div>

                {/* Atajos Rápidos de Acción */}
                <div className="p-2.5 bg-indigo-50/60 border-b border-indigo-100 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0 text-xs">
                  <span className="text-[11px] font-bold text-indigo-950 shrink-0">Acciones Directas:</span>
                  <button
                    type="button"
                    onClick={() => handleSendClientAiMessage('Crea un presupuesto oficial de 180€ para este cliente')}
                    className="px-2.5 py-1 bg-white hover:bg-indigo-100/80 text-indigo-900 border border-indigo-200 rounded-md font-semibold text-[11px] transition-colors shrink-0 flex items-center gap-1 shadow-2xs"
                  >
                    <span className="material-symbols-outlined text-[13px] text-indigo-600">request_quote</span>
                    <span>Crear Presupuesto</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendClientAiMessage('Emite una factura oficial por 150€ con IVA incluido')}
                    className="px-2.5 py-1 bg-white hover:bg-emerald-100/80 text-emerald-900 border border-emerald-200 rounded-md font-semibold text-[11px] transition-colors shrink-0 flex items-center gap-1 shadow-2xs"
                  >
                    <span className="material-symbols-outlined text-[13px] text-emerald-600">receipt</span>
                    <span>Emitir Factura</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendClientAiMessage('Agenda una llamada telefónica para el cliente el 16 de octubre a las 11:00')}
                    className="px-2.5 py-1 bg-white hover:bg-blue-100/80 text-blue-900 border border-blue-200 rounded-md font-semibold text-[11px] transition-colors shrink-0 flex items-center gap-1 shadow-2xs"
                  >
                    <span className="material-symbols-outlined text-[13px] text-blue-600">call</span>
                    <span>Agendar Cita</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendClientAiMessage('Genera un dictamen resumen de su situación y guárdalo en sus documentos')}
                    className="px-2.5 py-1 bg-white hover:bg-purple-100/80 text-purple-900 border border-purple-200 rounded-md font-semibold text-[11px] transition-colors shrink-0 flex items-center gap-1 shadow-2xs"
                  >
                    <span className="material-symbols-outlined text-[13px] text-purple-600">description</span>
                    <span>Archivar Informe</span>
                  </button>
                </div>

                {/* Mensajes del Chat */}
                <div
                  ref={clientAiScrollRef}
                  className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4 bg-surface/40"
                >
                  {clientAiMessages.map((m) => (
                    <div
                      key={m.id}
                      className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl p-3.5 text-xs shadow-xs leading-relaxed ${
                          m.role === 'user'
                            ? 'bg-secondary text-white rounded-br-none'
                            : 'bg-surface-container-lowest text-on-surface border border-outline-variant rounded-bl-none'
                        }`}
                      >
                        <div className="whitespace-pre-line font-medium">{m.content}</div>

                        {/* Widget de acción ejecutada */}
                        {m.actionExecuted && (
                          <div className="mt-3 pt-2.5 border-t border-surface-container/60 bg-surface-container-low/50 p-2.5 rounded-lg flex items-center justify-between gap-3 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-emerald-600 text-lg">check_circle</span>
                              <span className="font-bold text-on-surface">{m.actionExecuted.summary}</span>
                            </div>
                            {m.actionExecuted.type === 'invoice_created' && (
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedDoc({
                                    type: 'invoice',
                                    data: {
                                      ...m.actionExecuted!.data,
                                      client_name: selectedClient.full_name,
                                      client_bsn: selectedClient.bsn,
                                    },
                                  })
                                }
                                className="px-2.5 py-1 bg-secondary text-white rounded font-semibold text-[11px] hover:bg-blue-700"
                              >
                                Ver Factura
                              </button>
                            )}
                            {m.actionExecuted.type === 'quote_created' && (
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedDoc({
                                    type: 'quote',
                                    data: {
                                      ...m.actionExecuted!.data,
                                      client_name: selectedClient.full_name,
                                      client_bsn: selectedClient.bsn,
                                    },
                                  })
                                }
                                className="px-2.5 py-1 bg-secondary text-white rounded font-semibold text-[11px] hover:bg-blue-700"
                              >
                                Ver Presupuesto
                              </button>
                            )}
                            {m.actionExecuted.type === 'document_created' && (
                              <button
                                type="button"
                                onClick={() => setActive360Tab('documentos')}
                                className="px-2.5 py-1 bg-indigo-600 text-white rounded font-semibold text-[11px] hover:bg-indigo-700"
                              >
                                Ir a Documentos
                              </button>
                            )}
                            {m.actionExecuted.type === 'appointment_created' && (
                              <button
                                type="button"
                                onClick={() => setActive360Tab('citas')}
                                className="px-2.5 py-1 bg-emerald-600 text-white rounded font-semibold text-[11px] hover:bg-emerald-700"
                              >
                                Ver Citas
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] text-outline mt-1 font-mono-data px-1">{m.timestamp}</span>
                    </div>
                  ))}
                  {isClientAiSending && (
                    <div className="flex items-center gap-2 text-xs text-outline font-medium p-2">
                      <span className="material-symbols-outlined text-indigo-600 animate-spin text-base">progress_activity</span>
                      <span>El Asistente IA está analizando el expediente y ejecutando tu orden...</span>
                    </div>
                  )}
                </div>

                {/* Input de comandos para el asistente */}
                <div className="p-3 bg-surface-container-lowest border-t border-surface-container shrink-0">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendClientAiMessage();
                    }}
                    className="flex items-center gap-2"
                  >
                    <input
                      type="text"
                      placeholder={`Escribe una orden para ${selectedClient.full_name} (ej: "Emite factura de 180€", "Agenda llamada para el viernes")...`}
                      value={clientAiInput}
                      onChange={(e) => setClientAiInput(e.target.value)}
                      className="flex-1 h-10 px-3.5 border border-outline-variant rounded-xl bg-surface text-xs focus:border-indigo-600 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={isClientAiSending || !clientAiInput.trim()}
                      className="h-10 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                    >
                      <span>Ejecutar</span>
                      <span className="material-symbols-outlined text-[15px]">send</span>
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: EDITAR DATOS COMPLETOS DEL CLIENTE */}
      {/* ========================================================================= */}
      {showEditClientModal && (
        <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveClientEdit}
            className="bg-surface-container-lowest max-w-2xl w-full rounded-2xl border border-outline-variant shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-in zoom-in-95"
          >
            <div className="flex items-center justify-between pb-3 border-b border-surface-container">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-2xl">edit_note</span>
                <div>
                  <h3 className="font-bold text-sm text-on-surface">Editar Ficha del Cliente</h3>
                  <p className="text-[11px] text-outline">Modifica datos personales, fiscales o estado de DigiD.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditClientModal(false)}
                className="text-outline hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              <div>
                <label className="block text-outline uppercase font-semibold mb-1">Nombre Completo *</label>
                <input
                  required
                  type="text"
                  value={editFormData.full_name}
                  onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
                  className="w-full h-9 px-3 border border-outline-variant rounded bg-surface focus:border-secondary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-outline uppercase font-semibold mb-1">Número BSN</label>
                <input
                  type="text"
                  value={editFormData.bsn}
                  onChange={(e) => setEditFormData({ ...editFormData, bsn: e.target.value })}
                  className="w-full h-9 px-3 border border-outline-variant rounded bg-surface font-mono-data font-semibold text-secondary focus:border-secondary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-outline uppercase font-semibold mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  className="w-full h-9 px-3 border border-outline-variant rounded bg-surface focus:border-secondary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-outline uppercase font-semibold mb-1">Teléfono</label>
                <input
                  type="text"
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  className="w-full h-9 px-3 border border-outline-variant rounded bg-surface font-mono-data focus:border-secondary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-outline uppercase font-semibold mb-1">Pasaporte / DNI</label>
                <input
                  type="text"
                  value={editFormData.id_document_number}
                  onChange={(e) => setEditFormData({ ...editFormData, id_document_number: e.target.value })}
                  className="w-full h-9 px-3 border border-outline-variant rounded bg-surface font-mono-data focus:border-secondary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-outline uppercase font-semibold mb-1">Ciudad (NL)</label>
                <input
                  type="text"
                  value={editFormData.city}
                  onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                  className="w-full h-9 px-3 border border-outline-variant rounded bg-surface focus:border-secondary focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-outline uppercase font-semibold mb-1">Dirección en Países Bajos</label>
                <input
                  type="text"
                  value={editFormData.address}
                  onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                  className="w-full h-9 px-3 border border-outline-variant rounded bg-surface focus:border-secondary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-outline uppercase font-semibold mb-1">Cuenta IBAN</label>
                <input
                  type="text"
                  value={editFormData.iban}
                  onChange={(e) => setEditFormData({ ...editFormData, iban: e.target.value })}
                  className="w-full h-9 px-3 border border-outline-variant rounded bg-surface font-mono-data focus:border-secondary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-outline uppercase font-semibold mb-1">Estado DigiD</label>
                <select
                  value={editFormData.digid_status}
                  onChange={(e) => setEditFormData({ ...editFormData, digid_status: e.target.value })}
                  className="w-full h-9 px-3 border border-outline-variant rounded bg-surface focus:border-secondary focus:outline-none"
                >
                  <option value="activo">Activo</option>
                  <option value="pendiente_activar">Pendiente de activación</option>
                  <option value="sin_digid">Sin DigiD</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-outline uppercase font-semibold mb-1">Notas Internas</label>
                <textarea
                  rows={2}
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                  className="w-full p-2.5 border border-outline-variant rounded bg-surface focus:border-secondary focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-surface-container">
              <button
                type="button"
                onClick={() => setShowEditClientModal(false)}
                className="h-8 px-4 border border-outline-variant rounded text-xs font-semibold hover:bg-surface-container"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="h-8 px-5 bg-secondary text-white rounded text-xs font-semibold hover:bg-blue-700 shadow-xs"
              >
                Guardar Cambios
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: SUBIR DOCUMENTO AL CLIENTE */}
      {/* ========================================================================= */}
      {showUploadDocModal && (
        <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest max-w-md w-full rounded-2xl border border-outline-variant shadow-2xl p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-xl">upload_file</span>
                <h3 className="font-bold text-sm text-on-surface">Subir Documento al Expediente</h3>
              </div>
              <button type="button" onClick={() => setShowUploadDocModal(false)} className="text-outline">
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-outline uppercase font-semibold mb-1">Nombre o Título del Documento</label>
                <input
                  type="text"
                  placeholder="ej: Contrato_Alquiler_Utrecht.pdf"
                  value={uploadDocName}
                  onChange={(e) => setUploadDocName(e.target.value)}
                  className="w-full h-9 px-3 border border-outline-variant rounded bg-surface focus:border-secondary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-outline uppercase font-semibold mb-1">Categoría</label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value as any)}
                  className="w-full h-9 px-3 border border-outline-variant rounded bg-surface focus:border-secondary focus:outline-none"
                >
                  <option value="identificacion">Identificación (DNI / Pasaporte)</option>
                  <option value="fiscal_belastingdienst">Fiscal / Belastingdienst</option>
                  <option value="subsidios">Subsidios / Toeslagen</option>
                  <option value="laboral_nominas">Laboral / Nóminas</option>
                  <option value="bancario">Bancario / Extractos</option>
                  <option value="contrato">Contratos / Acuerdos</option>
                  <option value="otro">Otros Documentos</option>
                </select>
              </div>

              {/* Botón de exploración de archivos */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-6 border-2 border-dashed border-outline-variant hover:border-secondary rounded-xl text-center cursor-pointer bg-surface/50 transition-colors"
              >
                <span className="material-symbols-outlined text-3xl text-secondary block mb-1">cloud_upload</span>
                <span className="font-semibold text-xs text-on-surface block">Selecciona un archivo desde tu equipo</span>
                <span className="text-[11px] text-outline mt-0.5 block">Formatos: PDF, Imágenes, Word, TXT (hasta 15 MB)</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-surface-container">
              <button
                type="button"
                onClick={() => setShowUploadDocModal(false)}
                className="h-8 px-4 border border-outline-variant rounded text-xs font-semibold hover:bg-surface-container"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: CREAR DOCUMENTO DE TEXTO O NOTA INTERNA */}
      {/* ========================================================================= */}
      {showNewTextDocModal && (
        <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveTextDocument}
            className="bg-surface-container-lowest max-w-lg w-full rounded-2xl border border-outline-variant shadow-2xl p-6 space-y-4 animate-in zoom-in-95"
          >
            <div className="flex items-center justify-between pb-2 border-b border-surface-container">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-600 text-xl">note_add</span>
                <h3 className="font-bold text-sm text-on-surface">Nuevo Documento de Texto / Nota</h3>
              </div>
              <button type="button" onClick={() => setShowNewTextDocModal(false)} className="text-outline">
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-outline uppercase font-semibold mb-1">Título del Documento *</label>
                <input
                  required
                  type="text"
                  placeholder="ej: Nota_Aclaratoria_Ingresos.txt"
                  value={textDocTitle}
                  onChange={(e) => setTextDocTitle(e.target.value)}
                  className="w-full h-9 px-3 border border-outline-variant rounded bg-surface focus:border-secondary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-outline uppercase font-semibold mb-1">Categoría</label>
                <select
                  value={textDocCategory}
                  onChange={(e) => setTextDocCategory(e.target.value as any)}
                  className="w-full h-9 px-3 border border-outline-variant rounded bg-surface focus:border-secondary focus:outline-none"
                >
                  <option value="nota_ia">Nota Interna / Resumen</option>
                  <option value="fiscal_belastingdienst">Fiscal / Belastingdienst</option>
                  <option value="subsidios">Subsidios / Toeslagen</option>
                  <option value="otro">Otro</option>
                </select>
              </div>

              <div>
                <label className="block text-outline uppercase font-semibold mb-1">Contenido del Documento / Texto</label>
                <textarea
                  rows={6}
                  required
                  placeholder="Escribe aquí el contenido del documento, transcripción, dictamen o nota para este cliente..."
                  value={textDocContent}
                  onChange={(e) => setTextDocContent(e.target.value)}
                  className="w-full p-3 border border-outline-variant rounded bg-surface font-mono-data text-xs focus:border-secondary focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-surface-container">
              <button
                type="button"
                onClick={() => setShowNewTextDocModal(false)}
                className="h-8 px-4 border border-outline-variant rounded text-xs font-semibold hover:bg-surface-container"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="h-8 px-5 bg-secondary text-white rounded text-xs font-semibold hover:bg-blue-700 shadow-xs"
              >
                Guardar en Documentos
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: VISUALIZADOR DE DOCUMENTO */}
      {/* ========================================================================= */}
      {previewDoc && (
        <div className="fixed inset-0 z-[130] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest max-w-2xl w-full rounded-2xl border border-outline-variant shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95">
            <div className="p-4 border-b border-surface-container flex items-center justify-between bg-surface-container-low shrink-0">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-xl">description</span>
                <div>
                  <h3 className="font-bold text-sm text-on-surface">{previewDoc.name}</h3>
                  <span className="text-[10px] text-outline uppercase font-mono-data">
                    {previewDoc.size} · {previewDoc.date} · Añadido por: {previewDoc.added_by}
                  </span>
                </div>
              </div>
              <button type="button" onClick={closeDocumentPreview} className="text-outline hover:text-on-surface" aria-label="Cerrar">
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <div className="p-4 flex-1 min-h-[420px] overflow-auto bg-surface/30">
              {previewDoc.content_text ? (
                <pre className="font-mono-data text-xs leading-relaxed whitespace-pre-wrap">{previewDoc.content_text}</pre>
              ) : previewUrl && (previewDoc.file_type === 'pdf' || previewDoc.mime_type === 'application/pdf' || previewDoc.name?.toLowerCase().endsWith('.pdf')) ? (
                <iframe title={`Vista previa de ${previewDoc.name}`} src={previewUrl} className="w-full h-[58vh] rounded-lg border border-outline-variant bg-white" />
              ) : previewUrl && (previewDoc.file_type === 'image' || previewDoc.mime_type?.startsWith('image/')) ? (
                <div className="w-full min-h-[420px] flex items-center justify-center bg-slate-100 rounded-lg p-3"><img src={previewUrl} alt={previewDoc.name} className="max-w-full max-h-[58vh] object-contain rounded shadow-sm" /></div>
              ) : (
                <div className="h-[420px] flex items-center justify-center text-sm text-outline">Cargando archivo…</div>
              )}
            </div>

            <div className="p-3 bg-surface-container-low border-t border-surface-container flex items-center justify-between shrink-0">
              <span className="text-[11px] text-outline">NexusGest Storage Engine</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="h-8 px-3 border border-outline-variant hover:bg-surface-container text-xs font-semibold rounded flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[15px]">print</span>
                  <span>Imprimir</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (previewUrl) {
                      const a = document.createElement('a');
                      a.href = previewUrl;
                      a.download = previewDoc.name || 'documento';
                      a.click();
                    } else if (previewDoc.content_text) {
                      const blob = new Blob([previewDoc.content_text], { type: 'text/plain;charset=utf-8' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = previewDoc.name;
                      a.click();
                    }
                  }}
                  className="h-8 px-4 bg-secondary text-white text-xs font-semibold rounded hover:bg-blue-700 transition-colors flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[15px]">download</span>
                  <span>Descargar</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: NUEVO TRÁMITE / EXPEDIENTE */}
      {/* ========================================================================= */}
      {showAddDossierModal && (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveDossier}
            className="bg-surface-container-lowest max-w-lg w-full rounded-2xl border border-outline-variant shadow-2xl p-6 space-y-4 animate-in zoom-in-95"
          >
            <div className="flex items-center justify-between pb-2 border-b border-surface-container">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">assignment_add</span>
                <h3 className="font-bold text-sm text-on-surface">
                  Abrir Trámite para {selectedClient?.full_name}
                </h3>
              </div>
              <button type="button" onClick={() => setShowAddDossierModal(false)} className="text-outline">
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-outline uppercase font-semibold mb-1">
                  Selecciona Trámite del Catálogo:
                </label>
                <select
                  value={selectedCatalogServiceId}
                  onChange={(e) => handleCatalogSelectChange(e.target.value)}
                  className="w-full h-10 px-3 border border-outline-variant rounded-md bg-surface font-semibold text-on-surface focus:border-secondary focus:outline-none"
                >
                  {servicesCatalog.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title} — € {Number(s.defaultFee || 0).toFixed(2)} ({s.category})
                    </option>
                  ))}
                  <option value="__NEW__">+ Crear Nuevo Servicio Personalizado...</option>
                </select>
              </div>

              <div>
                <label className="block text-outline uppercase font-semibold mb-1">
                  Nombre del Trámite en Expediente:
                </label>
                <input
                  required
                  type="text"
                  value={dossierTitle}
                  onChange={(e) => setDossierTitle(e.target.value)}
                  className="w-full h-9 px-3 border border-outline-variant rounded bg-surface font-medium focus:border-secondary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-outline uppercase font-semibold mb-1">Categoría</label>
                  <input
                    type="text"
                    value={dossierCategory}
                    onChange={(e) => setDossierCategory(e.target.value)}
                    className="w-full h-9 px-3 border border-outline-variant rounded bg-surface focus:border-secondary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-outline uppercase font-semibold mb-1">Precio / Honorarios (€)</label>
                  <input
                    required
                    type="number"
                    value={dossierFee}
                    onChange={(e) => setDossierFee(parseFloat(e.target.value) || 0)}
                    className="w-full h-9 px-3 border border-outline-variant rounded bg-surface font-mono-data font-bold text-secondary focus:border-secondary focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-outline uppercase font-semibold mb-1">Plazo Objetivo / Vencimiento</label>
                <input
                  type="date"
                  value={dossierDeadline}
                  onChange={(e) => setDossierDeadline(e.target.value)}
                  className="w-full h-9 px-3 border border-outline-variant rounded bg-surface font-mono-data focus:border-secondary focus:outline-none"
                />
              </div>

              {isNewServiceMode && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="saveCatalog"
                    checked={saveToCatalogToo}
                    onChange={(e) => setSaveToCatalogToo(e.target.checked)}
                    className="accent-secondary"
                  />
                  <label htmlFor="saveCatalog" className="text-blue-900 font-semibold text-[11px] cursor-pointer">
                    Guardar también este nuevo servicio en el catálogo para futuros clientes
                  </label>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-surface-container">
              <button
                type="button"
                onClick={() => setShowAddDossierModal(false)}
                className="h-8 px-3 border border-outline-variant rounded text-xs font-semibold hover:bg-surface-container"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="h-8 px-4 bg-secondary text-white rounded text-xs font-semibold hover:bg-blue-700 shadow-sm"
              >
                Guardar Trámite
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: NUEVA CITA DIRECTA */}
      {/* ========================================================================= */}
      {showNewAptModal && (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveAppointment}
            className="bg-surface-container-lowest max-w-md w-full rounded-2xl border border-outline-variant shadow-2xl p-6 space-y-4 animate-in zoom-in-95"
          >
            <div className="flex items-center justify-between pb-2 border-b border-surface-container">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-600">event_available</span>
                <h3 className="font-bold text-sm text-on-surface">Nueva Cita con {selectedClient?.full_name}</h3>
              </div>
              <button type="button" onClick={() => setShowNewAptModal(false)} className="text-outline">
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="p-3 bg-surface-container-low rounded-lg border border-surface-container">
                <span className="text-[10px] font-bold uppercase text-outline">Cliente Asignado:</span>
                <p className="font-bold text-on-surface text-sm mt-0.5">{selectedClient?.full_name}</p>
                <p className="text-[11px] text-outline font-mono-data">{selectedClient?.phone} · BSN: {selectedClient?.bsn}</p>
              </div>

              <div>
                <label className="block text-outline uppercase font-semibold mb-1.5">
                  Modalidad de la Cita:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAptModality('llamada');
                      setAptTitle(`Consulta Telefónica con ${selectedClient?.full_name}`);
                    }}
                    className={`p-2 rounded-lg border text-center transition-all flex flex-col items-center gap-1 ${
                      aptModality === 'llamada'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold ring-2 ring-emerald-500/20'
                        : 'border-outline-variant bg-surface text-outline hover:bg-surface-container'
                    }`}
                  >
                    <span className="material-symbols-outlined text-base text-emerald-600">call</span>
                    <span className="text-[10px]">Llamada (Defecto)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAptModality('presencial');
                      setAptTitle(`Cita Presencial con ${selectedClient?.full_name}`);
                    }}
                    className={`p-2 rounded-lg border text-center transition-all flex flex-col items-center gap-1 ${
                      aptModality === 'presencial'
                        ? 'border-secondary bg-blue-50 text-secondary font-bold ring-2 ring-blue-500/20'
                        : 'border-outline-variant bg-surface text-outline hover:bg-surface-container'
                    }`}
                  >
                    <span className="material-symbols-outlined text-base text-secondary">business</span>
                    <span className="text-[10px]">Solo Presencial</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAptModality('online_meet');
                      setAptTitle(`Videollamada con ${selectedClient?.full_name}`);
                    }}
                    className={`p-2 rounded-lg border text-center transition-all flex flex-col items-center gap-1 ${
                      aptModality === 'online_meet'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-bold ring-2 ring-indigo-500/20'
                        : 'border-outline-variant bg-surface text-outline hover:bg-surface-container'
                    }`}
                  >
                    <span className="material-symbols-outlined text-base text-indigo-600">videocam</span>
                    <span className="text-[10px]">Videollamada</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-outline uppercase font-semibold mb-1">Motivo / Título de la Cita</label>
                <input
                  required
                  type="text"
                  value={aptTitle}
                  onChange={(e) => setAptTitle(e.target.value)}
                  className="w-full h-9 px-3 border border-outline-variant rounded bg-surface focus:border-secondary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-outline uppercase font-semibold mb-1">Fecha</label>
                  <input
                    required
                    type="date"
                    value={aptDate}
                    onChange={(e) => setAptDate(e.target.value)}
                    className="w-full h-9 px-3 border border-outline-variant rounded bg-surface font-mono-data focus:border-secondary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-outline uppercase font-semibold mb-1">Hora</label>
                  <input
                    required
                    type="time"
                    value={aptTime}
                    onChange={(e) => setAptTime(e.target.value)}
                    className="w-full h-9 px-3 border border-outline-variant rounded bg-surface font-mono-data focus:border-secondary focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-surface-container">
              <button
                type="button"
                onClick={() => setShowNewAptModal(false)}
                className="h-8 px-3 border border-outline-variant rounded text-xs font-semibold hover:bg-surface-container"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="h-8 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold shadow-sm"
              >
                Confirmar Cita ({aptModality === 'llamada' ? 'Llamada' : aptModality === 'presencial' ? 'Presencial' : 'Videollamada'})
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 7: NUEVO PRESUPUESTO */}
      {/* ========================================================================= */}
      {showNewQuoteModal && (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveQuote}
            className="bg-surface-container-lowest max-w-2xl w-full rounded-2xl border border-outline-variant shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-in zoom-in-95"
          >
            <div className="flex items-center justify-between pb-3 border-b border-surface-container">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-secondary flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">request_quote</span>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-on-surface">Crear Presupuesto PRE-2026</h3>
                  <p className="text-[11px] text-on-surface-variant">
                    Cliente: <strong className="text-secondary">{selectedClient?.full_name}</strong> (BSN: {selectedClient?.bsn})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNewQuoteModal(false)}
                className="text-outline hover:text-on-surface p-1 rounded-md hover:bg-surface-container"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-outline uppercase font-semibold flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[15px] text-secondary">checklist</span>
                    <span>Trámites Disponibles ({selectedQuoteServiceIds.length} seleccionados)</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllQuoteServices}
                      className="text-[11px] text-secondary font-semibold hover:underline"
                    >
                      Seleccionar todos
                    </button>
                    <span className="text-outline">·</span>
                    <button
                      type="button"
                      onClick={handleClearQuoteServices}
                      className="text-[11px] text-outline font-semibold hover:underline"
                    >
                      Deseleccionar todos
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1 border border-outline-variant/60 rounded-xl bg-surface">
                  {servicesCatalog.map((s) => {
                    const isSelected = selectedQuoteServiceIds.includes(s.id);
                    return (
                      <div
                        key={s.id}
                        onClick={() => toggleQuoteService(s.id)}
                        className={`cursor-pointer p-2.5 rounded-lg border transition-all flex items-start gap-2.5 ${
                          isSelected
                            ? 'border-secondary bg-blue-50/70 shadow-xs'
                            : 'border-surface-container bg-surface-container-lowest hover:border-outline-variant hover:bg-surface-container-low'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="mt-0.5 rounded text-secondary focus:ring-secondary cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold leading-tight text-xs ${isSelected ? 'text-secondary font-bold' : 'text-on-surface'}`}>
                            {s.title}
                          </p>
                          <div className="flex items-center justify-between mt-1 text-[10px]">
                            <span className="text-outline truncate">{s.category}</span>
                            <span className="font-mono-data font-bold text-on-surface">€ {Number(s.defaultFee || 0).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {selectedQuoteServiceIds.length > 0 && (
                <div className="p-3 bg-surface-container-low/70 rounded-xl border border-surface-container space-y-2">
                  <span className="font-bold text-[11px] text-on-surface uppercase tracking-wider block">
                    Desglose de Trámites a Facturar ({selectedQuoteServiceIds.length}):
                  </span>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {getSelectedQuoteItems().map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-3 bg-surface-container-lowest p-2 rounded-lg border border-outline-variant/40"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="material-symbols-outlined text-[14px] text-emerald-600">check_circle</span>
                          <span className="font-medium text-xs text-on-surface truncate">{item.title}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-outline font-mono-data">€</span>
                          <input
                            type="number"
                            min="0"
                            step="5"
                            value={item.fee}
                            onChange={(e) => handleCustomFeeChange(item.id, parseFloat(e.target.value) || 0)}
                            className="w-20 h-7 px-2 border border-outline-variant rounded bg-surface font-mono-data font-bold text-right text-xs focus:border-secondary focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => toggleQuoteService(item.id)}
                            className="text-outline hover:text-red-500 p-1"
                            title="Quitar de este presupuesto"
                          >
                            <span className="material-symbols-outlined text-[14px]">close</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-outline uppercase font-semibold mb-1">
                  Concepto en Presupuesto:
                </label>
                <input
                  required
                  type="text"
                  value={quoteConcept}
                  onChange={(e) => {
                    setQuoteConcept(e.target.value);
                    setIsConceptManuallyEdited(true);
                  }}
                  className="w-full h-9 px-3 border border-outline-variant rounded bg-surface font-medium focus:border-secondary focus:outline-none"
                />
              </div>

              <div className="p-3 bg-surface-container-low rounded-xl border border-surface-container font-mono-data space-y-1.5">
                <div className="flex justify-between text-outline">
                  <span>IVA incluido:</span>
                  <span>Sí</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-secondary pt-1.5 border-t border-surface-container">
                  <span>Total Presupuestado:</span>
                  <span>€ {quoteTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-surface-container">
              <button
                type="button"
                onClick={() => setShowNewQuoteModal(false)}
                className="h-8 px-3 border border-outline-variant rounded text-xs font-semibold hover:bg-surface-container"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="h-8 px-4 bg-secondary text-white rounded text-xs font-semibold hover:bg-blue-700 shadow-sm"
              >
                Generar Presupuesto (€ {quoteTotal.toFixed(2)})
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 8: HOJA OFICIAL FACTURA / PRESUPUESTO */}
      {/* ========================================================================= */}
      {selectedDoc && (
        <div className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="print-document bg-surface-container-lowest max-w-3xl w-full rounded-2xl shadow-2xl border border-outline-variant overflow-hidden my-auto animate-in zoom-in-95">
            {/* Barra Superior del Visor Documental */}
            <div className="no-print bg-surface-container-low px-6 py-3.5 border-b border-surface-container flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">
                  {selectedDoc.type === 'invoice' ? 'receipt_long' : 'request_quote'}
                </span>
                <span className="font-bold text-sm text-on-surface">
                  {selectedDoc.type === 'invoice' ? 'Factura Oficial Neerlandesa' : 'Presupuesto de Honorarios'}
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono-data font-bold bg-surface-container-high text-on-surface">
                  {selectedDoc.data.code}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="h-8 px-3 border border-outline-variant hover:bg-surface-container rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">print</span>
                  <span className="hidden sm:inline">Imprimir / PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDoc(null)}
                  className="h-8 w-8 rounded-md text-outline hover:text-on-surface hover:bg-surface-container flex items-center justify-center transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>
            </div>

            {/* Hoja Documental */}
            <div className="p-8 sm:p-10 space-y-8 bg-surface-container-lowest text-xs text-on-surface">
              <div className="flex flex-col sm:flex-row justify-between gap-6 pb-6 border-b border-surface-container">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-secondary text-white font-bold flex items-center justify-center text-sm">
                      NG
                    </div>
                    <span className="font-bold text-base tracking-tight text-on-surface">NexusGest Advies B.V.</span>
                  </div>
                  <p className="text-[11px] text-on-surface-variant mt-1.5 leading-relaxed">
                    Gestoría y Asesoría Fiscal en Países Bajos<br />
                    Keizersgracht 421, 1016 EK Amsterdam<br />
                    KVK: 84920194 · BTW-id: NL849201940B01<br />
                    IBAN: NL91 INGB 0001 2345 67 (ING Bank)
                  </p>
                </div>

                <div className="text-left sm:text-right space-y-1">
                  <h2 className="text-2xl font-black font-mono-data text-on-surface tracking-tight">
                    {selectedDoc.data.code}
                  </h2>
                  <div className="text-[11px] text-outline font-mono-data">
                    Fecha de emisión: {new Date().toLocaleDateString('es-ES')}
                  </div>
                  <div className="text-[11px] text-outline font-mono-data">
                    {selectedDoc.type === 'invoice' ? 'Fecha de vencimiento: ' : 'Válido hasta: '}
                    <strong>{selectedDoc.data.due_date || selectedDoc.data.valid_until || '2026-11-30'}</strong>
                  </div>
                </div>
              </div>

              {/* Datos del Cliente */}
              <div className="p-4 bg-surface-container-low rounded-xl border border-surface-container">
                <span className="text-[10px] font-bold uppercase tracking-wider text-outline block mb-1.5">
                  {selectedDoc.type === 'invoice' ? 'Facturado a:' : 'Presupuestado para:'}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <h3 className="font-bold text-sm text-on-surface">
                      {selectedDoc.data.client_name || selectedClient?.full_name || 'Cliente'}
                    </h3>
                    <p className="text-xs text-on-surface-variant font-mono-data mt-0.5">
                      BSN Oficial: <strong>{selectedDoc.data.client_bsn || selectedClient?.bsn || '—'}</strong>
                    </p>
                  </div>
                  <div className="text-xs text-on-surface-variant space-y-0.5">
                    <p>{selectedDoc.data.address || selectedClient?.address || 'Países Bajos'}</p>
                    <p>{selectedDoc.data.city || selectedClient?.city || 'Amsterdam'}</p>
                    <p className="text-outline">{selectedDoc.data.email || selectedClient?.email || '—'}</p>
                  </div>
                </div>
              </div>

              {/* Tabla de Conceptos */}
              <div className="border border-outline-variant/60 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-container-low text-outline font-semibold uppercase tracking-wider border-b border-surface-container">
                    <tr>
                      <th className="px-4 py-2.5">Descripción del Trámite / Servicio</th>
                      <th className="px-4 py-2.5 text-center">Cant.</th>
                      <th className="px-4 py-2.5 text-right">Precio (€)</th>
                      <th className="px-4 py-2.5 text-center">IVA incluido</th>
                      <th className="px-4 py-2.5 text-right">Total (€)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container">
                    {getDocItems(selectedDoc.data).map((item: any, idx: number) => {
                      const itemBase = item.total || 0;
                      const itemBtw = Math.round(itemBase * 0.21 * 100) / 100;
                      const itemTotal = Math.round((itemBase + itemBtw) * 100) / 100;
                      return (
                        <tr key={idx} className="hover:bg-surface-container-low/50">
                          <td className="px-4 py-3 font-semibold text-on-surface">
                            {item.description}
                          </td>
                          <td className="px-4 py-3 text-center font-mono-data text-outline">
                            1
                          </td>
                          <td className="px-4 py-3 text-right font-mono-data">
                            € {itemBase.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-center font-mono-data text-outline">
                            21%
                          </td>
                          <td className="px-4 py-3 text-right font-mono-data font-bold text-on-surface">
                            € {itemTotal.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Resumen de Totales */}
              <div className="flex flex-col sm:flex-row justify-between gap-6 pt-2">
                <div className="sm:max-w-xs space-y-2 text-[11px] text-outline">
                  <p className="font-semibold text-on-surface">Información de Pago & Fiscalidad:</p>
                  <p>
                    Los importes mostrados son precios finales con IVA incluido.
                  </p>
                </div>

                <div className="w-full sm:w-64 p-4 rounded-xl bg-surface-container-low font-mono-data text-xs space-y-2 border border-surface-container">
                  <div className="flex justify-between font-bold text-sm text-secondary">
                    <span>Total final (IVA incluido):</span>
                    <span>€ {getDocTotals(selectedDoc.data).total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm text-secondary pt-2 border-t border-surface-container">
                    <span>Total:</span>
                    <span>€ {getDocTotals(selectedDoc.data).total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pie de Acciones */}
            <div className="no-print bg-surface-container px-6 py-3 border-t border-surface-container-high flex items-center justify-between">
              <div className="text-[11px] text-outline">
                Documento legal emitido por NexusGest · Países Bajos
              </div>

              <div className="flex items-center gap-2">
                {selectedDoc.type === 'quote' && selectedDoc.data.status !== 'convertido' && (
                  <button
                    type="button"
                    onClick={() => {
                      handleConvertQuoteInFicha(selectedDoc.data);
                      setSelectedDoc(null);
                    }}
                    className="h-8 px-4 bg-secondary hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[15px]">transform</span>
                    <span>Convertir a Factura Oficial</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedDoc(null)}
                  className="h-8 px-4 border border-outline-variant hover:bg-surface-container-high rounded-lg text-xs font-semibold"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
