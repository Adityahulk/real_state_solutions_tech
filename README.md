# Real Estate Builder Platform

Internal operations platform for a real estate builder (India). Manages plot ownership, on-site development progress, in-plot construction checklists, and a marketing video workflow — under a Super Admin who owns the role / permission system itself.

Full design lives in [`/Users/serverport/.claude/plans/so-i-have-to-tranquil-cookie.md`](../../.claude/plans/so-i-have-to-tranquil-cookie.md).

## Status: Hardening pass — bug-free, accessible, complete

(Built on top of all 5 phases below.)

**Hardening (this pass):**

- **Security**: closed two data-leak bugs (`/sites/:siteId/plots.geojson` and `/sites/:siteId/plots` now filter by ownership for `plot_owner` users); enforced `MediaTask.publish` permission separately from `approve`; added `@CheckAbilities` to `GET /media-tasks/:id`; gated sandbox webhook routes behind `NODE_ENV !== production` (or explicit `ALLOW_SANDBOX_WEBHOOKS=true`).
- **Reliability**: e-sign failures now write `Document.signStatus = 'failed'` instead of being swallowed; new `POST /esign/requests/:docId/retry` endpoint surfaces retry from the admin UI.
- **Functional polish**: removed unused `MediaTaskStatus.EDIT_IN_PROGRESS`; added dedicated `media.state_changed` notification key; sorted `/me/plots` by `site.code, plotNumber`.
- **Accessibility (WCAG 2.1 AA target)**:
  - New UI primitives: `<Dialog>` (focus-trapped, `role="dialog"`, `aria-modal`, focus restore on close), `<ToastProvider>` with `role="status"`, `useConfirm()` for destructive actions.
  - Every ad-hoc modal tagged with `role="dialog" aria-modal="true" aria-label="..."`.
  - `PlotInterior` SVG zones are now `role="button"`, `tabindex="0"`, with Enter/Space activation, `aria-pressed`, and rich `aria-label` describing progress.
  - Live regions (`role="status" aria-live="polite"`) on the PWA offline/queue banner and engineer task feedback messages.
  - Global `:focus-visible` ring in `globals.css` for any focus-removed element.
  - Touch targets on the engineer PWA bumped to ≥ 44 px (camera, location, submit).
- **Mobile**: admin layout is now a responsive drawer (`AdminShell.tsx`) — fixed sidebar on `lg+`, hamburger-toggled drawer on smaller screens. Admin tables (users, vendors, KYC, audit, marketing) get `overflow-x-auto` so they scroll inside their cards instead of breaking the layout.
- **Impersonation, fully wired**: Next.js routes `/api/auth/impersonate-complete` and `/api/auth/stop-impersonating` swap cookies and stash the original tokens; the admin sidebar shows a real "Stop impersonating" button when active. No more `alert()` placeholder.
- **PWA**: single brand `RE` SVG icon at `/icons/icon.svg` (`purpose: "any maskable"`) — the manifest no longer references missing PNGs.
- **Test safety net**: extended `AbilityFactory` tests, added `payment-templates` and `RolesService.delete` invariant tests under Vitest. Playwright golden-path pack is staged in the plan but not committed in this turn (needs Chromium download + dev infra).

## Status: Phase 5 — Visual UX upgrade (tap-and-go console)

**Phase 0 (foundation):** monorepo, Prisma schema, dynamic RBAC, auth, audit, Super Admin settings (users, roles, permissions, audit log viewer, impersonation).

**Phase 1:** Module 1 — Ownership end-to-end (CAD pipeline, Sites, Plots, allotment + transfer flows, plot owner portal).

**Phase 2:** PDF letters, payment schedules + Razorpay, Digio e-sign, KYC capture, in-app/email notifications.

**Phase 3:**

