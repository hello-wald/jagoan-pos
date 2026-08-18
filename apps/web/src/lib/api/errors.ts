import { AppErrorCode } from '@jagoan-pos/contracts';

export type AppError = { code: AppErrorCode; status: number; message: string };

const KNOWN_CODES = new Set<string>(Object.values(AppErrorCode));

// HttpExceptions reach us without a `code`, so status is the only signal.
const CODE_BY_STATUS: Record<number, AppErrorCode> = {
  401: AppErrorCode.INVALID_CREDENTIALS,
  403: AppErrorCode.USER_INACTIVE,
  429: AppErrorCode.AUTH_RATE_LIMITED,
};

export function normalizeError(status: number, body: unknown): AppError {
  const record = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
  const rawCode = record.code;
  const code =
    typeof rawCode === 'string' && KNOWN_CODES.has(rawCode)
      ? (rawCode as AppErrorCode)
      : (CODE_BY_STATUS[status] ?? AppErrorCode.INTERNAL_ERROR);

  return {
    code,
    status,
    message: typeof record.message === 'string' ? record.message : 'Internal server error',
  };
}
