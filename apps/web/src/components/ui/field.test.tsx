import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Field } from './field';
import { Input } from './input';

describe('Field', () => {
  it('associates the label with the control', () => {
    render(
      <Field id="email" label="Email">
        <Input id="email" />
      </Field>,
    );
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('links the error to the control and marks it invalid', () => {
    render(
      <Field id="sku" label="SKU" error="SKU ini sudah dipakai produk lain.">
        <Input id="sku" />
      </Field>,
    );
    const input = screen.getByLabelText('SKU');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('SKU ini sudah dipakai produk lain.');
  });

  it('describes the control with the hint when there is no error', () => {
    render(
      <Field id="password" label="Kata sandi" hint="Minimal 8 karakter.">
        <Input id="password" />
      </Field>,
    );
    expect(screen.getByLabelText('Kata sandi')).toHaveAccessibleDescription('Minimal 8 karakter.');
  });
});
