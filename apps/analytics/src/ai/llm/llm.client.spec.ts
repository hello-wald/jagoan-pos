import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RpcException } from '@nestjs/microservices';
import { Type } from '@google/genai';
import { AppErrorCode } from '@jagoan-pos/contracts';
import { LlmClient } from './llm.client';
import type { LlmContent, LlmToolDefinition } from './llm.types';

describe('LlmClient', () => {
  let client: LlmClient;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LlmClient,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'GEMINI_API_KEY') return 'mock-api-key';
              if (key === 'GEMINI_MODEL') return 'gemini-2.5-flash-lite';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    client = module.get<LlmClient>(LlmClient);
  });

  describe('mapToSdkContents', () => {
    it('correctly maps user text, model function call, and user function response', () => {
      const contents: LlmContent[] = [
        {
          role: 'user',
          parts: [{ text: 'Berapa omset hari ini?' }],
        },
        {
          role: 'model',
          parts: [
            {
              functionCall: {
                name: 'getDashboardSummary',
                args: {},
              },
            },
          ],
        },
        {
          role: 'user',
          parts: [
            {
              functionResponse: {
                name: 'getDashboardSummary',
                response: { revenue: 500000 },
              },
            },
          ],
        },
      ];

      const sdkContents = client.mapToSdkContents(contents);

      expect(sdkContents).toEqual([
        {
          role: 'user',
          parts: [{ text: 'Berapa omset hari ini?' }],
        },
        {
          role: 'model',
          parts: [
            {
              functionCall: {
                name: 'getDashboardSummary',
                args: {},
              },
            },
          ],
        },
        {
          role: 'user',
          parts: [
            {
              functionResponse: {
                name: 'getDashboardSummary',
                response: { revenue: 500000 },
              },
            },
          ],
        },
      ]);
    });
  });

  describe('mapToSdkTools', () => {
    it('correctly converts vendor-agnostic tool definitions to Gemini FunctionDeclarations with min/max', () => {
      const tools: LlmToolDefinition[] = [
        {
          name: 'getTopProducts',
          description: 'Mengambil data produk terlaris.',
          parameters: {
            type: 'object',
            properties: {
              from: {
                type: 'string',
                format: 'date',
                description: 'Tanggal mulai',
              },
              limit: {
                type: 'integer',
                format: 'int32',
                minimum: 1,
                maximum: 20,
                description: 'Batas jumlah',
              },
            },
            required: ['from'],
          },
        },
      ];

      const sdkTools = client.mapToSdkTools(tools);

      expect(sdkTools).toHaveLength(1);
      expect(sdkTools[0]?.name).toBe('getTopProducts');
      expect(sdkTools[0]?.description).toBe('Mengambil data produk terlaris.');
      expect(sdkTools[0]?.parameters).toEqual({
        type: Type.OBJECT,
        properties: {
          from: {
            type: Type.STRING,
            description: 'Tanggal mulai',
            format: 'date',
            enum: undefined,
            minimum: undefined,
            maximum: undefined,
          },
          limit: {
            type: Type.INTEGER,
            description: 'Batas jumlah',
            format: 'int32',
            enum: undefined,
            minimum: 1,
            maximum: 20,
          },
        },
        required: ['from'],
      });
    });
  });

  describe('generate execution & response parsing', () => {
    it('successfully maps Gemini candidate response into text, functionCalls, and modelContent', async () => {
      const mockGenerateContent = jest.fn().mockResolvedValueOnce({
        text: 'Ini respon teks',
        functionCalls: [{ name: 'getDashboardSummary', args: {} }],
        candidates: [
          {
            content: {
              role: 'model',
              parts: [
                { text: 'Ini respon teks' },
                { functionCall: { name: 'getDashboardSummary', args: {} } },
              ],
            },
          },
        ],
      });

      (
        client as unknown as { ai: { models: { generateContent: typeof mockGenerateContent } } }
      ).ai = {
        models: { generateContent: mockGenerateContent },
      };

      const result = await client.generate([{ role: 'user', parts: [{ text: 'Halo' }] }]);

      expect(result).toEqual({
        text: 'Ini respon teks',
        functionCalls: [{ name: 'getDashboardSummary', args: {} }],
        modelContent: {
          role: 'model',
          parts: [
            { text: 'Ini respon teks' },
            { functionCall: { name: 'getDashboardSummary', args: {} } },
          ],
        },
      });
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    it('catches SDK errors and throws AI_TEMPORARILY_UNAVAILABLE', async () => {
      const mockGenerateContent = jest.fn().mockRejectedValueOnce(new Error('Network timeout'));
      (
        client as unknown as { ai: { models: { generateContent: typeof mockGenerateContent } } }
      ).ai = {
        models: { generateContent: mockGenerateContent },
      };

      let thrownError: unknown;
      try {
        await client.generate([{ role: 'user', parts: [{ text: 'Halo' }] }]);
      } catch (err) {
        thrownError = err;
      }

      expect(thrownError).toBeInstanceOf(RpcException);
      expect((thrownError as RpcException).getError()).toEqual(
        expect.objectContaining({
          code: AppErrorCode.AI_TEMPORARILY_UNAVAILABLE,
        }),
      );
    });

    it('delegates complete to generate method', async () => {
      const generateSpy = jest.spyOn(client, 'generate').mockResolvedValueOnce({
        text: 'Halo dari complete',
        functionCalls: [],
      });

      const response = await client.complete({
        contents: [{ role: 'user', parts: [{ text: 'Hai' }] }],
      });

      expect(response.text).toBe('Halo dari complete');
      expect(generateSpy).toHaveBeenCalledTimes(1);
    });
  });
});
