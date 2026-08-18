import { z } from 'zod';

export const rangeArgsSchema = z.object({
  from: z.string().date('Invalid calendar date format (YYYY-MM-DD)'),
  to: z.string().date('Invalid calendar date format (YYYY-MM-DD)'),
});

export const topProductsArgsSchema = rangeArgsSchema.extend({
  direction: z.enum(['best', 'worst']).default('best'),
  limit: z.coerce.number().int().min(1).max(20).default(10),
});

export type RangeArgs = z.infer<typeof rangeArgsSchema>;
export type TopProductsArgs = z.infer<typeof topProductsArgsSchema>;
