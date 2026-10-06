'use client';

import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { IconButton } from './IconButton';

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="shared-modal-title" className="max-h-[min(90vh,48rem)] w-full max-w-2xl overflow-y-auto rounded-xl bg-surface p-5 shadow-2xl sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id="shared-modal-title" className="font-heading text-xl font-bold text-text">{title}</h2>
          <IconButton ref={closeRef} label="Cerrar" onClick={onClose}><span aria-hidden="true">×</span></IconButton>
        </div>
        {children}
      </section>
    </div>
  );
}
