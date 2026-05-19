# =====================================================================
# apps/web/Dockerfile
#
# Multi-stage build for the Next.js 15 web app. Uses Next's
# `output: 'standalone'` so the runtime image only carries the trace-
# resolved server bundle — no pnpm, no monorepo at runtime.
#
# Build from the repo root:
#   docker build -f apps/web/Dockerfile -t rest-web:local .
# =====================================================================

ARG NODE_VERSION=20.18.0
ARG PNPM_VERSION=9.12.0

# ---------- deps ----------
FROM node:${NODE_VERSION}-slim AS deps
ARG PNPM_VERSION
WORKDIR /repo
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared-types/package.json ./packages/shared-types/
RUN pnpm install --frozen-lockfile

# ---------- build ----------
FROM deps AS build
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production
RUN pnpm --filter @rest/web build

# ---------- runtime ----------
FROM node:${NODE_VERSION}-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl tini \
    && rm -rf /var/lib/apt/lists/*

# Next standalone output places the server entry under the per-app path
# inside `.next/standalone/`. With `outputFileTracingRoot` set to the
# repo root, we copy the whole standalone tree as-is, plus the static
# bundle and the `public/` directory.
COPY --from=build /repo/apps/web/.next/standalone ./
COPY --from=build /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /repo/apps/web/public ./apps/web/public

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -fsS http://127.0.0.1:3000 || exit 1

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "apps/web/server.js"]
