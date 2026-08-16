import { Module } from '@nestjs/common';
import { PostgresService } from '../db/postgres.service';
import { PublisherService } from '../rabbitmq/publisher.service';
import { OutboxRepository } from './outbox.repository';
import { RelayService } from './relay.service';

@Module({
  providers: [PostgresService, OutboxRepository, PublisherService, RelayService],
})
export class RelayModule {}
