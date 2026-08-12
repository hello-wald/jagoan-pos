import { createCashierSchema, setCashierActiveSchema } from "./staff.schema";
import { z } from 'zod';

export type CreateCashierInput = z.infer<typeof createCashierSchema>;
export type SetCashierActiveInput = z.infer<typeof setCashierActiveSchema>;