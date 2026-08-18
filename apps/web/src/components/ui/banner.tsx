import { Info, Warning, WarningCircle } from '@phosphor-icons/react/dist/ssr';

const TONES = {
  danger: { cls: 'border-danger/30 bg-danger/5 text-danger', Icon: WarningCircle },
  warning: { cls: 'border-warning/30 bg-warning/5 text-warning', Icon: Warning },
  info: { cls: 'border-line bg-paper text-ink-2', Icon: Info },
} as const;

export function Banner({
  tone = 'danger',
  children,
}: {
  tone?: keyof typeof TONES;
  children: React.ReactNode;
}) {
  const { cls, Icon } = TONES[tone];
  return (
    <div role="alert" className={`flex gap-2.5 rounded-panel border p-3 text-[13px] ${cls}`}>
      <Icon size={18} weight="regular" className="mt-px shrink-0" aria-hidden />
      <span>{children}</span>
    </div>
  );
}
