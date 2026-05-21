const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // gzip responses at the framework boundary so droplet bandwidth isn't the
  // bottleneck on initial HTML / RSC payloads.
  compress: true,
  // Tree-shake the icon libraries so we only ship the icons actually used.
  // Without this, a single `import { X } from 'lucide-react'` pulls in the
  // whole barrel (~1 MB) — visible as a several-second hit on slow CPUs.
  experimental: {
    scrollRestoration: true,
    optimizePackageImports: ['lucide-react', '@tanstack/react-query'],
  },
  transpilePackages: ['@rest/shared-types'],
  // Emit a minimal `.next/standalone/` server bundle so the production image
  // doesn't need pnpm or the full monorepo at runtime.
  output: 'standalone',
  // Tell Next to trace dependencies from the monorepo root, not just
  // apps/web — so workspace packages get bundled into standalone.
  outputFileTracingRoot: path.join(__dirname, '../../'),
};

module.exports = nextConfig;
