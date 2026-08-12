import { z } from 'zod';
import {
    jwtPayloadSchema,
    loginSchema,
    registerOwnerSchema,
    userRoleSchema,
} from './auth.schema';

export type RegisterOwnerInput = z.infer<typeof registerOwnerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

//jwt n role
export type UserRole = z.infer<typeof userRoleSchema>;
export type JwtPayload = z.infer<typeof jwtPayloadSchema>;


export type AuthUser = {
    id: string;
    merchantId: string | null;
    fullName: string;
    email: string;
    role: UserRole;
    isActive: boolean;
}