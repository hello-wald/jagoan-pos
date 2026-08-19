'use client';

import type { ReactNode } from 'react';
import { Banner } from './banner';
import { Button } from './button';
import { EmptyState } from './empty-state';
import { Skeleton } from './skeleton';

export type ColumnDef<T> = {
  header: ReactNode;
  accessor: (row: T) => ReactNode;
  className?: string;
  headerClassName?: string;
};

export type DataTableProps<T> = {
  columns: ColumnDef<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  skeletonRows?: number;
};

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  isLoading,
  isError,
  onRetry,
  emptyTitle = 'Tidak ada data',
  emptyDescription = 'Belum ada data yang tersedia.',
  emptyAction,
  skeletonRows = 6,
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div
        data-testid="data-table-loading"
        className="divide-y divide-line rounded-panel border border-line bg-surface overflow-hidden"
      >
        <div className="flex h-11 items-center gap-4 bg-paper/60 px-4">
          {columns.map((_, i) => (
            <Skeleton key={i} className="h-3.5 flex-1" />
          ))}
        </div>
        {Array.from({ length: skeletonRows }, (_, rowIndex) => (
          <div key={rowIndex} className="flex h-13 items-center gap-4 px-4">
            {columns.map((_, colIndex) => (
              <Skeleton key={colIndex} className="h-3.5 flex-1" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-start gap-3 p-4 rounded-panel border border-line bg-surface">
        <Banner tone="danger">Gagal memuat data.</Banner>
        {onRetry ? (
          <Button variant="secondary" size="sm" onClick={onRetry}>
            Coba lagi
          </Button>
        ) : null}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-panel border border-line bg-surface p-8 text-center">
        <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-panel border border-line bg-surface shadow-xs">
      <table className="w-full text-left text-sm text-ink">
        <thead className="border-b border-line bg-paper/60 text-xs font-medium text-ink-2">
          <tr>
            {columns.map((col, i) => (
              <th
                key={i}
                scope="col"
                className={`px-4 py-3 font-medium ${col.headerClassName ?? ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {data.map((row) => (
            <tr key={keyExtractor(row)} className="transition-colors hover:bg-paper/40">
              {columns.map((col, i) => (
                <td key={i} className={`px-4 py-3.5 align-middle ${col.className ?? ''}`}>
                  {col.accessor(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
