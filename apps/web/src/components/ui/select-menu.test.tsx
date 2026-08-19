import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { SelectMenu } from './select-menu';

describe('SelectMenu', () => {
  const options = [
    { value: 'ALL', label: 'Semua Produk' },
    { value: 'ACTIVE', label: 'Katalog: Aktif' },
    { value: 'INACTIVE', label: 'Katalog: Nonaktif' },
  ];

  it('renders trigger button with current selected label', () => {
    render(<SelectMenu value="ALL" onChange={vi.fn()} options={options} />);
    expect(screen.getByRole('combobox')).toHaveTextContent('Semua Produk');
  });

  it('opens custom dropdown menu when clicked', () => {
    render(<SelectMenu value="ALL" onChange={vi.fn()} options={options} />);

    // Initially menu is closed
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    // Click trigger
    fireEvent.click(screen.getByRole('combobox'));

    // Now menu is open
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(3);
    expect(screen.getByRole('option', { name: 'Katalog: Aktif' })).toBeInTheDocument();
  });

  it('calls onChange with selected value and closes menu', () => {
    const onChange = vi.fn();
    render(<SelectMenu value="ALL" onChange={onChange} options={options} />);

    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.click(screen.getByRole('option', { name: 'Katalog: Aktif' }));

    expect(onChange).toHaveBeenCalledWith('ACTIVE');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('closes on Escape key press', () => {
    render(<SelectMenu value="ALL" onChange={vi.fn()} options={options} />);

    fireEvent.click(screen.getByRole('combobox'));
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
