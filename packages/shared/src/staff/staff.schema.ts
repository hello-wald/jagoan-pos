import { z } from 'zod';


const nameSchema = z.string().trim().min(1).max(150);
const emailSchema = z.string().trim().toLowerCase().email({message: "Invalid email address"});
const passwordSchema = z.string().min(8).max(28);

export const createCashierSchema = z.object({
    fullName: nameSchema,
    email: emailSchema,
    password: passwordSchema,
});

export const setCashierActiveSchema = z.object({
    isActive: z.boolean(),
});