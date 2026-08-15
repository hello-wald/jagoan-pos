import { z } from 'zod';

export const userRoleSchema = z.enum(['GLOBAL_ADMIN', 'OWNER', 'CASHIER']);
export type UserRole = z.infer<typeof userRoleSchema>;

/**
 * The authenticated caller, derived server-side from the JWT by the gateway.
 * Services read tenant scope from here and never from client-supplied fields
 * (FRD AR-1, AR-2).
 */
export const actorSchema = z.object({
  userId: z.uuid(),
  role: userRoleSchema,
  merchantId: z.uuid().nullable(),
});
export type Actor = z.infer<typeof actorSchema>;

export interface RpcMeta {
  correlationId: string;
  actor: Actor | null;
}

export interface RpcEnvelope<T> {
  meta: RpcMeta;
  data: T;
}

export const jwtPayloadSchema = z.object({
  sub: z.uuid(),
  jti: z.uuid(),
  role: userRoleSchema,
  merchantId: z.uuid().nullable(),
});
export type JwtPayload = z.infer<typeof jwtPayloadSchema>;

export type AuthUser = {
  id: string;
  merchantId: string | null;
  fullName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
};
