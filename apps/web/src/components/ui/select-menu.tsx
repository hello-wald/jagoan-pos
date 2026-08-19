'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CaretDown, Check } from '@phosphor-icons/react';

export type SelectOption<T extends string | number> = {
  value: T;
  label: string;
  icon?: ReactNode;
  badge?: ReactNode;
};

export type SelectMenuProps<T extends string | number> = {
  value: T;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  icon?: ReactNode;
  ariaLabel?: string;
  size?: 'sm' | 'md';
  className?: string;
  menuClassName?: string;
};

export function SelectMenu<T extends string | number>({
  value,
  onChange,
  options,
  icon,
  ariaLabel,
  size = 'md',
  className = '',
  menuClassName = '',
}: SelectMenuProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value) ?? options[0];

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const sizeClasses =
    size === 'sm'
      ? 'h-8 px-2.5 text-xs gap-1.5'
      : 'h-10 px-3 text-xs gap-2';

  return (
    <div ref={containerRef} className={`relative inline-block text-left ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={ariaLabel ?? selectedOption?.label}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center justify-between rounded-control border border-line bg-surface font-semibold text-ink transition-all hover:bg-paper focus:border-accent focus:outline-none shadow-2xs ${sizeClasses}`}
      >
        <div className="flex items-center gap-1.5 truncate">
          {icon ? <span className="shrink-0 text-accent-deep">{icon}</span> : null}
          <span className="truncate">{selectedOption?.label}</span>
          {selectedOption?.badge ? <span>{selectedOption.badge}</span> : null}
        </div>
        <CaretDown
          size={12}
          weight="bold"
          className={`shrink-0 text-ink-2 transition-transform duration-150 ${
            isOpen ? 'rotate-180 text-accent-deep' : ''
          }`}
        />
      </button>

      {/* Popover Dropdown Menu */}
      {isOpen ? (
        <div
          role="listbox"
          aria-label={ariaLabel}
          className={`absolute left-0 z-50 mt-1 min-w-full w-max max-w-xs rounded-control border border-line bg-surface p-1 shadow-lg ring-1 ring-black/5 focus:outline-none animate-in fade-in-0 zoom-in-95 ${menuClassName}`}
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={String(option.value)}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-3 rounded-control px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  isSelected
                    ? 'bg-accent/15 text-accent-deep font-semibold'
                    : 'text-ink hover:bg-paper'
                }`}
              >
                <div className="flex items-center gap-2">
                  {option.icon ? (
                    <span className="shrink-0 text-ink-2">{option.icon}</span>
                  ) : null}
                  <span>{option.label}</span>
                  {option.badge ? <span>{option.badge}</span> : null}
                </div>
                {isSelected ? (
                  <Check size={13} weight="bold" className="shrink-0 text-accent-deep" />
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
