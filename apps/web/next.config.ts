import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || '.next',
  transpilePackages: ['shared'],
  compress: true,
  productionBrowserSourceMaps: false,
  // Estabilidade em dev: evitar chunks inconsistentes com optimizePackageImports.
  experimental: {},
};

export default nextConfig;
