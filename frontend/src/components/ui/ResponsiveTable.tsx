import type { ReactNode } from 'react';

export interface ResponsiveColumn<T> {
  key: string;
  label: string;
  render: (row: T) => ReactNode;
  mobileLabel?: string;
}

export function ResponsiveTable<T>({
  rows,
  columns,
  getRowKey,
  empty,
}: {
  rows: T[];
  columns: ResponsiveColumn<T>[];
  getRowKey: (row: T, index: number) => string;
  empty?: ReactNode;
}) {
  if (rows.length === 0) return <div className="rounded-lg border border-dashed border-border p-6 text-center text-text-muted">{empty ?? 'No hay datos para mostrar.'}</div>;
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
        <thead className="bg-surface-muted text-xs uppercase tracking-wide text-text-muted">
          <tr>{columns.map((column) => <th key={column.key} scope="col" className="px-4 py-3 font-bold">{column.label}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row, index) => <tr key={getRowKey(row, index)} className="align-top hover:bg-surface-muted/60">{columns.map((column) => <td key={column.key} data-label={column.mobileLabel ?? column.label} className="px-4 py-3">{column.render(row)}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  );
}
