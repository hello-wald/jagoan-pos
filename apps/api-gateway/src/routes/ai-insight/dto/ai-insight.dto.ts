import { createZodDto } from 'nestjs-zod';
import { aiChatMessageSchema } from '@jagoan-pos/contracts';

export class AiChatMessageDto extends createZodDto(aiChatMessageSchema) {}
