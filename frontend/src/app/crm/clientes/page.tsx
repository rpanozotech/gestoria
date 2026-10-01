'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function CRMClientesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'todos' | 'activos' | 'con_digid' | 'pendientes'>('todos');

  const [clients, setClients] = useState<any[]>([
    {
      id: '1',
      full_name: 'Maria Popescu',
      email: 'maria.popescu@gmail.com',
      phone: '+31 6 81239845',
      bsn: '982145672',
      id_document_number: 'RO9284102',
      city: 'Eindhoven',
      address: 'Strijpsestraat 142',
      iban: 'NL91INGB0001234567',
      digid_status: 'pendiente_activar',
      status: 'activo',
      notes: 'Requiere activación de DigiD y solicitud retroactiva de Zorgtoeslag.',
      dossiers_count: 1,
      invoices_count: 1,
    },
    {
      id: '2',
      full_name: 'Carlos Mendoza Ruiz',
      email: 'carlos.mendoza@outlook.com',
      phone: '+34 654 321 987',
      bsn: '817293845',
      id_document_number: '48920184K',
      city: 'Amsterdam',
      address: 'Keizersgracht 321',
      iban: 'NL44ABNA0412345678',
      digid_status: 'activo',
      status: 'activo',
      notes: 'Llegada en 2025. Declaración Modelo M (M-Form). Deducción por traslado internacional.',
      dossiers_count: 1,
      invoices_count: 1,
    },
    {
      id: '3',
      full_name: 'Lars Van Dijk',
      email: 'lars.vandijk@techconsulting.nl',
      phone: '+31 6 49201948',
      bsn: '728194028',
      id_document_number: 'NL8273619',
      city: 'Rotterdam',
      address: 'Coolsingel 88',
      iban: 'NL02RABO0319284756',
      digid_status: 'activo',
      status: 'activo',
      notes: 'Alta como ZZP en KVK y declaración trimestral de BTW.',
      dossiers_count: 1,
      invoices_count: 0,
    },
    {
      id: '4',
      full_name: 'Elena Morales Castillo',
      email: 'elena.morales@hotmail.com',
      phone: '+34 611 223 344',
      bsn: '639102847',
      id_document_number: '51928374P',
      city: 'Utrecht',
      address: 'Oudegracht 120',
      iban: 'NL88BUNQ2019283746',
      digid_status: 'activo',
      status: 'activo',
      notes: 'Subsidio de alquiler Huurtoeslag y seguro de salud HollandZorg.',
      dossiers_count: 0,
      invoices_count: 0,
    },
  ]);

  // Cliente seleccionado para la Ficha 360°
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [active360Tab, setActive360Tab] = useState<'resumen' | 'personales' | 'facturacion' | 'citas' | 'ia'>('resumen');
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editedNotes, setEditedNotes] = useState('');

  // Modal para crear nuevo trámite rápido dentro de la ficha 360°
  const [showAddDossierModal, setShowAddDossierModal] = useState(false);
  const [newDossierTitle, setNewDossierTitle] = useState('');
  const [newDossierFee, setNewDossierFee] = useState<number>(90);

  useEffect(() => {
    fetch('http://localhost:5000/api/clients')
      .then((res) => res.json())
      .then((data) => {
        if (data.clients && data.clients.length > 0) {
          setClients(data.clients);
        }
      })
      .catch(() => {});
  }, []);

  const filteredClients = clients.filter((c) => {
    const matchesSearch =
      c.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.bsn?.includes(searchTerm) ||
      c.email?.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;
    if (filterStatus === 'activos') return c.status === 'activo';
    if (filterStatus === 'con_digid') return c.digid_status === 'activo';
    if (filterStatus === 'pendientes') return c.digid_status === 'pendiente_activar';
    return true;
  });

  const handleSaveNotes = () => {
    if (!selectedClient) return;
    const updated = { ...selectedClient, notes: editedNotes };
    setSelectedClient(updated);
    setClients(clients.map((c) => (c.id === updated.id ? updated : c)));
    setIsEditingNotes(false);
  };

  const handleAddDossierToClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDossierTitle.trim() || !selectedClient) return;

    const updated = {
      ...selectedClient,
      dossiers_count: (selectedClient.dossiers_count || 0) + 1,
    };
    setSelectedClient(updated);
    setClients(clients.map((c) => (c.id === updated.id ? updated : c)));
    setShowAddDossierModal(false);
    setNewDossierTitle('');
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-surface-container">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-on-surface">Directorio de Clientes</h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Base de datos de residentes, BSN, expediente fiscal y ficha completa 360°.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-outline text-[18px]">search</span>
            <input
              type="text"
              placeholder="Buscar por nombre o BSN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 pl-9 pr-4 text-xs border border-outline-variant rounded-md bg-surface-container-lowest focus:border-secondary focus:outline-none w-56"
            />
          </div>

          <Link
            href="/crm/alta-ia"
            className="h-9 px-4 bg-secondary text-white text-xs font-semibold rounded-md shadow-sm hover:bg-blue-700 transition-colors flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">person_add</span>
            <span>+ Nuevo Cliente</span>
          </Link>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex border-b border-surface-container gap-2 text-xs font-semibold">
        <button
          onClick={() => setFilterStatus('todos')}
          className={`pb-2.5 px-3 border-b-2 transition-all ${
            filterStatus === 'todos' ? 'border-secondary text-secondary' : 'border-transparent text-outline hover:text-on-surface'
          }`}
        >
          Todos ({clients.length})
        </button>
        <button
          onClick={() => setFilterStatus('con_digid')}
          className={`pb-2.5 px-3 border-b-2 transition-all ${
            filterStatus === 'con_digid' ? 'border-secondary text-secondary' : 'border-transparent text-outline hover:text-on-surface'
          }`}
        >
          DigiD Activo
        </button>
        <button
          onClick={() => setFilterStatus('pendientes')}
          className={`pb-2.5 px-3 border-b-2 transition-all ${
            filterStatus === 'pendientes' ? 'border-secondary text-secondary' : 'border-transparent text-outline hover:text-on-surface'
          }`}
        >
          Pendientes DigiD
        </button>
      </div>

      {/* Grid: Clients Directory Table */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-container-low text-outline font-semibold uppercase tracking-wider border-b border-surface-container">
              <tr>
                <th className="px-5 py-3">Cliente / Contacto</th>
                <th className="px-5 py-3">BSN</th>
                <th className="px-5 py-3">Ciudad / Dirección</th>
                <th className="px-5 py-3">Estado DigiD</th>
                <th className="px-5 py-3 text-center">Trámites</th>
                <th className="px-5 py-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-surface-container-low transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="font-bold text-on-surface text-sm">{client.full_name}</div>
                    <div className="text-[11px] text-outline mt-0.5">{client.email} · {client.phone}</div>
                  </td>
                  <td className="px-5 py-3.5 font-mono-data font-bold text-secondary">
                    {client.bsn || '—'}
                  </td>
                  <td className="px-5 py-3.5 text-on-surface-variant">
                    <div className="font-semibold text-on-surface">{client.city || 'Países Bajos'}</div>
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
                      {client.dossiers_count || 1}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => {
                        setSelectedClient(client);
                        setEditedNotes(client.notes || '');
                        setIsEditingNotes(false);
                        setActive360Tab('resumen');
                      }}
                      className="h-8 px-3 bg-surface-container text-on-surface text-xs font-semibold rounded hover:bg-secondary hover:text-white transition-colors inline-flex items-center gap-1.5 shadow-sm"
                    >
                      <span className="material-symbols-outlined text-[15px]">visibility</span>
                      <span>Ficha 360°</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* DRAWER / MODAL: FICHA 360° DEL CLIENTE */}
      {selectedClient && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-end">
          <div className="bg-surface-container-lowest w-full max-w-2xl h-full shadow-2xl flex flex-col border-l border-outline-variant animate-in slide-in-from-right duration-200">
            {/* Header Ficha 360 */}
            <div className="p-6 border-b border-surface-container flex items-start justify-between bg-surface-container-low">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary-container text-white font-mono-data font-bold text-lg flex items-center justify-center shadow-sm">
                  {selectedClient.full_name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold tracking-tight text-on-surface">{selectedClient.full_name}</h2>
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded">
                      CLIENTE ACTIVO
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-on-surface-variant mt-1">
                    <span className="font-mono-data font-bold text-secondary">BSN: {selectedClient.bsn}</span>
                    <span>·</span>
                    <span>{selectedClient.city}</span>
                    <span>·</span>
                    <span>{selectedClient.phone}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedClient(null)}
                className="w-8 h-8 rounded-md hover:bg-surface-container flex items-center justify-center text-outline"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Quick Actions Strip inside 360 view */}
            <div className="px-6 py-2.5 bg-surface border-b border-surface-container flex flex-wrap items-center gap-2">
              <button
                onClick={() => setShowAddDossierModal(true)}
                className="h-7 px-2.5 bg-secondary text-white rounded text-[11px] font-semibold flex items-center gap-1 hover:bg-blue-700 transition-colors shadow-sm"
              >
                <span className="material-symbols-outlined text-[14px]">add</span>
                <span>Nuevo Trámite</span>
              </button>
              <Link
                href="/crm/facturacion"
                className="h-7 px-2.5 bg-surface-container hover:bg-surface-container-high text-on-surface rounded text-[11px] font-semibold flex items-center gap-1 transition-colors"
              >
                <span className="material-symbols-outlined text-[14px]">receipt_long</span>
                <span>Emitir Factura</span>
              </Link>
              <Link
                href="/crm/agenda"
                className="h-7 px-2.5 bg-surface-container hover:bg-surface-container-high text-on-surface rounded text-[11px] font-semibold flex items-center gap-1 transition-colors"
              >
                <span className="material-symbols-outlined text-[14px]">event</span>
                <span>Agendar Cita</span>
              </Link>
              <Link
                href="/crm/documentos-ia"
                className="h-7 px-2.5 bg-surface-container hover:bg-surface-container-high text-on-surface rounded text-[11px] font-semibold flex items-center gap-1 transition-colors"
              >
                <span className="material-symbols-outlined text-[14px] text-secondary">auto_awesome</span>
                <span>Carta Belastingdienst</span>
              </Link>
            </div>

            {/* Sub-Tabs de Ficha 360° */}
            <div className="flex border-b border-surface-container px-6 gap-2 bg-surface text-xs font-semibold">
              <button
                onClick={() => setActive360Tab('resumen')}
                className={`py-3 px-3 border-b-2 transition-all ${
                  active360Tab === 'resumen' ? 'border-secondary text-secondary' : 'border-transparent text-outline hover:text-on-surface'
                }`}
              >
                Resumen & Trámites
              </button>
              <button
                onClick={() => setActive360Tab('personales')}
                className={`py-3 px-3 border-b-2 transition-all ${
                  active360Tab === 'personales' ? 'border-secondary text-secondary' : 'border-transparent text-outline hover:text-on-surface'
                }`}
              >
                Datos Personales
              </button>
              <button
                onClick={() => setActive360Tab('facturacion')}
                className={`py-3 px-3 border-b-2 transition-all ${
                  active360Tab === 'facturacion' ? 'border-secondary text-secondary' : 'border-transparent text-outline hover:text-on-surface'
                }`}
              >
                Facturas & Presupuestos
              </button>
              <button
                onClick={() => setActive360Tab('ia')}
                className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1 ${
                  active360Tab === 'ia' ? 'border-secondary text-secondary' : 'border-transparent text-outline hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                <span>Actividad IA</span>
              </button>
            </div>

            {/* Tab Contents */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
              {active360Tab === 'resumen' && (
                <div className="space-y-4">
                  {/* Notes Card with interactive Edit */}
                  <div className="p-4 bg-surface-container-low rounded-xl border border-surface-container">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold uppercase text-outline">Notas del Gestor:</span>
                      <button
                        onClick={() => setIsEditingNotes(!isEditingNotes)}
                        className="text-secondary font-semibold text-[11px] hover:underline flex items-center gap-0.5"
                      >
                        <span className="material-symbols-outlined text-[13px]">edit</span>
                        <span>{isEditingNotes ? 'Cancelar' : 'Editar Nota'}</span>
                      </button>
                    </div>

                    {isEditingNotes ? (
                      <div className="space-y-2 mt-2">
                        <textarea
                          rows={3}
                          value={editedNotes}
                          onChange={(e) => setEditedNotes(e.target.value)}
                          className="w-full p-2 border border-outline-variant rounded bg-surface text-xs focus:border-secondary focus:outline-none"
                        />
                        <button
                          onClick={handleSaveNotes}
                          className="h-7 px-3 bg-secondary text-white rounded text-xs font-semibold hover:bg-blue-700"
                        >
                          Guardar Nota
                        </button>
                      </div>
                    ) : (
                      <p className="mt-1 text-on-surface leading-relaxed">{selectedClient.notes || 'Sin notas registradas.'}</p>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold text-sm text-on-surface">Expedientes y Trámites Activos</h4>
                      <button
                        onClick={() => setShowAddDossierModal(true)}
                        className="text-xs font-semibold text-secondary hover:underline"
                      >
                        + Añadir Trámite
                      </button>
                    </div>

                    <div className="p-4 rounded-xl border border-outline-variant bg-surface space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-mono-data font-bold text-secondary text-xs">EXP-2026-0041</span>
                          <h5 className="font-bold text-sm mt-0.5">Activación DigiD + Solicitud Zorgtoeslag 2026</h5>
                        </div>
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded">
                          En Belastingdienst
                        </span>
                      </div>
                      <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                        <div className="bg-secondary h-full rounded-full w-[65%]"></div>
                      </div>
                      <div className="flex justify-between text-[11px] text-outline font-mono-data">
                        <span>Progreso: 65%</span>
                        <span>Plazo objetivo: 15 Oct 2026</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {active360Tab === 'personales' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-surface rounded border border-surface-container">
                    <span className="text-[10px] font-bold uppercase text-outline">BSN Oficial:</span>
                    <p className="font-mono-data font-bold text-sm text-on-surface mt-1">{selectedClient.bsn}</p>
                  </div>
                  <div className="p-3 bg-surface rounded border border-surface-container">
                    <span className="text-[10px] font-bold uppercase text-outline">Documento / Pasaporte:</span>
                    <p className="font-mono-data font-bold text-sm text-on-surface mt-1">{selectedClient.id_document_number || 'RO9284102'}</p>
                  </div>
                  <div className="p-3 bg-surface rounded border border-surface-container">
                    <span className="text-[10px] font-bold uppercase text-outline">Dirección en Países Bajos:</span>
                    <p className="font-semibold text-on-surface mt-1">{selectedClient.address || '—'}</p>
                  </div>
                  <div className="p-3 bg-surface rounded border border-surface-container">
                    <span className="text-[10px] font-bold uppercase text-outline">Cuenta Bancaria (IBAN):</span>
                    <p className="font-mono-data font-bold text-on-surface mt-1">{selectedClient.iban || 'NL91INGB0001234567'}</p>
                  </div>
                </div>
              )}

              {active360Tab === 'facturacion' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-emerald-800">Factura FAC-2026-0001</span>
                      <p className="font-semibold text-emerald-950 mt-0.5">Gestión M-Form Belastingdienst</p>
                    </div>
                    <div className="text-right">
                      <span className="font-mono-data font-bold text-base text-emerald-700">€ 266,20</span>
                      <span className="block text-[10px] font-semibold text-emerald-800">Pagada vía iDEAL</span>
                    </div>
                  </div>

                  <Link
                    href="/crm/facturacion"
                    className="block text-center p-3 rounded-lg border border-dashed border-secondary text-secondary font-semibold hover:bg-blue-50 transition-colors"
                  >
                    + Ir al Módulo de Facturación Completo
                  </Link>
                </div>
              )}

              {active360Tab === 'ia' && (
                <div className="space-y-3">
                  <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg flex items-start gap-3">
                    <span className="material-symbols-outlined text-indigo-600 text-lg">auto_awesome</span>
                    <div>
                      <h5 className="font-bold text-indigo-950">Extracción inicial completada</h5>
                      <p className="text-[11px] text-indigo-800 mt-0.5">Datos ingresados por lenguaje natural y validados con 96% de precisión.</p>
                      <span className="font-mono-data text-[10px] text-indigo-600 mt-1 block">Modelo: OpenAI gpt-4o-mini</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Ficha 360 */}
            <div className="p-4 border-t border-surface-container bg-surface flex items-center justify-between">
              <span className="text-[11px] text-outline">ID: {selectedClient.id}</span>
              <button
                onClick={() => setSelectedClient(null)}
                className="h-8 px-4 bg-primary text-white text-xs font-semibold rounded hover:bg-slate-800 transition-colors"
              >
                Cerrar Ficha
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL AÑADIR TRÁMITE RÁPIDO */}
      {showAddDossierModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleAddDossierToClient}
            className="bg-surface-container-lowest max-w-md w-full rounded-2xl border border-outline-variant shadow-2xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-surface-container">
              <h3 className="font-bold text-sm text-on-surface">Nuevo Trámite para {selectedClient?.full_name}</h3>
              <button type="button" onClick={() => setShowAddDossierModal(false)} className="text-outline">
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-outline uppercase font-semibold mb-1">Nombre del Trámite</label>
                <input
                  required
                  type="text"
                  placeholder="Ej. Solicitud Subsidio Huurtoeslag 2026"
                  value={newDossierTitle}
                  onChange={(e) => setNewDossierTitle(e.target.value)}
                  className="w-full h-9 px-3 border border-outline-variant rounded bg-surface focus:border-secondary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-outline uppercase font-semibold mb-1">Tarifa Gestoría (€)</label>
                <input
                  required
                  type="number"
                  value={newDossierFee}
                  onChange={(e) => setNewDossierFee(parseFloat(e.target.value) || 0)}
                  className="w-full h-9 px-3 border border-outline-variant rounded bg-surface font-mono-data font-semibold focus:border-secondary focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddDossierModal(false)}
                className="h-8 px-3 border border-outline-variant rounded text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="h-8 px-4 bg-secondary text-white rounded text-xs font-semibold hover:bg-blue-700"
              >
                Añadir al Expediente
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
