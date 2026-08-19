'use client';

import { useQuery } from '@tanstack/react-query';
import type { AuthUser } from '@jagoan-pos/contracts';
import { bffFetch } from '../bff-client';
import { ownerProfileKeys } from './shared';

export { ownerProfileKeys } from './shared';

export function useCurrentUser() {
  return useQuery({
    queryKey: ownerProfileKeys.me,
    queryFn: () => bffFetch<AuthUser>('/auth/me'),
  });
}
