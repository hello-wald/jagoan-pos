import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import type { GatewayEnv } from '../config/env.schema';
import { CORE_CLIENT, CoreClient } from './core.client';

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
    ]),
  ],
  providers: [CoreClient],
  exports: [CoreClient],
})
export class RpcClientsModule {}
