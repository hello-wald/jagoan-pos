import { QueryClient } from '@tanstack/react-query';

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: (failureCount, error) => {
          // Auth and validation failures never succeed on retry.
          const status = (error as { status?: number }).status ?? 0;
          if (status >= 400 && status < 500) return false;
          return failureCount < 2;
        },
      },
    },
  });
}
