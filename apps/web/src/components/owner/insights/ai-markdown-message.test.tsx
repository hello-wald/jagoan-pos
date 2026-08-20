import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AiMarkdownMessage } from './ai-markdown-message';

describe('AiMarkdownMessage', () => {
  it('renders emphasis without leaking markdown syntax', () => {
    const { container } = render(
      <AiMarkdownMessage content="1. **Dorong Produk Terlaris (Best Seller)**" />,
    );

    expect(container.textContent?.trim()).toBe('Dorong Produk Terlaris (Best Seller)');
    expect(container.querySelector('strong')?.textContent).toBe(
      'Dorong Produk Terlaris (Best Seller)',
    );
  });

  it('nests two-space-indented bullets under their ordered parent', () => {
    const { container } = render(
      <AiMarkdownMessage
        content={['1. Produk terlaris', '  * Stok aman', '2. Bundling'].join('\n')}
      />,
    );

    const lists = container.querySelectorAll('ol');
    expect(lists).toHaveLength(1);
    expect(lists[0].children).toHaveLength(2);
    expect(lists[0].children[0].querySelector('ul li')?.textContent).toBe('Stok aman');
  });

  it('renders gfm tables', () => {
    const { container } = render(
      <AiMarkdownMessage content={['| Produk | Omzet |', '| --- | --- |', '| Kopi | 100 |'].join('\n')} />,
    );

    expect(container.querySelectorAll('th')).toHaveLength(2);
    expect(container.querySelector('td')?.textContent).toBe('Kopi');
  });
});
