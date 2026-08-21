'use client';

import type { CategoryWithUsage } from '@jagoan-pos/contracts';
import { UNCATEGORIZED } from '@jagoan-pos/contracts';

export type CategoryFilterCardsProps = {
  categories: Pick<CategoryWithUsage, 'id' | 'name'>[];
  value?: string;
  disabled?: boolean;
  onChange: (categoryId?: string) => void;
};

export function CategoryFilterCards({
  categories,
  value,
  disabled,
  onChange,
}: CategoryFilterCardsProps) {
  const options: Array<{ key: string; id: string | undefined; label: string }> = [
    { key: 'all', id: undefined, label: 'Semua kategori' },
    { key: 'none', id: UNCATEGORIZED, label: 'Tanpa kategori' },
    ...categories.map((category) => ({ key: category.id, id: category.id, label: category.name })),
  ];

  return (
    <div aria-label="Filter kategori produk" className="flex gap-2 overflow-x-auto pb-1">
      {options.map((option) => {
        const selected = value === option.id;
        return (
          <button
            key={option.key}
            type="button"
            aria-label={option.label}
            aria-pressed={selected}
            disabled={disabled}
            onClick={() => onChange(option.id)}
            className={`flex min-w-[8rem] shrink-0 cursor-pointer items-center justify-center rounded-panel border px-3 py-2.5 text-xs font-semibold transition-colors ${
              selected
                ? 'border-accent-deep bg-accent/20 text-ink shadow-xs'
                : 'border-line bg-surface text-ink-2 hover:border-accent-deep/40 hover:bg-paper hover:text-ink'
            } disabled:pointer-events-none disabled:opacity-50`}
          >
            <span className="truncate">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
