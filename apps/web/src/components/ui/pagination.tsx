import React from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

export interface PageSizeSelectorProps {
  pageSize: number;
  onPageSizeChange: (newPageSize: number) => void;
  options?: number[];
  className?: string;
}

export function PageSizeSelector({
  pageSize,
  onPageSizeChange,
  options = [5, 10, 20, 50],
  className,
}: PageSizeSelectorProps) {
  return (
    <div className={cn("flex items-center gap-2 text-xs text-slate-500 font-medium", className)}>
      <label htmlFor="pageSizeSelect" className="whitespace-nowrap">
        Tampilkan:
      </label>
      <select
        id="pageSizeSelect"
        value={pageSize}
        onChange={(e) => onPageSizeChange(Number(e.target.value))}
        className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800 font-bold text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs cursor-pointer hover:border-slate-300 transition"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt} baris
          </option>
        ))}
      </select>
    </div>
  );
}

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  pageSize?: number;
  onPageSizeChange?: (newPageSize: number) => void;
  pageSizeOptions?: number[];
  showItemCount?: boolean;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
  onPageSizeChange,
  pageSizeOptions = [4, 8, 15, 30],
  showItemCount = true,
  className,
}: PaginationProps) {
  if (totalPages <= 1 && (!totalItems || totalItems <= (pageSize || 10)) && !onPageSizeChange) {
    return null;
  }

  // Generate visible page numbers
  const getPageNumbers = () => {
    const pages: (number | "...")[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, "...", totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, "...", totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
      }
    }
    return pages;
  };

  const startItem = pageSize && totalItems && totalItems > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endItem = pageSize && totalItems ? Math.min(currentPage * pageSize, totalItems) : 0;

  return (
    <div
      className={cn(
        "flex flex-col md:flex-row items-center justify-between gap-4 py-3.5 px-2 text-xs text-slate-600",
        className
      )}
    >
      {/* Left side: Item count + Page size selector */}
      <div className="flex flex-wrap items-center gap-4">
        {onPageSizeChange && pageSize && (
          <PageSizeSelector
            pageSize={pageSize}
            onPageSizeChange={onPageSizeChange}
            options={pageSizeOptions}
          />
        )}

        {showItemCount && totalItems !== undefined && (
          <div className="font-medium text-slate-500">
            {startItem > 0 ? (
              <span>
                Menampilkan <strong>{startItem}</strong> - <strong>{endItem}</strong> dari total{" "}
                <strong>{totalItems}</strong> data
              </span>
            ) : (
              <span>
                Total <strong>{totalItems}</strong> data
              </span>
            )}
          </div>
        )}
      </div>

      {/* Right side: Pagination Controls */}
      <div className="flex items-center gap-1.5 ml-auto">
        {/* First Page */}
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={currentPage <= 1}
          className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-2xs"
          title="Halaman Pertama"
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </button>

        {/* Prev Page */}
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-2xs"
          title="Halaman Sebelumnya"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {/* Page Numbers */}
        <div className="flex items-center gap-1">
          {getPageNumbers().map((page, idx) => {
            if (page === "...") {
              return (
                <span key={`dots-${idx}`} className="px-2 text-slate-400 font-bold">
                  ...
                </span>
              );
            }

            const isActive = page === currentPage;
            return (
              <button
                key={page}
                type="button"
                onClick={() => onPageChange(page)}
                className={cn(
                  "min-w-[32px] h-8 px-2 rounded-lg font-bold text-xs transition-all shadow-2xs",
                  isActive
                    ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/20"
                    : "border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900"
                )}
              >
                {page}
              </button>
            );
          })}
        </div>

        {/* Next Page */}
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages || totalPages === 0}
          className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-2xs"
          title="Halaman Berikutnya"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        {/* Last Page */}
        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage >= totalPages || totalPages === 0}
          className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-2xs"
          title="Halaman Terakhir"
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
