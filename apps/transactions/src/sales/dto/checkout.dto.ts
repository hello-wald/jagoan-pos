import { createZodDto } from 'nestjs-zod';
import { checkoutInputSchema } from '@jagoan-pos/contracts';

export class CheckoutDto extends createZodDto(checkoutInputSchema) {}
