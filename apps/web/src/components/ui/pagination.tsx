'use client';

import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import { Button } from './button';

export type PaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  const safeTotalPages = Math.max(1, totalPages);
  const isFirstPage = currentPage <= 1;
  const isLastPage = currentPage >= safeTotalPages;

  return (
    <nav
      aria-label="Navigasi halaman"
      className="flex items-center justify-between gap-3 border-t border-line pt-4"
    >
      <p className="text-xs text-ink-2">
        Halaman <span className="font-medium text-ink">{currentPage}</span> dari{' '}
        <span className="font-medium text-ink">{safeTotalPages}</span>
      </p>

      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={isFirstPage}
          aria-label="Halaman sebelumnya"
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
        >
          <span>Berikutnya</span>
          <CaretRight size={14} weight="bold" />
        </Button>
      </div>
    </nav>
  );
}
