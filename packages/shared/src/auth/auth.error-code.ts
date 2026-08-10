export const AuthErrorCode = {
  EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',
} as const;

export type AuthErrorCode =
  (typeof AuthErrorCode)[keyof typeof AuthErrorCode];
