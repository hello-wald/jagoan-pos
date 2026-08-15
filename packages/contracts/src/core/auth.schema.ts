import { z } from 'zod';
import type { userRoleSchema } from '../rpc';

const nameSchema = z.string().trim().min(1).max(150);

/** Trim and lowercase first, then validate — so " A@B.com " is accepted and normalized. */
const emailSchema = z.string().trim().toLowerCase().pipe(z.email('Invalid email address'));

/** Registration policy. Deliberately NOT reused by loginSchema. */
const newPasswordSchema = z.string().min(8).max(128);

export const registerOwnerSchema = z.object({
  merchantName: nameSchema,
  fullName: nameSchema,
  email: emailSchema,
  password: newPasswordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  // Any non-empty string. Tightening the registration policy must never
  // lock out an existing user (FRD US-1.1).
  password: z.string().min(1),
});

export const resolveSessionSchema = z.object({ jti: z.uuid(), userId: z.uuid() });
export const revokeSessionSchema = z.object({ jti: z.uuid() });

export type RegisterOwnerInput = z.infer<typeof registerOwnerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ResolveSessionInput = z.infer<typeof resolveSessionSchema>;
export type RevokeSessionInput = z.infer<typeof revokeSessionSchema>;

export type LoginResult = {
  accessToken: string;
  user: {
    id: string;
    merchantId: string | null;
    fullName: string;
    email: string;
    role: z.infer<typeof userRoleSchema>;
    isActive: boolean;
  };
};
