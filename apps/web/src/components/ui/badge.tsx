import { CheckCircle, MinusCircle } from '@phosphor-icons/react/dist/ssr';

const TONES = {
  success: { cls: 'border-success/30 bg-success/5 text-success', Icon: CheckCircle },
  neutral: { cls: 'border-line bg-paper text-ink-2', Icon: MinusCircle },
  warning: { cls: 'border-warning/30 bg-warning/5 text-warning', Icon: MinusCircle },
} as const;

// Every badge carries an icon AND a border so state never depends on hue alone.
export function Badge({ tone, children }: { tone: keyof typeof TONES; children: React.ReactNode }) {
  const { cls, Icon } = TONES[tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-badge border px-2 py-1 text-[11px] font-medium ${cls}`}
    >
      <Icon size={13} weight="regular" aria-hidden />
      {children}
    </span>
  );
}
