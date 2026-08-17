'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MagnifyingGlass } from '@phosphor-icons/react';
import { Input } from '@/components/ui/input';

export function ProductFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('query') ?? '');

  const status = searchParams.get('status') ?? 'all';

  // Debounced so the catalog is not queried on every keystroke.
  useEffect(() => {
    const current = searchParams.get('query') ?? '';
    if (query === current) return;

    const timer = setTimeout(() => {
      const next = new URLSearchParams(searchParams.toString());
      if (query.trim()) next.set('query', query.trim());
      else next.delete('query');
      next.delete('page'); // a new search always starts at page 1
      router.replace(`?${next.toString()}`, { scroll: false });
    }, 300);

    return () => clearTimeout(timer);
  }, [query, router, searchParams]);

  function onStatusChange(value: string) {
    const next = new URLSearchParams(searchParams.toString());
    // 'all' omits activeOnly entirely rather than sending false.
    if (value === 'all') next.delete('status');
    else next.set('status', value);
    next.delete('page');
    router.replace(`?${next.toString()}`, { scroll: false });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative min-w-[260px] flex-1">
        <MagnifyingGlass
          size={16}
          weight="regular"
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3"
        />
        <label htmlFor="product-search" className="sr-only">
          Cari produk
        </label>
        <Input
          id="product-search"
          type="search"
          className="pl-9"
          placeholder="Cari nama atau SKU…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <label htmlFor="product-status" className="sr-only">
        Status produk
      </label>
      <select
        id="product-status"
        value={status}
        onChange={(event) => onStatusChange(event.target.value)}
        className="h-11 rounded-[--radius-control] border border-line bg-surface px-3 text-sm text-ink"
      >
        <option value="all">Semua status</option>
        <option value="active">Aktif</option>
        <option value="inactive">Nonaktif</option>
      </select>
    </div>
  );
}