- **Module 2 — Site Development**: `DevelopmentItem` CRUD (kind-grouped: road / pole / club_house / …), `Vendor` master, `WorkPackage` rows with vendor + engineer assignment, deadlines, budget. Admin manages from the per-site Development page; each dev item has its own detail page with the full work-package list.
- **Module 3 — Plot Construction**: reusable `ChecklistTemplate` (with starter "Standard plot" 13 items across 6 trades). One-click bootstrap per plot forks the template into a `PlotChecklist`, flips the plot to `UNDER_CONSTRUCTION`, and exposes a tabbed checklist (Civil / Plumbing / Electrical / Painting / Garden / Finishing). Engineers are assigned per item.
- **ProgressUpdate**: append-only audit of every progress event, with `percentAfter`, optional GPS, optional note, optional photo Document ids. Parent's `percentComplete` + status snap to the latest update atomically.
- **Issue tracking**: site engineers raise issues (low/normal/high/blocker) against either a WorkPackage or PlotChecklistItem; admins resolve them at `/admin/issues`.
- **Photo evidence**: presigned S3 uploads, registered as `Document(kind=progress_photo|issue_photo)`. Thumbnails render through signed URLs on every detail screen.
- **Row-level RBAC**: `site_engineer` can only `update` WorkPackages / PlotConstruction where `assignedEngineerId = $user.id` — enforced both at the controller guard and inside `ProgressService.record` so the rule travels with the entity, not the path.
- **Site Engineer PWA** (`/engineer`): standalone PWA with manifest + service worker, role-routed landing, "My tasks today" unified across Module 2 + 3, update form with camera capture, geolocation, and **offline queue** (IndexedDB) that auto-flushes on reconnect. A floating banner shows offline state and pending count.

**Phase 4:** Module 4 (marketing video workflow with Mux), RERA quarterly export, real APS-backed DWG/DXF parsing.

**Phase 5 (this turn) — focus: make the visualisation amazing, tap-to-detail simple:**

- **Site Console** at `/admin/sites/[id]` is now a full-bleed map. Hover a plot → status + area tooltip. Click → an animated side panel slides in showing owners, payment progress bar, construction %, e-sign status, and quick-action buttons (Allot, Construction view, Payments & e-sign, Letter download). Click another plot → panel content swaps without closing. Esc or background click closes.
- **Map toolbar** floats above the map: live search by plot number (dims non-matches), status filter chips with **live per-status counts**, and per-layer toggles for Plots / Development.
- **Two-layer rendering**: plot polygons (status-coloured) on layer 1, development items (roads, poles, club house, utilities — kind-coloured) on layer 2. Click either to open its panel.
- **`/plots/:id/summary`** — single ~1 KB endpoint returns everything the side panel needs (owners + payments + construction + e-sign) in one round-trip so panels open instantly.
- **Visual Module 3** — checklist groups render as an auto-laid-out room map (`PlotInterior` SVG). Each zone is colour-gradated by completion (grey → amber → emerald) and tappable; the right pane shows the items inside the active zone with progress bars and engineer assignment.
- **Owner home** is now a card grid where each plot is a fully-loaded `PlotPanel` — owners get all key info (status, owners, payments, construction, letter, e-sign) at a glance without diving in.
- **Marketing Library** at `/admin/marketing/library` — gallery of published videos with thumbnail / inline player (`<video>` for sandbox-S3, "Play HLS" for Mux).
- **MahaRERA CSV adapter** — one-click download of a state-portal-shaped CSV from the RERA report page. Layers cleanly over the canonical RERA JSON, so adding K-RERA / Tamil Nadu later means writing another adapter, not another query.

**Phase 6+ (roadmap):** SVF2 binary geometry extraction (real polygon coordinates from APS), more state-portal adapters, drone-shoot scheduling, advanced analytics.

## Prerequisites

- Node ≥ 20 (an `.nvmrc` is provided)
- pnpm ≥ 9 — install once: `corepack enable && corepack prepare pnpm@9.12.0 --activate`
- Docker (for local Postgres + Redis + MinIO)

## Bootstrap

> **Phase 2 note**: Puppeteer downloads ~170MB of Chromium on first install — expect a slower `pnpm install`. Set `PUPPETEER_SKIP_DOWNLOAD=1` to skip; letters then fall back to HTML automatically.
>
> Phase 5 doesn't add new tables. If you've been keeping up, you're already migrated; just re-seed to pick up catalogue/permission tweaks: `pnpm db:seed`.
>
> Coming from a pre-Phase 3 checkout? Run: `pnpm --filter @rest/db migrate -- --name phase3_progress_checklists`

