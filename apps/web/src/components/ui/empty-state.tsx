export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-20 text-center">
      <h2 className="text-lg text-ink">{title}</h2>
      <p className="max-w-[46ch] text-sm leading-relaxed text-ink-2">{description}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
