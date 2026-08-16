import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_PIPE } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { ZodValidationPipe } from 'nestjs-zod';
import { buildLoggerOptions, validateEnv } from '@jagoan-pos/shared';
import { ENV_FILE_PATH, reportsEnvSchema } from './config/env.schema';
import { ClickHouseModule } from './clickhouse/clickhouse.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [ENV_FILE_PATH],
      ignoreEnvFile: process.env.NODE_ENV === 'production',
      validate: validateEnv(reportsEnvSchema),
    }),
    LoggerModule.forRoot(buildLoggerOptions('reports')),
    ClickHouseModule,
    ReportsModule,
  ],
  providers: [{ provide: APP_PIPE, useClass: ZodValidationPipe }],
})
export class AppModule {}
