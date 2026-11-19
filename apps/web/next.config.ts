import { resolve } from 'path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || '.next',
  transpilePackages: ['shared'],
  webpack: (config) => { config.resolve.alias.shared = resolve(__dirname, '../../packages/shared/dist/index.js'); return config; },
  compress: true,
  productionBrowserSourceMaps: false,
  // Estabilidade em dev: evitar chunks inconsistentes com optimizePackageImports.
  experimental: {},
};

export default nextConfig;
