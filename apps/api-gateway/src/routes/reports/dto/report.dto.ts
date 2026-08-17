import { createZodDto } from 'nestjs-zod';
import { dateRangeSchema, topProductsQuerySchema } from '@jagoan-pos/contracts';

export class DateRangeDto extends createZodDto(dateRangeSchema) {}

export class TopProductsQueryDto extends createZodDto(topProductsQuerySchema) {}
