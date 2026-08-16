import type {
  AdjustStockInput,
  AdjustStockResult,
  GetMerchantStockQueryInput,
  InventorySummary,
  PaginatedMerchantStock,
} from './inventory.schema';
import type { CheckoutInput, Sale } from './sale.schema';

export interface TransactionsContract {
  'sales.checkout': { request: CheckoutInput; response: Sale };
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
