import { AppErrorCode } from '@jagoan-pos/contracts';
import { describe, expect, it } from 'vitest';
import { normalizeError } from './errors';

describe('normalizeError', () => {
  it('reads the code from a domain-error envelope', () => {
    const result = normalizeError(409, {
      statusCode: 409,
      code: AppErrorCode.SKU_ALREADY_EXISTS,
      message: 'SKU already exists',
    });
    expect(result.code).toBe(AppErrorCode.SKU_ALREADY_EXISTS);
    expect(result.status).toBe(409);
  });

  // ZodValidationPipe, RolesGuard and ThrottlerGuard all throw HttpExceptions,
  // which RpcExceptionFilter passes through WITHOUT a `code` field.
  it('falls back by status when the envelope carries no code', () => {
    expect(normalizeError(429, { statusCode: 429, message: 'Too Many Requests' }).code).toBe(
      AppErrorCode.AUTH_RATE_LIMITED,
    );
  });

  it('maps a bare 401 to invalid credentials', () => {
    expect(normalizeError(401, { statusCode: 401, message: 'Unauthorized' }).code).toBe(
      AppErrorCode.INVALID_CREDENTIALS,
    );
  });

  it('maps anything unrecognized to INTERNAL_ERROR', () => {
    expect(normalizeError(500, null).code).toBe(AppErrorCode.INTERNAL_ERROR);
    expect(normalizeError(418, 'teapot').code).toBe(AppErrorCode.INTERNAL_ERROR);
  });

  it('never trusts a non-string code', () => {
    expect(normalizeError(409, { statusCode: 409, code: 42 }).code).toBe(
      AppErrorCode.INTERNAL_ERROR,
    );
  });
});
