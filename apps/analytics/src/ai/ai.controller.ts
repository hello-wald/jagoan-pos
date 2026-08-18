import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { aiChatRequestSchema, type AiChatResponse } from '@jagoan-pos/contracts';
import { AiService } from './ai.service';

@Controller()
export class AiController {
  constructor(private readonly ai: AiService) {}

  @MessagePattern('ai.chat')
  chat(@Payload() payload: unknown): Promise<AiChatResponse> {
    return this.ai.chat(aiChatRequestSchema.parse(payload));
  }
}
