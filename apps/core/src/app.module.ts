import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_PIPE } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { ZodValidationPipe } from 'nestjs-zod';
import { buildLoggerOptions, validateEnv } from '@jagoan-pos/shared';
import { RedisModule } from '@jagoan-pos/redis';
import { ENV_FILE_PATH, coreEnvSchema } from './config/env.schema';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { StaffModule } from './staff/staff.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [ENV_FILE_PATH],
      ignoreEnvFile: process.env.NODE_ENV === 'production',
      validate: validateEnv(coreEnvSchema),
    }),
    LoggerModule.forRoot(buildLoggerOptions('core')),
    PrismaModule,
    RedisModule,
    AuthModule,
    StaffModule,
  ],
  providers: [{ provide: APP_PIPE, useClass: ZodValidationPipe }],
})
export class AppModule {}
