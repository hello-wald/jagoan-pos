import type { LlmToolDefinition } from '../llm/llm.types';

export const ANALYTICS_TOOL_NAMES = [
  'getDashboardSummary',
  'getRevenueRange',
  'getTopProducts',
  'getHourlySales',
] as const;

export type AnalyticsToolName = (typeof ANALYTICS_TOOL_NAMES)[number];

export const ANALYTICS_TOOLS: LlmToolDefinition[] = [
  {
    name: 'getDashboardSummary',
    description:
      'Mengambil ringkasan performa penjualan terkini (omset hari ini, total transaksi, rata-rata transaksi, dsb). Gunakan untuk pertanyaan seputar performa hari ini / ringkasan cepat. Mengembalikan totals omset hari ini dan bulan ini beserta timestamp asOf.',
  },
  {
    name: 'getRevenueRange',
    description:
      'Mengambil tren omset dan jumlah transaksi harian dalam rentang tanggal tertentu. Mengembalikan daftar interval harian (grossSales, netSales, ordersCount) dan totals keseluruhan.',
    parameters: {
      type: 'object',
      properties: {
        from: {
          type: 'string',
          format: 'date',
          description: 'Tanggal awal dalam format YYYY-MM-DD',
        },
        to: {
          type: 'string',
          format: 'date',
          description: 'Tanggal akhir dalam format YYYY-MM-DD',
        },
      },
      required: ['from', 'to'],
    },
  },
  {
    name: 'getTopProducts',
    description:
      'Mengambil daftar produk paling laris (best) atau paling kurang laku (worst) dalam rentang tanggal tertentu. Mengembalikan daftar item produk (name, quantity, grossSales).',
    parameters: {
      type: 'object',
      properties: {
        from: {
          type: 'string',
          format: 'date',
          description: 'Tanggal awal dalam format YYYY-MM-DD',
        },
        to: {
          type: 'string',
          format: 'date',
          description: 'Tanggal akhir dalam format YYYY-MM-DD',
        },
        direction: {
          type: 'string',
          enum: ['best', 'worst'],
          description: 'Urutkan terlaris (best) atau paling sedikit terjual (worst)',
        },
        limit: {
          type: 'integer',
          format: 'int32',
          minimum: 1,
          maximum: 20,
          description: 'Jumlah produk yang diambil (1-20, default 10)',
        },
      },
      required: ['from', 'to'],
    },
  },
  {
    name: 'getHourlySales',
    description:
      'Mengambil pola jam sibuk dan transaksi per jam dalam rentang tanggal tertentu. Mengembalikan distribusi transaksi dan penjualan per jam (0-23).',
    parameters: {
      type: 'object',
      properties: {
        from: {
          type: 'string',
          format: 'date',
          description: 'Tanggal awal dalam format YYYY-MM-DD',
        },
        to: {
          type: 'string',
          format: 'date',
          description: 'Tanggal akhir dalam format YYYY-MM-DD',
        },
      },
      required: ['from', 'to'],
    },
  },
];
