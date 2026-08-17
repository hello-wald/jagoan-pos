import { type ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import type {
  ThrottlerLimitDetail,
  ThrottlerModuleOptions,
  ThrottlerStorage,
} from '@nestjs/throttler';
import { AppErrorCode } from '@jagoan-pos/contracts';
import { AuthThrottlerGuard } from './auth-throttler.guard';

// throwThrottlingException is protected; widening it here is the only way to
// exercise it without standing up a full Nest request pipeline.
class ExposedGuard extends AuthThrottlerGuard {
  override throwThrottlingException(
    context: ExecutionContext,
    detail: ThrottlerLimitDetail,
  ): Promise<void> {
    return super.throwThrottlingException(context, detail);
  }
}

function buildGuard(): ExposedGuard {
  return new ExposedGuard(
    [] as unknown as ThrottlerModuleOptions,
    {} as ThrottlerStorage,
    {} as Reflector,
  );
}

describe('AuthThrottlerGuard', () => {
  // Without this the gateway answers a throttled login with a bare 429 while
  // core's own lockout answers with AUTH_RATE_LIMITED — same event, two shapes.
  it('throws a 429 carrying AUTH_RATE_LIMITED', async () => {
    const guard = buildGuard();

    const thrown = await guard
      .throwThrottlingException({} as ExecutionContext, {} as ThrottlerLimitDetail)
      .then(
        () => null,
        (error: unknown) => error,
      );

    expect(thrown).toBeInstanceOf(HttpException);
    const error = thrown as HttpException;
    expect(error.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    expect(error.getResponse()).toEqual({
      statusCode: HttpStatus.TOO_MANY_REQUESTS,
      code: AppErrorCode.AUTH_RATE_LIMITED,
      message: 'Too many login attempts. Try again later.',
    });
  });
});
