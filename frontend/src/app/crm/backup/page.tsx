'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiFetch, apiUrl } from '@/lib/api';
import { getToken } from '@/lib/session';

interface BackupStats {
  counts: {
    clients: number;
    dossiers: number;
    quotes: number;
    invoices: number;
    appointments: number;
    documents: number;
  };
  lastBackupDate: string;
  databaseStatus: string;
  retentionDays: number;
}

export default function CRMBackupPage() {
  const [stats, setStats] = useState<BackupStats>({
    counts: {
      clients: 0,
      dossiers: 0,
      quotes: 0,
      invoices: 0,
      appointments: 0,
      documents: 0,
    },
    lastBackupDate: new Date().toISOString(),
    databaseStatus: 'online',
    retentionDays: 14,
  });

  const [loadingStats, setLoadingStats] = useState(true);
  const [isCreatingFullBackup, setIsCreatingFullBackup] = useState(false);
  const [isExportingJson, setIsExportingJson] = useState(false);
  const [exportingCsvType, setExportingCsvType] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetConfirmation, setResetConfirmation] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // Estados para restauración / importación
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any | null>(null);
  const [isInspectingBackup, setIsInspectingBackup] = useState(false);
  const [hasDownloadedCurrentBackup, setHasDownloadedCurrentBackup] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Cargar estadísticas reales del servidor
  useEffect(() => {
    apiFetch('/backup/stats')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.counts) {
          setStats(data);
        } else {
          if (process.env.NODE_ENV !== 'production') readLocalStats();
          else setToastMessage('No se pudieron cargar las estadísticas desde PostgreSQL.');
        }
      })
      .catch(() => {
        if (process.env.NODE_ENV !== 'production') readLocalStats();
        else setToastMessage('No se pudo conectar con PostgreSQL. No se mostrarán datos locales de respaldo.');
      })
      .finally(() => setLoadingStats(false));
  }, []);

  const readLocalStats = () => setStats({ counts: { clients: 0, dossiers: 0, quotes: 0, invoices: 0, appointments: 0, documents: 0 }, databaseStatus: 'offline', lastBackupDate: null, retentionDays: 14 });

  // Descarga helper en cliente
  const triggerDownload = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handleCreateFullBackup = async (): Promise<boolean> => {
    setIsCreatingFullBackup(true);
    try {
      const res = await apiFetch('/backup/full', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'No se pudo crear la copia completa.');
      }
      const counts = JSON.parse(res.headers.get('X-Backup-Counts') || '{}');
      const filename = res.headers.get('content-disposition')?.match(/filename="?([^";]+)"?/i)?.[1]
        || `nexusgest-backup-${new Date().toISOString().slice(0, 10)}.tar.gz`;
      triggerDownload(await res.blob(), filename);
      showToast(`Copia completa: ${counts.clients ?? 0} clientes, ${counts.invoices ?? 0} facturas, ${counts.appointments ?? 0} citas y ${counts.documents ?? 0} documentos.`);
      return true;
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'No se pudo crear la copia completa.');
      return false;
    } finally {
      setIsCreatingFullBackup(false);
    }
  };

  const handleSaveCurrentBackupBeforeRestore = async () => {
    const created = await handleCreateFullBackup();
    setHasDownloadedCurrentBackup(created);
  };

  // 1. Descargar Backup Completo en JSON
  const handleDownloadFullBackup = async () => {
    setIsExportingJson(true);
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `nexusgest-crm-backup-${dateStr}.json`;

    try {
      // Intentar endpoint del backend
      const res = await apiFetch('/backup/export-full');
      if (res.ok) {
        const blob = await res.blob();
        triggerDownload(blob, filename);
        showToast('¡Copia de seguridad completa descargada con éxito!');
        setIsExportingJson(false);
        return;
      }
    } catch (e) {
      console.warn('Backend export failed:', e);
    }

    showToast('No se pudo generar la copia desde PostgreSQL.');
    setIsExportingJson(false);
    return;
  };

  // 2. Descargar CSV específico para migración a otros CRM
  const handleDownloadCsv = async (type: 'clients' | 'invoices' | 'quotes' | 'appointments' | 'dossiers') => {
    setExportingCsvType(type);
    try {
      const response = await apiFetch(`/backup/export-csv/${type}`);
      if (!response.ok) throw new Error('No se pudo exportar los datos desde PostgreSQL.');
      const blob = await response.blob();
      triggerDownload(blob, response.headers.get('content-disposition')?.match(/filename="?([^";]+)"?/i)?.[1] || `nexusgest-${type}.csv`);
      showToast('Exportación generada desde PostgreSQL.');
    } catch (error) { showToast(error instanceof Error ? error.message : 'No se pudo exportar.'); }
    finally { setExportingCsvType(null); }
  };

  // 3. Inspeccionar la copia completa antes de ofrecer la restauración
  const handleFileSelectForRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const input = e.currentTarget;
    setImportFile(file);
    setImportPreview(null);
    setHasDownloadedCurrentBackup(false);
    if (!file.name.toLowerCase().endsWith('.tar.gz')) {
      showToast('Selecciona una copia completa de NexusGest (.tar.gz).');
      setImportFile(null);
      input.value = '';
      return;
    }

    setIsInspectingBackup(true);
    try {
      const form = new FormData();
      form.append('backup', file);
      const res = await apiFetch('/backup/full/inspect', { method: 'POST', body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'No se pudo leer la copia.');
      setImportPreview(data.metadata);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'No se pudo leer la copia.');
      setImportFile(null);
      input.value = '';
    } finally {
      setIsInspectingBackup(false);
    }
  };

  // 4. Restaurar copia de seguridad en el sistema
  const handleExecuteRestore = async () => {
    if (!importPreview || !importFile || !hasDownloadedCurrentBackup) return;

    const counts = importPreview.counts || {};
    const summary = `Clientes: ${counts.clients ?? 0}\nFacturas: ${counts.invoices ?? 0}\nCitas: ${counts.appointments ?? 0}\nExpedientes: ${counts.dossiers ?? 0}\nDocumentos: ${counts.documents ?? 0}`;
    if (!confirm(`Vas a reemplazar los datos actuales y el esquema por la copia del ${new Date(importPreview.createdAt).toLocaleString('es-ES')}.\n\n${summary}\n\nEsta acción no se puede deshacer. ¿Continuar?`)) {
      return;
    }

    setIsImporting(true);
    try {
      const form = new FormData();
      form.append('backup', importFile);
      form.append('confirmation', 'RESTAURAR COPIA COMPLETA');
      const res = await apiFetch('/backup/full/restore', { method: 'POST', body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'No se pudo restaurar la copia completa.');
      }

      localStorage.removeItem('nexusgest_clients');
      localStorage.removeItem('nexusgest_appointments');
      window.dispatchEvent(new CustomEvent('nexusgest_clients_updated'));
      window.dispatchEvent(new CustomEvent('nexusgest_appointments_updated'));
      showToast(`Restaurados ${data.restored?.clients ?? 0} clientes, ${data.restored?.invoices ?? 0} facturas y ${data.restored?.appointments ?? 0} citas.`);
      setImportPreview(null);
      setImportFile(null);
      setHasDownloadedCurrentBackup(false);
      const statsRes = await apiFetch('/backup/stats').catch(() => null);
      if (statsRes?.ok) setStats(await statsRes.json());
    } catch (err: any) {
      showToast(err?.message || 'Error durante la restauración de datos.');
    } finally {
      setIsImporting(false);
    }
  };

  // 5. Reset completo del CRM (acción destructiva protegida)
  const handleResetCrm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resetConfirmation !== 'RESETEAR CRM') return;

    setIsResetting(true);
    try {
      const res = await apiFetch('/backup/reset', {
        method: 'POST',
        body: JSON.stringify({ confirmation: resetConfirmation }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'No se pudo resetear el CRM.');
      }

      // El CRM también mantiene una caché local para el modo demo/offline.
      [
        'nexusgest_clients',
        'nexusgest_appointments',
        'nexusgest_ai_config',
        'nexusgest_custom_templates',
        'rp_portal_session_user',
      ].forEach((key) => localStorage.removeItem(key));
      window.dispatchEvent(new CustomEvent('nexusgest_clients_updated'));
      window.dispatchEvent(new CustomEvent('nexusgest_appointments_updated'));

      setShowResetModal(false);
      setResetConfirmation('');
      showToast('CRM reseteado. Ya puedes empezar con nuevos clientes.');
      const statsRes = await apiFetch('/backup/stats');
      if (statsRes.ok) setStats(await statsRes.json());
    } catch (err: any) {
      showToast(err?.message || 'No se pudo resetear el CRM.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="w-full h-full max-h-[calc(100vh-4.6rem)] overflow-hidden flex flex-col gap-2.5">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-[100] bg-emerald-700 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 animate-in slide-in-from-top duration-300">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-surface-container shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-on-surface">Copia de Seguridad & Portabilidad CRM</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono-data font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              PostgreSQL & Documentos
            </span>
          </div>
          <p className="text-[11px] text-on-surface-variant">
            Crea una copia manual completa de PostgreSQL y documentos, o exporta registros en JSON/CSV.
          </p>
        </div>

        {/* Botón Principal Destacado */}
        <button
          type="button"
          onClick={handleCreateFullBackup}
          disabled={isCreatingFullBackup}
          className="h-8 px-3.5 bg-secondary hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 shrink-0 disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-[16px]">
            {isCreatingFullBackup ? 'hourglass_top' : 'cloud_download'}
          </span>
          <span>{isCreatingFullBackup ? 'Creando copia...' : 'Descargar copia completa'}</span>
        </button>
      </div>

      {/* Conteos actuales consultados desde PostgreSQL */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2 shrink-0">
        <div className="p-2.5 bg-surface-container-lowest rounded-lg border border-outline-variant shadow-xs">
          <div className="flex items-center justify-between text-outline">
            <span className="text-[10px] font-semibold uppercase">Clientes</span>
            <span className="material-symbols-outlined text-[16px] text-secondary">group</span>
          </div>
          <div className="text-lg font-bold font-mono-data text-on-surface mt-1 leading-tight">
            {stats.counts.clients}
          </div>
          <p className="text-[9px] text-outline">Fichas 360°</p>
        </div>

        <div className="p-2.5 bg-surface-container-lowest rounded-lg border border-outline-variant shadow-xs">
          <div className="flex items-center justify-between text-outline">
            <span className="text-[10px] font-semibold uppercase">Facturas</span>
            <span className="material-symbols-outlined text-[16px] text-emerald-600">receipt_long</span>
          </div>
          <div className="text-lg font-bold font-mono-data text-on-surface mt-1 leading-tight">
            {stats.counts.invoices}
          </div>
          <p className="text-[9px] text-outline">FAC legales</p>
        </div>

        <div className="p-2.5 bg-surface-container-lowest rounded-lg border border-outline-variant shadow-xs">
          <div className="flex items-center justify-between text-outline">
            <span className="text-[10px] font-semibold uppercase">Presupuestos</span>
            <span className="material-symbols-outlined text-[16px] text-blue-600">request_quote</span>
          </div>
          <div className="text-lg font-bold font-mono-data text-on-surface mt-1 leading-tight">
            {stats.counts.quotes}
          </div>
          <p className="text-[9px] text-outline">PRE emitidos</p>
        </div>

        <div className="p-2.5 bg-surface-container-lowest rounded-lg border border-outline-variant shadow-xs">
          <div className="flex items-center justify-between text-outline">
            <span className="text-[10px] font-semibold uppercase">Expedientes</span>
            <span className="material-symbols-outlined text-[16px] text-amber-600">folder_shared</span>
          </div>
          <div className="text-lg font-bold font-mono-data text-on-surface mt-1 leading-tight">
            {stats.counts.dossiers}
          </div>
          <p className="text-[9px] text-outline">Trámites</p>
        </div>

        <div className="p-2.5 bg-surface-container-lowest rounded-lg border border-outline-variant shadow-xs">
          <div className="flex items-center justify-between text-outline">
            <span className="text-[10px] font-semibold uppercase">Citas Agenda</span>
            <span className="material-symbols-outlined text-[16px] text-indigo-600">calendar_month</span>
          </div>
          <div className="text-lg font-bold font-mono-data text-on-surface mt-1 leading-tight">
            {stats.counts.appointments}
          </div>
          <p className="text-[9px] text-outline">Llamadas / Meet</p>
        </div>

        <div className="p-2.5 bg-surface-container-lowest rounded-lg border border-outline-variant shadow-xs">
          <div className="flex items-center justify-between text-outline">
            <span className="text-[10px] font-semibold uppercase">Documentos</span>
            <span className="material-symbols-outlined text-[16px] text-purple-600">description</span>
          </div>
          <div className="text-lg font-bold font-mono-data text-on-surface mt-1 leading-tight">
            {stats.counts.documents}
          </div>
          <p className="text-[9px] text-outline">PDFs / Cartas</p>
        </div>
      </div>

      {/* ÁREA DE SECCIONES SCROLLEABLE INTERNAMENTE */}
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-3 pr-1">
      {/* SECCIÓN 1: EXPORTACIÓN MODULAR A CSV (PARA IMPORTAR A OTROS CRM) */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-surface-container">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-secondary flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">table_chart</span>
            </div>
            <div>
              <h2 className="text-sm font-bold text-on-surface">Exportación Universal en Tablas CSV</h2>
              <p className="text-[11px] text-on-surface-variant">
                Formato UTF-8 con delimitador estándar para importar en 1 clic en cualquier CRM, Excel o Google Sheets.
              </p>
            </div>
          </div>
          <span className="text-[11px] font-mono-data text-outline">Compatibilidad: HubSpot · Salesforce · Zoho · Holded · Excel</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Card Clientes */}
          <div className="p-4 rounded-xl border border-surface-container bg-surface hover:border-secondary transition-colors flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-secondary">group</span>
                  <span>Clientes & Contactos</span>
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono-data bg-surface-container font-semibold">
                  {stats.counts.clients} filas
                </span>
              </div>
              <p className="text-[11px] text-outline mt-1.5 leading-relaxed">
                Incluye nombre, BSN, email, teléfono, dirección, ciudad, IBAN bancario, estado DigiD y notas.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleDownloadCsv('clients')}
              disabled={exportingCsvType === 'clients'}
              className="h-8 px-3 bg-surface-container hover:bg-surface-container-high border border-outline-variant rounded-lg text-xs font-semibold text-on-surface flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[15px]">download</span>
              <span>{exportingCsvType === 'clients' ? 'Exportando...' : 'Descargar Clientes (.CSV)'}</span>
            </button>
          </div>

          {/* Card Facturas */}
          <div className="p-4 rounded-xl border border-surface-container bg-surface hover:border-secondary transition-colors flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-emerald-600">receipt_long</span>
                  <span>Facturación Oficial</span>
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono-data bg-surface-container font-semibold">
                  {stats.counts.invoices} facturas
                </span>
              </div>
              <p className="text-[11px] text-outline mt-1.5 leading-relaxed">
                Código FAC-2026, total final IVA incluido, cliente, BSN, estado y fechas.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleDownloadCsv('invoices')}
              disabled={exportingCsvType === 'invoices'}
              className="h-8 px-3 bg-surface-container hover:bg-surface-container-high border border-outline-variant rounded-lg text-xs font-semibold text-on-surface flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[15px]">download</span>
              <span>{exportingCsvType === 'invoices' ? 'Exportando...' : 'Descargar Facturas (.CSV)'}</span>
            </button>
          </div>

          {/* Card Presupuestos */}
          <div className="p-4 rounded-xl border border-surface-container bg-surface hover:border-secondary transition-colors flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-blue-600">request_quote</span>
                  <span>Presupuestos</span>
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono-data bg-surface-container font-semibold">
                  {stats.counts.quotes} presupuestos
                </span>
              </div>
              <p className="text-[11px] text-outline mt-1.5 leading-relaxed">
                Código PRE-2026, cliente, importe cotizado, fecha de validez, desglose y estado de aceptación.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleDownloadCsv('quotes')}
              disabled={exportingCsvType === 'quotes'}
              className="h-8 px-3 bg-surface-container hover:bg-surface-container-high border border-outline-variant rounded-lg text-xs font-semibold text-on-surface flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[15px]">download</span>
              <span>{exportingCsvType === 'quotes' ? 'Exportando...' : 'Descargar Presupuestos (.CSV)'}</span>
            </button>
          </div>

          {/* Card Agenda & Citas */}
          <div className="p-4 rounded-xl border border-surface-container bg-surface hover:border-secondary transition-colors flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-indigo-600">calendar_month</span>
                  <span>Agenda & Citas</span>
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono-data bg-surface-container font-semibold">
                  {stats.counts.appointments} citas
                </span>
              </div>
              <p className="text-[11px] text-outline mt-1.5 leading-relaxed">
                Citas con clientes, fecha, hora, modalidad (Google Meet, llamada o presencial), teléfono y notas.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleDownloadCsv('appointments')}
              disabled={exportingCsvType === 'appointments'}
              className="h-8 px-3 bg-surface-container hover:bg-surface-container-high border border-outline-variant rounded-lg text-xs font-semibold text-on-surface flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[15px]">download</span>
              <span>{exportingCsvType === 'appointments' ? 'Exportando...' : 'Descargar Agenda (.CSV)'}</span>
            </button>
          </div>

          {/* Card Expedientes */}
          <div className="p-4 rounded-xl border border-surface-container bg-surface hover:border-secondary transition-colors flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-amber-600">folder_shared</span>
                  <span>Expedientes & Trámites</span>
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono-data bg-surface-container font-semibold">
                  {stats.counts.dossiers} expedientes
                </span>
              </div>
              <p className="text-[11px] text-outline mt-1.5 leading-relaxed">
                Trámites abiertos (M-Form, DigiD, Zorgtoeslag, KVK), avance porcentual, tarifa y plazos.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleDownloadCsv('dossiers')}
              disabled={exportingCsvType === 'dossiers'}
              className="h-8 px-3 bg-surface-container hover:bg-surface-container-high border border-outline-variant rounded-lg text-xs font-semibold text-on-surface flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[15px]">download</span>
              <span>{exportingCsvType === 'dossiers' ? 'Exportando...' : 'Descargar Trámites (.CSV)'}</span>
            </button>
          </div>

          {/* Card Copia Completa Integral */}
          <div className="p-4 rounded-xl border border-secondary/30 bg-blue-50/40 dark:bg-blue-950/20 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-secondary flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">all_inclusive</span>
                  <span>Exportación de registros JSON</span>
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-secondary text-white">
                  Exportación JSON
                </span>
              </div>
              <p className="text-[11px] text-on-surface-variant mt-1.5 leading-relaxed">
                Para migrar registros. No incluye los adjuntos y no sustituye la copia completa .tar.gz.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadFullBackup}
              disabled={isExportingJson}
              className="h-8 px-3 bg-secondary hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[15px]">download</span>
              <span>{isExportingJson ? 'Descargando...' : 'Descargar Todo (JSON)'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* SECCIÓN 2: IMPORTAR / RESTAURAR COPIA DE SEGURIDAD */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-sm p-6 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 pb-3 border-b border-surface-container mb-4">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-lg">restore</span>
              </div>
              <div>
                <h2 className="text-sm font-bold text-on-surface">Restaurar copia completa</h2>
                <p className="text-[11px] text-on-surface-variant">
                  Sube un .tar.gz creado desde este CRM. Verás sus conteos antes de reemplazar los datos actuales.
                </p>
              </div>
            </div>

            <div className="p-4 border-2 border-dashed border-outline-variant rounded-xl bg-surface text-center space-y-3">
              <span className="material-symbols-outlined text-3xl text-outline">upload_file</span>
              <div>
                <p className="text-xs font-semibold text-on-surface">Selecciona una copia completa</p>
                <p className="text-[11px] text-outline mt-0.5">Archivo .tar.gz descargado desde NexusGest</p>
              </div>

              <input
                type="file"
                accept=".tar.gz"
                onChange={handleFileSelectForRestore}
                className="hidden"
                id="restore-upload-input"
              />
              <label
                htmlFor="restore-upload-input"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-lg text-xs font-semibold cursor-pointer transition-colors border border-outline-variant"
              >
                <span className="material-symbols-outlined text-[16px]">folder_open</span>
                <span>Explorar copia .tar.gz</span>
              </label>
            </div>

            {isInspectingBackup && (
              <p className="mt-4 text-center text-xs text-outline">Validando copia y leyendo conteos...</p>
            )}

            {/* Conteos leídos desde los metadatos de la copia validada */}
            {importPreview && (
              <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between text-emerald-900 font-bold">
                  <span>Copia verificada: {importFile?.name}</span>
                  <span className="text-[10px] bg-emerald-200 px-2 py-0.5 rounded font-mono-data">Completa</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-emerald-800">
                  <div>Clientes: <strong>{importPreview.counts?.clients ?? 0}</strong></div>
                  <div>Facturas: <strong>{importPreview.counts?.invoices ?? 0}</strong></div>
                  <div>Citas: <strong>{importPreview.counts?.appointments ?? 0}</strong></div>
                  <div>Expedientes: <strong>{importPreview.counts?.dossiers ?? 0}</strong></div>
                  <div>Presupuestos: <strong>{importPreview.counts?.quotes ?? 0}</strong></div>
                  <div>Documentos: <strong>{importPreview.counts?.documents ?? 0}</strong></div>
                  <div>Usuarios: <strong>{importPreview.counts?.users ?? 0}</strong></div>
                  <div>Fecha: <strong>{importPreview.createdAt ? new Date(importPreview.createdAt).toLocaleString('es-ES') : '—'}</strong></div>
                </div>
                {hasDownloadedCurrentBackup ? (
                  <p className="pt-2 text-[11px] font-semibold text-emerald-800">Copia del estado actual descargada. Ya puedes restaurar este archivo.</p>
                ) : (
                  <button
                    type="button"
                    onClick={handleSaveCurrentBackupBeforeRestore}
                    disabled={isCreatingFullBackup || isInspectingBackup}
                    className="mt-2 h-9 w-full rounded-lg border border-emerald-300 bg-white px-3 text-xs font-bold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
                  >
                    {isCreatingFullBackup ? 'Descargando copia actual...' : '1. Descargar copia del estado actual'}
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-surface-container flex justify-end">
            <button
              type="button"
              onClick={handleExecuteRestore}
              disabled={!importPreview || !hasDownloadedCurrentBackup || isImporting || isInspectingBackup}
              className="h-9 px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]">settings_backup_restore</span>
              <span>{isImporting ? 'Restaurando...' : '2. Restaurar esta copia completa'}</span>
            </button>
          </div>
        </div>

        {/* SECCIÓN 3: INFORMACIÓN DE COPIAS MANUALES */}
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-sm p-6 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 pb-3 border-b border-surface-container mb-4">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-lg">dns</span>
              </div>
              <div>
                <h2 className="text-sm font-bold text-on-surface">Qué contiene la copia completa</h2>
                <p className="text-[11px] text-on-surface-variant">
                  Se genera únicamente cuando pulsas “Crear y descargar copia completa”.
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-surface rounded-xl border border-surface-container space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-on-surface">Base de datos:</span>
                  <span className="font-mono-data text-secondary font-bold text-[11px]">Dump PostgreSQL completo</span>
                </div>
                <p className="text-[11px] text-outline">
                  Incluye las tablas, datos y estructura existentes al crear la copia.
                </p>
              </div>

              <div className="p-3 bg-surface rounded-xl border border-surface-container space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-on-surface">Archivos:</span>
                  <span className="font-mono-data text-secondary font-bold text-[11px]">Documentos subidos</span>
                </div>
                <p className="text-[11px] text-outline">
                  El .tar.gz se descarga en tu equipo. Guarda una copia en otro lugar seguro.
                </p>
                <p className="text-[11px] text-outline">
                  Contiene datos personales y financieros; protégelo como información confidencial.
                </p>
              </div>

              <div className="p-3 bg-surface rounded-xl border border-surface-container space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-on-surface">Restauración:</span>
                  <span className="font-mono-data font-bold text-[11px]">Con vista previa</span>
                </div>
                <p className="text-[11px] text-outline">
                  El CRM muestra los conteos del archivo antes de reemplazar los datos actuales.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-surface-container flex items-center justify-between text-xs">
            <span className="text-outline">Estado general:</span>
            <span className="font-bold text-amber-700 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              Copia manual bajo demanda; no automática
            </span>
          </div>
        </div>
      </div>

      {/* SECCIÓN 4: RESET CONTROLADO DEL CRM */}
      <section className="rounded-2xl border border-red-200 bg-red-50/60 p-5 shadow-sm dark:border-red-900/50 dark:bg-red-950/20">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300">
              <span className="material-symbols-outlined">delete_forever</span>
            </div>
            <div>
              <h2 className="text-sm font-bold text-red-900 dark:text-red-200">Reiniciar CRM desde cero</h2>
              <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-red-800/80 dark:text-red-200/80">
                Elimina clientes, citas, expedientes, documentos, presupuestos, facturas y registros de IA. Mantiene las cuentas del gestor para que puedas volver a entrar.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowResetModal(true)}
            className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-red-300 bg-white px-4 text-xs font-bold text-red-700 transition-colors hover:bg-red-100 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300 dark:hover:bg-red-900/50"
          >
            <span className="material-symbols-outlined text-[16px]">restart_alt</span>
            Reiniciar CRM
          </button>
        </div>
      </section>
      </div>

      {showResetModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" aria-labelledby="reset-crm-title" className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-6 shadow-2xl dark:border-red-900 dark:bg-slate-900">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300">
                <span className="material-symbols-outlined">warning</span>
              </div>
              <div>
                <h2 id="reset-crm-title" className="text-base font-bold text-slate-900 dark:text-white">¿Reiniciar todo el CRM?</h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  Esta acción no se puede deshacer. Se borrarán todos los datos operativos y documentos registrados.
                </p>
              </div>
            </div>
            <form onSubmit={handleResetCrm} className="mt-5 space-y-4">
              <label htmlFor="reset-confirmation" className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                Escribe <span className="font-mono font-bold text-red-700 dark:text-red-300">RESETEAR CRM</span> para confirmar
              </label>
              <input
                id="reset-confirmation"
                value={resetConfirmation}
                onChange={(e) => setResetConfirmation(e.target.value)}
                autoFocus
                autoComplete="off"
                spellCheck={false}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none ring-red-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                placeholder="RESETEAR CRM"
              />
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => { setShowResetModal(false); setResetConfirmation(''); }}
                  disabled={isResetting}
                  className="h-9 rounded-lg border border-slate-300 px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={resetConfirmation !== 'RESETEAR CRM' || isResetting}
                  className="h-9 rounded-lg bg-red-600 px-4 text-xs font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isResetting ? 'Reseteando...' : 'Borrar y reiniciar CRM'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
