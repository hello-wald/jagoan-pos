import { z } from 'zod';
import type { AuthUser } from '../rpc';

const nameSchema = z.string().trim().min(1).max(150);
const emailSchema = z.string().trim().toLowerCase().pipe(z.email('Invalid email address'));
const newPasswordSchema = z.string().min(8).max(128);

export const registerOwnerSchema = z.object({
  merchantName: nameSchema,
  fullName: nameSchema,
  email: emailSchema,
  password: newPasswordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  // Any non-empty string: tightening the registration policy must not lock out existing users.
  password: z.string().min(1),
});

export type RegisterOwnerInput = z.infer<typeof registerOwnerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

export type LoginResult = {
  accessToken: string;
  user: AuthUser;
};
