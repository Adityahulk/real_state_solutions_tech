# =====================================================================
# apps/api/Dockerfile
#
# Multi-stage build for the NestJS API.
#  - `deps`  installs the full workspace dep tree (needs the monorepo)
#  - `build` runs Prisma generate + nest build
#  - `prod-deps` produces a pruned, prod-only node_modules via `pnpm deploy`
#  - `runtime` is a slim node image with Chromium (Puppeteer) + prisma CLI
#
# Build from the repo root:
#   docker build -f apps/api/Dockerfile -t rest-api:local .
# =====================================================================

ARG NODE_VERSION=20.18.0
ARG PNPM_VERSION=9.12.0

# ---------- deps: install full workspace deps ----------
FROM node:${NODE_VERSION}-slim AS deps
ARG PNPM_VERSION
WORKDIR /repo
# Skip Puppeteer's Chromium auto-download — we don't ship Chromium and the
# PdfRenderer falls back to HTML at runtime.
ENV PUPPETEER_SKIP_DOWNLOAD=1
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate
# Only the manifests, so layer cache survives source changes.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/db/package.json ./packages/db/
COPY packages/shared-types/package.json ./packages/shared-types/
RUN pnpm install --frozen-lockfile

# ---------- build: compile TS + generate Prisma client ----------
FROM deps AS build
COPY . .
RUN pnpm --filter @rest/shared-types... --filter @rest/api... install --frozen-lockfile \
    && pnpm --filter @rest/db exec prisma generate \
    && pnpm --filter @rest/api build

# ---------- prod-deps: pruned production tree ----------
FROM build AS prod-deps
# `pnpm deploy` copies the API plus its production dependencies (including
# workspace deps like @rest/db / @rest/shared-types) into /out. devDeps
# such as tsx, ts-node, vitest are dropped.
RUN pnpm --filter @rest/api deploy --prod --legacy /out

# ---------- runtime: slim node ----------
FROM node:${NODE_VERSION}-slim AS runtime
WORKDIR /app

# Minimal system deps: TLS for outbound API calls, curl for the
# healthcheck, tini to reap zombies + propagate signals. No Chromium —
# the PdfRenderer detects its absence and falls back to HTML letters,
# which the browser can save as PDF natively.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       ca-certificates curl tini \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    PORT=4000 \
    PUPPETEER_SKIP_DOWNLOAD=1

# Prisma CLI + tsx are needed at boot for `migrate deploy` + the seed
# (seed.ts is plain TS; tsx executes it without a build step). Installed
# globally so they're outside the app's node_modules and don't bloat
# the production tree.
RUN npm install --omit=dev -g prisma@5.20.0 tsx@4.19.1

# App + pruned prod node_modules
COPY --from=prod-deps /out/dist ./dist
COPY --from=prod-deps /out/node_modules ./node_modules
COPY --from=prod-deps /out/package.json ./package.json

# Prisma schema + seed (run from entrypoint).
COPY packages/db/prisma ./packages/db/prisma

# Entry script: migrate → seed (best-effort) → exec node.
COPY apps/api/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -fsS http://127.0.0.1:4000/api/health || exit 1

ENTRYPOINT ["/usr/bin/tini", "--", "/entrypoint.sh"]
