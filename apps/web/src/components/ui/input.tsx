'use client';
import { forwardRef, type InputHTMLAttributes } from 'react';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className = '', ...props }, ref) {
    return (
      <input
        ref={ref}
        className={`h-11 w-full rounded-[--radius-control] border border-line bg-surface px-3 text-ink outline-none transition-colors duration-150 placeholder:text-ink-3 focus:border-accent-deep focus:ring-2 focus:ring-accent-deep/20 aria-[invalid=true]:border-danger ${className}`}
        {...props}
      />
    );
  },
);
