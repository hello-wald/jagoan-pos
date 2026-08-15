import type { UserSummary } from '@jagoan-pos/contracts';
import type { UserGetPayload } from '../generated/prisma/models';

/** The only user projection that leaves this service. Never selects passwordHash. */
export const userSelect = {
  id: true,
  merchantId: true,
  fullName: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type UserRow = UserGetPayload<{ select: typeof userSelect }>;

export function toUserSummary(row: UserRow): UserSummary {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
