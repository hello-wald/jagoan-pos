import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_PIPE } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { ZodValidationPipe } from 'nestjs-zod';
import { buildLoggerOptions, validateEnv } from '@jagoan-pos/shared';
import { ENV_FILE_PATH, gatewayEnvSchema } from './config/env.schema';
import { RpcClientsModule } from './clients/clients.module';
import { JwtStrategy } from './common/strategies/jwt.strategy';
import { HealthController } from './routes/health/health.controller';
import { AuthModule } from './routes/auth/auth.module';
import { StaffModule } from './routes/staff/staff.module';
import { ProductsModule } from './routes/products/products.module';
import { ReportsModule } from './routes/reports/reports.module';
import { TransactionsModule } from './routes/transactions/transactions.module';
import { InventoryModule } from './routes/inventory/inventory.module';
import { AiInsightModule } from './routes/ai-insight/ai-insight.module';
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [ENV_FILE_PATH],
      ignoreEnvFile: process.env.NODE_ENV === 'production',
      validate: validateEnv(gatewayEnvSchema),
    }),
    LoggerModule.forRoot(buildLoggerOptions('api-gateway')),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 20 }]),
    RpcClientsModule,
    AuthModule,
    StaffModule,
    ProductsModule,
    ReportsModule,
    TransactionsModule,
    InventoryModule,
    AiInsightModule,
  ],

  controllers: [HealthController],
  providers: [JwtStrategy, { provide: APP_PIPE, useClass: ZodValidationPipe }],
})
export class AppModule {}
