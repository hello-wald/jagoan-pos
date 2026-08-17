import type {
  AdjustStockInput,
  AdjustStockResult,
  GetMerchantStockQueryInput,
  InventorySummary,
  PaginatedMerchantStock,
} from './inventory.schema';
import type { CheckoutInput, ListSalesQueryInput, PaginatedSales, Sale } from './sale.schema';

export interface TransactionsContract {
  'sales.checkout': { request: CheckoutInput; response: Sale };
  'sales.list': {
    request: { merchantId: string; query: ListSalesQueryInput; cashierIdFilter?: string };
    response: PaginatedSales;
  };
  'sales.getById': {
    request: { merchantId: string; id: string; cashierIdFilter?: string };
    response: Sale;
  };
  'inventory.getMerchantStock': {
    request: { merchantId: string; query: GetMerchantStockQueryInput };
    response: PaginatedMerchantStock;
  };
  'inventory.getInventorySummary': {
    request: { merchantId: string };
    response: InventorySummary;
  };
  'inventory.adjustStock': {
    request: { merchantId: string; userId: string; productId: string; dto: AdjustStockInput };
    response: AdjustStockResult;
  };
}

export type TransactionsPattern = keyof TransactionsContract;
export type TransactionsRequest<P extends TransactionsPattern> = TransactionsContract[P]['request'];
export type TransactionsResponse<P extends TransactionsPattern> =
  TransactionsContract[P]['response'];
