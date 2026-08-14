export interface InventoryApiItem {
  productId: string;
  sku: string;
  name: string;
  currentPrice: number | string;
  stockQuantity: number;
  updatedAt: string;
}

export interface InventorySummary {
  totalProducts: number;
  totalStockUnits: number;
  lowStockCount: number;
  outOfStockCount: number;
}

export interface InventoryMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface GetInventoryApiResponse {
  data: InventoryApiItem[];
  meta: InventoryMeta;
  summary: InventorySummary;
}

export interface InventoryItem {
  id: string;
  productId: string;
  sku: string;
  productName: string;
  price: number;
  stockQuantity: number;
  isActive: boolean;
  lastUpdated: string;
}

export interface UpdateStockInput {
  stockQuantity: number;
}

