import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import type { TransactionsEnv } from '../config/env.schema';
import { PRODUCTS_CLIENT, ProductsClient } from './products.client';

/**
 * Registers every downstream proxy once. Feature modules import this rather
 * than calling ClientsModule.registerAsync themselves, so transport config has
 * a single home and the service opens one connection per downstream service.
 */
@Module({
  imports: [
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
  providers: [ProductsClient],
  exports: [ProductsClient],
})
export class RpcClientsModule {}
