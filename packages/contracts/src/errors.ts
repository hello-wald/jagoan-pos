export const AppErrorCode = {
  EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  USER_INACTIVE: 'USER_INACTIVE',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  CASHIER_NOT_FOUND: 'CASHIER_NOT_FOUND',
  PRODUCT_NOT_FOUND: 'PRODUCT_NOT_FOUND',
  SKU_ALREADY_EXISTS: 'SKU_ALREADY_EXISTS',
  PERMANENT_DELETE_FORBIDDEN: 'PERMANENT_DELETE_FORBIDDEN',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type AppErrorCode = (typeof AppErrorCode)[keyof typeof AppErrorCode];

/** The only payload shape an RpcException may carry. */
export interface RpcErrorShape {
  code: AppErrorCode;
  message: string;
}
