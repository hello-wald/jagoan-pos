import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { NextConfig } from 'next';

// One .env for the whole monorepo (see .env.example's header comment).
// Next only auto-loads .env files from its own app directory, so without
// this, JWT_SECRET and GATEWAY_URL would silently read as undefined.
const rootEnv = resolve(__dirname, '..', '..', '.env');
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

const config: NextConfig = {
  transpilePackages: ['@jagoan-pos/contracts'],
  experimental: { typedRoutes: true },
};

export default config;
