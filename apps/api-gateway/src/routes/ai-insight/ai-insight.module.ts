import { Module } from '@nestjs/common';
import { RpcClientsModule } from '../../clients/clients.module';
import { AiInsightController } from './ai-insight.controller';

@Module({
  imports: [RpcClientsModule],
  controllers: [AiInsightController],
})
export class AiInsightModule {}
