import { z } from 'zod';

export const userRoleSchema = z.enum(['GLOBAL_ADMIN', 'OWNER', 'CASHIER']);
export type UserRole = z.infer<typeof userRoleSchema>;

export const jwtPayloadSchema = z.object({
  sub: z.uuid(),
  role: userRoleSchema,
  merchantId: z.uuid().nullable(),
});
export type JwtPayload = z.infer<typeof jwtPayloadSchema>;

/** The authenticated caller, resolved from the JWT by the gateway. */
export type AuthUser = {
  id: string;
  merchantId: string | null;
  merchantName: string | null;
  fullName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
};

/** A user as returned by read/write handlers. Dates are ISO strings over the wire. */
export type UserSummary = AuthUser & {
  createdAt: string;
  updatedAt: string;
};
