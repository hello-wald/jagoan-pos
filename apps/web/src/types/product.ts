export interface Product {
  id: string;
  sku: string;
  name: string;
  price: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductInput {
  sku: string;
  name: string;
  price: number;
}

export interface UpdateProductInput {
  name: string;
  price: number;
  isActive: boolean;
}
