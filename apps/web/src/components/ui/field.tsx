import { cloneElement, type ReactElement } from 'react';

type FieldProps = {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: ReactElement<{ 'aria-describedby'?: string; 'aria-invalid'?: boolean }>;
};

export function Field({ id, label, error, hint, children }: FieldProps) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-[13px] font-medium text-ink">
        {label}
      </label>
      {cloneElement(children, { 'aria-describedby': describedBy, 'aria-invalid': Boolean(error) })}
      {error ? (
        <p id={`${id}-error`} className="text-[13px] text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-[13px] text-ink-3">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
