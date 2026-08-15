import { createZodDto } from 'nestjs-zod';
import { createCashierSchema, setCashierActiveSchema } from '@jagoan-pos/contracts';

export class CreateCashierDto extends createZodDto(createCashierSchema) {}
export class SetCashierActiveDto extends createZodDto(setCashierActiveSchema) {}
