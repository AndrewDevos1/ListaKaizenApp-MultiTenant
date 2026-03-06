import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['shared'],
  compress: true,
  productionBrowserSourceMaps: false,
  // Estabilidade em dev: evitar chunks inconsistentes com optimizePackageImports.
  experimental: {},
};

export default nextConfig;
