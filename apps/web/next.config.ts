import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['shared'],
  compress: true,
  productionBrowserSourceMaps: false,
  experimental: {
    // Tree-shake automático para pacotes pesados — reduz bundle significativamente
    optimizePackageImports: ['react-icons', 'react-bootstrap', '@fortawesome/react-fontawesome'],
  },
};

export default nextConfig;
