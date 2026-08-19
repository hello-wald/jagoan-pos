import type { Icon } from '@phosphor-icons/react';
import { Card } from '@/components/ui/card';

export type MetricCardProps = {
  label: string;
  value: string;
  description?: string;
  icon?: Icon;
  tone?: 'default' | 'accent' | 'success' | 'warning' | 'danger';
};

export function MetricCard({
  label,
  value,
  description,
  icon: IconComponent,
  tone = 'default',
}: MetricCardProps) {
  return (
    <Card className="flex flex-col justify-between gap-3 p-5">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium text-ink-2">{label}</span>
        {IconComponent ? (
          <div className="flex h-8 w-8 items-center justify-center rounded-control bg-paper text-ink-2">
            <IconComponent size={18} weight="duotone" aria-hidden="true" />
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-2xl font-semibold tracking-tight text-ink">{value}</span>
        {description ? (
          <span
            className={`text-xs ${
              tone === 'danger' ? 'text-danger' : tone === 'success' ? 'text-success' : 'text-ink-2'
            }`}
          >
            {description}
          </span>
        ) : null}
      </div>
    </Card>
  );
}
