import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CategoryFilterCards } from './category-filter-cards';

describe('CategoryFilterCards', () => {
  it('renders all, uncategorized, and active category cards', () => {
    render(
      <CategoryFilterCards categories={[{ id: 'cat-1', name: 'Minuman' }]} onChange={vi.fn()} />,
    );

    expect(screen.getByRole('button', { name: 'Semua kategori' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tanpa kategori' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Minuman' })).toBeInTheDocument();
  });

  it('marks the selected card and emits the category id', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(
      <CategoryFilterCards
        categories={[{ id: 'cat-1', name: 'Minuman' }]}
        value="cat-1"
        onChange={onChange}
      />,
    );

    expect(screen.getByRole('button', { name: 'Minuman' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: 'Semua kategori' }));
    expect(onChange).toHaveBeenCalledWith(undefined);
  });
});
