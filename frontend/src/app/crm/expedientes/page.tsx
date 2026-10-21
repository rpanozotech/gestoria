'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';

type Dossier = {
  id: string;
  code?: string;
  title: string;
  category?: string;
  status?: string;
  priority?: string;
  deadline?: string;
  client_name?: string;
  progress?: number;
};

export default function ExpedientesPage() {
  const [items, setItems] = useState<Dossier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/dossiers')
      .then(async (r) => {
        if (!r.ok) throw new Error('No se pudieron cargar los expedientes');
        const data = await r.json();
        setItems(data.dossiers || []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Error al cargar expedientes'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="w-full h-full max-h-[calc(100vh-4.6rem)] overflow-hidden flex flex-col gap-2.5">
      <header className="flex flex-wrap items-center justify-between gap-2 shrink-0 pb-1.5 border-b border-surface-container">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-on-surface">Expedientes & Trámites Activos</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary/10 text-secondary">
              Gestión Legal
            </span>
          </div>
          <p className="text-[11px] text-on-surface-variant">
            Seguimiento de trámites, documentación y plazos oficiales de clientes.
          </p>
        </div>

        <Link
          href="/crm/clientes"
          className="h-8 rounded-lg bg-secondary px-3.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-[15px]">groups</span>
          <span>Ver Directorio Clientes</span>
        </Link>
      </header>

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-800 shrink-0">
          {error}
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-2 pr-1">
        {loading ? (
          <div className="p-8 text-center text-xs text-on-surface-variant">Cargando expedientes…</div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest p-10 text-center">
            <h2 className="text-sm font-bold text-on-surface">No hay expedientes registrados</h2>
            <p className="mt-1 text-xs text-outline">Crea un expediente directamente desde la ficha de cualquier cliente.</p>
            <Link
              href="/crm/clientes"
              className="mt-3 inline-flex rounded-md border border-outline-variant px-3 py-1.5 text-xs font-semibold text-secondary hover:bg-surface"
            >
              Abrir clientes
            </Link>
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <article
                key={item.id}
                className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-2xs hover:border-secondary/50 transition-all flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono-data font-bold text-secondary uppercase bg-blue-50 px-2 py-0.5 rounded">
                      {item.code || item.id}
                    </span>
                    <span className="rounded border border-outline-variant px-2 py-0.5 text-[10px] font-semibold text-on-surface-variant">
                      {item.status || 'Pendiente'}
                    </span>
                  </div>

                  <Link
                    href={`/crm/expedientes/${item.id}`}
                    className="mt-2 block font-bold text-sm text-on-surface hover:text-secondary line-clamp-1"
                  >
                    {item.title}
                  </Link>

                  <p className="mt-1 text-xs text-on-surface-variant flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px] text-outline">person</span>
                    <span>{item.client_name || 'Cliente no identificado'}</span>
                    {item.category && <span className="text-outline">· {item.category}</span>}
                  </p>
                </div>

                <div className="pt-2 border-t border-surface-container flex items-center justify-between text-[11px] text-on-surface-variant">
                  <span>
                    {item.deadline ? `Plazo: ${new Date(item.deadline).toLocaleDateString('es-NL')}` : 'Sin plazo fijado'}
                  </span>
                  <Link
                    href={`/crm/expedientes/${item.id}`}
                    className="text-secondary font-semibold hover:underline flex items-center gap-0.5"
                  >
                    <span>Ver</span>
                    <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
