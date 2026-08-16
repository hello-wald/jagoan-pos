import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import type { GatewayEnv } from '../config/env.schema';
import { CORE_CLIENT, CoreClient } from './core.client';
import { PRODUCTS_CLIENT, ProductsClient } from './products.client';
import { REPORTS_CLIENT, ReportsClient } from './reports.client';
import { TRANSACTIONS_CLIENT, TransactionsClient } from './transactions.client';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: CORE_CLIENT,
        inject: [ConfigService],
        useFactory: (config: ConfigService<GatewayEnv, true>) => ({
          transport: Transport.TCP,
          options: {
            host: config.get('CORE_HOST', { infer: true }),
            port: config.get('CORE_TCP_PORT', { infer: true }),
          },
        }),
      },
      {
        name: PRODUCTS_CLIENT,
        inject: [ConfigService],
        useFactory: (config: ConfigService<GatewayEnv, true>) => ({
          transport: Transport.TCP,
          options: {
            host: config.get('PRODUCTS_HOST', { infer: true }),
            port: config.get('PRODUCTS_TCP_PORT', { infer: true }),
          },
        }),
      },
      {
        name: TRANSACTIONS_CLIENT,
        inject: [ConfigService],
        useFactory: (config: ConfigService<GatewayEnv, true>) => ({
          transport: Transport.TCP,
          options: {
            host: config.get('TRANSACTIONS_HOST', { infer: true }),
            port: config.get('TRANSACTIONS_TCP_PORT', { infer: true }),
          },
        }),
      },
      {
        name: REPORTS_CLIENT,
        inject: [ConfigService],
        useFactory: (config: ConfigService<GatewayEnv, true>) => ({
          transport: Transport.TCP,
          options: {
            host: config.get('REPORTS_HOST', { infer: true }),
            port: config.get('REPORTS_TCP_PORT', { infer: true }),
          },
        }),
      },
    ]),
  ],
  providers: [CoreClient, ProductsClient, ReportsClient, TransactionsClient],
  exports: [CoreClient, ProductsClient, ReportsClient, TransactionsClient],
})
export class RpcClientsModule {}
