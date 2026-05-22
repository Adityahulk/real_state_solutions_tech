#!/usr/bin/env bash
# =============================================================================
# start.sh — One-command bootstrap for the REST platform on a fresh droplet.
#
# Run once:   bash start.sh
# Redeploy:   bash start.sh --deploy-only
# =============================================================================
set -e

REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"
DEPLOY_ONLY="${1:-}"

log()  { echo -e "\n\033[1;36m▶ $*\033[0m"; }
ok()   { echo -e "\033[1;32m✓ $*\033[0m"; }
die()  { echo -e "\033[1;31m✗ $*\033[0m"; exit 1; }

# ---------------------------------------------------------------------------
# 1. Install system deps (first run only)
# ---------------------------------------------------------------------------
if [ -z "$DEPLOY_ONLY" ]; then
  log "Installing system dependencies..."

  apt-get update -qq
  apt-get install -y -qq curl git ufw

  # Docker
  if ! command -v docker &>/dev/null; then
    curl -fsSL https://get.docker.com | sh
    ok "Docker installed"
  else
    ok "Docker already installed"
  fi

  # Node 20
  if ! command -v node &>/dev/null || [[ "$(node -v)" != v20* ]]; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
    ok "Node 20 installed"
  else
    ok "Node $(node -v) already installed"
  fi

  # pnpm
  if ! command -v pnpm &>/dev/null; then
    npm install -g pnpm
    ok "pnpm installed"
  else
    ok "pnpm already installed"
  fi

  # PM2
  if ! command -v pm2 &>/dev/null; then
    npm install -g pm2
    ok "PM2 installed"
  else
    ok "PM2 already installed"
  fi
fi

# ---------------------------------------------------------------------------
# 2. Start infrastructure (Postgres, Redis, MinIO) via Docker
# ---------------------------------------------------------------------------
log "Starting infrastructure containers (Postgres, Redis, MinIO)..."
docker compose -f "$REPO_ROOT/infra/docker-compose.dev.yml" up -d
ok "Infrastructure running"

# Wait for Postgres to be ready
log "Waiting for Postgres..."
until docker exec rest_postgres pg_isready -U rest -d rest_dev &>/dev/null; do
  sleep 1
done
ok "Postgres ready"

# ---------------------------------------------------------------------------
# 3. Create .env files if they don't exist
# ---------------------------------------------------------------------------
API_ENV="$REPO_ROOT/apps/api/.env"
WEB_ENV="$REPO_ROOT/apps/web/.env.local"

if [ ! -f "$API_ENV" ]; then
  log "Creating apps/api/.env with defaults..."
  cat > "$API_ENV" <<'EOF'
# === REQUIRED — edit before going live ===
DATABASE_URL=postgresql://rest:rest@localhost:5432/rest_dev
REDIS_URL=redis://localhost:6379
JWT_SECRET=change-me-to-a-random-32-char-string-now
NEXTAUTH_SECRET=change-me-to-another-random-32-char-string

# === Storage (MinIO running locally) ===
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_BUCKET=rest-dev
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
# Replace with your droplet IP
S3_PUBLIC_BASE_URL=http://64.227.140.244:9000/rest-dev

# === App URLs (replace with your droplet IP) ===
API_URL=http://localhost:4000
NEXT_PUBLIC_API_URL=http://64.227.140.244:4000
WEB_ORIGIN=http://64.227.140.244:3000
NEXTAUTH_URL=http://64.227.140.244:3000

# === Branding ===
ORG_NAME=Rest
ORG_EMAIL=noreply@example.com

# === Optional (leave blank for sandbox/stub mode) ===
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
DIGIO_CLIENT_ID=
DIGIO_CLIENT_SECRET=
RESEND_API_KEY=
RESEND_FROM=
MUX_TOKEN_ID=
MUX_TOKEN_SECRET=
APS_CLIENT_ID=
APS_CLIENT_SECRET=
EOF
  ok "Created apps/api/.env — edit S3_PUBLIC_BASE_URL and URLs if needed"
else
  ok "apps/api/.env already exists, skipping"
fi

if [ ! -f "$WEB_ENV" ]; then
  log "Creating apps/web/.env.local..."
  cat > "$WEB_ENV" <<'EOF'
NEXTAUTH_SECRET=change-me-to-another-random-32-char-string
NEXTAUTH_URL=http://64.227.140.244:3000
API_URL=http://localhost:4000
NEXT_PUBLIC_API_URL=http://64.227.140.244:4000
EOF
  ok "Created apps/web/.env.local"
else
  ok "apps/web/.env.local already exists, skipping"
fi

# ---------------------------------------------------------------------------
# 4. Pull latest code
# ---------------------------------------------------------------------------
log "Pulling latest code..."
cd "$REPO_ROOT"
git pull origin main
ok "Code up to date"

# ---------------------------------------------------------------------------
# 5. Install dependencies
# ---------------------------------------------------------------------------
log "Installing dependencies..."
pnpm install --frozen-lockfile
ok "Dependencies installed"

# ---------------------------------------------------------------------------
# 6. Build shared types
# ---------------------------------------------------------------------------
log "Building shared types..."
pnpm --filter @rest/shared-types build
ok "Shared types built"

# ---------------------------------------------------------------------------
# 7. Build API
# ---------------------------------------------------------------------------
log "Building API..."
cd "$REPO_ROOT/apps/api"
pnpm build
ok "API built"

# ---------------------------------------------------------------------------
# 8. Run DB migrations + seed
# ---------------------------------------------------------------------------
log "Running database migrations..."
cd "$REPO_ROOT/apps/api"
npx prisma migrate deploy
ok "Migrations done"

log "Seeding database (idempotent)..."
npx prisma db seed || true
ok "Seed done"

# ---------------------------------------------------------------------------
# 9. Build Web
# ---------------------------------------------------------------------------
log "Building Web..."
cd "$REPO_ROOT/apps/web"
NODE_OPTIONS="--max-old-space-size=768" pnpm build
ok "Web built"

# ---------------------------------------------------------------------------
# 10. Copy static files into standalone bundle (Next.js requires this)
# ---------------------------------------------------------------------------
log "Copying static assets into standalone bundle..."
cp -r .next/static .next/standalone/apps/web/.next/static
cp -r public .next/standalone/apps/web/public
ok "Static assets copied"

# ---------------------------------------------------------------------------
# 11. Start/restart apps with PM2
# ---------------------------------------------------------------------------
log "Starting services with PM2..."
cd "$REPO_ROOT"
pm2 delete all 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save

# Survive reboots
pm2 startup systemd -u root --hp /root 2>/dev/null | grep "sudo" | bash || true
ok "PM2 services started"

# ---------------------------------------------------------------------------
# 12. Open firewall
# ---------------------------------------------------------------------------
log "Opening firewall ports..."
ufw allow 22/tcp   # SSH — never lock yourself out
ufw allow 3000/tcp # Web
ufw allow 4000/tcp # API
ufw allow 9000/tcp # MinIO (S3)
ufw --force enable
ok "Firewall configured"

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------
echo ""
echo "=============================================="
ok "All services are running!"
echo ""
echo "  Web app:  http://64.227.140.244:3000"
echo "  API:      http://64.227.140.244:4000/api/health"
echo "  MinIO:    http://64.227.140.244:9000"
echo ""
echo "  Admin login:  admin@example.com / ChangeMe!123"
echo ""
echo "  pm2 list          → check status"
echo "  pm2 logs          → view live logs"
echo "  bash start.sh --deploy-only  → redeploy after a git push"
echo "=============================================="
