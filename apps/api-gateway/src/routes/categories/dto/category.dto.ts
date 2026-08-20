import {
  categoryListQuerySchema,
  createCategorySchema,
  setCategoryActiveSchema,
  updateCategorySchema,
} from '@jagoan-pos/contracts';
import { createZodDto } from 'nestjs-zod';

export class CreateCategoryDto extends createZodDto(createCategorySchema) {}
export class UpdateCategoryDto extends createZodDto(updateCategorySchema) {}
export class SetCategoryActiveDto extends createZodDto(setCategoryActiveSchema) {}
export class CategoryListQueryDto extends createZodDto(categoryListQuerySchema) {}
