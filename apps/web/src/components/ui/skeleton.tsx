export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-[--radius-badge] bg-line/60 ${className}`} />;
}
