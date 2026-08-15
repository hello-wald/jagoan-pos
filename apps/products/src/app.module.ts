import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_PIPE } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { ZodValidationPipe } from 'nestjs-zod';
import { buildLoggerOptions, validateEnv } from '@jagoan-pos/shared';
import { ENV_FILE_PATH, productsEnvSchema } from './config/env.schema';
import { ProductsModule } from './products/products.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [ENV_FILE_PATH],
      ignoreEnvFile: process.env.NODE_ENV === 'production',
      validate: validateEnv(productsEnvSchema),
    }),
    LoggerModule.forRoot(buildLoggerOptions('products')),
    ProductsModule,
  ],
  providers: [{ provide: APP_PIPE, useClass: ZodValidationPipe }],
})
export class AppModule {}
