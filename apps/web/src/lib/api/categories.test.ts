import { describe, expect, it } from 'vitest';
import { buildCategoryQuery, categoryKeys } from './categories.shared';

describe('buildCategoryQuery', () => {
  it('sends no query string when every category is wanted', () => {
    expect(buildCategoryQuery({})).toBe('');
  });

  it('distinguishes the active and inactive scopes', () => {
    expect(buildCategoryQuery({ activeOnly: true })).toBe('?activeOnly=true');
    expect(buildCategoryQuery({ activeOnly: false })).toBe('?activeOnly=false');
  });
});

describe('categoryKeys', () => {
  it('varies the list key by scope so the picker and the admin list cache apart', () => {
    expect(categoryKeys.list({})).not.toEqual(categoryKeys.list({ activeOnly: true }));
  });
});
