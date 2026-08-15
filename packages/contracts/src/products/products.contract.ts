import type {
  CreateProductInput,
  PaginatedProducts,
  Product,
  ProductListQuery,
  SetProductActiveInput,
  UpdateProductInput,
} from './product.schema';

export interface ProductsContract {
  'products.create': { request: CreateProductInput; response: Product };
  'products.list': { request: ProductListQuery; response: PaginatedProducts };
  'products.getById': { request: { id: string }; response: Product };
  'products.getManyByIds': { request: { ids: string[] }; response: Product[] };
  'products.update': { request: { id: string; dto: UpdateProductInput }; response: Product };
  'products.setActive': {
    request: { id: string; dto: SetProductActiveInput };
    response: Product;
  };
  'products.delete': { request: { id: string }; response: never };
}

export type ProductsPattern = keyof ProductsContract;
export type ProductsRequest<P extends ProductsPattern> = ProductsContract[P]['request'];
export type ProductsResponse<P extends ProductsPattern> = ProductsContract[P]['response'];
