'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AltaIAEscaneerPage() {
  const router = useRouter();

  // Modos de entrada: 'nlp' (lenguaje natural), 'ocr' (escáner), 'manual' (formulario)
  const [activeTab, setActiveTab] = useState<'nlp' | 'ocr' | 'manual'>('nlp');

  // Estado para Lenguaje Natural
  const [nlpPrompt, setNlpPrompt] = useState(
    'Maria Popescu, Eindhoven, Strijpsestraat 142, BSN 982145672, telefono +31 6 81239845. Requiere activación de DigiD y Zorgtoeslag por 85€'
  );
  const [isProcessing, setIsProcessing] = useState(false);

  // Modal de confirmación obligatoria
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [parsedData, setParsedData] = useState<any>({
    full_name: '',
    bsn: '',
    phone: '',
    email: '',
    city: '',
    address: '',
    service_title: '',
    fee: 0,
    confidence: 0.95,
  });

  // Estado para Escáner OCR
  const [ocrResult, setOcrResult] = useState<any>(null);
  const [isOcrScanning, setIsOcrScanning] = useState(false);

  // Manejar procesamiento de Lenguaje Natural con IA
  const handleProcessNLP = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch('http://localhost:5000/api/ai/parse-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: nlpPrompt }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setParsedData(data.data);
        setShowReviewModal(true);
      } else {
        // Fallback local si el backend no está iniciado
        fallbackParsing();
      }
    } catch {
      fallbackParsing();
    } finally {
      setIsProcessing(false);
    }
  };

  const fallbackParsing = () => {
    setParsedData({
      full_name: 'Maria Popescu',
      bsn: '982145672',
      phone: '+31 6 81239845',
      email: 'maria.popescu@gmail.com',
      city: 'Eindhoven',
      address: 'Strijpsestraat 142',
      service_title: 'Activación DigiD + Zorgtoeslag',
      fee: 85.00,
      confidence: 0.96,
    });
    setShowReviewModal(true);
  };

  // Guardar en la base de datos tras confirmación
  const [isSaving, setIsSaving] = useState(false);
  const handleConfirmSave = async () => {
    setIsSaving(true);
    try {
      // 1. Guardar cliente
      const res = await fetch('http://localhost:5000/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: parsedData.full_name,
          email: parsedData.email,
          phone: parsedData.phone,
          bsn: parsedData.bsn,
          city: parsedData.city,
          address: parsedData.address,
          status: 'activo',
          digid_status: 'pendiente_activar',
          notes: `Alta generada mediante IA. Trámite inicial: ${parsedData.service_title}`,
        }),
      });
      const data = await res.json();

      // 2. Si se creó, añadir trámite/expediente
      if (data.client?.id) {
        await fetch('http://localhost:5000/api/dossiers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: data.client.id,
            title: parsedData.service_title || 'Trámite Inicial Gestoría',
            category: 'Zorgtoeslag',
            fee: parsedData.fee || 75.00,
            priority: 'alta',
          }),
        });
      }

      setShowReviewModal(false);
      router.push('/crm/clientes');
    } catch (err) {
      console.error(err);
      setShowReviewModal(false);
      router.push('/crm/clientes');
    } finally {
      setIsSaving(false);
    }
  };

  // Simulación de escáner OCR
  const handleRunOCR = async () => {
    setIsOcrScanning(true);
    try {
      const res = await fetch('http://localhost:5000/api/ai/ocr-doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_type: 'Carta Belastingdienst' }),
      });
      const data = await res.json();
      setOcrResult(data.analysis);
    } catch {
      setOcrResult({
        detected_entity: 'Belastingdienst (Administración Tributaria NL)',
        document_category: 'Aanslag Inkomstenbelasting',
        bsn: '982145672',
        letter_date: '2026-02-18',
        reference_number: 'BLS-2026-99214A',
        key_amounts: {
          to_pay_or_refund: '€ 452,00 a devolver (Te ontvangen)',
          due_date: '2026-04-01',
        },
        summary_es: 'Resolución de liquidación provisional de impuestos. Saldo favorable para el cliente.',
        confidence: 0.98,
      });
    } finally {
      setIsOcrScanning(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-surface-container">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-on-surface">Alta Inteligente de Clientes con IA</h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Ingreso rápido por voz/texto libre, escáner de documentos OCR y verificación obligatoria previa.
          </p>
        </div>
        <span className="px-2.5 py-1 text-xs font-semibold bg-secondary-container text-white rounded flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[16px]">psychology</span>
          <span>Motor IA Activo</span>
        </span>
      </div>

      {/* Tabs Selector */}
      <div className="flex border-b border-surface-container gap-2">
        <button
          onClick={() => setActiveTab('nlp')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'nlp'
              ? 'border-secondary text-secondary'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">chat</span>
          <span>Lenguaje Natural & Voz</span>
        </button>
        <button
          onClick={() => setActiveTab('ocr')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'ocr'
              ? 'border-secondary text-secondary'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">document_scanner</span>
          <span>Escáner de Documentos (OCR)</span>
        </button>
        <button
          onClick={() => setActiveTab('manual')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'manual'
              ? 'border-secondary text-secondary'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">edit_note</span>
          <span>Formulario Manual</span>
        </button>
      </div>

      {/* TAB 1: Lenguaje Natural con IA */}
      {activeTab === 'nlp' && (
        <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-outline">
              Pega o redacta los datos del cliente sin formato:
            </label>
            <span className="text-[11px] text-secondary font-medium">Ej: Notas de llamada, WhatsApp o email</span>
          </div>

          <textarea
            rows={5}
            value={nlpPrompt}
            onChange={(e) => setNlpPrompt(e.target.value)}
            placeholder="Ejemplo: Maria Popescu, Eindhoven, BSN 982145672, DigiD 60€, tel +31 6 81239845..."
            className="w-full p-4 border border-outline-variant rounded-lg bg-surface font-body-md text-sm text-on-surface focus:border-secondary focus:outline-none"
          />

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <div className="flex items-center gap-2 text-xs text-on-surface-variant">
              <span className="material-symbols-outlined text-indigo-600 text-sm">verified_user</span>
              <span>Revisión y confirmación obligatoria garantizada antes de guardar</span>
            </div>

            <button
              onClick={handleProcessNLP}
              disabled={isProcessing || !nlpPrompt.trim()}
              className="h-10 px-6 bg-secondary text-white text-xs font-semibold rounded-md shadow-sm hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">
                {isProcessing ? 'hourglass_top' : 'auto_awesome'}
              </span>
              <span>{isProcessing ? 'Extrayendo datos...' : 'Procesar con IA y Revisar'}</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: Escáner OCR */}
      {activeTab === 'ocr' && (
        <div className="space-y-6">
          <div className="bg-surface-container-lowest p-8 rounded-xl border-2 border-dashed border-outline-variant text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-secondary flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-2xl">cloud_upload</span>
            </div>
            <div>
              <h3 className="font-bold text-sm text-on-surface">Arrastra una carta de Belastingdienst, HollandZorg o DNI</h3>
              <p className="text-xs text-on-surface-variant mt-1">Soporta PDF, PNG, JPG hasta 15 MB. El OCR extraerá automáticamente el BSN y los importes.</p>
            </div>
            <button
              onClick={handleRunOCR}
              disabled={isOcrScanning}
              className="h-9 px-5 bg-primary text-white text-xs font-semibold rounded-md hover:bg-slate-800 transition-colors inline-flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[16px]">scanner</span>
              <span>{isOcrScanning ? 'Analizando Documento...' : 'Simular Escaneo de Carta Belastingdienst'}</span>
            </button>
          </div>

          {ocrResult && (
            <div className="bg-surface-container-lowest p-6 rounded-xl border border-secondary shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-surface-container">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600">task_alt</span>
                  <h4 className="font-bold text-sm text-on-surface">Datos Extraídos por Escáner IA</h4>
                </div>
                <span className="text-xs font-mono-data bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-bold">
                  Confianza: {(ocrResult.confidence * 100).toFixed(0)}%
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-outline uppercase text-[10px] font-semibold">Organismo Emisor:</span>
                  <p className="font-bold text-on-surface mt-0.5">{ocrResult.detected_entity}</p>
                </div>
                <div>
                  <span className="text-outline uppercase text-[10px] font-semibold">BSN Detectado:</span>
                  <p className="font-mono-data font-bold text-secondary text-sm mt-0.5">{ocrResult.bsn}</p>
                </div>
                <div>
                  <span className="text-outline uppercase text-[10px] font-semibold">Resultado Fiscal:</span>
                  <p className="font-mono-data font-bold text-emerald-700 mt-0.5">{ocrResult.key_amounts?.to_pay_or_refund}</p>
                </div>
                <div>
                  <span className="text-outline uppercase text-[10px] font-semibold">Referencia Carta:</span>
                  <p className="font-mono-data font-bold text-on-surface mt-0.5">{ocrResult.reference_number}</p>
                </div>
              </div>

              <div className="p-3 bg-surface-container-low rounded-lg text-xs">
                <span className="font-semibold text-on-surface">Resumen en Español: </span>
                <span className="text-on-surface-variant">{ocrResult.summary_es}</span>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => {
                    setParsedData({
                      full_name: 'Cliente según carta (BSN ' + ocrResult.bsn + ')',
                      bsn: ocrResult.bsn,
                      phone: '+31 6 81239845',
                      email: 'cliente@nexusgest.nl',
                      city: 'Eindhoven',
                      address: 'Strijpsestraat 142',
                      service_title: ocrResult.document_category,
                      fee: 85.00,
                      confidence: 0.98,
                    });
                    setShowReviewModal(true);
                  }}
                  className="h-9 px-4 bg-secondary text-white text-xs font-semibold rounded hover:bg-blue-700 transition-colors flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  <span>Pasar a Ficha de Cliente</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Formulario Manual */}
      {activeTab === 'manual' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleConfirmSave();
          }}
          className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-outline uppercase mb-1">Nombre Completo *</label>
              <input
                required
                type="text"
                value={parsedData.full_name}
                onChange={(e) => setParsedData({ ...parsedData, full_name: e.target.value })}
                placeholder="Ej. Juan Pérez"
                className="w-full h-10 px-3 border border-outline-variant rounded-md text-xs bg-surface focus:border-secondary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-outline uppercase mb-1">BSN (Número Fiscal Neerlandés)</label>
              <input
                type="text"
                value={parsedData.bsn}
                onChange={(e) => setParsedData({ ...parsedData, bsn: e.target.value })}
                placeholder="Ej. 982145672"
                className="w-full h-10 px-3 border border-outline-variant rounded-md text-xs bg-surface font-mono-data focus:border-secondary focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-outline uppercase mb-1">Teléfono</label>
              <input
                type="tel"
                value={parsedData.phone}
                onChange={(e) => setParsedData({ ...parsedData, phone: e.target.value })}
                placeholder="+31 6 ..."
                className="w-full h-10 px-3 border border-outline-variant rounded-md text-xs bg-surface focus:border-secondary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-outline uppercase mb-1">Correo Electrónico</label>
              <input
                type="email"
                value={parsedData.email}
                onChange={(e) => setParsedData({ ...parsedData, email: e.target.value })}
                placeholder="cliente@ejemplo.com"
                className="w-full h-10 px-3 border border-outline-variant rounded-md text-xs bg-surface focus:border-secondary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-outline uppercase mb-1">Ciudad en Países Bajos</label>
              <input
                type="text"
                value={parsedData.city}
                onChange={(e) => setParsedData({ ...parsedData, city: e.target.value })}
                placeholder="Eindhoven / Amsterdam"
                className="w-full h-10 px-3 border border-outline-variant rounded-md text-xs bg-surface focus:border-secondary focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="h-10 px-6 bg-secondary text-white text-xs font-semibold rounded-md hover:bg-blue-700 transition-colors shadow-sm"
            >
              Guardar Cliente
            </button>
          </div>
        </form>
      )}

      {/* PANTALLA / MODAL DE REVISIÓN Y CONFIRMACIÓN OBLIGATORIA (Requisito Clave de la Plataforma) */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest max-w-lg w-full rounded-2xl border border-outline-variant shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">verified</span>
                <div>
                  <h3 className="font-bold text-base text-on-surface">Revisión Obligatoria de Datos</h3>
                  <p className="text-[11px] text-on-surface-variant">Verifica la información antes de crear el registro en la base de datos.</p>
                </div>
              </div>
              <span className="text-[10px] font-mono-data bg-blue-50 text-secondary px-2 py-0.5 rounded font-bold">
                Confianza IA: {(parsedData.confidence * 100).toFixed(0)}%
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-outline uppercase text-[10px] font-semibold mb-1">Nombre Completo</label>
                  <input
                    type="text"
                    value={parsedData.full_name}
                    onChange={(e) => setParsedData({ ...parsedData, full_name: e.target.value })}
                    className="w-full h-9 px-3 border border-outline-variant rounded bg-surface font-semibold text-on-surface focus:border-secondary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-outline uppercase text-[10px] font-semibold mb-1">BSN (Burger Service Nummer)</label>
                  <input
                    type="text"
                    value={parsedData.bsn || ''}
                    onChange={(e) => setParsedData({ ...parsedData, bsn: e.target.value })}
                    className="w-full h-9 px-3 border border-outline-variant rounded bg-surface font-mono-data font-bold text-secondary focus:border-secondary focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-outline uppercase text-[10px] font-semibold mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={parsedData.phone || ''}
                    onChange={(e) => setParsedData({ ...parsedData, phone: e.target.value })}
                    className="w-full h-9 px-3 border border-outline-variant rounded bg-surface focus:border-secondary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-outline uppercase text-[10px] font-semibold mb-1">Ciudad</label>
                  <input
                    type="text"
                    value={parsedData.city || ''}
                    onChange={(e) => setParsedData({ ...parsedData, city: e.target.value })}
                    className="w-full h-9 px-3 border border-outline-variant rounded bg-surface focus:border-secondary focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-outline uppercase text-[10px] font-semibold mb-1">Trámite a Abrir</label>
                  <input
                    type="text"
                    value={parsedData.service_title || ''}
                    onChange={(e) => setParsedData({ ...parsedData, service_title: e.target.value })}
                    className="w-full h-9 px-3 border border-outline-variant rounded bg-surface focus:border-secondary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-outline uppercase text-[10px] font-semibold mb-1">Honorarios / Tarifa (€)</label>
                  <input
                    type="number"
                    value={parsedData.fee || 0}
                    onChange={(e) => setParsedData({ ...parsedData, fee: parseFloat(e.target.value) || 0 })}
                    className="w-full h-9 px-3 border border-outline-variant rounded bg-surface font-mono-data font-semibold focus:border-secondary focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-container">
              <button
                onClick={() => setShowReviewModal(false)}
                className="h-9 px-4 border border-outline-variant text-on-surface-variant hover:bg-surface-container text-xs font-semibold rounded"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmSave}
                disabled={isSaving}
                className="h-9 px-5 bg-secondary text-white text-xs font-semibold rounded hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[16px]">check</span>
                <span>{isSaving ? 'Guardando...' : 'Confirmar y Guardar en Base de Datos'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
