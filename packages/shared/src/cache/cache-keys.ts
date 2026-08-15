const PREFIX = 'jagoan';

export const cacheKeys = {
  cashiers: (merchantId: string) => `${PREFIX}:core:cashiers:${merchantId}`,
} as const;
