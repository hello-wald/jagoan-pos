import { Type, type FunctionDeclaration } from '@google/genai';

export const ANALYTICS_TOOL_NAMES = [
  'getDashboardSummary',
  'getRevenueRange',
  'getTopProducts',
  'getHourlySales',
] as const;

export type AnalyticsToolName = (typeof ANALYTICS_TOOL_NAMES)[number];

export const ANALYTICS_TOOLS: FunctionDeclaration[] = [
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
      type: Type.OBJECT,
      properties: {
        from: {
          type: Type.STRING,
          format: 'date',
          description: 'Tanggal awal dalam format YYYY-MM-DD',
        },
        to: {
          type: Type.STRING,
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
      type: Type.OBJECT,
      properties: {
        from: {
          type: Type.STRING,
          format: 'date',
          description: 'Tanggal awal dalam format YYYY-MM-DD',
        },
        to: {
          type: Type.STRING,
          format: 'date',
          description: 'Tanggal akhir dalam format YYYY-MM-DD',
        },
        direction: {
          type: Type.STRING,
          enum: ['best', 'worst'],
          description: 'Urutkan terlaris (best) atau paling sedikit terjual (worst)',
        },
        limit: {
          type: Type.INTEGER,
          format: 'int32',
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
      type: Type.OBJECT,
      properties: {
        from: {
          type: Type.STRING,
          format: 'date',
          description: 'Tanggal awal dalam format YYYY-MM-DD',
        },
        to: {
          type: Type.STRING,
          format: 'date',
          description: 'Tanggal akhir dalam format YYYY-MM-DD',
        },
      },
      required: ['from', 'to'],
    },
  },
];

