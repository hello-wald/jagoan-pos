import { createZodDto } from 'nestjs-zod';
import { listSalesQuerySchema } from '@jagoan-pos/contracts';

export class ListSalesQueryDto extends createZodDto(listSalesQuerySchema) {}
