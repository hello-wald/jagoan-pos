import {
  createProductSchema,
  productListQuerySchema,
  setProductActiveSchema,
  updateProductSchema,
} from '@jagoan-pos/contracts';
import { createZodDto } from 'nestjs-zod';

export class CreateProductDto extends createZodDto(createProductSchema) {}
export class UpdateProductDto extends createZodDto(updateProductSchema) {}
export class SetProductActiveDto extends createZodDto(setProductActiveSchema) {}
export class ProductListQueryDto extends createZodDto(productListQuerySchema) {}
