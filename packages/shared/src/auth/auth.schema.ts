import { z } from 'zod';

const nameSchema = z.string().trim().min(1).max(150);
const emailSchema = z.string().trim().toLowerCase().email({message: "Invalid email address"});
const passwordSchema = z.string().min(8).max(28);
    
export const registerOwnerSchema = z.object({
    merchantName: nameSchema,
    fullName: nameSchema,
    email: emailSchema,
    password: passwordSchema,
});

export const loginSchema = z.object({
    email: emailSchema,
    password: passwordSchema,
});


// jwt payload and role 
export const userRoleSchema = z.enum([
    'GLOBAL_ADMIN',
    'OWNER',
    'CASHIER'
])

export const jwtPayloadSchema = z.object({
    sub: z.string().uuid(),
    role: userRoleSchema,
    merchantId: z.string().uuid().nullable()
})