import { z } from 'zod';
import {
    createCashierSchema,
    jwtPayloadSchema,
    loginSchema,
    registerOwnerSchema,
    setCashierActiveSchema,
    userRoleSchema,
} from './auth.schema';

export type RegisterOwnerInput = z.infer<typeof registerOwnerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateCashierInput = z.infer<typeof createCashierSchema>;
export type SetCashierActiveInput = z.infer<typeof setCashierActiveSchema>;

//jwt n role
export type UserRole = z.infer<typeof userRoleSchema>;
export type JwtPayload = z.infer<typeof jwtPayloadSchema>;