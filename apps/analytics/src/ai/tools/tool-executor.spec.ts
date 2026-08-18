import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { RpcException } from '@nestjs/microservices';
import {
  AppErrorCode,
  type DashboardTotals,
  type HourlySales,
  type RevenueRange,
  type TopProducts,
} from '@jagoan-pos/contracts';
import { ReportsClient } from '../../clients/reports.client';
import { ToolExecutor } from './tool-executor';

describe('ToolExecutor', () => {
  let executor: ToolExecutor;
  let reportsClientMock: jest.Mocked<Pick<ReportsClient, 'send'>>;

  const merchantId = '123e4567-e89b-12d3-a456-426614174000';
  const attackerMerchantId = '987e6543-e21b-12d3-a456-426614174999';

  const dashboardResult: DashboardTotals = {
    asOf: '2026-08-18T10:00:00.000Z',
    day: '2026-08-18',
    revenue: 500_000,
    transactions: 10,
    units: 25,
    averageBasket: 50_000,
  };

  const revenueResult: RevenueRange = {
    asOf: '2026-08-18T10:00:00.000Z',
    from: '2026-08-01',
    to: '2026-08-15',
    totalRevenue: 1_000_000,
    totalTransactions: 20,
    averageBasket: 50_000,
    days: [{ day: '2026-08-01', revenue: 100_000, transactions: 2, units: 3 }],
  };

  const topProductsResult: TopProducts = {
    asOf: '2026-08-18T10:00:00.000Z',
    from: '2026-08-01',
    to: '2026-08-15',
    direction: 'best',
    products: [
      {
        productId: '223e4567-e89b-12d3-a456-426614174111',
        productName: 'Kopi Susu',
        sku: 'KOPI-SUSU-001',
        revenue: 250_000,
        units: 5,
        transactions: 4,
      },
    ],
  };

  const hourlyResult: HourlySales = {
    asOf: '2026-08-18T10:00:00.000Z',
    from: '2026-08-01',
    to: '2026-08-15',
    hours: [{ hour: 10, revenue: 100_000, transactions: 2, units: 3 }],
  };

  beforeEach(async () => {
    reportsClientMock = {
      send: jest.fn(),
    } as jest.Mocked<Pick<ReportsClient, 'send'>>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ToolExecutor,
        { provide: ReportsClient, useValue: reportsClientMock },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => (key === 'AI_MAX_RANGE_DAYS' ? 92 : undefined)),
          },
        },
      ],
    }).compile();

    executor = module.get<ToolExecutor>(ToolExecutor);
  });

  async function expectRpcError(promise: Promise<unknown>, code: AppErrorCode): Promise<void> {
    let error: unknown;
    try {
      await promise;
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(RpcException);
    expect((error as RpcException).getError()).toEqual(expect.objectContaining({ code }));
  }

  describe('security and allowlist', () => {
    it('rejects arbitrary tools before calling reports', async () => {
      await expectRpcError(
        executor.execute('execute_sql', { query: 'SELECT * FROM users' }, { merchantId }),
        AppErrorCode.AI_TOOL_NOT_ALLOWED,
      );

      expect(reportsClientMock.send).not.toHaveBeenCalled();
    });

    it('always injects the context merchant and never forwards a caller merchant', async () => {
      reportsClientMock.send.mockResolvedValueOnce(revenueResult);

      await executor.execute(
        'getRevenueRange',
        {
          merchantId: attackerMerchantId,
          from: '2026-08-01',
          to: '2026-08-15',
        },
        { merchantId },
      );

      expect(reportsClientMock.send).toHaveBeenCalledWith('reports.revenueRange', {
        merchantId,
        from: '2026-08-01',
        to: '2026-08-15',
      });
    });
  });

  describe('argument and date-range validation', () => {
    it('rejects invalid calendar dates without calling reports', async () => {
      await expectRpcError(
        executor.execute(
          'getRevenueRange',
          { from: '2026-02-31', to: '2026-03-01' },
          { merchantId },
        ),
        AppErrorCode.AI_TOOL_ARGUMENTS_INVALID,
      );

      expect(reportsClientMock.send).not.toHaveBeenCalled();
    });

    it('rejects a reversed date range without calling reports', async () => {
      await expectRpcError(
        executor.execute(
          'getRevenueRange',
          { from: '2026-08-15', to: '2026-08-01' },
          { merchantId },
        ),
        AppErrorCode.AI_TOOL_ARGUMENTS_INVALID,
      );

      expect(reportsClientMock.send).not.toHaveBeenCalled();
    });

    it('accepts exactly 92 inclusive calendar days', async () => {
      reportsClientMock.send.mockResolvedValueOnce(revenueResult);

      await expect(
        executor.execute(
          'getRevenueRange',
          { from: '2026-01-01', to: '2026-04-02' },
          { merchantId },
        ),
      ).resolves.toEqual({ data: revenueResult, asOf: revenueResult.asOf });

      expect(reportsClientMock.send).toHaveBeenCalledTimes(1);
    });

    it('rejects 93 inclusive calendar days', async () => {
      await expectRpcError(
        executor.execute(
          'getRevenueRange',
          { from: '2026-01-01', to: '2026-04-03' },
          { merchantId },
        ),
        AppErrorCode.AI_TOOL_ARGUMENTS_INVALID,
      );

      expect(reportsClientMock.send).not.toHaveBeenCalled();
    });

    it('rejects a top-products limit above 20', async () => {
      await expectRpcError(
        executor.execute(
          'getTopProducts',
          { from: '2026-08-01', to: '2026-08-15', limit: 21 },
          { merchantId },
        ),
        AppErrorCode.AI_TOOL_ARGUMENTS_INVALID,
      );

      expect(reportsClientMock.send).not.toHaveBeenCalled();
    });
  });

  describe('routing and result forwarding', () => {
    it('routes dashboard requests and forwards asOf', async () => {
      reportsClientMock.send.mockResolvedValueOnce(dashboardResult);

      await expect(executor.execute('getDashboardSummary', {}, { merchantId })).resolves.toEqual({
        data: dashboardResult,
        asOf: dashboardResult.asOf,
      });

      expect(reportsClientMock.send).toHaveBeenCalledWith('reports.dashboard', { merchantId });
      expect(reportsClientMock.send).toHaveBeenCalledTimes(1);
    });

    it('routes revenue-range requests with typed arguments', async () => {
      reportsClientMock.send.mockResolvedValueOnce(revenueResult);

      await executor.execute(
        'getRevenueRange',
        { from: '2026-08-01', to: '2026-08-15' },
        { merchantId },
      );

      expect(reportsClientMock.send).toHaveBeenCalledWith('reports.revenueRange', {
        merchantId,
        from: '2026-08-01',
        to: '2026-08-15',
      });
      expect(reportsClientMock.send).toHaveBeenCalledTimes(1);
    });

    it('routes top-products requests with default direction and limit', async () => {
      reportsClientMock.send.mockResolvedValueOnce(topProductsResult);

      await executor.execute(
        'getTopProducts',
        { from: '2026-08-01', to: '2026-08-15' },
        { merchantId },
      );

      expect(reportsClientMock.send).toHaveBeenCalledWith('reports.topProducts', {
        merchantId,
        from: '2026-08-01',
        to: '2026-08-15',
        direction: 'best',
        limit: 10,
      });
      expect(reportsClientMock.send).toHaveBeenCalledTimes(1);
    });

    it('routes hourly-sales requests with typed arguments', async () => {
      reportsClientMock.send.mockResolvedValueOnce(hourlyResult);

      await expect(
        executor.execute(
          'getHourlySales',
          { from: '2026-08-01', to: '2026-08-15' },
          { merchantId },
        ),
      ).resolves.toEqual({ data: hourlyResult, asOf: hourlyResult.asOf });

      expect(reportsClientMock.send).toHaveBeenCalledWith('reports.hourly', {
        merchantId,
        from: '2026-08-01',
        to: '2026-08-15',
      });
      expect(reportsClientMock.send).toHaveBeenCalledTimes(1);
    });
  });
});
