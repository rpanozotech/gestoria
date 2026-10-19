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

  return <div className="space-y-6 pb-10">
    <header className="border-b border-surface-container pb-5"><Link href="/crm/clientes" className="text-xs font-semibold text-secondary hover:underline">← Directorio de clientes</Link><h1 className="mt-2 text-2xl font-bold text-on-surface">Importar varios clientes</h1><p className="mt-1 text-sm text-on-surface-variant">CSV UTF-8 con una columna obligatoria: <code>full_name</code>. Opcionales: email, phone, bsn, address, city, postal_code, country, iban, notes.</p></header>
    <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm"><label htmlFor="client-csv" className="block text-sm font-bold text-on-surface">Archivo CSV</label><input id="client-csv" type="file" accept=".csv,text/csv" onChange={onFile} className="mt-3 block w-full rounded-md border border-outline-variant p-2 text-sm" />{fileName && <p className="mt-2 text-xs text-on-surface-variant">{fileName}</p>}<div className="mt-5 flex flex-wrap gap-2"><button type="button" onClick={importCsv} disabled={busy || !csv} className="rounded-md bg-secondary px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{busy ? 'Importando…' : 'Importar clientes'}</button><Link href="/crm/clientes" className="rounded-md border border-outline-variant px-4 py-2 text-xs font-semibold text-on-surface">Cancelar</Link></div>{status && <p role="status" className="mt-4 text-sm text-on-surface-variant">{status}</p>}</section>
  </div>;
}
