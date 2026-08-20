import type { GetMerchantStockQueryInput, ListSalesQueryInput } from '@jagoan-pos/contracts';
import { buildInventoryQuery, buildTransactionsQuery } from '../query-builders';

export type CashierCatalogQueryParams = Required<
  Pick<GetMerchantStockQueryInput, 'page' | 'limit'>
> &
  Pick<GetMerchantStockQueryInput, 'search'>;

export const cashierCatalogKeys = {
  all: ['cashier', 'catalog'] as const,
  list: (params: CashierCatalogQueryParams) => ['cashier', 'catalog', 'list', params] as const,
};

export const cashierTransactionKeys = {
  all: ['cashier', 'transactions'] as const,
  list: (params: Partial<ListSalesQueryInput>) =>
    ['cashier', 'transactions', 'list', params] as const,
  detail: (id: string) => ['cashier', 'transactions', 'detail', id] as const,
};

export function buildCashierCatalogQuery(params: CashierCatalogQueryParams): string {
  return buildInventoryQuery({ ...params, activeOnly: true });
}

export const buildCashierTransactionsQuery = buildTransactionsQuery;
export { buildTransactionsQuery, buildInventoryQuery };
