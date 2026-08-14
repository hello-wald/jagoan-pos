import React from "react";
import { cn } from "@/lib/utils";
import { Loader2, Inbox } from "lucide-react";

export interface ColumnDef<T> {
  header: React.ReactNode;
  accessorKey?: keyof T;
  cell?: (row: T, index: number) => React.ReactNode;
  className?: string;
  headerClassName?: string;
}

export interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  keyExtractor?: (row: T, index: number) => string | number;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  isLoading = false,
  emptyMessage = "Tidak ada data yang ditemukan.",
  emptyIcon = <Inbox className="w-10 h-10 text-slate-300 mb-2" />,
  keyExtractor,
  className,
}: DataTableProps<T>) {
  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-2xl border border-border bg-white shadow-card",
        className
      )}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-700">
          <thead className="bg-slate-50/80 border-b border-border text-xs uppercase tracking-wider text-slate-500 font-semibold">
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className={cn("px-5 py-3.5", col.headerClassName)}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="px-5 py-12 text-center">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    <span className="text-xs text-slate-500 font-medium">
                      Memuat data...
                    </span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-5 py-12 text-center">
                  <div className="flex flex-col items-center justify-center">
                    {emptyIcon}
                    <p className="text-sm font-medium text-slate-500">
                      {emptyMessage}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => {
                const rowKey = keyExtractor
                  ? keyExtractor(row, rowIndex)
                  : rowIndex;
                return (
                  <tr
                    key={rowKey}
                    className="hover:bg-slate-50/70 transition-colors duration-150"
                  >
                    {columns.map((col, colIndex) => (
                      <td
                        key={colIndex}
                        className={cn("px-5 py-4", col.className)}
                      >
                        {col.cell
                          ? col.cell(row, rowIndex)
                          : col.accessorKey
                          ? String(row[col.accessorKey] ?? "")
                          : null}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
