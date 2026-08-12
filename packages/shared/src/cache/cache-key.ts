export const redisKeys = {
  core: {
    cashiers: (merchantId: string) =>
      `appk:core:cashiers:${merchantId}`,
  },
} as const;