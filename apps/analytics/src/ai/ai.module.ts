import { Module } from '@nestjs/common';
import { RpcClientsModule } from '../clients/clients.module';
import { LlmClient } from './llm/llm.client';
import { ToolExecutor } from './tools/tool-executor';
import { AiService } from './ai.service';

@Module({
  imports: [RpcClientsModule],
  providers: [LlmClient, ToolExecutor, AiService],
  exports: [AiService, ToolExecutor],
})
export class AiModule {}
