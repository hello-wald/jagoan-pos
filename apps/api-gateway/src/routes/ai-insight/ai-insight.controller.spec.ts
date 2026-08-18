import { ForbiddenException } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { aiChatMessageSchema, type AuthUser } from '@jagoan-pos/contracts';
import { AnalyticsClient } from '../../clients/analytics.client';
import { AiInsightController } from './ai-insight.controller';
import type { AiChatMessageDto } from './dto/ai-insight.dto';

describe('AiInsightController', () => {
  let controller: AiInsightController;
  let analyticsClientMock: jest.Mocked<Pick<AnalyticsClient, 'send'>>;

  const merchantId = '123e4567-e89b-12d3-a456-426614174000';
  const ownerUser: AuthUser = {
    id: 'user-1',
    email: 'owner@example.com',
    fullName: 'Owner Jagoan',
    merchantName: 'Toko Kopi',
    role: 'OWNER',
    isActive: true,
    merchantId,
  };

  beforeEach(async () => {
    analyticsClientMock = {
      send: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiInsightController],
      providers: [
        {
          provide: AnalyticsClient,
          useValue: analyticsClientMock,
        },
      ],
    }).compile();

    controller = module.get<AiInsightController>(AiInsightController);
  });

  describe('POST /api/ai-insight/chat', () => {
    it('successfully extracts merchantId from JWT user and forwards message to analytics client', async () => {
      const mockResponse = {
        answer: 'Omset toko Anda hari ini Rp 1.500.000.',
        asOf: '2026-08-18T10:00:00.000Z',
      };
      analyticsClientMock.send.mockResolvedValueOnce(mockResponse);

      const body: AiChatMessageDto = {
        message: 'Berapa omset hari ini?',
      };

      const result = await controller.chat(ownerUser, body);

      expect(analyticsClientMock.send).toHaveBeenCalledWith('ai.chat', {
        merchantId,
        message: 'Berapa omset hari ini?',
      });
      expect(result).toEqual(mockResponse);
    });

    it('ignores client-supplied merchantId and uses verified JWT user merchantId', async () => {
      const mockResponse = {
        answer: 'Omset toko Anda hari ini Rp 1.500.000.',
        asOf: '2026-08-18T10:00:00.000Z',
      };
      analyticsClientMock.send.mockResolvedValueOnce(mockResponse);

      // Malicious attempt to inject different merchantId via body
      const maliciousBody = {
        message: 'Berapa omset hari ini?',
        merchantId: '99999999-9999-9999-9999-999999999999',
      } as unknown as AiChatMessageDto;

      const result = await controller.chat(ownerUser, maliciousBody);

      expect(analyticsClientMock.send).toHaveBeenCalledWith('ai.chat', {
        merchantId: ownerUser.merchantId, // MUST use verified JWT user.merchantId
        message: 'Berapa omset hari ini?',
      });
      expect(analyticsClientMock.send).not.toHaveBeenCalledWith(
        'ai.chat',
        expect.objectContaining({
          merchantId: '99999999-9999-9999-9999-999999999999',
        }),
      );
      expect(result).toEqual(mockResponse);
    });

    it('throws ForbiddenException if user has no merchantId attached', () => {
      const userWithoutMerchant: AuthUser = {
        id: 'admin-1',
        email: 'admin@example.com',
        fullName: 'Global Admin',
        merchantName: null,
        role: 'GLOBAL_ADMIN',
        isActive: true,
        merchantId: null,
      };

      const body: AiChatMessageDto = {
        message: 'Berapa omset platform?',
      };

      expect(() => controller.chat(userWithoutMerchant, body)).toThrow(
        ForbiddenException,
      );
      expect(analyticsClientMock.send).not.toHaveBeenCalled();
    });

    describe('DTO / schema validations', () => {
      it('rejects empty or whitespace-only messages', () => {
        expect(aiChatMessageSchema.safeParse({ message: '' }).success).toBe(false);
        expect(aiChatMessageSchema.safeParse({ message: '   ' }).success).toBe(false);
      });

      it('rejects messages exceeding 2000 characters', () => {
        const validMax = 'a'.repeat(2000);
        const oversized = 'a'.repeat(2001);

        expect(aiChatMessageSchema.safeParse({ message: validMax }).success).toBe(true);
        expect(aiChatMessageSchema.safeParse({ message: oversized }).success).toBe(false);
      });
    });
  });
});
