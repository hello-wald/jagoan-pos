import type { UserSummary } from '@jagoan-pos/contracts';
import type { UserGetPayload } from '../generated/prisma/models';

export const userSelect = {
  id: true,
  merchantId: true,
  fullName: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  merchant: { select: { name: true } },
} as const;

export type UserRow = UserGetPayload<{ select: typeof userSelect }>;

export function toUserSummary(row: UserRow): UserSummary {
  const { merchant, ...user } = row;
  return {
    ...user,
    merchantName: merchant?.name ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
