// PM2 ecosystem config — manages API + Web processes permanently.
// Usage:
//   pm2 start ecosystem.config.js   ← start both
//   pm2 restart all                 ← restart both after a deploy
//   pm2 save && pm2 startup         ← survive reboots

module.exports = {
  apps: [
    {
      name: 'rest-api',
      script: 'dist/main.js',
      cwd: '/root/real_state_solutions_tech/apps/api',
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'rest-web',
      script: '/root/real_state_solutions_tech/apps/web/.next/standalone/apps/web/server.js',
      cwd: '/root/real_state_solutions_tech/apps/web/.next/standalone/apps/web',
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      env: {
        NODE_ENV: 'production',
        PORT: '3000',
        HOSTNAME: '0.0.0.0',
      },
    },
  ],
};
