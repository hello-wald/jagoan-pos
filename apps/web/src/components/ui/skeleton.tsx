export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-badge bg-line/60 ${className}`} />;
}
