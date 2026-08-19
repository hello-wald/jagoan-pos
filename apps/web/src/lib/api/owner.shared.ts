import type {
  GetMerchantStockQueryInput,
  ListSalesQueryInput,
} from '@jagoan-pos/contracts';

export type OwnerDatePreset = 'TODAY' | '7D' | '30D' | 'MONTH_COMPARISON';

export const REPORT_TIME_ZONE = 'Asia/Jakarta'; // WIB

const formatLocalYmd = (date: Date): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: REPORT_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);

export function getPresetDateRange(
  preset: Exclude<OwnerDatePreset, 'MONTH_COMPARISON'>,
  now = new Date(),
): { from: string; to: string } {
  // Convert now to local date in Asia/Jakarta
  const nowYmd = formatLocalYmd(now);
  const [y, m, d] = nowYmd.split('-').map(Number);
  // Construct date in local day context
  const localDate = new Date(Date.UTC(y, m - 1, d));

  if (preset === 'TODAY') {
    return { from: nowYmd, to: nowYmd };
  }

  if (preset === '7D') {
    const fromDate = new Date(localDate);
    fromDate.setUTCDate(fromDate.getUTCDate() - 6);
    return { from: formatLocalYmd(fromDate), to: nowYmd };
  }

  if (preset === '30D') {
    const fromDate = new Date(localDate);
    fromDate.setUTCDate(fromDate.getUTCDate() - 29);
    return { from: formatLocalYmd(fromDate), to: nowYmd };
  }

  return { from: nowYmd, to: nowYmd };
}

export function getMonthComparisonRanges(now = new Date()): {
  current: { from: string; to: string };
  previous: { from: string; to: string };
} {
  const nowYmd = formatLocalYmd(now);
  const [y, m, d] = nowYmd.split('-').map(Number);

  // Current month: start of month to today
  const currentStart = new Date(Date.UTC(y, m - 1, 1));
  const currentEnd = new Date(Date.UTC(y, m - 1, d));

  // Previous month: start of prev month to same day (or last day of prev month)
  const prevMonthIndex = m - 2; // 0-indexed prev month
  const prevYear = prevMonthIndex < 0 ? y - 1 : y;
  const normalizedPrevMonth = (prevMonthIndex + 12) % 12;

  // Find max days in previous month
  const maxDaysInPrevMonth = new Date(Date.UTC(prevYear, normalizedPrevMonth + 1, 0)).getUTCDate();
  const prevDay = Math.min(d, maxDaysInPrevMonth);

  const prevStart = new Date(Date.UTC(prevYear, normalizedPrevMonth, 1));
  const prevEnd = new Date(Date.UTC(prevYear, normalizedPrevMonth, prevDay));

  return {
    current: {
      from: formatLocalYmd(currentStart),
      to: formatLocalYmd(currentEnd),
    },
    previous: {
      from: formatLocalYmd(prevStart),
      to: formatLocalYmd(prevEnd),
    },
  };
}

export function buildInventoryQuery(params: Partial<GetMerchantStockQueryInput>): string {
  const searchParams = new URLSearchParams();
  if (params.page !== undefined) searchParams.set('page', String(params.page));
  if (params.limit !== undefined) searchParams.set('limit', String(params.limit));
  const trimmed = params.search?.trim();
  if (trimmed) searchParams.set('search', trimmed);
  if (params.activeOnly !== undefined) searchParams.set('activeOnly', String(params.activeOnly));
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

export function buildTransactionsQuery(params: Partial<ListSalesQueryInput>): string {
  const searchParams = new URLSearchParams();
  if (params.page !== undefined) searchParams.set('page', String(params.page));
  if (params.limit !== undefined) searchParams.set('limit', String(params.limit));
  const trimmed = params.search?.trim();
  if (trimmed) searchParams.set('search', trimmed);
  if (params.startDate) searchParams.set('startDate', params.startDate);
  if (params.endDate) searchParams.set('endDate', params.endDate);
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

export const ownerReportKeys = {
  all: ['owner', 'reports'] as const,
  dashboard: ['owner', 'reports', 'dashboard'] as const,
  revenue: (from: string, to: string) => ['owner', 'reports', 'revenue', { from, to }] as const,
  topProducts: (params: { from: string; to: string; limit?: number; direction?: 'best' | 'worst' }) =>
    ['owner', 'reports', 'top-products', params] as const,
  hourly: (from: string, to: string) => ['owner', 'reports', 'hourly', { from, to }] as const,
};

export const ownerInventoryKeys = {
  all: ['owner', 'inventory'] as const,
  summary: ['owner', 'inventory', 'summary'] as const,
  list: (params: Partial<GetMerchantStockQueryInput>) =>
    ['owner', 'inventory', 'list', params] as const,
};

export const ownerStaffKeys = {
  all: ['owner', 'staff'] as const,
  cashiers: ['owner', 'staff', 'cashiers'] as const,
};

export const ownerTransactionKeys = {
  all: ['owner', 'transactions'] as const,
  list: (params: Partial<ListSalesQueryInput>) => ['owner', 'transactions', 'list', params] as const,
  detail: (id: string) => ['owner', 'transactions', 'detail', id] as const,
};

export const ownerProfileKeys = {
  me: ['owner', 'profile', 'me'] as const,
};
