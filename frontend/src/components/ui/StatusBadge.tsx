import type { ReactNode } from 'react';

export type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export function StatusBadge({ tone = 'neutral', children }: { tone?: StatusTone; children: ReactNode }) {
  const tones: Record<StatusTone, string> = {
    neutral: 'bg-surface-muted text-text-muted',
    info: 'bg-blue-100 text-blue-900',
    success: 'bg-green-100 text-green-900',
    warning: 'bg-amber-100 text-amber-950',
    danger: 'bg-red-100 text-red-900',
  };
  return <span className={`inline-flex min-h-7 items-center rounded-full px-2.5 text-xs font-bold ${tones[tone]}`}>{children}</span>;
}
