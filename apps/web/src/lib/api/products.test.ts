import { describe, expect, it } from 'vitest';
import { UNCATEGORIZED } from '@jagoan-pos/contracts';
import { buildListQuery, productKeys, totalPages } from './products';

describe('buildListQuery', () => {
  it('serializes only the params that are set', () => {
    expect(buildListQuery({ page: 2, pageSize: 20 })).toBe('?page=2&pageSize=20');
  });

  it('includes search and the active filter when present', () => {
    const qs = buildListQuery({ page: 1, pageSize: 20, query: 'mie ayam', activeOnly: true });
    expect(qs).toContain('query=mie+ayam');
    expect(qs).toContain('activeOnly=true');
  });

  it('passes the category filter through, including the uncategorized sentinel', () => {
    expect(buildListQuery({ page: 1, pageSize: 20, categoryId: 'cat-1' })).toContain(
      'categoryId=cat-1',
    );
    expect(buildListQuery({ page: 1, pageSize: 20, categoryId: UNCATEGORIZED })).toContain(
      `categoryId=${UNCATEGORIZED}`,
    );
  });

  it('omits the category filter when none is selected', () => {
    expect(buildListQuery({ page: 1, pageSize: 20 })).not.toContain('categoryId');
  });

  it('omits an empty search rather than sending a blank string', () => {
    // productListQuerySchema requires min(1) when query is present.
    expect(buildListQuery({ page: 1, pageSize: 20, query: '   ' })).toBe('?page=1&pageSize=20');
  });
});

describe('productKeys', () => {
  it('varies the list key by params so pages cache separately', () => {
    expect(productKeys.list({ page: 1, pageSize: 20 })).not.toEqual(
      productKeys.list({ page: 2, pageSize: 20 }),
    );
  });
});

describe('totalPages', () => {
  // GAP G-6: meta carries no totalPages, so the UI derives it.
  it('rounds up and never returns zero', () => {
    expect(totalPages(41, 20)).toBe(3);
    expect(totalPages(40, 20)).toBe(2);
    expect(totalPages(0, 20)).toBe(1);
  });
});
