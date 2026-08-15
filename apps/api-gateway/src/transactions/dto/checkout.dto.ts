import { createZodDto } from 'nestjs-zod';
import { checkoutRequestSchema } from '@jagoan-pos/contracts';

export class CheckoutDto extends createZodDto(checkoutRequestSchema) {}
