import type { Params } from 'nestjs-pino';

/** Shared logger config: pretty in dev, JSON in prod. */
export function buildLoggerOptions(serviceName: string): Params {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    pinoHttp: {
      name: serviceName,
      level: process.env.LOG_LEVEL ?? (isProd ? 'info' : 'debug'),
      autoLogging: isProd,
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
