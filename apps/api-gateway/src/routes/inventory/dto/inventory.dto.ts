import { createZodDto } from 'nestjs-zod';
import { adjustStockSchema, getMerchantStockQuerySchema } from '@jagoan-pos/contracts';

export class GetMerchantStockQueryDto extends createZodDto(getMerchantStockQuerySchema) {}
export class AdjustStockDto extends createZodDto(adjustStockSchema) {}
