import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { resolve } from 'node:path';
import { buildLoggerOptions, validateEnv } from '@jagoan-pos/shared';
import { RedisModule } from '@jagoan-pos/redis';
import { coreEnvSchema } from './config/env.schema';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { StaffModule } from './staff/staff.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Resolved from __dirname, not process.cwd(). Under Docker the working
      // directory is /app while this file lives in /app/apps/core/dist, so a
      // cwd-relative path resolved to /.env and silently loaded nothing.
      envFilePath: [resolve(__dirname, '..', '.env')],
      ignoreEnvFile: process.env.NODE_ENV === 'production',
      validate: validateEnv(coreEnvSchema),
    }),
    LoggerModule.forRoot(buildLoggerOptions('core')),
    PrismaModule,
    RedisModule,
    AuthModule,
    StaffModule,
  ],
})
export class AppModule {}
