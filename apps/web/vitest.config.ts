import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    // Playwright owns e2e/**; without this Vitest's default *.spec.ts glob
    // also picks those files up and fails outside a Playwright runner.
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
});
