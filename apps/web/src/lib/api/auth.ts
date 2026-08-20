'use client';

import { useQuery } from '@tanstack/react-query';
import type { AuthUser } from '@jagoan-pos/contracts';
import { bffFetch } from './bff-client';

export const authKeys = {
  me: ['auth', 'me'] as const,
};

export function useCurrentUser() {
  return useQuery({
    queryKey: authKeys.me,
    queryFn: () => bffFetch<AuthUser>('/auth/me'),
  });
}
