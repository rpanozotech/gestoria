'use client';

/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiUrl } from '@/lib/api';
import { formatThousands } from '@/lib/format';

/**
 * Pago del portal del cliente.
 *
 * No hay pasarela de pago integrada: la gestoria no procesa tarjetas. El
 * cliente abre WhatsApp con el mensaje ya escrito y el gestor le confirma
 * importe, coordenadas e IBAN. Nada se cobra desde la web.
 *
 * Número oficial de RP Gestoría en formato internacional, sin símbolos.
 */
const WHATSAPP_PAGO = '31685291402';

interface ClientMessage {
  id: string;
  sender: 'ia' | 'user';
  text: string;
  time: string;
  suggestedAction?: {
    label: string;
    tab: 'resumen' | 'toeslagen' | 'facturas' | 'documentos' | 'citas';
    action?: string;
  };
}

interface PortalAppointment {
  id: string;
  client_name: string;
  client_phone: string;
  title: string;
  appointment_date: string;
  appointment_time: string;
  modality: 'llamada' | 'presencial' | 'online_meet';
  status: 'confirmada' | 'completada' | 'pendiente' | 'cancelada';
  advisor: string;
  notes?: string;
  created_at?: string;
}

export default function PortalClientePage() {
  const router = useRouter();
  // Clientes disponibles para simular o cambiar vista
  const defaultClients = [
    {
      id: '1',
      full_name: 'Maria Popescu',
      email: 'maria.popescu@gmail.com',
      phone: '+31 6 81239845',
      bsn: '982145672',
      city: 'Eindhoven',
      address: 'Strijpsestraat 142',
      iban: 'NL91INGB0001234567',
      digid_status: 'pendiente_activar',
      dossier_code: 'EXP-2026-0041',
      dossier_title: 'Activación DigiD + Solicitud Zorgtoeslag 2026',
      dossier_status: 'en_belastingdienst',
      dossier_progress: 65,
      refund_amount: 2410,
      monthly_zorg: 154,
      monthly_huur: 0,
      advisor: 'Rony P.',
    },
    {
      id: '2',
      full_name: 'Carlos Mendoza Ruiz',
      email: 'carlos.mendoza@techmail.nl',
      phone: '+34 654 321 987',
      bsn: '817293845',
      city: 'Ámsterdam',
      address: 'Keizersgracht 421',
      iban: 'NL44ABNA0412849201',
      digid_status: 'activo',
      dossier_code: 'EXP-2026-0042',
      dossier_title: 'Declaración Fiscal M-Form 2026',
      dossier_status: 'en_preparacion',
      dossier_progress: 80,
      refund_amount: 2890,
      monthly_zorg: 0,
      monthly_huur: 0,
      advisor: 'Rony P.',
    },
    {
      id: '3',
      full_name: 'Lars Van Dijk',
      email: 'lars.vandijk@techconsulting.nl',
      phone: '+31 6 49201948',
      bsn: '728194028',
      city: 'Rotterdam',
      address: 'Coolsingel 88',
      iban: 'NL02RABO0319284756',
      digid_status: 'activo',
      dossier_code: 'EXP-2026-0043',
      dossier_title: 'Alta Eenmanszaak KVK y BTW-nummer',
      dossier_status: 'completado',
      dossier_progress: 100,
      refund_amount: 0,
      monthly_zorg: 0,
      monthly_huur: 0,
      advisor: 'Rony P.',
    },
    {
      id: '4',
      full_name: 'Elena Morales Castillo',
      email: 'elena.morales@hotmail.com',
      phone: '+34 611 223 344',
      bsn: '639102847',
      city: 'Utrecht',
      address: 'Oudegracht 120',
      iban: 'NL88BUNQ2019283746',
      digid_status: 'activo',
      dossier_code: 'EXP-2026-0044',
      dossier_title: 'Subsidio Huurtoeslag de Alquiler',
      dossier_status: 'aprobado',
      dossier_progress: 95,
      refund_amount: 1450,
      monthly_zorg: 154,
      monthly_huur: 380,
      advisor: 'Rony P.',
    },
  ];

  // El portal usa el mismo registro que el CRM. Se conserva un cliente demo
  // como respaldo para que la maqueta siga siendo navegable si no hay sesión.
  const [portalClientData, setPortalClientData] = useState<any>(null);
  const [portalLoading, setPortalLoading] = useState(true);
  const [portalMessages, setPortalMessages] = useState<Array<{ id: string; body: string; author_name?: string; created_at: string }>>([]);
  const [portalMessageDraft, setPortalMessageDraft] = useState('');
  const [portalMessageSending, setPortalMessageSending] = useState(false);
  const [currentClientIndex] = useState(0);

  useEffect(() => {
    const syncClientFromCrm = async () => {
      try {
        const token = window.localStorage.getItem('rp_portal_token');
        if (!token) {
          router.replace('/portal/login');
          return;
        }
        const response = await fetch(`${apiUrl('/portal/me')}`, { headers: { Authorization: `Bearer ${token}` } });
        if (response.status === 401 || response.status === 403) {
          window.localStorage.removeItem('rp_portal_token');
          window.localStorage.removeItem('rp_portal_session_user');
          router.replace('/portal/login');
          return;
        }
        if (!response.ok) throw new Error('No se pudo cargar el portal');
        const data = await response.json();
        setPortalClientData(data);
        const messagesResponse = await fetch(apiUrl('/portal/messages'), { headers: { Authorization: `Bearer ${token}` } });
        if (messagesResponse.ok) {
          const messagesData = await messagesResponse.json();
          setPortalMessages(Array.isArray(messagesData.messages) ? messagesData.messages : []);
        }
      } catch {
        setPortalClientData(null);
      } finally {
        setPortalLoading(false);
      }
    };

    syncClientFromCrm();
    window.addEventListener('storage', syncClientFromCrm);
    window.addEventListener('nexusgest_clients_updated', syncClientFromCrm);
    return () => {
      window.removeEventListener('storage', syncClientFromCrm);
      window.removeEventListener('nexusgest_clients_updated', syncClientFromCrm);
    };
  }, [router]);

  const baseClient = {
    id: '', full_name: '', email: '', phone: '', bsn: '', city: '', address: '', iban: '',
    digid_status: 'sin_digid', dossier_code: '', dossier_title: '', dossier_status: 'en_preparacion',
    dossier_progress: 0, refund_amount: 0, monthly_zorg: 0, monthly_huur: 0, advisor: 'Tu gestor',
  };
  const firstDossier = portalClientData?.dossiers?.[0];
  const client = portalClientData
    ? {
        ...baseClient,
        ...portalClientData,
        dossier_code: firstDossier?.code || baseClient.dossier_code,
        dossier_title: firstDossier?.title || baseClient.dossier_title,
        dossier_status: firstDossier?.status || baseClient.dossier_status,
        dossier_progress: firstDossier?.progress_percentage ?? baseClient.dossier_progress,
        advisor: portalClientData.advisor || baseClient.advisor,
      }
    : baseClient;
  const displayClientName = client.full_name || 'Cliente';
  const displayBsn = client.bsn || 'No registrado';
  const latestInvoice = client.invoices?.[0];
  const portalInvoiceRef = latestInvoice?.code || '';
  const portalInvoiceTotal = latestInvoice?.total != null
    ? Number(latestInvoice.total).toFixed(2).replace('.', ',')
    : '';

  // Tabs de navegación
  const [activeTab, setActiveTab] = useState<
    'resumen' | 'ia' | 'toeslagen' | 'facturas' | 'documentos' | 'citas' | 'mensajes'
  >('resumen');

  const sendPortalMessage = async () => {
    const body = portalMessageDraft.trim();
    if (!body || portalMessageSending) return;
    const token = window.localStorage.getItem('rp_portal_token');
    if (!token) return;
    setPortalMessageSending(true);
    try {
      const response = await fetch(apiUrl('/portal/messages'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ body }),
      });
      if (!response.ok) throw new Error('No se pudo enviar el mensaje.');
      const data = await response.json();
      setPortalMessages((current) => [...current, data.message]);
      setPortalMessageDraft('');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'No se pudo enviar el mensaje.');
    } finally {
      setPortalMessageSending(false);
    }
  };

  // Estado de Notificaciones
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationsList, setNotificationsList] = useState([
    {
      id: 'n1',
      title: 'Belastingdienst en Proceso',
      date: 'Hoy',
      text: 'Expediente remitido para validación de subsidio Zorgtoeslag.',
      type: 'info',
    },
    {
      id: 'n2',
      title: 'Asesor Asignado',
      date: 'Ayer',
      text: 'Rony P. ha revisado tu documentación y preparado tu borrador fiscal.',
      type: 'success',
    },
  ]);
  const [unreadNotifications, setUnreadNotifications] = useState(2);

  // Subsidios interactivos
  const [huurtoeslagRequested, setHuurtoeslagRequested] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Documentos del cliente
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [isScanningFile, setIsScanningFile] = useState(false);
  const [documentList, setDocumentList] = useState<any[]>([]);

  useEffect(() => {
    if (!Array.isArray(portalClientData?.documents)) return;
    setDocumentList(
      portalClientData.documents.map((doc: any) => ({
        id: String(doc.id),
        name: doc.file_name,
        category: doc.category || 'Documento del expediente',
        date: doc.created_at ? new Date(doc.created_at).toLocaleDateString('es-NL') : '—',
        size: doc.file_size ? `${Math.max(1, Math.round(doc.file_size / 1024))} KB` : '—',
        status: doc.uploaded_by ? 'Subido por ti' : doc.is_verified ? 'Revisado por tu gestor' : 'Disponible para ti',
      }))
    );
  }, [portalClientData]);

  const [previewDoc, setPreviewDoc] = useState<any>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const input = e.currentTarget;
    if (!file) return;

    setUploadedFile(null);
    setIsScanningFile(true);
    try {
      const token = window.localStorage.getItem('rp_portal_token');
      if (!token) throw new Error('Tu sesión ha caducado. Vuelve a iniciar sesión.');
      const form = new FormData();
      form.append('file', file);
      const response = await fetch(apiUrl('/portal/documents'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'No se pudo subir el documento.');

      setPortalClientData((previous: any) => previous
        ? { ...previous, documents: [data.document, ...(previous.documents || [])] }
        : previous);
      setUploadedFile(file.name);
      showToast(`"${file.name}" ya está disponible para tu gestor en el CRM.`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'No se pudo subir el documento.');
    } finally {
      setIsScanningFile(false);
      input.value = '';
    }
  };

  const handleDownloadDocument = async (document: any) => {
    try {
      const token = window.localStorage.getItem('rp_portal_token');
      if (!token) throw new Error('Tu sesión ha caducado. Vuelve a iniciar sesión.');
      const response = await fetch(apiUrl(`/portal/documents/${encodeURIComponent(document.id)}/download`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('No se pudo descargar el documento.');
      const url = window.URL.createObjectURL(await response.blob());
      const link = window.document.createElement('a');
      link.href = url;
      link.download = document.name;
      link.click();
      window.URL.revokeObjectURL(url);
      setPreviewDoc(null);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'No se pudo descargar el documento.');
    }
  };

  // =========================================================================
  // SISTEMA COMPLETO DE CITAS Y SOLICITUD DESDE EL PORTAL DEL CLIENTE
  // =========================================================================
  const initialAppointments: PortalAppointment[] = [
    {
      id: '1',
      client_name: 'Maria Popescu',
      client_phone: '+31 6 81239845',
      title: 'Seguimiento Telefónico Zorgtoeslag',
      appointment_date: '2026-10-10',
      appointment_time: '10:00:00',
      modality: 'llamada',
      status: 'confirmada',
      advisor: 'Rony P.',
      notes: 'Llamar para verificar si ya llegó la carta física con el código de activación DigiD.',
    },
    {
      id: '8',
      client_name: 'Maria Popescu',
      client_phone: '+31 6 81239845',
      title: 'Verificación Certificado DigiD',
      appointment_date: '2026-10-05',
      appointment_time: '10:00:00',
      modality: 'llamada',
      status: 'completada',
      advisor: 'Rony P.',
      notes: 'Revisión y confirmación de activación de código por SMS.',
    },
    {
      id: '2',
      client_name: 'Carlos Mendoza Ruiz',
      client_phone: '+34 654 321 987',
      title: 'Revisión M-Form Carlos Mendoza',
      appointment_date: '2026-10-10',
      appointment_time: '11:30:00',
      modality: 'online_meet',
      status: 'confirmada',
      advisor: 'Rony P.',
      notes: 'Revisar certificado de retenciones emitido en España antes del traslado a Ámsterdam.',
    },
    {
      id: '7',
      client_name: 'Carlos Mendoza Ruiz',
      client_phone: '+34 654 321 987',
      title: 'Firma Presencial Modelo 30% Ruling',
      appointment_date: '2026-10-27',
      appointment_time: '15:00:00',
      modality: 'presencial',
      status: 'confirmada',
      advisor: 'Rony P.',
      notes: 'Firma conjunta con empleador del formulario 30% Ruling ante la Belastingdienst.',
    },
    {
      id: '3',
      client_name: 'Lars Van Dijk',
      client_phone: '+31 6 49201948',
      title: 'Firma Presencial Documentación KVK',
      appointment_date: '2026-10-10',
      appointment_time: '16:00:00',
      modality: 'presencial',
      status: 'confirmada',
      advisor: 'Rony P.',
      notes: 'Firma de estatutos y verificación presencial de pasaporte en despacho.',
    },
    {
      id: '5',
      client_name: 'Lars Van Dijk',
      client_phone: '+31 6 49201948',
      title: 'Videollamada Liquidación BTW 3T',
      appointment_date: '2026-10-15',
      appointment_time: '12:00:00',
      modality: 'online_meet',
      status: 'confirmada',
      advisor: 'Rony P.',
      notes: 'Presentación trimestral del IVA (Omzetbelasting) y facturas deducibles.',
    },
    {
      id: '4',
      client_name: 'Elena Morales Castillo',
      client_phone: '+34 611 223 344',
      title: 'Consulta Telefónica Huurtoeslag',
      appointment_date: '2026-10-12',
      appointment_time: '09:30:00',
      modality: 'llamada',
      status: 'pendiente',
      advisor: 'Rony P.',
      notes: 'Resolver dudas sobre el contrato de arrendamiento en Utrecht y límite de ingresos.',
    },
    {
      id: '6',
      client_name: 'Elena Morales Castillo',
      client_phone: '+34 611 223 344',
      title: 'Consulta Deducción Hipoteca (Eigenwoningforfait)',
      appointment_date: '2026-10-22',
      appointment_time: '11:15:00',
      modality: 'llamada',
      status: 'confirmada',
      advisor: 'Rony P.',
      notes: 'Análisis fiscal sobre compra de vivienda habitual en Países Bajos.',
    },
  ];

  const [allAppointments, setAllAppointments] = useState<PortalAppointment[]>(
    process.env.NODE_ENV === 'production' ? [] : initialAppointments
  );
  const [aptFilter, setAptFilter] = useState<'todas' | 'proximas' | 'completadas'>('todas');

  // La agenda del portal refleja las citas guardadas en PostgreSQL.
  useEffect(() => {
    if (!Array.isArray(portalClientData?.appointments)) return;
    setAllAppointments(portalClientData.appointments.map((appointment: any) => ({
      ...appointment,
      id: String(appointment.id),
      appointment_date: String(appointment.appointment_date).slice(0, 10),
      appointment_time: String(appointment.appointment_time).slice(0, 8),
      client_name: appointment.client_name || displayClientName,
      client_phone: appointment.client_phone || client.phone,
      status: appointment.status || 'pendiente',
      advisor: client.advisor || 'Tu gestor',
    })));
  }, [portalClientData, displayClientName, client.phone, client.advisor]);

  // Citas pertenecientes al cliente actualmente seleccionado
  const clientAppointments = allAppointments.filter((a) => {
    const cleanApt = (a.client_name || '').trim().toLowerCase();
    const cleanClient = displayClientName.trim().toLowerCase();
    return cleanApt === cleanClient || cleanApt.includes(cleanClient) || cleanClient.includes(cleanApt);
  });

  // Próxima cita del cliente (la más cercana no completada)
  const nextClientAppointment =
    clientAppointments
      .filter((a) => a.status !== 'completada')
      .sort((a, b) => a.appointment_date.localeCompare(b.appointment_date))[0] || null;

  // MODAL PARA SOLICITAR CITA
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingTopic, setBookingTopic] = useState('Revisión y Firma de Declaración M-Form 2026');
  const [bookingDate, setBookingDate] = useState('2026-10-16');
  const [bookingTime, setBookingTime] = useState('11:00');
  const [bookingModality, setBookingModality] = useState<'online_meet' | 'llamada' | 'presencial'>('online_meet');
  const [bookingNotes, setBookingNotes] = useState('');
  const [isSubmittingApt, setIsSubmittingApt] = useState(false);

  const handleCreateClientAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingApt(true);
    try {
      const token = window.localStorage.getItem('rp_portal_token');
      if (!token) throw new Error('Tu sesión ha caducado. Vuelve a iniciar sesión.');
      const response = await fetch(apiUrl('/portal/appointments'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: bookingTopic,
          appointment_date: bookingDate,
          appointment_time: `${bookingTime}:00`,
          modality: bookingModality,
          notes: bookingNotes,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'No se pudo guardar la solicitud.');

      const savedAppointment: PortalAppointment = {
        ...data.appointment,
        id: String(data.appointment.id),
        appointment_date: String(data.appointment.appointment_date).slice(0, 10),
        appointment_time: String(data.appointment.appointment_time).slice(0, 8),
        client_name: displayClientName,
        client_phone: client.phone,
        advisor: client.advisor || 'Tu gestor',
      };
      setAllAppointments((previous) => [savedAppointment, ...previous]);
      setPortalClientData((previous: any) => previous
        ? { ...previous, appointments: [data.appointment, ...(previous.appointments || [])] }
        : previous);

      setNotificationsList((prev) => [{
        id: String(Date.now()),
        title: 'Solicitud de cita registrada',
        date: 'Ahora',
        text: `${bookingTopic} · ${bookingDate} a las ${bookingTime}. Pendiente de revisión por tu gestor.`,
        type: 'info',
      }, ...prev]);
      setUnreadNotifications((count) => count + 1);

      setChatMessages((prev) => [...prev, {
        id: String(Date.now()),
        sender: 'ia',
        text: `He registrado tu solicitud para el **${bookingDate} a las ${bookingTime}**. Tu gestor la revisará; la cita aún no está confirmada.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedAction: { label: 'Ver mis Citas', tab: 'citas' },
      }]);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'No se pudo guardar la solicitud de cita.');
      return;
    } finally {
      setIsSubmittingApt(false);
    }

    setShowBookingModal(false);
    setBookingNotes('');
    setActiveTab('citas');
    showToast(`¡Cita solicitada con éxito para el ${bookingDate} a las ${bookingTime}!`);
  };

  // CHAT DEL ASISTENTE VIRTUAL IA DEL CLIENTE
  const [chatMessages, setChatMessages] = useState<ClientMessage[]>([
    {
      id: 'm1',
      sender: 'ia',
      text: `👋 ¡Hola ${displayClientName.split(' ')[0]}! Soy tu **Asistente Virtual NexusGest 24/7**.\n\nTengo acceso a tu expediente activo **${client.dossier_code}** y puedo responder cualquier duda sobre tu **devolución de impuestos**, el cobro de tu **Zorgtoeslag**, agendar una **cita con tu gestor** o descifrar las cartas de la **Belastingdienst**.\n\n¿En qué puedo ayudarte?`,
      time: '10:00',
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll en el chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, isAiTyping]);

  // Actualizar mensaje de bienvenida cuando cambia el cliente seleccionado
  useEffect(() => {
    setChatMessages([
      {
        id: `m-init-${client.id}`,
        sender: 'ia',
        text: `👋 ¡Hola ${displayClientName.split(' ')[0]}! Soy tu **Asistente Virtual NexusGest**.\n\nTengo en pantalla tu expediente **${client.dossier_code}** (*${client.dossier_title}*). Tu saldo estimado a devolver es de **€ ${formatThousands(client.refund_amount)}** y tu próximo subsidio mensual es de **€ ${formatThousands(client.monthly_zorg)}/mes**.\n\n¿En qué te puedo asesorar?`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  }, [currentClientIndex]);

  const handleSendChatMessage = (textToSend?: string) => {
    const message = (textToSend || chatInput).trim();
    if (!message) return;

    const userMsg: ClientMessage = {
      id: String(Date.now()),
      sender: 'user',
      text: message,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setChatInput('');
    setIsAiTyping(true);

    // Lógica inteligente de respuesta según palabras clave
    setTimeout(() => {
      let reply = '';
      let action: any = undefined;
      const lower = message.toLowerCase();

      if (lower.includes('pedir cita') || lower.includes('solicitar cita') || lower.includes('agendar') || lower.includes('reunión')) {
        reply = `¡Por supuesto! Puedes solicitar una sesión individual con tu asesor **Rony P.** eligiendo fecha, hora y modalidad (Google Meet, llamada telefónica o presencial).\n\nHe preparado el formulario para que selecciones el horario que mejor te convenga.`;
        action = { label: 'Abrir Formulario de Cita', tab: 'citas', action: 'open_booking' };
        setShowBookingModal(true);
      } else if (lower.includes('zorgtoeslag') || lower.includes('subsidio') || lower.includes('cobro') || lower.includes('dinero')) {
        reply = `El subsidio de salud (**Zorgtoeslag**) de **€ ${client.monthly_zorg || 154},00 al mes** lo abona directamente la Belastingdienst en tu cuenta bancaria (**${client.iban}**) el **día 20 de cada mes**.\n\nComo tu solicitud se tramitó en octubre, el primer ingreso incluirá además los meses atrasados que te correspondan con efecto retroactivo.`;
        action = { label: 'Ver Estado de Subsidios', tab: 'toeslagen' };
      } else if (lower.includes('carta') || lower.includes('digid') || lower.includes('código') || lower.includes('sms')) {
        reply = `Cuando te llegue la carta física de la Belastingdienst con el código de activación DigiD a tu dirección (**${client.address}, ${client.city}**):\n\n1. Entra a la pestaña **Subir Cartas**.\n2. Hazle una foto con tu móvil o sube el archivo PDF.\n3. Nuestro sistema OCR extraerá el código al instante y tu gestor completará la activación en menos de 24 horas.`;
        action = { label: 'Ir a Subir Cartas', tab: 'documentos' };
      } else if (lower.includes('devolución') || lower.includes('mform') || lower.includes('m-form') || lower.includes('renta')) {
        reply = `Tu declaración **M-Form 2026** tiene un saldo estimado a tu favor de **€ ${formatThousands(client.refund_amount)}** gracias a las deducciones por relocalización internacional.\n\nEl expediente se encuentra formalmente presentado ante la oficina fiscal de Heerlen y el plazo medio habitual de resolución oscila entre **3 y 6 semanas**.`;
        action = { label: 'Consultar Expediente', tab: 'resumen' };
      } else if (lower.includes('cita') || lower.includes('asesor') || lower.includes('hablar')) {
        const nextApt = nextClientAppointment;
        if (nextApt) {
          reply = `Tienes programada tu próxima sesión con **${nextApt.advisor}** para el día **${nextApt.appointment_date} a las ${nextApt.appointment_time.slice(0, 5)}** (${nextApt.modality === 'online_meet' ? 'Videollamada Google Meet' : nextApt.modality === 'llamada' ? 'Llamada telefónica' : 'Presencial'}).\n\n¿Deseas solicitar otra cita adicional o reprogramarla?`;
          action = { label: 'Gestionar Mis Citas', tab: 'citas' };
        } else {
          reply = `Actualmente no tienes ninguna cita futura agendada. ¿Quieres que agendemos una llamada o videollamada con tu gestor **Rony P.**?`;
          action = { label: 'Solicitar Nueva Cita', tab: 'citas', action: 'open_booking' };
        }
      } else if (lower.includes('factura') || lower.includes('pagar') || lower.includes('ideal')) {
        reply = `Puedes coordinar el pago de tu factura directamente con tu gestor por **WhatsApp**. Abre la pestaña de facturas para iniciar la conversación con el número y la referencia preparados.`;
        action = { label: 'Ver Facturas y Pago', tab: 'facturas' };
      } else {
        reply = `He registrado tu consulta sobre *"${message}"*. Tu asesor personal **Rony P.** tiene visibilidad de este chat en su CRM y revisará cualquier detalle específico en tu expediente **${client.dossier_code}**.\n\n¿Deseas que te oriente sobre tus **subsidios**, tu **declaración M-Form** o **agendar una cita** directa?`;
      }

      setChatMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          sender: 'ia',
          text: reply,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestedAction: action,
        },
      ]);
      setIsAiTyping(false);
    }, 900);
  };

  if (portalLoading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <p className="text-sm text-slate-300">Cargando tu expediente seguro…</p>
      </main>
    );
  }

  // Nunca mostrar una ficha vacía ni datos demo si la sesión no está vinculada
  // a un cliente real. Esto evita que un token antiguo deje ver un portal sin
  // identidad o que el cliente crea que sus datos se han perdido.
  if (!portalClientData) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <section className="max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center shadow-xl">
          <span className="material-symbols-outlined text-4xl text-amber-400">lock</span>
          <h1 className="mt-4 text-xl font-bold">Sesión de cliente no disponible</h1>
          <p className="mt-2 text-sm text-slate-300">Vuelve a iniciar sesión para acceder a tu expediente.</p>
          <button
            type="button"
            onClick={() => router.replace('/portal/login')}
            className="mt-6 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold hover:bg-blue-500"
          >
            Ir al acceso del portal
          </button>
        </section>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white font-sans antialiased">
      {/* Toast flotante */}
      {toastMsg && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-2 border border-emerald-400">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TOP NAVBAR CLIENTE (FINTECH PREMIUM) */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 px-4 sm:px-6 lg:px-10 h-16 sm:h-18 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl overflow-hidden bg-slate-950 border border-slate-700 text-white flex items-center justify-center font-bold text-sm shadow-md group-hover:scale-105 transition-transform">
              <img src="/logo.png" alt="RP Gestoría" className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col">
              <span className="font-heading font-extrabold text-sm sm:text-base tracking-tight text-white group-hover:text-blue-400 transition-colors">
                Mijn RP Gestoría
              </span>
              <span className="text-[9px] uppercase font-bold tracking-widest text-slate-400">
                Portal Seguro del Cliente
              </span>
            </div>
          </Link>
          <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-mono-data bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>CIFRADO 256-BIT</span>
          </span>
        </div>

        {/* Acciones del cliente */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Botón destacado rápido para solicitar cita */}
          <button
            type="button"
            onClick={() => setShowBookingModal(true)}
            className="h-8 sm:h-9 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm hover:shadow"
            title="Pedir cita con mi gestor"
          >
            <span className="material-symbols-outlined text-[16px]">add_circle</span>
            <span className="hidden sm:inline">Solicitar Cita</span>
            <span className="sm:hidden">Cita</span>
          </button>

          {/* Notificaciones */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowNotifications(!showNotifications);
                setUnreadNotifications(0);
              }}
              className="w-9 h-9 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center transition-colors relative"
              title="Notificaciones oficiales"
            >
              <span className="material-symbols-outlined text-[19px]">notifications</span>
              {unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-500 text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
                  {unreadNotifications}
                </span>
              )}
            </button>

            {/* Popover de Notificaciones */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-4 text-xs space-y-3 z-50 animate-in fade-in">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <h5 className="font-bold text-white text-xs">Avisos de tu Expediente</h5>
                  <button type="button" aria-label="Cerrar notificaciones" onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-white">✕</button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {notificationsList.map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-2.5 rounded-xl border space-y-1 ${
                        notif.type === 'success'
                          ? 'bg-emerald-500/10 border-emerald-500/20'
                          : 'bg-blue-500/10 border-blue-500/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`font-bold text-[11px] ${
                            notif.type === 'success' ? 'text-emerald-300' : 'text-blue-300'
                          }`}
                        >
                          {notif.title}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono-data">{notif.date}</span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-tight">{notif.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* El portal de cliente no muestra accesos al CRM interno. */}

          {/* Avatar del Cliente */}
          <div className="flex items-center gap-2.5 border-l border-slate-800 pl-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-mono-data font-bold text-xs flex items-center justify-center shadow-md">
              {displayClientName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-bold text-white truncate max-w-[130px]">{displayClientName}</span>
              <span className="text-[10px] font-mono-data text-slate-400">BSN: {displayBsn}</span>
            </div>
          </div>

          <Link
            href="/"
            className="text-xs font-medium text-slate-400 hover:text-white flex items-center gap-1 border-l border-slate-800 pl-3"
            title="Cerrar sesión"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
          </Link>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* MAIN CONTAINER */}
      {/* ========================================================================= */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-8 space-y-6">
        {/* BANNER FINTECH DE BIENVENIDA */}
        <div className="bg-gradient-to-r from-blue-900/60 via-indigo-950/70 to-slate-900 border border-slate-800 p-6 sm:p-7 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -z-0"></div>

          <div className="space-y-2 relative z-10">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.8 rounded-full bg-blue-500/20 text-blue-300 font-mono-data text-[10px] font-bold border border-blue-400/30">
                {client.dossier_code}
              </span>
              <span className="text-xs font-mono-data text-slate-400">
                {client.city} · IBAN: {client.iban.slice(0, 8)}•••
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              ¡Hola, {displayClientName.split(' ')[0]}!
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Tu expediente <strong>{client.dossier_title}</strong> se encuentra activo y gestionado por tu asesor personal <strong>{client.advisor}</strong> ante la Belastingdienst.
            </p>
          </div>

          {/* Quick Action Buttons en el Banner */}
          <div className="flex flex-wrap items-center gap-3 relative z-10 shrink-0">
            <button
              type="button"
              onClick={() => setShowBookingModal(true)}
              className="h-10 sm:h-11 px-4 sm:px-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 transition-all transform hover:-translate-y-0.5"
            >
              <span className="material-symbols-outlined text-[18px]">calendar_month</span>
              <span>Solicitar Cita con Asesor</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ia')}
              className="h-10 sm:h-11 px-4 border border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-200 text-xs font-bold rounded-xl transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px] text-blue-400">smart_toy</span>
              <span>Consultar Asistente IA</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4 FINTECH KPI CARDS: SALDO, SUBSIDIOS, DIGID Y PRÓXIMA CITA */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Devolución M-Form */}
          <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-sm space-y-2 hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Devolución Estimada</span>
              <span className="material-symbols-outlined text-blue-400 text-lg">account_balance</span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono-data text-emerald-400">
              {client.refund_amount > 0 ? `€ ${formatThousands(client.refund_amount)}` : '€ 0,00'}
            </div>
            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/80">
              <span className="text-slate-400">M-Form 2026</span>
              <span className="text-blue-400 font-semibold">En revisión oficial</span>
            </div>
          </div>

          {/* Card 2: Subsidios Mensuales Toeslagen */}
          <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-sm space-y-2 hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Subsidio Mensual Activo</span>
              <span className="material-symbols-outlined text-emerald-400 text-lg">health_and_safety</span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono-data text-blue-400">
              € {client.monthly_zorg + client.monthly_huur},00 <span className="text-xs font-normal text-slate-400">/ mes</span>
            </div>
            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/80">
              <span className="text-slate-400">Próximo ingreso</span>
              <span className="text-emerald-400 font-semibold font-mono-data">20 de Octubre</span>
            </div>
          </div>

          {/* Card 3: DigiD y BSN */}
          <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-sm space-y-2 hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Identidad DigiD</span>
              <span className="material-symbols-outlined text-purple-400 text-lg">fingerprint</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg font-bold text-white font-mono-data">
                {client.digid_status === 'activo' ? '✓ Activo y Operativo' : '⏳ Carta en Tránsito'}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/80">
              <span className="text-slate-400 font-mono-data">BSN: {displayBsn}</span>
              <button onClick={() => setActiveTab('documentos')} className="text-purple-400 hover:underline font-semibold">
                Subir código
              </button>
            </div>
          </div>

          {/* Card 4: Próxima Cita & Acción Rápida */}
          <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-sm space-y-2 hover:border-slate-700 transition-colors">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Próxima Asesoría</span>
              <span className="material-symbols-outlined text-amber-400 text-lg">calendar_month</span>
            </div>
            <div className="text-base sm:text-lg font-bold text-white truncate">
              {nextClientAppointment
                ? `${nextClientAppointment.appointment_date} · ${nextClientAppointment.appointment_time.slice(0, 5)}`
                : 'Sin cita programada'}
            </div>
            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => setShowBookingModal(true)}
                className="text-blue-400 hover:underline font-semibold flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[13px]">add</span>
                <span>Pedir Cita</span>
              </button>
              <button onClick={() => setActiveTab('citas')} className="text-amber-400 hover:underline font-semibold">
                Ver todas ({clientAppointments.length})
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* PESTAÑAS DE NAVEGACIÓN PRINCIPAL */}
        {/* ========================================================================= */}
        <div className="flex border-b border-slate-800 gap-1 overflow-x-auto text-xs font-bold no-scrollbar">
          {[
            { id: 'resumen', icon: 'assignment', label: 'Mi Expediente & Estado' },
            { id: 'citas', icon: 'event', label: 'Mis Citas & Solicitar', badge: `${clientAppointments.length}` },
            { id: 'ia', icon: 'smart_toy', label: 'Asistente IA 24/7' },
            { id: 'toeslagen', icon: 'health_and_safety', label: 'Subsidios & Toeslagen Hub' },
            { id: 'facturas', icon: 'chat', label: 'Facturas & Pago WhatsApp' },
            { id: 'documentos', icon: 'folder_shared', label: 'Bóveda de Documentos' },
            { id: 'mensajes', icon: 'forum', label: 'Mensajes con tu gestor', badge: `${portalMessages.length}` },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id as any)}
              aria-pressed={activeTab === t.id}
              className={`py-3 px-3.5 sm:px-4 border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === t.id
                  ? 'border-blue-500 text-blue-400 bg-blue-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">{t.icon}</span>
              <span>{t.label}</span>
              {t.badge && (
                <span className="px-1.5 py-0.2 bg-blue-500 text-white text-[9px] font-extrabold rounded-full">
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {activeTab === 'mensajes' && (
          <section aria-labelledby="portal-messages-title" className="space-y-4">
            <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800">
              <h2 id="portal-messages-title" className="text-xl font-extrabold text-white">Mensajes con tu gestor</h2>
              <p className="text-xs text-slate-400 mt-1">Aquí solo aparecen mensajes compartidos contigo. Las notas internas del CRM nunca se muestran.</p>
            </div>
            <div className="space-y-3">
              {portalMessages.length === 0 ? (
                <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8 text-center text-sm text-slate-400">Todavía no hay mensajes.</div>
              ) : portalMessages.map((message) => (
                <article key={message.id} className="bg-slate-900 rounded-2xl border border-slate-800 p-4">
                  <div className="flex items-center justify-between gap-3 text-[11px] text-slate-400">
                    <span>{message.author_name || 'Tu gestor'}</span>
                    <time dateTime={message.created_at}>{new Date(message.created_at).toLocaleString('es-ES')}</time>
                  </div>
                  <p className="mt-2 text-sm text-slate-200 whitespace-pre-wrap">{message.body}</p>
                </article>
              ))}
            </div>
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4">
              <label htmlFor="portal-message-draft" className="block text-xs font-bold text-slate-300 mb-2">Escribe a tu gestor</label>
              <textarea id="portal-message-draft" value={portalMessageDraft} onChange={(event) => setPortalMessageDraft(event.target.value)} rows={4} maxLength={2000} className="w-full rounded-xl bg-slate-950 border border-slate-700 text-sm text-white p-3" placeholder="Escribe tu consulta..." />
              <button type="button" onClick={sendPortalMessage} disabled={!portalMessageDraft.trim() || portalMessageSending} className="mt-3 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold disabled:opacity-50">{portalMessageSending ? 'Enviando…' : 'Enviar mensaje'}</button>
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* TAB: MIS CITAS & SOLICITAR CITA NUEVA */}
        {/* ========================================================================= */}
        {activeTab === 'citas' && (
          <div className="space-y-6">
            {/* Header de la sección de citas */}
            <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono-data text-xs font-bold">
                    AGENDA DEL CLIENTE
                  </span>
                  <span className="text-xs text-slate-400">Asesor: <strong>{client.advisor}</strong></span>
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-1">Tus Citas y Asesorías</h2>
                <p className="text-xs text-slate-300 mt-0.5">
                  Gestiona tus sesiones con tu gestor. Puedes solicitar una nueva cita en cualquier momento eligiendo día y hora.
                </p>
              </div>

              {/* Botón principal Solicitar Cita */}
              <button
                type="button"
                onClick={() => setShowBookingModal(true)}
                className="h-11 px-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 shrink-0 transform hover:-translate-y-0.5"
              >
                <span className="material-symbols-outlined text-[18px]">calendar_month</span>
                <span>+ Solicitar Nueva Cita</span>
              </button>
            </div>

            {/* Filtros de citas */}
            <div className="flex items-center gap-2 text-xs">
              {(['todas', 'proximas', 'completadas'] as const).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setAptFilter(filter)}
                  aria-pressed={aptFilter === filter}
                  className={`px-3.5 py-1.5 rounded-lg font-bold capitalize transition-colors ${
                    aptFilter === filter
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {filter === 'todas' ? 'Todas las Citas' : filter === 'proximas' ? 'Próximas Sesiones' : 'Completadas'}
                </button>
              ))}
            </div>

            {/* Listado de citas */}
            <div className="space-y-3.5">
              {clientAppointments
                .filter((apt) => {
                  if (aptFilter === 'proximas') return apt.status !== 'completada';
                  if (aptFilter === 'completadas') return apt.status === 'completada';
                  return true;
                })
                .map((apt) => (
                  <div
                    key={apt.id}
                    className={`p-5 rounded-2xl border transition-all space-y-3 ${
                      apt.status === 'completada'
                        ? 'bg-slate-900/60 border-slate-800 opacity-75'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700 shadow-md'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3.5">
                        <div
                          className={`p-3 rounded-xl text-center min-w-[75px] shrink-0 font-mono-data ${
                            apt.modality === 'online_meet'
                              ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                              : apt.modality === 'llamada'
                              ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-slate-800 text-slate-300 border border-slate-700'
                          }`}
                        >
                          <span className="block text-sm font-extrabold">{apt.appointment_time.slice(0, 5)}</span>
                          <span className="text-[10px] uppercase font-bold tracking-wider">
                            {apt.appointment_date}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-bold text-sm sm:text-base text-white">{apt.title}</h3>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                apt.status === 'completada'
                                  ? 'bg-slate-800 text-slate-400'
                                  : apt.status === 'pendiente'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                              }`}
                            >
                              {apt.status === 'completada'
                                ? 'Completada'
                                : apt.status === 'pendiente'
                                ? 'Pendiente de confirmación'
                                : 'Confirmada'}
                            </span>
                          </div>

                          <p className="text-xs text-slate-400 flex items-center gap-2">
                            <span>Asesor: <strong className="text-slate-300">{apt.advisor || 'Rony P.'}</strong></span>
                            <span>·</span>
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px] text-blue-400">
                                {apt.modality === 'online_meet' ? 'videocam' : apt.modality === 'llamada' ? 'call' : 'business'}
                              </span>
                              <span>
                                {apt.modality === 'online_meet'
                                  ? 'Videollamada Google Meet'
                                  : apt.modality === 'llamada'
                                  ? `Llamada telefónica a ${apt.client_phone}`
                                  : 'Presencial en despacho'}
                              </span>
                            </span>
                          </p>
                        </div>
                      </div>

                      {/* Acciones directas de la cita */}
                      <div className="flex items-center gap-2 shrink-0">
                        {apt.modality === 'online_meet' && apt.status !== 'completada' && (
                          <button
                            type="button"
                            onClick={() => window.open('https://meet.google.com', '_blank')}
                            className="h-9 px-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                          >
                            <span className="material-symbols-outlined text-[16px]">video_call</span>
                            <span>Unirse a Google Meet</span>
                          </button>
                        )}

                        {apt.modality === 'llamada' && apt.status !== 'completada' && (
                          <button
                            type="button"
                            onClick={() => showToast(`Tu asesor ${apt.advisor || 'Rony P.'} te llamará al ${apt.client_phone} en la hora indicada.`)}
                            className="h-9 px-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                          >
                            <span className="material-symbols-outlined text-[16px]">phone_in_talk</span>
                            <span>Confirmar Número</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {apt.notes && (
                      <div className="p-3 bg-slate-950/70 rounded-xl text-xs text-slate-300 border border-slate-800">
                        <span className="text-slate-500 font-semibold">Detalles de la sesión: </span>
                        <span>{apt.notes}</span>
                      </div>
                    )}
                  </div>
                ))}

              {clientAppointments.length === 0 && (
                <div className="p-12 text-center bg-slate-900 rounded-3xl border border-dashed border-slate-800 space-y-3">
                  <span className="material-symbols-outlined text-4xl text-slate-600">event_busy</span>
                  <h4 className="font-bold text-white text-base">No tienes citas registradas actualmente</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Puedes agendar una sesión individual con tu gestor Rony P. para revisar tu declaración, tus subsidios o cualquier carta de la Belastingdienst.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowBookingModal(true)}
                    className="mt-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">calendar_month</span>
                    <span>Solicitar mi Primera Cita</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 1: MI EXPEDIENTE & PROGRESO VISUAL */}
        {/* ========================================================================= */}
        {activeTab === 'resumen' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-sm space-y-6">
              {/* Barra de progreso visual */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-white">Progreso de Tramitación: {client.dossier_code}</h3>
                    <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono-data text-[10px] font-bold">
                      {client.dossier_progress}% completado
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">Resolución estimada: 3-5 semanas</span>
                </div>
                <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${client.dossier_progress}%` }}
                  ></div>
                </div>
              </div>

              {/* Timeline de Hitos */}
              <div className="space-y-4 pt-2">
                {/* Hito 1 */}
                <div className="flex items-start gap-3.5">
                  <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <span className="material-symbols-outlined text-[16px]">check</span>
                  </div>
                  <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60 flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <h5 className="font-bold text-xs sm:text-sm text-white">1. Recopilación de Documentos y BSN Oficial</h5>
                      <span className="text-[10px] font-mono-data text-emerald-400 font-semibold">Completado</span>
                    </div>
                    <p className="text-slate-300 text-xs">
                      Documentación de identidad y certificado de empadronamiento validados por el asesor Rony P.
                    </p>
                  </div>
                </div>

                {/* Hito 2 */}
                <div className="flex items-start gap-3.5">
                  <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <span className="material-symbols-outlined text-[16px]">check</span>
                  </div>
                  <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60 flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <h5 className="font-bold text-xs sm:text-sm text-white">2. Presentación telemática a la Belastingdienst</h5>
                      <span className="text-[10px] font-mono-data text-emerald-400 font-semibold">Completado</span>
                    </div>
                    <p className="text-slate-300 text-xs">
                      Expediente remitido a la oficina fiscal con el certificado tributario oficial de la gestoría.
                    </p>
                  </div>
                </div>

                {/* Hito 3 */}
                <div className="flex items-start gap-3.5">
                  <div className="w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center shrink-0 animate-pulse shadow-md">
                    <span className="material-symbols-outlined text-[16px]">hourglass_top</span>
                  </div>
                  <div className="bg-blue-500/10 p-3.5 rounded-xl border border-blue-500/30 flex-1 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <h5 className="font-bold text-xs sm:text-sm text-blue-300">
                        3. Espera de carta física postal con código DigiD
                      </h5>
                      <span className="text-[10px] font-mono-data text-blue-400 font-bold">En curso</span>
                    </div>
                    <p className="text-slate-200 text-xs">
                      Recibirás una carta física por correo en tu buzón de <strong>{client.address}, {client.city}</strong>. Cuando la recibas, hazle una foto y súbela en la pestaña &quot;Bóveda de Documentos&quot; para que activemos tu clave en 1 hora.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTab('documentos')}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold rounded-lg transition-colors inline-flex items-center gap-1 shadow-2xs"
                    >
                      <span className="material-symbols-outlined text-[14px]">upload</span>
                      <span>Subir Carta Ahora</span>
                    </button>
                  </div>
                </div>

                {/* Hito 4 */}
                <div className="flex items-start gap-3.5 opacity-50">
                  <div className="w-7 h-7 rounded-full bg-slate-800 text-slate-500 flex items-center justify-center shrink-0 border border-slate-700">
                    <span className="material-symbols-outlined text-[16px]">account_balance_wallet</span>
                  </div>
                  <div className="bg-slate-800/30 p-3.5 rounded-xl border border-slate-800 flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <h5 className="font-bold text-xs sm:text-sm text-slate-400">
                        4. Resolución definitiva y abono mensual en tu cuenta
                      </h5>
                      <span className="text-[10px] font-mono-data text-slate-500">Pendiente</span>
                    </div>
                    <p className="text-slate-500 text-xs">
                      Ingreso mensual del subsidio en tu cuenta bancaria ({client.iban}) y confirmación oficial en PDF.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Columna Derecha: Tarjeta de tu Asesor Personal */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-white">Tu Asesor Personal Asignado</h3>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold text-[10px] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span>EN LÍNEA</span>
                  </span>
                </div>

                <div className="flex items-center gap-3.5 p-3.5 bg-slate-800/60 rounded-xl border border-slate-700/60">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-base flex items-center justify-center font-mono-data shadow-md">
                    RP
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white">Rony P.</h4>
                    <p className="text-xs text-blue-400 font-medium">Especialista Fiscal & Trámites NL</p>
                    <p className="text-[10px] text-slate-400 font-mono-data">Gestor Colegiado NexusGest</p>
                  </div>
                </div>

                <div className="p-3 bg-slate-800/40 rounded-xl text-xs space-y-2 border border-slate-800">
                  <div className="flex items-center gap-2.5 text-slate-300">
                    <span className="material-symbols-outlined text-blue-400 text-base">call</span>
                    <span className="font-mono-data">+31 6 8123 9845</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-slate-300">
                    <span className="material-symbols-outlined text-blue-400 text-base">mail</span>
                    <span>soporte@nexusgest.nl</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-slate-300">
                    <span className="material-symbols-outlined text-blue-400 text-base">schedule</span>
                    <span>Lun - Vie · 09:00 a 18:00</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setShowBookingModal(true)}
                    className="w-full h-10 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all"
                  >
                    <span className="material-symbols-outlined text-[17px]">calendar_month</span>
                    <span>Pedir Cita con Rony P.</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('ia')}
                    className="w-full h-10 border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[17px]">chat</span>
                    <span>Consultar por Chat con Asistente IA</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: ASISTENTE IA 24/7 PARA EL CLIENTE */}
        {/* ========================================================================= */}
        {activeTab === 'ia' && (
          <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-xl overflow-hidden flex flex-col h-[650px]">
            {/* Header del Chat */}
            <div className="p-4 sm:px-6 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md">
                  <span className="material-symbols-outlined text-[22px]">smart_toy</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-white">Asistente Virtual NexusGest 24/7</h3>
                    <span className="px-2 py-0.2 bg-emerald-500/20 text-emerald-400 font-bold text-[9px] rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      <span>EN VIVO</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Conectado a tu expediente <span className="font-mono-data text-blue-300 font-semibold">{client.dossier_code}</span> y base de datos Belastingdienst
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowBookingModal(true)}
                  className="h-8 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold flex items-center gap-1 transition-colors shadow-2xs"
                >
                  <span className="material-symbols-outlined text-[14px]">calendar_month</span>
                  <span>Pedir Cita</span>
                </button>
                <button
                  type="button"
                  onClick={() => setChatMessages(chatMessages.slice(0, 1))}
                  className="h-8 px-2.5 rounded-lg border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white text-[11px] font-semibold flex items-center gap-1 transition-colors"
                  title="Reiniciar conversación"
                >
                  <span className="material-symbols-outlined text-[14px]">refresh</span>
                  <span>Limpiar</span>
                </button>
              </div>
            </div>

            {/* Mensajes del Chat */}
            <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 max-w-2xl ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                      msg.sender === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gradient-to-tr from-indigo-600 to-blue-500 text-white shadow-sm'
                    }`}
                  >
                    {msg.sender === 'user' ? 'Tú' : <span className="material-symbols-outlined text-[16px]">smart_toy</span>}
                  </div>
                  <div className="space-y-2">
                    <div
                      className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-line ${
                        msg.sender === 'user'
                          ? 'bg-blue-600 text-white rounded-tr-none'
                          : 'bg-slate-800/90 text-slate-200 border border-slate-700/80 rounded-tl-none shadow-sm'
                      }`}
                    >
                      {msg.text}
                    </div>

                    {/* Botón de acción contextual sugerido */}
                    {msg.suggestedAction && (
                      <button
                        type="button"
                        onClick={() => {
                          if (msg.suggestedAction?.action === 'open_booking') {
                            setShowBookingModal(true);
                          }
                          setActiveTab(msg.suggestedAction!.tab);
                        }}
                        className="px-3.5 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-400/30 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
                      >
                        <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                        <span>{msg.suggestedAction.label}</span>
                      </button>
                    )}

                    <span className="text-[10px] text-slate-500 block px-1">{msg.time}</span>
                  </div>
                </div>
              ))}

              {isAiTyping && (
                <div className="flex gap-3 max-w-xl">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-blue-500 text-white flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[16px]">smart_toy</span>
                  </div>
                  <div className="p-3.5 bg-slate-800 text-slate-300 rounded-2xl rounded-tl-none border border-slate-700 flex items-center gap-1.5 text-xs">
                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce"></span>
                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce [animation-delay:0.4s]"></span>
                    <span className="ml-1 text-slate-400">Consultando expediente...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Píldoras de preguntas rápidas sugeridas */}
            <div className="px-4 py-2 bg-slate-950/60 border-t border-slate-800 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0 text-xs">
              <span className="text-slate-500 text-[11px] shrink-0">Preguntas frecuentes:</span>
              {[
                'Quiero solicitar una cita',
                '¿Cuándo me ingresan el Zorgtoeslag?',
                '¿Cómo subo la carta de DigiD?',
                '¿Cuándo resolverán mi M-Form?',
              ].map((query, i) => (
                <button
                  key={i}
                  onClick={() => handleSendChatMessage(query)}
                  className="px-3 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 text-[11px] whitespace-nowrap transition-colors"
                >
                  {query}
                </button>
              ))}
            </div>

            {/* Input del Chat */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 shrink-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendChatMessage();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Pregúntale a tu Asistente IA sobre tus subsidios, impuestos o pide una cita..."
                  className="flex-1 h-11 px-4 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-blue-500 transition-colors"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim()}
                  className="h-11 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-md"
                >
                  <span>Enviar</span>
                  <span className="material-symbols-outlined text-[16px]">send</span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: TOESLAGEN HUB (SUBSIDIOS MENSUALES) */}
        {/* ========================================================================= */}
        {activeTab === 'toeslagen' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Tarjeta 1: Zorgtoeslag */}
              <div className="bg-slate-900 p-6 rounded-2xl border border-blue-500/50 shadow-lg space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                    <span className="material-symbols-outlined text-2xl">medical_services</span>
                  </div>
                  <span className="px-2.5 py-1 bg-blue-500/20 text-blue-300 text-[10px] font-bold rounded-full border border-blue-400/30">
                    EN TRÁMITE OFICIAL
                  </span>
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Zorgtoeslag (Seguro Médico)</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Compensación mensual obligatoria del gobierno holandés para sufragar tu póliza de salud en Países Bajos.
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-mono-data">Abono mensual en tu cuenta:</span>
                  <div className="text-2xl font-extrabold font-mono-data text-blue-400 mt-0.5">€ 154,00 / mes</div>
                  <span className="text-[11px] text-emerald-400 font-semibold block mt-1">
                    ✓ Retroactivo desde el primer mes de empadronamiento
                  </span>
                </div>
              </div>

              {/* Tarjeta 2: Huurtoeslag */}
              <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-sm space-y-4 hover:border-slate-700 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <span className="material-symbols-outlined text-2xl">home</span>
                  </div>
                  <span
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-full border ${
                      huurtoeslagRequested
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {huurtoeslagRequested ? 'SOLICITUD ENVIADA' : 'DISPONIBLE PARA SOLICITAR'}
                  </span>
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Huurtoeslag (Alquiler de Vivienda)</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Ayuda mensual del gobierno para personas o familias que viven en régimen de alquiler independiente.
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-mono-data">Estimación mensual:</span>
                  <div className="text-2xl font-extrabold font-mono-data text-emerald-400 mt-0.5">Hasta € 450,00 / mes</div>
                  <button
                    type="button"
                    onClick={() => {
                      setHuurtoeslagRequested(true);
                      showToast('Solicitud de Huurtoeslag enviada al gestor Rony P. para su tramitación.');
                    }}
                    disabled={huurtoeslagRequested}
                    className="w-full h-9 mt-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold text-xs rounded-xl transition-colors shadow-2xs"
                  >
                    {huurtoeslagRequested ? '✓ Solicitado ante el Gestor' : 'Solicitar Este Subsidio Ahora'}
                  </button>
                </div>
              </div>

              {/* Tarjeta 3: Kindgebonden */}
              <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-sm space-y-4 hover:border-slate-700 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                    <span className="material-symbols-outlined text-2xl">child_care</span>
                  </div>
                  <span className="px-2.5 py-1 bg-slate-800 text-slate-400 text-[10px] font-bold rounded-full border border-slate-700">
                    CONSULTAR REQUISITOS
                  </span>
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Kindgebonden Budget (Hijos)</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Aporte económico mensual del gobierno neerlandés para familias con hijos a cargo menores de 18 años.
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-mono-data">Estimación mensual:</span>
                  <div className="text-2xl font-extrabold font-mono-data text-purple-400 mt-0.5">Hasta € 115,00 / hijo</div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('ia');
                      handleSendChatMessage('¿Cumplo los requisitos para el Kindgebonden Budget de hijos?');
                    }}
                    className="w-full h-9 mt-3 border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition-colors"
                  >
                    Comprobar con Asistente IA
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: FACTURAS Y PAGO POR WHATSAPP */}
        {/* ========================================================================= */}
        {activeTab === 'facturas' && (
          <div className="max-w-3xl mx-auto space-y-6">
            {latestInvoice ? (
            <div className="bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-800 gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono-data text-xs font-bold">
                      FACTURA {portalInvoiceRef}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400">
                      {latestInvoice.status === 'pagada' ? 'PAGADA' : String(latestInvoice.status || 'pendiente').toUpperCase()}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mt-1.5">{client.dossier_title}</h3>
                  <p className="text-xs text-slate-400">Cliente: {displayClientName} · BSN: {displayBsn}</p>
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-3xl font-extrabold font-mono-data text-white">€ {portalInvoiceTotal}</span>
                  <span className="block text-[11px] text-slate-400">Importe registrado por tu gestor en el CRM</span>
                </div>
              </div>

              <div className="space-y-5">
                <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                  <span className="material-symbols-outlined text-blue-400 text-lg shrink-0 mt-0.5">info</span>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    El pago se coordina directamente con tu gestor por WhatsApp. Al pulsar el
                    botón se abrirá una conversación con el mensaje ya escrito; tu gestor te
                    confirmará el importe, las coordenadas y el IBAN de la cuenta.
                    <span className="block mt-1 text-slate-400">
                      Desde esta web no se cobra nada ni se registran datos bancarios.
                    </span>
                  </p>
                </div>

                {latestInvoice.status !== 'pagada' && <button
                  type="button"
                  onClick={() => {
                    const mensaje = encodeURIComponent(
                      `Hola, quiero pagar la factura ${portalInvoiceRef} de mi gestoría (importe ${portalInvoiceTotal} EUR). ¿Me confirmas las coordenadas para hacer el pago?`
                    );
                    window.open(`https://wa.me/${WHATSAPP_PAGO}?text=${mensaje}`, '_blank', 'noopener,noreferrer');
                  }}
                  className="w-full h-12 bg-gradient-to-r from-secondary to-blue-700 hover:from-secondary/90 hover:to-blue-600 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">chat</span>
                  <span>Pagar por WhatsApp</span>
                </button>}

                <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                  Te abrimos WhatsApp con el mensaje ya escrito. Tu gestor te confirmará las
                  coordenadas de pago y el IBAN de la cuenta. No se cobra nada desde esta web.
                </p>
              </div>
            </div>
            ) : (
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
                <span className="material-symbols-outlined text-3xl text-slate-500">receipt_long</span>
                <h3 className="mt-3 text-sm font-bold text-white">No tienes facturas registradas</h3>
                <p className="mt-1 text-xs text-slate-400">Cuando tu gestor cree una factura en el CRM, aparecerá aquí.</p>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: BÓVEDA DE DOCUMENTOS & ARCHIVO SEGURO */}
        {/* ========================================================================= */}
        {activeTab === 'documentos' && (
          <div className="space-y-6">
            {/* Zona de subida */}
            <div className="bg-slate-900 p-8 rounded-3xl border-2 border-dashed border-slate-700 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mx-auto border border-blue-500/20">
                <span className="material-symbols-outlined text-3xl">document_scanner</span>
              </div>
              <div className="max-w-md mx-auto">
                <h3 className="font-bold text-base text-white">Sube la carta que recibiste en tu buzón</h3>
                <p className="text-xs text-slate-400 mt-1">
                  El archivo se guardará de forma segura y quedará disponible para tu gestor en el CRM.
                </p>
              </div>

              <input
                type="file"
                id="portalDocUploadInput"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleFileSelect}
                className="hidden"
              />

              {isScanningFile ? (
                <div className="p-4 bg-blue-500/10 text-blue-300 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 max-w-md mx-auto">
                  <span className="material-symbols-outlined animate-spin text-lg">sync</span>
                  <span>Guardando documento...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-3">
                  <label
                    htmlFor="portalDocUploadInput"
                    className="h-11 px-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-md inline-flex items-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">upload_file</span>
                    <span>{uploadedFile ? 'Subir otro documento' : 'Seleccionar archivo (PDF o foto)'}</span>
                  </label>
                  {uploadedFile && <p className="text-[11px] text-emerald-300">Último archivo guardado: {uploadedFile}</p>}
                </div>
              )}
            </div>

            {/* Listado de documentos en la bóveda */}
            <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-white">Documentos Disponibles en tu Expediente</h3>
                <span className="text-xs font-mono-data text-slate-400">{documentList.length} archivos</span>
              </div>

              <div className="space-y-2.5">
                {documentList.length === 0 && <p className="py-5 text-center text-xs text-slate-400">No hay documentos asociados a tu expediente.</p>}
                {documentList.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-3.5 bg-slate-800/60 rounded-xl border border-slate-700/60 flex items-center justify-between gap-4 hover:border-slate-600 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[20px]">description</span>
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-xs text-white truncate">{doc.name}</h4>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                          <span>{doc.category}</span>
                          <span>·</span>
                          <span>{doc.date}</span>
                          <span>·</span>
                          <span className="font-mono-data">{doc.size}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold text-[10px] hidden sm:inline">
                        {doc.status}
                      </span>
                      <button
                        type="button"
                        onClick={() => setPreviewDoc(doc)}
                        className="h-8 px-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold transition-colors flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[15px]">visibility</span>
                        <span className="hidden sm:inline">Ver</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* MODAL INTERACTIVO: SOLICITAR NUEVA CITA CON EL GESTOR */}
      {/* ========================================================================= */}
      {showBookingModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 sm:p-7 space-y-5 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">calendar_month</span>
                </div>
                <div>
                  <h4 className="font-bold text-base text-white">Solicitar Cita con Asesor</h4>
                  <p className="text-[11px] text-slate-400">Asignado: <strong>Rony P. (Gestor Oficial NL)</strong></p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Cerrar solicitud de cita"
                onClick={() => setShowBookingModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateClientAppointment} className="space-y-4 text-xs">
              {/* Motivo de la Cita */}
              <div>
                <label className="block text-slate-300 font-bold mb-1.5">
                  Motivo de la Consulta *
                </label>
                <select
                  value={bookingTopic}
                  onChange={(e) => setBookingTopic(e.target.value)}
                  className="w-full h-11 px-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500 font-medium"
                >
                  <option>Revisión y Firma de Declaración M-Form 2026</option>
                  <option>Consulta y Solicitud de Subsidios (Zorgtoeslag / Huurtoeslag)</option>
                  <option>Dudas sobre Carta Postal de la Belastingdienst</option>
                  <option>Activación de Código DigiD y Certificados</option>
                  <option>Asesoría para Autónomos ZZP y Facturación</option>
                  <option>Consulta General de Traslado y Residencia</option>
                </select>
              </div>

              {/* Modalidad */}
              <div>
                <label className="block text-slate-300 font-bold mb-1.5">
                  ¿Cómo prefieres realizar la sesión? *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'online_meet', label: 'Google Meet', icon: 'videocam' },
                    { id: 'llamada', label: 'Llamada', icon: 'call' },
                    { id: 'presencial', label: 'Presencial', icon: 'business' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setBookingModality(m.id as any)}
                      className={`p-2.5 rounded-xl border font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                        bookingModality === m.id
                          ? 'border-blue-500 bg-blue-500/20 text-blue-300 shadow-sm'
                          : 'border-slate-800 bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">{m.icon}</span>
                      <span className="text-[11px]">{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Fecha y Hora */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">Fecha Deseada *</label>
                  <input
                    required
                    type="date"
                    value={bookingDate}
                    min="2026-10-10"
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full h-11 px-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500 font-mono-data"
                  />
                  {/* Píldoras rápidas */}
                  <div className="flex gap-1.5 mt-1.5">
                    <button
                      type="button"
                      onClick={() => setBookingDate('2026-10-12')}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px]"
                    >
                      12 Oct
                    </button>
                    <button
                      type="button"
                      onClick={() => setBookingDate('2026-10-15')}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px]"
                    >
                      15 Oct
                    </button>
                    <button
                      type="button"
                      onClick={() => setBookingDate('2026-10-20')}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px]"
                    >
                      20 Oct
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">Hora Disponible *</label>
                  <select
                    value={bookingTime}
                    onChange={(e) => setBookingTime(e.target.value)}
                    className="w-full h-11 px-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500 font-mono-data"
                  >
                    <option>09:30</option>
                    <option>10:30</option>
                    <option>11:30</option>
                    <option>14:00</option>
                    <option>15:30</option>
                    <option>16:30</option>
                  </select>
                </div>
              </div>

              {/* Notas opcionales */}
              <div>
                <label className="block text-slate-300 font-bold mb-1.5">
                  Notas o comentarios para tu gestor (opcional):
                </label>
                <textarea
                  rows={2}
                  value={bookingNotes}
                  onChange={(e) => setBookingNotes(e.target.value)}
                  placeholder="Ej: Tengo una duda sobre la casilla 3.b del M-Form..."
                  className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500 resize-none text-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowBookingModal(false)}
                  className="h-11 px-4 border border-slate-700 hover:bg-slate-800 text-slate-300 font-bold rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingApt}
                  className="h-11 px-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">check</span>
                  <span>{isSubmittingApt ? 'Agendando...' : 'Confirmar Solicitud de Cita'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL VISUALIZADOR DE DOCUMENTOS */}
      {/* ========================================================================= */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-400 text-xl">description</span>
                <h4 className="font-bold text-sm text-white truncate max-w-xs">{previewDoc.name}</h4>
              </div>
              <button
                type="button"
                aria-label="Cerrar vista previa del documento"
                onClick={() => setPreviewDoc(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500">Categoría:</span>
                <span className="font-semibold text-white">{previewDoc.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Fecha de recepción:</span>
                <span className="font-mono-data">{previewDoc.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tamaño del archivo:</span>
                <span className="font-mono-data">{previewDoc.size}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Estado de validación:</span>
                <span className="text-emerald-400 font-bold">{previewDoc.status}</span>
              </div>
            </div>

            <p className="text-xs text-slate-400">
              Este documento está cifrado y custodiado bajo la normativa europea de protección de datos (AVG/GDPR).
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleDownloadDocument(previewDoc)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">download</span>
                <span>Descargar Archivo</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-2 border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold rounded-xl transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
