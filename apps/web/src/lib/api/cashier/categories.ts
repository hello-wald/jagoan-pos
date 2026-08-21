'use client';

import { useQuery } from '@tanstack/react-query';
import type { CategoryWithUsage } from '@jagoan-pos/contracts';
import { bffFetch } from '../bff-client';

export const cashierCategoryKeys = {
  all: ['cashier', 'categories'] as const,
  active: ['cashier', 'categories', 'active'] as const,
};

export function useCashierCategoryList() {
  return useQuery({
    queryKey: cashierCategoryKeys.active,
    queryFn: () => bffFetch<CategoryWithUsage[]>('/categories'),
    staleTime: 60_000,
  });
}
