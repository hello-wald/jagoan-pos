import type { NextConfig } from 'next';

const config: NextConfig = {
  transpilePackages: ['@jagoan-pos/contracts'],
  experimental: { typedRoutes: true },
};

export default config;
