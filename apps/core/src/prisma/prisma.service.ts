import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';
import type { CoreEnv } from '../config/env.schema';

// Narrows the constructor's `Options` generic so the `log` tuple's literal
// levels flow through to `$on`'s event-name union. Without this, `extends
// PrismaClient` defaults that generic to `never` and every `$on(...)` call
// below fails to typecheck under `strict`.
type PrismaServiceOptions = {
  adapter: PrismaPg;
  log: [
    { emit: 'event'; level: 'query' },
    { emit: 'event'; level: 'warn' },
    { emit: 'event'; level: 'error' },
  ];
};

@Injectable()
export class PrismaService
  extends PrismaClient<PrismaServiceOptions>
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(config: ConfigService<CoreEnv, true>) {
    const adapter = new PrismaPg({
      connectionString: config.get('CORE_DATABASE_URL', { infer: true }),
      // Bounded so five Node processes cannot exhaust Postgres' connection
      // limit between them.
      max: config.get('CORE_DATABASE_POOL_MAX', { infer: true }),
    });

    super({
      adapter,
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'warn' },
        { emit: 'event', level: 'error' },
      ],
    });
  }

  async onModuleInit(): Promise<void> {
    this.$on('query', (event) => {
      this.logger.debug(`${event.duration}ms ${event.query}`);
    });
    this.$on('warn', (event) => this.logger.warn(event.message));
    this.$on('error', (event) => this.logger.error(event.message));

    // Fail the boot rather than logging and continuing into a broken process.
    await this.$connect();
    this.logger.log('prisma connected');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
