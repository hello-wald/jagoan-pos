'use client';
import { Toaster as Sonner } from 'sonner';

export function Toaster() {
  return (
    <Sonner
      position="bottom-right"
      duration={4000}
      toastOptions={{
        classNames: {
          toast:
            'rounded-[--radius-panel] border border-line bg-ink text-paper text-[13px] px-4 py-3 font-sans',
          actionButton: 'bg-accent text-ink rounded-[--radius-badge] px-2 py-1 font-medium',
          error: 'border-danger/40',
        },
      }}
    />
  );
}
