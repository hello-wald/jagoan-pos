import type { ReactNode } from 'react';

export type OwnerPageHeaderProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
};

export function OwnerPageHeader({ title, subtitle, actions }: OwnerPageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
        {subtitle ? <p className="text-sm text-ink-2">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2.5">{actions}</div> : null}
    </div>
  );
}
