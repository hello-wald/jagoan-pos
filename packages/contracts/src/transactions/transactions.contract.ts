import type { CheckoutInput, Sale } from './sale.schema';

export interface TransactionsContract {
  'sales.checkout': { request: CheckoutInput; response: Sale };
}

export type TransactionsPattern = keyof TransactionsContract;
export type TransactionsRequest<P extends TransactionsPattern> = TransactionsContract[P]['request'];
export type TransactionsResponse<P extends TransactionsPattern> =
  TransactionsContract[P]['response'];
