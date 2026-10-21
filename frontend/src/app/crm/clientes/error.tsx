'use client';

import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('CRM clientes error:', error);
  }, [error]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <section className="max-w-xl w-full rounded-2xl bg-white border border-red-200 shadow-sm p-6">
        <h1 className="text-lg font-bold text-red-800">Error al abrir la ficha del cliente</h1>
        <p className="mt-3 text-sm text-slate-700">La aplicación ha capturado el error para poder corregirlo.</p>
        <pre className="mt-4 overflow-auto rounded-lg bg-slate-950 p-4 text-xs text-red-200 whitespace-pre-wrap">{error?.message || 'Error desconocido'}</pre>
        {error?.digest && <p className="mt-2 text-xs text-slate-500">Referencia: {error.digest}</p>}
        <button type="button" onClick={() => reset()} className="mt-5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Reintentar</button>
      </section>
    </main>
  );
}
