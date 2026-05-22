// PM2 ecosystem config — manages API + Web processes permanently.
// Usage:
//   pm2 start ecosystem.config.js   ← start both
//   pm2 restart all                 ← restart both after a deploy
//   pm2 save && pm2 startup         ← survive reboots

const fs = require('fs');
const path = require('path');

// Parse a .env file into an object without requiring any npm packages.
function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  return fs
    .readFileSync(filePath, 'utf8')
    .split('\n')
    .reduce((acc, line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return acc;
      const eq = trimmed.indexOf('=');
      if (eq === -1) return acc;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      acc[key] = val;
      return acc;
    }, {});
}

const ROOT = __dirname;
const apiEnv = parseEnvFile(path.join(ROOT, 'apps/api/.env'));
const webEnv = parseEnvFile(path.join(ROOT, 'apps/web/.env.local'));

module.exports = {
  apps: [
    {
      name: 'rest-api',
      script: 'dist/main.js',
      cwd: path.join(ROOT, 'apps/api'),
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      env: {
        NODE_ENV: 'production',
        ...apiEnv,
      },
    },
    {
      name: 'rest-web',
      script: path.join(ROOT, 'apps/web/.next/standalone/apps/web/server.js'),
      cwd: path.join(ROOT, 'apps/web/.next/standalone/apps/web'),
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      env: {
        NODE_ENV: 'production',
        PORT: '3000',
        HOSTNAME: '0.0.0.0',
        // Pass all web env vars so Next.js standalone can read them at runtime.
        ...webEnv,
        // API_URL is always internal — override anything from the file.
        API_URL: apiEnv.API_URL ?? 'http://localhost:4000',
      },
    },
  ],
};