```bash
# 1. install deps
pnpm install

# 2. copy env
cp .env.example .env

# 3. boot local infra (postgres+postgis, redis, minio)
pnpm infra:up

# 4. generate prisma client, run migrations, seed
pnpm --filter @rest/db generate
pnpm --filter @rest/db migrate -- --name init
pnpm db:seed

# 5. run everything
pnpm dev
```

When the seed runs it prints the bootstrap super-admin password (default `ChangeMe!123`, email `admin@example.com`). Sign in at <http://localhost:3000/login>.

### Try the Module 1 + Phase 2 flow end-to-end

1. Sign in as super admin → **Sites** → **New site** ("Green Meadows", code `GM-P1`).
2. Open the site → **Upload CAD** → pick `docs/sample-site.geojson` → wait ~2 s for parse → **Confirm and activate**. 6 grey plots appear on the Leaflet map.
3. Click a plot → **Allot plot** → enter joint owners + shares totalling 100% + price → submit. A PDF allotment letter is generated and an e-sign request is created for builder + buyers.
4. Open the plot → **Payments &amp; e-sign**. You'll see:
   - The signer list with per-signer **Sign now →** links. Click one → in sandbox mode the page records the signature; refresh — the signer flips to *signed*. When all sign, the document flips to `signed`.
   - **Generate schedule** → pick a template → installments appear with due dates and amounts. **Mark paid (offline)** for any row to create a PDF receipt; **Receipt →** opens the signed-URL PDF.
5. Create a `User` via **Settings → Users**, link it to a Person (via Prisma Studio: `User.personId = <person id>`), give it the `plot_owner` role. Sign in as that user — they land on `/owner`, see only their plot.
6. Owner clicks **Pay** on an installment → opens the sandbox payment URL → visiting it marks the installment paid, a receipt is generated, owner refreshes and downloads it.
7. Owner submits KYC at `/owner/kyc` (PAN + Aadhaar-last-4 + scan). Super admin verifies at `/admin/kyc`.

### Phase 3 walkthrough — construction + engineer PWA

1. **Settings → Checklist templates → New template** → "Standard plot" is created with 13 starter items.
2. **Settings → Users → New user** → create an engineer (role `site_engineer`). Re-seed if needed.
3. On the plot detail page click **Construction checklist →** → bootstrap from "Standard plot". The plot status flips to `UNDER_CONSTRUCTION`.
4. Assign one or more checklist items to the engineer from the dropdowns. Optionally add a Vendor (Vendors page) and a WorkPackage on a dev item.
5. Sign in as the engineer on a phone (or `Application → Manifest → Install` in DevTools). You'll land on `/engineer` with "My tasks". Tap a task → adjust the slider, take a photo (camera opens via the file input with `capture="environment"`), tap **Capture** to geo-tag, **Submit update**.
6. **Test offline**: in DevTools → Network → Offline (or airplane mode). Submit another update → the floating banner shows "● Offline · 1 queued". Re-enable network → the queue auto-flushes; photos are uploaded then the update POSTs, all with the original timestamps.
7. Admin reviews on the work package / plot construction screens — progress bars update and photo thumbnails render via signed URLs. Plot owner sees the read-only `/owner/plots/[id]/construction`.

### Phase 4 walkthrough — marketing + RERA

1. Settings → Users → create three users with roles `marketing_head`, `videographer`, `editor`.
2. Sign in as Marketing Head → **Marketing → New task** → fill brief + site → Create.
3. Open the task → assign the videographer and editor.
4. Sign in as the videographer → the same task is visible → pick a small video file → **Upload**. Status flips to `RAW_UPLOADED`.
5. Sign in as the editor → upload the edited cut → status flips to `EDIT_UPLOADED`.
6. Sign in as Marketing Head → preview the edit, **post timecoded comments** (`@ sec`), then **Request revision** *or* **Approve** → **Publish to library**.
7. Without Mux credentials, uploads land on MinIO/S3 and play through a signed `<video>` element. With Mux credentials, uploads go directly to Mux and HLS plays through the signed URL.
8. **RERA**: open `/admin/reports/rera`, pick a site, year, and quarter → preview by section → **Download JSON** or **MahaRERA CSV** for state-portal upload.

