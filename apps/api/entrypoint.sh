#!/bin/sh
# =====================================================================
# apps/api/entrypoint.sh — production boot
#
# 1. Run pending migrations against DATABASE_URL.
# 2. Run seed.ts (idempotent — re-installs the permission catalogue and
#    the built-in roles via upsert). Tolerated to fail; we still start.
# 3. Exec the NestJS server.
#
# Set RUN_MIGRATIONS=false or RUN_SEED=false to skip either step.
# =====================================================================
set -e

SCHEMA="/app/packages/db/prisma/schema.prisma"
SEED="/app/packages/db/prisma/seed.ts"

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "[entrypoint] prisma migrate deploy"
  prisma migrate deploy --schema="$SCHEMA"
else
  echo "[entrypoint] skipping migrations (RUN_MIGRATIONS=$RUN_MIGRATIONS)"
fi

if [ "${RUN_SEED:-true}" = "true" ]; then
  echo "[entrypoint] running seed (idempotent)"
  tsx "$SEED" || echo "[entrypoint] seed failed; continuing"
else
  echo "[entrypoint] skipping seed (RUN_SEED=$RUN_SEED)"
fi

echo "[entrypoint] starting API on :${PORT:-4000}"
exec node /app/dist/main.js
