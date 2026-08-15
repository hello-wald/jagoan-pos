import { type ArgumentsHost, ForbiddenException, HttpStatus } from '@nestjs/common';
import { AppErrorCode } from '@jagoan-pos/contracts';
import { RpcExceptionFilter } from './rpc-exception.filter';

function hostWithResponse() {
  const response = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  const host = {
    switchToHttp: () => ({ getResponse: () => response }),
  } as unknown as ArgumentsHost;
  return { host, response };
}

describe('RpcExceptionFilter', () => {
  const filter = new RpcExceptionFilter();

  it('maps a known service error code to its HTTP status', () => {
    const { host, response } = hostWithResponse();

    filter.catch({ code: AppErrorCode.CASHIER_NOT_FOUND, message: 'Cashier not found' }, host);

    expect(response.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.NOT_FOUND,
      code: AppErrorCode.CASHIER_NOT_FOUND,
      message: 'Cashier not found',
    });
  });

  // A TCP client can reject with the payload nested under `error`.
  it('unwraps a payload nested under error', () => {
    const { host, response } = hostWithResponse();

    filter.catch(
      { error: { code: AppErrorCode.INVALID_CREDENTIALS, message: 'Invalid email or password' } },
      host,
    );

    expect(response.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
  });

  it('passes an HttpException through with its own status', () => {
    const { host, response } = hostWithResponse();

    filter.catch(new ForbiddenException('Insufficient permission'), host);

    expect(response.status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
  });

  // An unmapped or non-object failure must not leak internals as a 200 or a raw dump.
  it('falls back to a 500 with INTERNAL_ERROR for anything unrecognised', () => {
    const { host, response } = hostWithResponse();

    filter.catch(new Error('socket hang up'), host);

    expect(response.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: AppErrorCode.INTERNAL_ERROR,
      message: 'socket hang up',
    });
  });
});
