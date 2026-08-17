import type {
  CreateProductInput,
  CreateProductImageUploadInput,
  PaginatedProducts,
  Product,
  ProductImage,
  ProductImageUpload,
  ProductListQuery,
  SetProductActiveInput,
  UpdateProductInput,
} from "./product.schema";

export interface ProductsContract {
  "products.create": { request: CreateProductInput; response: Product };
  "products.list": { request: ProductListQuery; response: PaginatedProducts };
  "products.getById": { request: { id: string }; response: Product };
  "products.getManyByIds": { request: { ids: string[] }; response: Product[] };
  "products.update": { request: { id: string; dto: UpdateProductInput }; response: Product };
  "products.setActive": {
    request: { id: string; dto: SetProductActiveInput };
    response: Product;
  };
  "products.delete": { request: { id: string }; response: never };
  "products.createImageUpload": {
    request: { productId: string; dto: CreateProductImageUploadInput };
    response: ProductImageUpload;
  };
  "products.completeImageUpload": {
    request: { productId: string; imageId: string };
    response: ProductImage;
  };
  "products.deleteImage": {
    request: { productId: string; imageId: string };
    response: void;
  };
}

export type ProductsPattern = keyof ProductsContract;
export type ProductsRequest<P extends ProductsPattern> = ProductsContract[P]["request"];
export type ProductsResponse<P extends ProductsPattern> = ProductsContract[P]["response"];