### Phase 5 walkthrough — visual UX

1. Open any site at `/admin/sites/[id]` — the page is now a full-bleed map console.
2. **Hover** any plot → status / area tooltip. **Click** → side panel slides in with owners, payment progress bar, construction %, e-sign status. Click another plot to swap content.
3. **Search** "P-03" in the toolbar → all other plots dim. **Click status chips** ("Allotted", "Under construction") to filter — counts update live.
4. **Toggle "Development" layer** → roads, club house, water lines overlay the map. Click any dev item → its panel slides in with the work-package list and progress bar.
5. Open a plot's **Construction** view — the left side renders the plot interior as colour-coded zones (one per checklist group). Tap a zone → that group's items slide into the right pane.
6. As an owner, sign in: your `/owner` home is a card grid where each plot shows everything in one view — no need to click into individual pages.
7. **Marketing → Library**: published videos appear as a gallery; sandbox uploads play inline.
8. **RERA report → MahaRERA CSV** downloads a state-portal-ready CSV from the same canonical data.

| Service | URL |
|---|---|
| Web | http://localhost:3000 |
| API | http://localhost:4000/api |
| MinIO console | http://localhost:9001 (`minioadmin`/`minioadmin`) |
| Prisma Studio | `pnpm db:studio` |

## Repo layout

```
apps/
  api/   NestJS — auth, users, rbac, audit, prisma
  web/   Next.js 15 — login, admin shell, settings/users, settings/roles, settings/audit
packages/
  db/             Prisma schema, migrations, seed
  shared-types/   Permission catalogue + zod schemas
infra/            docker-compose.dev.yml
docs/             (CAD layer standard, RERA export spec — coming in Phase 1+)
.github/workflows/ci.yml
```

## Dynamic RBAC — how it works

1. **Permission catalogue** lives in code at `packages/shared-types/src/permissions.ts` — every `(subject, action)` pair the app understands. The seed pipes it into the `Permission` table on every deploy.
2. **Roles** are DB rows. The seed creates seven built-in roles (`super_admin`, `admin`, `site_engineer`, `plot_owner`, `marketing_head`, `videographer`, `editor`). The Super Admin can create any number of custom roles via the UI.
3. **Each role** has many `RolePermission` rows. Each row may carry **row-level conditions** in JSON — placeholders like `"$user.id"` are substituted at login time, so a `plot_owner` rule like `{ "ownerUserIds": { "$contains": "$user.id" } }` becomes "only their own plots".
4. **Users** get one or more `UserRoleAssignment` rows. An assignment can carry an optional `scope` (e.g. `{ "siteIds": ["..."] }`) so a role like `admin` can be issued narrowly.
5. **At request time** `AbilityFactory.createForUser()` compiles the user's roles + scopes into a CASL `Ability`. `super_admin` skips DB and is unconditional. Every controller method gates on `@CheckAbilities({ action, subject })`.

## Invariants that protect you from yourself

- The `super_admin` role is `isImmutable=true` — API refuses edits / deletes.
- You cannot remove the last `super_admin` assignment from the system.
- You cannot deactivate the last active super-admin user.
- Built-in roles cannot be deleted (only their permissions edited).
- Roles with members cannot be deleted (reassign members first).
- Every role / permission / assignment change writes a `RoleAuditLog` entry.
- Impersonation issues a flagged token and writes an `impersonate.start` audit entry.

## Next phases

See the plan file for the full roadmap. Phase 1 brings CAD upload + parsing (via Autodesk Platform Services) and Module 1 (allotments, transfers, payment schedule).

## Production deploy (single DigitalOcean droplet)

The app deploys as a **monolith** — two containers (api + web) on a single droplet, pointed at three managed services. Total monthly cost on the cheapest tier is ~$24/mo: 1 GB droplet ($6) + Managed Postgres dev ($15) + Managed Redis dev ($15) + Spaces ($5) — round it to ~$40 with overhead.

### One-time setup on DigitalOcean

