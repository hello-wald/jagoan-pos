import { z } from 'zod';

export const getMerchantStockQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  activeOnly: z.union([z.boolean(), z.stringbool()]).optional(),
});

export type GetMerchantStockQueryInput = z.infer<typeof getMerchantStockQuerySchema>;

export const adjustStockSchema = z.object({
  stockQuantity: z
    .number({ message: 'Stock quantity is required' })
    .int('Stock must be an integer')
    .min(0, 'Stock cannot be negative'),
});

export type AdjustStockInput = z.infer<typeof adjustStockSchema>;

export interface InventorySummary {
  totalProducts: number;
  totalStockUnits: number;
  lowStockCount: number;
  outOfStockCount: number;
}

export interface MerchantStockItem {
  productId: string;
  sku: string;
  name: string;
  currentPrice: number;
  stockQuantity: number;
  isActive: boolean;
  updatedAt: string;
}

export interface PaginatedMerchantStock {
  data: MerchantStockItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface AdjustStockResult {
  id: string;
  merchantId: string;
  productId: string;
  productName: string;
  sku: string;
  currentPrice: number;
  stockQuantity: number;
  updatedAt: string;
}
