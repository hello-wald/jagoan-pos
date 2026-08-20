'use client';

import { useEffect, useState, type ChangeEvent } from 'react';
import { MAX_PRICE, formatRupiahDisplay, parseRupiahInput } from '@/lib/format/currency';
import { Input } from './input';

type Props = {
  id: string;
  value: number | null;
  onChange: (value: number | null) => void;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
};

function display(value: number | null): string {
  return value === null ? '' : formatRupiahDisplay(value);
}

/**
 * Shows grouped digits while the form state stays a plain integer.
 *
 * The displayed text is local state, not a direct read of `value`: a purely
 * controlled `value={display(value)}` would get reset by React after every
 * keystroke unless the caller echoes each `onChange` straight back into
 * `value` on the same render. Callers (react-hook-form's Controller included)
 * don't do that synchronously, so local state is what lets digits accumulate
 * while typing; the effect below still resyncs when `value` changes from
 * outside (e.g. a form reset).
 */
export function RupiahInput({ id, value, onChange, ...aria }: Props) {
  const [text, setText] = useState(() => display(value));

  useEffect(() => {
    setText(display(value));
  }, [value]);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const parsed = parseRupiahInput(event.target.value, MAX_PRICE);
    setText(display(parsed));
    onChange(parsed);
  }

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-3">
        Rp
      </span>
      <Input
        id={id}
        type="text"
        inputMode="numeric"
        className="pl-10 tabular"
        value={text}
        onChange={handleChange}
        {...aria}
      />
    </div>
  );
}
