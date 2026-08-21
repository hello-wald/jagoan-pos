import type { GetMerchantStockQueryInput, ListSalesQueryInput } from '@jagoan-pos/contracts';

export function buildInventoryQuery(params: Partial<GetMerchantStockQueryInput>): string {
  const searchParams = new URLSearchParams();
  if (params.page !== undefined) searchParams.set('page', String(params.page));
  if (params.limit !== undefined) searchParams.set('limit', String(params.limit));
  const trimmed = params.search?.trim();
  if (trimmed) searchParams.set('search', trimmed);
  if (params.categoryId) searchParams.set('categoryId', params.categoryId);
  if (params.activeOnly !== undefined) {
    searchParams.set('activeOnly', String(params.activeOnly));
  }
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

export function buildTransactionsQuery(params: Partial<ListSalesQueryInput>): string {
  const searchParams = new URLSearchParams();
  if (params.page !== undefined) searchParams.set('page', String(params.page));
  if (params.limit !== undefined) searchParams.set('limit', String(params.limit));
  const trimmed = params.search?.trim();
  if (trimmed) searchParams.set('search', trimmed);
  if (params.startDate) searchParams.set('startDate', params.startDate);
  if (params.endDate) searchParams.set('endDate', params.endDate);
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}
