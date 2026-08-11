export const AuthErrorCode = {
  EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  USER_INACTIVE: 'USER_INACTIVE',
  USER_NOT_FOUND: 'USER_NOT_FOUND'
} as const;

export type AuthErrorCode =
  (typeof AuthErrorCode)[keyof typeof AuthErrorCode];
