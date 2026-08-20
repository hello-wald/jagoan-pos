export type CategoryListParams = {
  activeOnly?: boolean;
};

export const categoryKeys = {
  all: ['categories'] as const,
  list: (params: CategoryListParams) => ['categories', 'list', params] as const,
};

export function buildCategoryQuery(params: CategoryListParams): string {
  if (params.activeOnly === undefined) return '';
  return `?activeOnly=${String(params.activeOnly)}`;
}
