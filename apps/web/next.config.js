const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: true,
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
