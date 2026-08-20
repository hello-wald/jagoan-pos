export type ProductListParams = {
  query?: string;
  page: number;
  pageSize: number;
  activeOnly?: boolean;
  /** A category id, or UNCATEGORIZED for products filed under no category. */
  categoryId?: string;
};

export const productKeys = {
  all: ['products'] as const,
  list: (params: ProductListParams) => ['products', 'list', params] as const,
  detail: (id: string) => ['products', 'detail', id] as const,
};

export function buildListQuery(params: ProductListParams): string {
  const search = new URLSearchParams();
  const trimmed = params.query?.trim();
  if (trimmed) search.set('query', trimmed);
  search.set('page', String(params.page));
  search.set('pageSize', String(params.pageSize));
  if (params.activeOnly !== undefined) search.set('activeOnly', String(params.activeOnly));
  if (params.categoryId) search.set('categoryId', params.categoryId);
  return `?${search.toString()}`;
}

export function totalPages(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}
