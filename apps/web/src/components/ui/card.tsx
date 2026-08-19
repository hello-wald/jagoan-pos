import { forwardRef, type HTMLAttributes } from 'react';

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function Card(
  { className = '', ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={`rounded-panel border border-line bg-surface p-5 shadow-xs ${className}`}
      {...props}
    />
  );
});

export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function CardHeader({ className = '', ...props }, ref) {
    return <div ref={ref} className={`flex flex-col gap-1.5 ${className}`} {...props} />;
  },
);

export const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  function CardTitle({ className = '', ...props }, ref) {
    return (
      <h3
        ref={ref}
        className={`text-base font-medium tracking-tight text-ink ${className}`}
        {...props}
      />
    );
  },
);

export const CardDescription = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLParagraphElement>
>(function CardDescription({ className = '', ...props }, ref) {
  return <p ref={ref} className={`text-xs text-ink-2 ${className}`} {...props} />;
});

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function CardContent({ className = '', ...props }, ref) {
    return <div ref={ref} className={`pt-4 ${className}`} {...props} />;
  },
);
