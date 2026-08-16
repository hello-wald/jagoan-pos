import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { PRODUCTS_CLIENT, ProductsClient } from '../clients/products.client';
import { ConfigService } from '@nestjs/config';
import { TransactionsEnv } from '../config/env.schema';
import { TransactionsPrismaModule } from '../prisma/prisma.module';

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
  controllers: [InventoryController],
  providers: [InventoryService, ProductsClient],
  exports: [InventoryService],
})
export class InventoryModule {}