1. **Managed Postgres** (with extensions): create a Postgres 16 cluster. Once it's up, enable `postgis`, `pgcrypto`, and `citext` via the DO console *or* let the entrypoint create them (it runs `CREATE EXTENSION IF NOT EXISTS` in the seed).
2. **Managed Redis**: create a 1 GB Redis 7 cluster. Grab the `rediss://` URL.
3. **Spaces**: create a Spaces bucket in the same region. Generate an access key. Optionally enable the CDN endpoint.
4. **Container Registry** (`doctl registry create your-registry-name`) — used by the deploy script.
5. **Droplet**: Ubuntu 24.04, 2 GB+ RAM (Puppeteer + Node need headroom). Install Docker + the compose plugin:
   ```bash
   curl -fsSL https://get.docker.com | sh
   mkdir -p /srv/rest && cd /srv/rest
   ```
   Copy `infra/docker-compose.prod.yml` to `/srv/rest/docker-compose.prod.yml` and `infra/.env.prod.example` to `/srv/rest/.env.prod` (then fill in real values). If you're using Caddy for TLS, also copy `infra/Caddyfile.example` to `/srv/rest/Caddyfile`.

### Build + push + deploy

From your laptop (or CI):

```bash
DO_REGISTRY=registry.digitalocean.com/your-registry \
DROPLET_HOST=1.2.3.4 \
DROPLET_PATH=/srv/rest \
  ./scripts/deploy.sh
```

The script:
1. `docker buildx build --platform linux/amd64` of both images, tagged with the git short SHA + `:latest`.
2. `doctl registry login` + `docker push` of all four tags.
3. SSH to the droplet, `docker compose pull`, `docker compose up -d`, and a `docker image prune -f` to free disk.

Env vars on the droplet (`/srv/rest/.env.prod`) drive everything — the same file is read by both containers via `env_file`.

### What the API container does on every boot

The api image's [`entrypoint.sh`](apps/api/entrypoint.sh) runs **before** the server starts:

1. `prisma migrate deploy` — idempotent; safe to run on every restart.
2. `tsx packages/db/prisma/seed.ts` — idempotent; upserts the permission catalogue + built-in roles + (on first boot only) the bootstrap super admin. Skip with `RUN_SEED=false` once the cluster is set up.
3. `exec node dist/main.js` — replaces the entrypoint process so signals propagate.

If migrations fail the container exits with a non-zero code, compose marks it unhealthy, and the web container won't pick it up (it `depends_on: condition: service_healthy`).

### Files that make this work

| File | Purpose |
|---|---|
| [`apps/api/Dockerfile`](apps/api/Dockerfile) | Multi-stage build, Chromium for Puppeteer, prisma CLI + tsx baked in |
| [`apps/api/entrypoint.sh`](apps/api/entrypoint.sh) | Migrate → seed → exec node |
| [`apps/web/Dockerfile`](apps/web/Dockerfile) | Next.js `output: 'standalone'` runtime |
| [`infra/docker-compose.prod.yml`](infra/docker-compose.prod.yml) | Two-service monolith with Caddy stub |
| [`infra/Caddyfile.example`](infra/Caddyfile.example) | Auto-HTTPS reverse proxy (optional) |
| [`infra/.env.prod.example`](infra/.env.prod.example) | Every env var the prod containers consume |
| [`scripts/deploy.sh`](scripts/deploy.sh) | Build → push → ssh pull-and-up |

### Things you'll want to check before going live

- **`JWT_SECRET` and `NEXTAUTH_SECRET`** — must be ≥ 32 chars, fresh per environment.
- **`BOOTSTRAP_SUPERADMIN_PASSWORD`** — change the default *before* first boot, or sign in immediately and change it via the Users page.
- **`ALLOW_SANDBOX_WEBHOOKS=false`** — confirm; otherwise anyone with an installment id could mark it paid.
- **TLS**: either keep Caddy in compose + point your domain at the droplet, or remove Caddy and put a DO Load Balancer in front of `:3000` and `:4000`.
- **Backups**: enable automatic backups on the Postgres cluster. The droplet itself is stateless once Spaces is wired up.

## Commands cheatsheet

```bash
pnpm dev                       # api + web together
pnpm --filter @rest/api dev    # api only
pnpm --filter @rest/web dev    # web only
pnpm typecheck                 # all packages
pnpm test                      # unit tests (vitest)
pnpm db:studio                 # browse db
pnpm infra:down                # stop local services
```
