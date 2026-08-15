import { z } from 'zod';

export const checkoutItemSchema = z.object({
  productId: z.uuid(),
  quantity: z.coerce.number().int().positive().max(10_000),
});

const checkoutBaseSchema = z.object({
  idempotencyKey: z.string().trim().min(1).max(255),
  cashReceived: z.coerce.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  items: z.array(checkoutItemSchema).min(1).max(200),
});

// A product may appear once per sale.
const hasUniqueProducts = (value: { items: { productId: string }[] }): boolean =>
  new Set(value.items.map((item) => item.productId)).size === value.items.length;

const uniqueProductsIssue = {
  message: 'Each product may appear only once; merge duplicate lines',
  path: ['items'],
};

export const checkoutRequestSchema = checkoutBaseSchema.refine(
  hasUniqueProducts,
  uniqueProductsIssue,
);

export const checkoutInputSchema = checkoutBaseSchema
  .extend({
    merchantId: z.uuid(),
    merchantName: z.string().trim().min(1).max(150),
    cashierId: z.uuid(),
    cashierName: z.string().trim().min(1).max(150),
  })
  .refine(hasUniqueProducts, uniqueProductsIssue);

export type CheckoutItemInput = z.infer<typeof checkoutItemSchema>;
export type CheckoutRequestInput = z.infer<typeof checkoutRequestSchema>;
export type CheckoutInput = z.infer<typeof checkoutInputSchema>;

export type SaleStatus = 'COMPLETED' | 'VOIDED';

/**
 * Snapshot fields are flattened to plain names here — `*_snapshot` is a storage
 * concern, not part of the wire contract.
 */
export type SaleLine = {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
};

export type Sale = {
  id: string;
  merchantId: string;
  merchantName: string;
  cashierId: string;
  cashierName: string;
  transactionNumber: string;
  status: SaleStatus;
  totalQuantity: number;
  totalAmount: number;
  cashReceived: number;
  changeAmount: number;
  createdAt: Date;
  items: SaleLine[];
};

/** Event type carried by the outbox row a completed sale writes. */
export const SALE_COMPLETED_EVENT = 'SALE_COMPLETED';
