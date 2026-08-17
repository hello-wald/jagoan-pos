import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import type { TransactionsEnv } from '../config/env.schema';

@Injectable()
export class TransactionsPrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(TransactionsPrismaService.name);

  constructor(config: ConfigService<TransactionsEnv, true>) {
    super({
      adapter: new PrismaPg({
        connectionString: config.get('TRANSACTIONS_DATABASE_URL', { infer: true }),
        max: config.get('TRANSACTIONS_DATABASE_POOL_MAX', { infer: true }),
      }),
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('prisma connected');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
