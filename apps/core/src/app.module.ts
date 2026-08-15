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
      // Resolved from __dirname, not process.cwd(). One shared .env lives at
      // the repo root (not per-service) so JWT_SECRET/REDIS_URL can't drift
      // between services; this file compiles to apps/core/dist/app.module.js,
      // so three levels up is the repo root.
      envFilePath: [resolve(__dirname, '..', '..', '..', '.env')],
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
