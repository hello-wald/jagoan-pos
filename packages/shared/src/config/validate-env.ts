import type { ZodType, z } from 'zod';

/**
 * Adapter between Zod and Nest's ConfigModule `validate` hook.
 * Fails loudly at boot rather than at first use of a missing variable.
 */
export function validateEnv<T extends ZodType>(schema: T) {
  return (raw: Record<string, unknown>): z.infer<T> => {
    const result = schema.safeParse(raw);
    if (!result.success) {
      const detail = result.error.issues
        .map((issue) => `  ${issue.path.join('.') || '(root)'}: ${issue.message}`)
        .join('\n');
      throw new Error(`Invalid environment configuration:\n${detail}`);
    }
    return result.data;
  };
}
