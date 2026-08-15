import { z } from 'zod';
import type { UserSummary } from '../rpc';

const nameSchema = z.string().trim().min(1).max(150);
const emailSchema = z.string().trim().toLowerCase().pipe(z.email('Invalid email address'));

export const createCashierSchema = z.object({
  fullName: nameSchema,
  email: emailSchema,
  password: z.string().min(8).max(128),
});

export const setCashierActiveSchema = z.object({
  isActive: z.boolean(),
});

export type CreateCashierInput = z.infer<typeof createCashierSchema>;
export type SetCashierActiveInput = z.infer<typeof setCashierActiveSchema>;

export type CashierListResult = {
  data: UserSummary[];
  summary: { total: number; active: number; inactive: number };
};
