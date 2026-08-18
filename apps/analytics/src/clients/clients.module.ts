import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { AnalyticsEnv } from '../config/env.schema';
import { REPORTS_CLIENT, ReportsClient } from './reports.client';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: REPORTS_CLIENT,
        inject: [ConfigService],
        useFactory: (config: ConfigService<AnalyticsEnv, true>) => ({
          transport: Transport.TCP,
          options: {
            host: config.get('REPORTS_HOST', { infer: true }),
            port: config.get('REPORTS_TCP_PORT', { infer: true }),
          },
        }),
      },
    ]),
  ],
  providers: [ReportsClient],
  exports: [ReportsClient],
})
export class RpcClientsModule {}
