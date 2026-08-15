import {
  ArgumentsHost,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthErrorCode, StaffErrorCode } from '@jagoan-pos/shared';

type RpcErrorPayload = {
  code?: string;
  message?: string;
};

//mapping error , nanti kalo mulai banyak yang mappping nya sama 
// , bisa pake set di kelommpokin , skrg gausah dlu.
const errorStatusByCode: Record<string, HttpStatus> = {
  [AuthErrorCode.EMAIL_ALREADY_EXISTS]: HttpStatus.CONFLICT,
  [AuthErrorCode.INVALID_CREDENTIALS]: HttpStatus.UNAUTHORIZED,
  [AuthErrorCode.USER_INACTIVE]: HttpStatus.FORBIDDEN,
  [AuthErrorCode.USER_NOT_FOUND]: HttpStatus.NOT_FOUND,
  [StaffErrorCode.CASHIER_NOT_FOUND]: HttpStatus.NOT_FOUND
};


// filter response 
export class RpcErrorFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      response.status(status).json(
        typeof exceptionResponse === 'string'
          ? {
              statusCode: status,
              message: exceptionResponse,
            }
          : exceptionResponse,
      );
      return;
    }

    const payload = this.extractPayload(exception);
    const code = payload.code ?? 'INTERNAL_SERVER_ERROR';
    const status = errorStatusByCode[code] ?? HttpStatus.INTERNAL_SERVER_ERROR;

    response.status(status).json({
      statusCode: status,
      code,
      message: payload.message ?? 'Internal server error',
    });
  }

  private extractPayload(exception: unknown): RpcErrorPayload {
    if (typeof exception !== 'object' || exception === null) {
      return {};
    }

    const record = exception as Record<string, unknown>;
    const nestedError = record.error;

    if (typeof nestedError === 'object' && nestedError !== null) {
      const nestedRecord = nestedError as Record<string, unknown>;

      return {
        code:
          typeof nestedRecord.code === 'string'
            ? nestedRecord.code
            : undefined,
        message:
          typeof nestedRecord.message === 'string'
            ? nestedRecord.message
            : undefined,
      };
    }

    return {
      code: typeof record.code === 'string' ? record.code : undefined,
      message:
        typeof record.message === 'string' ? record.message : undefined,
    };
  }
}
