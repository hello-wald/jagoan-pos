import { normalizeError, type AppError } from './errors';

export async function bffFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/bff${path}`, {
    ...init,
    headers: { accept: 'application/json', ...init?.headers },
  });

  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) throw normalizeError(response.status, data) satisfies AppError;
  return data as T;
}
