import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RpcException } from '@nestjs/microservices';
import {
  GoogleGenAI,
  Type,
  type Content,
  type FunctionDeclaration,
  type Part,
  type Schema,
} from '@google/genai';
import { AppErrorCode } from '@jagoan-pos/contracts';
import type { AnalyticsEnv } from '../../config/env.schema';
import { ANALYTICS_TOOLS } from '../tools/tool-registry';
import { SYSTEM_PROMPT } from '../ai.prompt';
import type { LlmContent, LlmInput, LlmPart, LlmResponse, LlmToolDefinition } from './llm.types';

@Injectable()
export class LlmClient {
  private readonly ai: GoogleGenAI;
  private readonly modelName: string;
  private readonly logger = new Logger(LlmClient.name);

  constructor(config: ConfigService<AnalyticsEnv, true>) {
    const apiKey = config.get('GEMINI_API_KEY', { infer: true });
    this.modelName = config.get('GEMINI_MODEL', { infer: true });
    this.ai = new GoogleGenAI({ apiKey });
  }

  async complete(
    input: LlmInput,
    tools: LlmToolDefinition[] = ANALYTICS_TOOLS,
  ): Promise<LlmResponse> {
    return this.generate(input.contents, tools);
  }

  async generate(
    contents: LlmContent[],
    tools: LlmToolDefinition[] = ANALYTICS_TOOLS,
  ): Promise<LlmResponse> {
    try {
      const sdkContents = this.mapToSdkContents(contents);
      const sdkTools = this.mapToSdkTools(tools);

      const response = await this.ai.models.generateContent({
        model: this.modelName,
        contents: sdkContents,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          tools: sdkTools.length > 0 ? [{ functionDeclarations: sdkTools }] : undefined,
          temperature: 0.2,
          maxOutputTokens: 1024,
        },
      });

      const functionCalls = (response.functionCalls ?? []).map((fc) => ({
        name: fc.name ?? '',
        args: (fc.args as Record<string, unknown>) ?? {},
      }));

      const candidateContent = response.candidates?.[0]?.content;
      const modelParts: LlmPart[] = candidateContent?.parts
        ? candidateContent.parts.map((p) => {
            if (p.functionCall) {
              return {
                functionCall: {
                  name: p.functionCall.name ?? '',
                  args: (p.functionCall.args as Record<string, unknown>) ?? {},
                },
              };
            }
            if (p.text) {
              return { text: p.text };
            }
            return {};
          })
        : functionCalls.map((fc) => ({ functionCall: fc }));

      const modelContent: LlmContent = {
        role: 'model',
        parts: modelParts,
      };

      return {
        text: response.text ?? null,
        functionCalls,
        modelContent,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown provider error';
      this.logger.error(`Gemini API call failed: ${message}`);
      throw new RpcException({
        code: AppErrorCode.AI_TEMPORARILY_UNAVAILABLE,
        message: 'Layanan AI sedang tidak tersedia atau timeout. Coba lagi sebentar.',
      });
    }
  }

  mapToSdkContents(contents: LlmContent[]): Content[] {
    return contents.map((c) => ({
      role: c.role,
      parts: c.parts.map((p): Part => {
        if (p.functionCall) {
          return { functionCall: p.functionCall };
        }
        if (p.functionResponse) {
          return { functionResponse: p.functionResponse };
        }
        return { text: p.text ?? '' };
      }),
    }));
  }

  mapToSdkTools(tools: LlmToolDefinition[]): FunctionDeclaration[] {
    const typeMap: Record<string, Type> = {
      string: Type.STRING,
      number: Type.NUMBER,
      integer: Type.INTEGER,
      boolean: Type.BOOLEAN,
      object: Type.OBJECT,
      array: Type.ARRAY,
    };

    return tools.map((t) => {
      const decl: FunctionDeclaration = {
        name: t.name,
        description: t.description,
      };

      if (t.parameters) {
        const properties: Record<string, Schema> = {};
        for (const [key, prop] of Object.entries(t.parameters.properties)) {
          properties[key] = {
            type: typeMap[prop.type] ?? Type.STRING,
            description: prop.description,
            format: prop.format,
            enum: prop.enum,
            minimum: prop.minimum,
            maximum: prop.maximum,
          };
        }

        decl.parameters = {
          type: Type.OBJECT,
          properties,
          required: t.parameters.required,
        };
      }

      return decl;
    });
  }
}
