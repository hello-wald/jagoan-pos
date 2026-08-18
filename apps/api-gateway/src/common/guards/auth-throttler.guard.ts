import { type ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ThrottlerGuard, type ThrottlerLimitDetail } from '@nestjs/throttler';
import { AppErrorCode } from '@jagoan-pos/contracts';

/**
 * ThrottlerGuard's own ThrottlerException carries no AppErrorCode, so a
 * throttled login would reach the client as a bare 429 while core's failed
 * attempt lockout answers the same event with AUTH_RATE_LIMITED. Rethrow in the
 * envelope every other gateway error uses, so clients branch on one code.
 */
@Injectable()
export class AuthThrottlerGuard extends ThrottlerGuard {
  protected override async throwThrottlingException(
    _context: ExecutionContext,
    _detail: ThrottlerLimitDetail,
  ): Promise<void> {
    throw new HttpException(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        code: AppErrorCode.AUTH_RATE_LIMITED,
        message: 'Too many login attempts. Try again later.',
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
