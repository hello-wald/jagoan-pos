import type { HTMLAttributes, ReactNode } from 'react';

export type StatusBadgeTone = 'default' | 'success' | 'warning' | 'danger' | 'accent';

export type StatusBadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: StatusBadgeTone;
  children: ReactNode;
};

const TONE_CLASSES: Record<StatusBadgeTone, string> = {
  default: 'bg-paper text-ink-2 border-line',
  success: 'bg-success/10 text-success border-success/20',
  warning: 'bg-warning/10 text-warning border-warning/20',
  danger: 'bg-danger/10 text-danger border-danger/20',
  accent: 'bg-accent/15 text-accent-deep border-accent/30',
};

export function StatusBadge({ tone = 'default', className = '', children, ...props }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-badge border px-2 py-0.5 text-[11px] font-medium tracking-tight ${TONE_CLASSES[tone]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
