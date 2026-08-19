'use client';

import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import { Button } from './button';
import { SelectMenu } from './select-menu';

export type PaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
};

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
  onPageSizeChange,
  pageSizeOptions = [5,10, 20, 50],
}: PaginationProps) {
  const safeTotalPages = Math.max(1, totalPages);
  const isFirstPage = currentPage <= 1;
  const isLastPage = currentPage >= safeTotalPages;

  return (
    <nav
      aria-label="Navigasi halaman"
      className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-line pt-4"
    >
      <div className="flex flex-wrap items-center gap-3 text-xs text-ink-2">
        <div className="flex items-center gap-1.5 rounded-control border border-line bg-paper/60 px-2.5 py-1">
          <span>Halaman</span>
          <span className="font-bold text-ink">{currentPage}</span>
          <span>dari</span>
          <span className="font-bold text-ink">{safeTotalPages}</span>
          {typeof totalItems === 'number' ? (
            <span className="text-ink-2 border-l border-line pl-1.5 ml-0.5">
              ({totalItems} total data)
            </span>
          ) : null}
        </div>

        {pageSize && onPageSizeChange ? (
          <div className="flex items-center gap-2">
            <span className="text-ink-2 font-medium">Tampilkan:</span>
            <SelectMenu
              size="sm"
              value={pageSize}
              onChange={onPageSizeChange}
              ariaLabel="Jumlah item per halaman"
              options={pageSizeOptions.map((opt) => ({
                value: opt,
                label: `${opt} / hal`,
              }))}
            />
          </div>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={isFirstPage}
          aria-label="Halaman sebelumnya"
          className="gap-1.5 shadow-2xs"
        >
          <CaretLeft size={14} weight="bold" />
          <span>Sebelumnya</span>
        </Button>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={isLastPage}
          aria-label="Halaman berikutnya"
          className="gap-1.5 shadow-2xs"
        >
          <span>Berikutnya</span>
          <CaretRight size={14} weight="bold" />
        </Button>
      </div>
    </nav>
  );
}
