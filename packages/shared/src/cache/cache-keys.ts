const PREFIX = 'appk';

export const cacheKeys = {
  /** Session state: JSON AuthUser, or the literal string "revoked". */
  session: (jti: string) => `${PREFIX}:sess:${jti}`,
  /** Set of live jtis for a user, so deactivation can revoke them all (FRD AR-5). */
  userSessions: (userId: string) => `${PREFIX}:usess:${userId}`,
  /** Failed-login counter, 15-minute window (FRD US-1.1). */
  loginAttempts: (email: string) => `${PREFIX}:login-attempts:${email}`,
  /** Cashier list per merchant. */
  cashiers: (merchantId: string) => `${PREFIX}:core:cashiers:${merchantId}`,
} as const;
