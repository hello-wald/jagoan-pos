import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RupiahInput } from './rupiah-input';

describe('RupiahInput', () => {
  it('groups digits for display while reporting an integer', async () => {
    const onChange = vi.fn();
    render(<RupiahInput id="price" value={null} onChange={onChange} />);

    await userEvent.type(screen.getByRole('textbox'), '15000');

    expect(onChange).toHaveBeenLastCalledWith(15000);
    expect(screen.getByRole('textbox')).toHaveValue('15.000');
  });

  it('ignores non-digit characters', async () => {
    const onChange = vi.fn();
    render(<RupiahInput id="price" value={null} onChange={onChange} />);

    await userEvent.type(screen.getByRole('textbox'), 'a1b2');

    expect(onChange).toHaveBeenLastCalledWith(12);
  });

  it('reports null when cleared', async () => {
    const onChange = vi.fn();
    render(<RupiahInput id="price" value={5000} onChange={onChange} />);

    await userEvent.clear(screen.getByRole('textbox'));

    expect(onChange).toHaveBeenLastCalledWith(null);
  });
});
