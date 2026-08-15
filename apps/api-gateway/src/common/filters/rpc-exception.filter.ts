import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { AppErrorCode } from '@jagoan-pos/contracts';

const statusByCode: Record<string, HttpStatus> = {
  [AppErrorCode.EMAIL_ALREADY_EXISTS]: HttpStatus.CONFLICT,
  [AppErrorCode.INVALID_CREDENTIALS]: HttpStatus.UNAUTHORIZED,
  [AppErrorCode.USER_INACTIVE]: HttpStatus.FORBIDDEN,
  [AppErrorCode.USER_NOT_FOUND]: HttpStatus.NOT_FOUND,
  [AppErrorCode.CASHIER_NOT_FOUND]: HttpStatus.NOT_FOUND,
  [AppErrorCode.PRODUCT_NOT_FOUND]: HttpStatus.NOT_FOUND,
  [AppErrorCode.SKU_ALREADY_EXISTS]: HttpStatus.CONFLICT,
  [AppErrorCode.PERMANENT_DELETE_FORBIDDEN]: HttpStatus.METHOD_NOT_ALLOWED,
  [AppErrorCode.INSUFFICIENT_STOCK]: HttpStatus.CONFLICT,
  [AppErrorCode.PRODUCT_INACTIVE]: HttpStatus.UNPROCESSABLE_ENTITY,
  [AppErrorCode.INSUFFICIENT_CASH]: HttpStatus.UNPROCESSABLE_ENTITY,
  [AppErrorCode.SALE_NOT_FOUND]: HttpStatus.NOT_FOUND,
  [AppErrorCode.CHECKOUT_CONFLICT]: HttpStatus.CONFLICT,
};

/** Turns an RpcException payload from any service into an HTTP status. */
@Catch()
export class RpcExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();

      response
        .status(status)
        .json(typeof body === 'string' ? { statusCode: status, message: body } : body);
      return;
    }

    const { code, message } = extractRpcError(exception);
    const status = statusByCode[code] ?? HttpStatus.INTERNAL_SERVER_ERROR;

    response.status(status).json({ statusCode: status, code, message });
  }
}

function extractRpcError(exception: unknown): { code: string; message: string } {
  const fallback = { code: AppErrorCode.INTERNAL_ERROR, message: 'Internal server error' };

  if (typeof exception !== 'object' || exception === null) return fallback;

  // A TCP client rejects with the raw payload, or wraps it under `error`.
  const record = exception as Record<string, unknown>;
  const nested = record.error;
  const source = (typeof nested === 'object' && nested !== null ? nested : record) as Record<
    string,
    unknown
  >;

  return {
    code: typeof source.code === 'string' ? source.code : fallback.code,
    message: typeof source.message === 'string' ? source.message : fallback.message,
  };
}
