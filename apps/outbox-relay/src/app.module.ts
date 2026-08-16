import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { buildLoggerOptions, validateEnv } from '@jagoan-pos/shared';
import { ENV_FILE_PATH, outboxRelayEnvSchema } from './config/env.schema';
import { RelayModule } from './relay/relay.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [ENV_FILE_PATH],
      ignoreEnvFile: process.env.NODE_ENV === 'production',
      validate: validateEnv(outboxRelayEnvSchema),
    }),
    LoggerModule.forRoot(buildLoggerOptions('outbox-relay')),
    RelayModule,
  ],
})
export class AppModule {}
