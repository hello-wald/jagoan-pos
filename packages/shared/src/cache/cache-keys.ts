import { createHash } from "crypto";

const PREFIX = 'jagoan';

export const cacheKeys = {
  cashiers: (merchantId: string) => `${PREFIX}:core:cashiers:${merchantId}`,
  authLoginFailures: (email: string) => {
    const hash = createHash('sha256').update(email.trim().toLowerCase()).digest('hex')
    return `${PREFIX}:core:auth:login-fail:${hash}`
  },
} as const;
