import { z } from 'zod';

const nameSchema = z.string().trim().min(1).max(150);
const emailSchema = z.string().trim().toLowerCase().pipe(z.email('Invalid email address'));

export const createCashierSchema = z.object({
  fullName: nameSchema,
  email: emailSchema,
  password: z.string().min(8).max(128),
});

export const setCashierActiveSchema = z.object({
  cashierId: z.uuid(),
  isActive: z.boolean(),
});

export type CreateCashierInput = z.infer<typeof createCashierSchema>;
export type SetCashierActiveInput = z.infer<typeof setCashierActiveSchema>;

export type CashierSummary = {
  id: string;
  merchantId: string | null;
  fullName: string;
  email: string;
  role: 'CASHIER';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CashierListResult = {
  data: CashierSummary[];
  summary: { total: number; active: number; inactive: number };
};
