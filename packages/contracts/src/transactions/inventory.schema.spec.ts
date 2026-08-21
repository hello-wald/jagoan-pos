import { UNCATEGORIZED } from '../products/product.schema';
import { getMerchantStockQuerySchema } from './inventory.schema';

const CATEGORY_ID = '2f9d1c6e-6b8a-4f5d-9a3e-1c0b7e4d2a11';

describe('getMerchantStockQuerySchema categoryId', () => {
  it('accepts a UUID and the uncategorized sentinel', () => {
    expect(getMerchantStockQuerySchema.safeParse({ categoryId: CATEGORY_ID }).success).toBe(true);
    expect(getMerchantStockQuerySchema.safeParse({ categoryId: UNCATEGORIZED }).success).toBe(true);
  });

  it('rejects a category name or empty category id', () => {
    expect(getMerchantStockQuerySchema.safeParse({ categoryId: 'Beverages' }).success).toBe(false);
    expect(getMerchantStockQuerySchema.safeParse({ categoryId: '' }).success).toBe(false);
  });
});
