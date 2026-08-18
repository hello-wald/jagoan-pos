import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RpcException } from '@nestjs/microservices';
import {
  AppErrorCode,
  type AiChatRequest,
  type DashboardTotals,
  type RevenueRange,
} from '@jagoan-pos/contracts';
import { AiService } from './ai.service';
import { LlmClient } from './llm/llm.client';
import { ToolExecutor } from './tools/tool-executor';
import type { LlmResponse } from './llm/llm.types';

describe('AiService', () => {
  let service: AiService;
  let llmClientMock: jest.Mocked<Pick<LlmClient, 'generate'>>;
  let toolExecutorMock: jest.Mocked<Pick<ToolExecutor, 'execute'>>;

  const merchantId = '123e4567-e89b-12d3-a456-426614174000';

  const dashboardResult: DashboardTotals = {
    asOf: '2026-08-18T10:00:00.000Z',
    day: '2026-08-18',
    revenue: 500000,
    transactions: 10,
    units: 20,
    averageBasket: 50000,
  };

  const revenueRangeThisWeek: RevenueRange = {
    asOf: '2026-08-18T12:00:00.000Z',
    from: '2026-08-11',
    to: '2026-08-18',
    totalRevenue: 1000000,
    totalTransactions: 20,
    averageBasket: 50000,
    days: [],
  };

  const revenueRangeLastWeek: RevenueRange = {
    asOf: '2026-08-18T08:00:00.000Z',
    from: '2026-08-04',
    to: '2026-08-10',
    totalRevenue: 800000,
    totalTransactions: 16,
    averageBasket: 50000,
    days: [],
  };

  beforeEach(async () => {
    llmClientMock = {
      generate: jest.fn(),
    };

    toolExecutorMock = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        {
          provide: LlmClient,
          useValue: llmClientMock,
        },
        {
          provide: ToolExecutor,
          useValue: toolExecutorMock,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'AI_MAX_TOOL_CALLS') return 3;
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
  });

  describe('direct conversation and out-of-scope refusals', () => {
    it('returns text directly without calling tool executor when no tools are requested', async () => {
      const llmResponse: LlmResponse = {
        text: 'Halo! Saya AI Insight Jagoan POS. Ada yang bisa saya bantu menganalisis penjualan Anda?',
        functionCalls: [],
      };
      llmClientMock.generate.mockResolvedValueOnce(llmResponse);

      const request: AiChatRequest = {
        merchantId,
        message: 'Halo, kamu siapa?',
      };

      const result = await service.chat(request);

      expect(result).toEqual({
        answer:
          'Halo! Saya AI Insight Jagoan POS. Ada yang bisa saya bantu menganalisis penjualan Anda?',
        asOf: null,
      });
      expect(toolExecutorMock.execute).not.toHaveBeenCalled();
      expect(llmClientMock.generate).toHaveBeenCalledTimes(1);
    });

    it('handles out-of-scope refusal gracefully without executing tools', async () => {
      const refusalText =
        'Maaf, saya hanya dapat membantu menjawab pertanyaan seputar analitik dan data performa penjualan toko Anda.';
      llmClientMock.generate.mockResolvedValueOnce({
        text: refusalText,
        functionCalls: [],
      });

      const request: AiChatRequest = {
        merchantId,
        message: 'Bagaimana cara membuat resep nasi goreng enak?',
      };

      const result = await service.chat(request);

      expect(result).toEqual({
        answer: refusalText,
        asOf: null,
      });
      expect(toolExecutorMock.execute).not.toHaveBeenCalled();
    });
  });

  describe('tool execution, sequential rounds, and multi-response handling', () => {
    it('orchestrates single tool call, executes tool, and returns final answer with asOf', async () => {
      llmClientMock.generate.mockResolvedValueOnce({
        text: null,
        functionCalls: [{ name: 'getDashboardSummary', args: {} }],
        modelContent: {
          role: 'model',
          parts: [{ functionCall: { name: 'getDashboardSummary', args: {} } }],
        },
      });

      toolExecutorMock.execute.mockResolvedValueOnce({
        data: dashboardResult,
        asOf: dashboardResult.asOf,
      });

      llmClientMock.generate.mockResolvedValueOnce({
        text: 'Omset toko Anda hari ini adalah Rp 500.000 dari 10 transaksi.',
        functionCalls: [],
      });

      const request: AiChatRequest = {
        merchantId,
        message: 'Berapa omset hari ini?',
      };

      const result = await service.chat(request);

      expect(result).toEqual({
        answer: 'Omset toko Anda hari ini adalah Rp 500.000 dari 10 transaksi.',
        asOf: dashboardResult.asOf,
      });

      expect(toolExecutorMock.execute).toHaveBeenCalledWith(
        'getDashboardSummary',
        {},
        { merchantId },
      );
      expect(llmClientMock.generate).toHaveBeenCalledTimes(2);
    });

    it('orchestrates sequential multi-round tool execution and preserves modelContent', async () => {
      // Round 1: Model asks for revenue of this week
      llmClientMock.generate.mockResolvedValueOnce({
        text: null,
        functionCalls: [
          { name: 'getRevenueRange', args: { from: '2026-08-11', to: '2026-08-18' } },
        ],
        modelContent: {
          role: 'model',
          parts: [
            {
              functionCall: {
                name: 'getRevenueRange',
                args: { from: '2026-08-11', to: '2026-08-18' },
              },
            },
          ],
        },
      });

      toolExecutorMock.execute.mockResolvedValueOnce({
        data: revenueRangeThisWeek,
        asOf: revenueRangeThisWeek.asOf,
      });

      // Round 2: Model then asks for revenue of last week sequentially
      llmClientMock.generate.mockResolvedValueOnce({
        text: null,
        functionCalls: [
          { name: 'getRevenueRange', args: { from: '2026-08-04', to: '2026-08-10' } },
        ],
        modelContent: {
          role: 'model',
          parts: [
            {
              functionCall: {
                name: 'getRevenueRange',
                args: { from: '2026-08-04', to: '2026-08-10' },
              },
            },
          ],
        },
      });

      toolExecutorMock.execute.mockResolvedValueOnce({
        data: revenueRangeLastWeek,
        asOf: revenueRangeLastWeek.asOf,
      });

      // Round 3: Model summarizes comparison
      llmClientMock.generate.mockResolvedValueOnce({
        text: 'Omset naik 25% dibanding minggu lalu.',
        functionCalls: [],
      });

      const result = await service.chat({
        merchantId,
        message: 'Bandingkan minggu ini dan minggu lalu.',
      });

      expect(result).toEqual({
        answer: 'Omset naik 25% dibanding minggu lalu.',
        asOf: '2026-08-18T08:00:00.000Z', // oldest asOf selected
      });

      expect(toolExecutorMock.execute).toHaveBeenCalledTimes(2);
      expect(llmClientMock.generate).toHaveBeenCalledTimes(3);
    });

    it('handles parallel tool calls in a single model turn correctly in unified user turn', async () => {
      // Model asks for 2 tools simultaneously in 1 modelContent
      llmClientMock.generate.mockResolvedValueOnce({
        text: null,
        functionCalls: [
          { name: 'getRevenueRange', args: { from: '2026-08-11', to: '2026-08-18' } },
          { name: 'getRevenueRange', args: { from: '2026-08-04', to: '2026-08-10' } },
        ],
        modelContent: {
          role: 'model',
          parts: [
            {
              functionCall: {
                name: 'getRevenueRange',
                args: { from: '2026-08-11', to: '2026-08-18' },
              },
            },
            {
              functionCall: {
                name: 'getRevenueRange',
                args: { from: '2026-08-04', to: '2026-08-10' },
              },
            },
          ],
        },
      });

      toolExecutorMock.execute
        .mockResolvedValueOnce({
          data: revenueRangeThisWeek,
          asOf: revenueRangeThisWeek.asOf,
        })
        .mockResolvedValueOnce({
          data: revenueRangeLastWeek,
          asOf: revenueRangeLastWeek.asOf,
        });

      llmClientMock.generate.mockResolvedValueOnce({
        text: 'Perbandingan omset minggu ini dan minggu lalu selesai dianalisis.',
        functionCalls: [],
      });

      const request: AiChatRequest = {
        merchantId,
        message: 'Bandingkan minggu ini dan lalu.',
      };

      const result = await service.chat(request);

      expect(result).toEqual({
        answer: 'Perbandingan omset minggu ini dan minggu lalu selesai dianalisis.',
        asOf: '2026-08-18T08:00:00.000Z',
      });

      expect(llmClientMock.generate).toHaveBeenNthCalledWith(
        2,
        expect.arrayContaining([
          {
            role: 'user',
            parts: [
              {
                functionResponse: {
                  name: 'getRevenueRange',
                  response: revenueRangeThisWeek as unknown as Record<string, unknown>,
                },
              },
              {
                functionResponse: {
                  name: 'getRevenueRange',
                  response: revenueRangeLastWeek as unknown as Record<string, unknown>,
                },
              },
            ],
          },
        ]),
      );
    });
  });

  describe('error handling and boundary guardrails', () => {
    it('propagates provider failure when LLM client throws RpcException with exact code and message', async () => {
      llmClientMock.generate.mockRejectedValueOnce(
        new RpcException({
          code: AppErrorCode.AI_TEMPORARILY_UNAVAILABLE,
          message: 'Provider timeout',
        }),
      );

      const request: AiChatRequest = {
        merchantId,
        message: 'Berapa omset hari ini?',
      };

      let thrownError: unknown;
      try {
        await service.chat(request);
      } catch (err) {
        thrownError = err;
      }

      expect(thrownError).toBeInstanceOf(RpcException);
      expect((thrownError as RpcException).getError()).toEqual({
        code: AppErrorCode.AI_TEMPORARILY_UNAVAILABLE,
        message: 'Provider timeout',
      });
    });

    it('propagates tool validation errors from ToolExecutor', async () => {
      llmClientMock.generate.mockResolvedValueOnce({
        text: null,
        functionCalls: [
          { name: 'getRevenueRange', args: { from: 'invalid-date', to: '2026-08-18' } },
        ],
      });

      toolExecutorMock.execute.mockRejectedValueOnce(
        new RpcException({
          code: AppErrorCode.AI_TOOL_ARGUMENTS_INVALID,
          message: 'Invalid date format',
        }),
      );

      const request: AiChatRequest = {
        merchantId,
        message: 'Cek omset',
      };

      await expect(service.chat(request)).rejects.toThrow(RpcException);
    });

    it('maps unexpected non-RpcException errors from ToolExecutor to AI_TEMPORARILY_UNAVAILABLE', async () => {
      llmClientMock.generate.mockResolvedValueOnce({
        text: null,
        functionCalls: [{ name: 'getDashboardSummary', args: {} }],
      });

      toolExecutorMock.execute.mockRejectedValueOnce(new Error('ClickHouse connection failed'));

      let thrownError: unknown;
      try {
        await service.chat({ merchantId, message: 'Cek omset' });
      } catch (err) {
        thrownError = err;
      }

      expect(thrownError).toBeInstanceOf(RpcException);
      expect((thrownError as RpcException).getError()).toEqual({
        code: AppErrorCode.AI_TEMPORARILY_UNAVAILABLE,
        message: 'Layanan analitik sedang tidak tersedia.',
      });
    });

    it('throws AI_TOOL_CALL_LIMIT_REACHED and asserts 4 LLM calls for 3 tool rounds', async () => {
      llmClientMock.generate.mockResolvedValue({
        text: null,
        functionCalls: [{ name: 'getDashboardSummary', args: {} }],
      });

      toolExecutorMock.execute.mockResolvedValue({
        data: dashboardResult,
        asOf: dashboardResult.asOf,
      });

      const request: AiChatRequest = {
        merchantId,
        message: 'Kenapa omset turun?',
      };

      let thrownError: unknown;
      try {
        await service.chat(request);
      } catch (err) {
        thrownError = err;
      }

      expect(thrownError).toBeInstanceOf(RpcException);
      expect((thrownError as RpcException).getError()).toEqual(
        expect.objectContaining({
          code: AppErrorCode.AI_TOOL_CALL_LIMIT_REACHED,
        }),
      );
      // 3 tool executions
      expect(toolExecutorMock.execute).toHaveBeenCalledTimes(3);
      // 4 LLM generate calls (round 0, 1, 2, 3)
      expect(llmClientMock.generate).toHaveBeenCalledTimes(4);
    });

    it('rejects message exceeding AI_MAX_MESSAGE_LENGTH with AI_TOOL_ARGUMENTS_INVALID', async () => {
      const oversizedMessage = 'a'.repeat(2001);

      let thrownError: unknown;
      try {
        await service.chat({ merchantId, message: oversizedMessage });
      } catch (err) {
        thrownError = err;
      }

      expect(thrownError).toBeInstanceOf(RpcException);
      expect((thrownError as RpcException).getError()).toEqual(
        expect.objectContaining({
          code: AppErrorCode.AI_TOOL_ARGUMENTS_INVALID,
        }),
      );
      expect(llmClientMock.generate).not.toHaveBeenCalled();
    });
  });
});

