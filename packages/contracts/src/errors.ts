export const AppErrorCode = {
  // auth
  EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  USER_INACTIVE: 'USER_INACTIVE',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  TOO_MANY_ATTEMPTS: 'TOO_MANY_ATTEMPTS',
  SESSION_REVOKED: 'SESSION_REVOKED',
  // staff
  CASHIER_NOT_FOUND: 'CASHIER_NOT_FOUND',
  // generic
  FORBIDDEN: 'FORBIDDEN',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type AppErrorCode = (typeof AppErrorCode)[keyof typeof AppErrorCode];

/** The only payload shape an RpcException may carry. */
export interface RpcErrorShape {
  code: AppErrorCode;
  message: string;
}
