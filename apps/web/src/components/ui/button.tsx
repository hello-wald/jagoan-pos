'use client';
import { forwardRef, type ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

// Gold is a FILL with a near-black label (9.02:1). Never gold text.
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-ink hover:brightness-[0.97]',
  secondary: 'border border-line bg-surface text-ink hover:bg-paper',
  danger: 'bg-danger-fill text-white hover:brightness-[0.95]',
  ghost: 'text-ink-2 hover:bg-paper hover:text-ink',
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: 'md' | 'sm';
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', className = '', ...props },
  ref,
) {
  const sizing = size === 'sm' ? 'h-9 px-3 text-[13px]' : 'h-11 px-5 text-sm';
  return (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[--radius-control] font-medium transition-all duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 ${VARIANTS[variant]} ${sizing} ${className}`}
      {...props}
    />
  );
});
