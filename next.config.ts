import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@prisma/client', 'prisma'],
  outputFileTracingExcludes: {
    '*': [
      'node_modules/@swc/core-linux-x64-gnu',
      'node_modules/@swc/core-linux-x64-musl',
      'node_modules/@esbuild/linux-x64',
      'node_modules/typescript',
      'node_modules/eslint',
      'node_modules/prettier',
      'node_modules/terser',
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb'
    },
  }
};

export default nextConfig;
