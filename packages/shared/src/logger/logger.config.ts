import type { Params } from 'nestjs-pino';

/**
 * One logging configuration for all five apps. Pretty in dev, JSON in prod.
 * `correlationId` is bound per-request by the gateway middleware and forwarded
 * to services in RpcMeta.
 */
export function buildLoggerOptions(serviceName: string): Params {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    pinoHttp: {
      name: serviceName,
      level: process.env.LOG_LEVEL ?? (isProd ? 'info' : 'debug'),
      autoLogging: !isProd ? false : true,
      redact: {
        paths: [
          'req.headers.authorization',
          'req.body.password',
          '*.password',
          '*.passwordHash',
          '*.accessToken',
        ],
        censor: '[redacted]',
      },
      transport: isProd
        ? undefined
        : { target: 'pino-pretty', options: { singleLine: true, translateTime: 'HH:MM:ss' } },
    },
  };
}
