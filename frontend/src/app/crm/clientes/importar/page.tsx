'use client';

import { ChangeEvent, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';

export default function ImportarClientes() {
  const [fileName, setFileName] = useState('');
  const [csv, setCsv] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setCsv(await file.text());
    setStatus('Archivo cargado. Revisa y confirma la importación.');
  };

  const importCsv = async () => {
    if (!csv.trim()) return setStatus('Selecciona un archivo CSV.');
    setBusy(true); setStatus('Importando…');
    try {
      const response = await apiFetch('/clients/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ csv }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'No se pudo importar el CSV');
      setStatus(`Importación completada: ${data.created?.length || 0} creados, ${data.skipped?.length || 0} omitidos.`);
      setCsv('');
    } catch (error) { setStatus(error instanceof Error ? error.message : 'No se pudo importar el CSV'); }
    finally { setBusy(false); }
  };

  return (
    <div className="w-full h-full max-h-[calc(100vh-4.6rem)] overflow-hidden flex flex-col gap-3">
      <header className="border-b border-surface-container pb-2 shrink-0">
        <Link href="/crm/clientes" className="text-xs font-semibold text-secondary hover:underline flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">arrow_back</span>
          <span>Directorio de clientes</span>
        </Link>
        <h1 className="mt-1 text-xl font-bold text-on-surface">Importar Clientes desde CSV</h1>
        <p className="text-[11px] text-on-surface-variant">CSV UTF-8 con columna obligatoria: <code className="bg-surface-container px-1 rounded">full_name</code>. Opcionales: email, phone, bsn, address, city, iban.</p>
      </header>

      <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm space-y-4 shrink-0">
        <label htmlFor="client-csv" className="block text-xs font-bold text-on-surface">Seleccionar archivo CSV</label>
        <input id="client-csv" type="file" accept=".csv,text/csv" onChange={onFile} className="block w-full rounded-md border border-outline-variant p-2 text-xs bg-surface" />
        {fileName && <p className="text-xs font-mono-data text-secondary">{fileName}</p>}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-surface-container">
          <button type="button" onClick={importCsv} disabled={busy || !csv} className="rounded-md bg-secondary px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {busy ? 'Importando…' : 'Importar clientes'}
          </button>
          <Link href="/crm/clientes" className="rounded-md border border-outline-variant px-4 py-2 text-xs font-semibold text-on-surface hover:bg-surface transition-colors">
            Cancelar
          </Link>
        </div>
        {status && <p role="status" className="text-xs font-medium text-on-surface-variant bg-surface-container-low p-2 rounded">{status}</p>}
      </section>
    </div>
  );
}
