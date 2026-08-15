import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import type { TransactionsEnv } from '../config/env.schema';
import { PRODUCTS_CLIENT, ProductsClient } from '../clients/products.client';
import { TransactionsPrismaModule } from '../prisma/prisma.module';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';

@Module({
  imports: [
    TransactionsPrismaModule,
    ClientsModule.registerAsync([
      {
        name: PRODUCTS_CLIENT,
        inject: [ConfigService],
        useFactory: (config: ConfigService<TransactionsEnv, true>) => ({
          transport: Transport.TCP,
          options: {
            host: config.get('PRODUCTS_HOST', { infer: true }),
            port: config.get('PRODUCTS_TCP_PORT', { infer: true }),
          },
        }),
      },
    ]),
  ],
  controllers: [SalesController],
  providers: [SalesService, ProductsClient],
})
export class SalesModule {}
