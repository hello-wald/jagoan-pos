import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { analyticsEnvSchema, ENV_FILE_PATH } from './config/env.schema';
import { buildLoggerOptions, validateEnv } from '@jagoan-pos/shared';
import { LoggerModule } from 'nestjs-pino';
import { APP_PIPE } from '@nestjs/core';
import { ZodValidationPipe } from 'nestjs-zod';
import { RpcClientsModule } from './clients/clients.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [ENV_FILE_PATH],
      ignoreEnvFile: process.env.NODE_ENV === 'production',
      validate: validateEnv(analyticsEnvSchema),
    }),
    LoggerModule.forRoot(buildLoggerOptions('analytics')),
    RpcClientsModule,
  ],
  providers: [{ provide: APP_PIPE, useClass: ZodValidationPipe }],
})
export class AppModule {}
