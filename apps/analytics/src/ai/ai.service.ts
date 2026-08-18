import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RpcException } from '@nestjs/microservices';
import { AppErrorCode, type AiChatRequest, type AiChatResponse } from '@jagoan-pos/contracts';
import type { AnalyticsEnv } from '../config/env.schema';
import { LlmClient } from './llm/llm.client';
import type { LlmContent, LlmPart } from './llm/llm.types';
import { ToolExecutor } from './tools/tool-executor';
import type { AnalyticsToolName } from './tools/tool-registry';

@Injectable()
export class AiService {
  private readonly maxToolCalls: number;
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly llmClient: LlmClient,
    private readonly toolExecutor: ToolExecutor,
    config: ConfigService<AnalyticsEnv, true>,
  ) {
    this.maxToolCalls = config.get('AI_MAX_TOOL_CALLS', { infer: true }) ?? 3;
  }

  async chat(request: AiChatRequest): Promise<AiChatResponse> {
    const { merchantId, message } = request;

    const contents: LlmContent[] = [
      {
        role: 'user',
        parts: [{ text: message }],
      },
    ];

    const asOfTimestamps: string[] = [];
    let toolCallRound = 0;

    while (toolCallRound <= this.maxToolCalls) {
      const response = await this.llmClient.generate(contents);

      // Direct text response from LLM (no tool calls or final answer)
      if (response.functionCalls.length === 0) {
        return {
          answer: response.text ?? '',
          asOf: this.resolveOldestAsOf(asOfTimestamps),
        };
      }

      // Guardrail: if LLM returns tool calls but limit reached
      if (toolCallRound >= this.maxToolCalls) {
        throw new RpcException({
          code: AppErrorCode.AI_TOOL_CALL_LIMIT_REACHED,
          message: `Batas iterasi pemanggilan data analitik (${this.maxToolCalls} kali) telah tercapai.`,
        });
      }

      toolCallRound++;

      // 1. Record full model turn (preserving text, thoughts, and function calls)
      contents.push(
        response.modelContent ?? {
          role: 'model',
          parts: response.functionCalls.map((fc) => ({
            functionCall: fc,
          })),
        },
      );

      // 2. Execute all function calls and collect responses
      const functionResponseParts: LlmPart[] = [];
      for (const fc of response.functionCalls) {
        try {
          const result = await this.toolExecutor.execute(fc.name as AnalyticsToolName, fc.args, {
            merchantId,
          });

          if (result.asOf) {
            asOfTimestamps.push(result.asOf);
          }

          functionResponseParts.push({
            functionResponse: {
              name: fc.name,
              response: (result.data ?? {}) as Record<string, unknown>,
            },
          });
        } catch (error) {
          if (error instanceof RpcException) {
            throw error;
          }
          const msg = error instanceof Error ? error.message : 'Unknown database error';
          this.logger.error(`Tool execution failed for '${fc.name}': ${msg}`);
          throw new RpcException({
            code: AppErrorCode.AI_TEMPORARILY_UNAVAILABLE,
            message: 'Layanan analitik sedang tidak tersedia.',
          });
        }
      }

      // 3. Append all tool responses in a single user turn (required by Gemini multi-function spec)
      contents.push({
        role: 'user',
        parts: functionResponseParts,
      });
    }

    throw new RpcException({
      code: AppErrorCode.AI_TOOL_CALL_LIMIT_REACHED,
      message: `Batas iterasi pemanggilan data analitik (${this.maxToolCalls} kali) telah tercapai.`,
    });
  }

  private resolveOldestAsOf(timestamps: string[]): string | null {
    if (timestamps.length === 0) return null;
    const sorted = [...timestamps].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    return sorted[0] ?? null;
  }
}
