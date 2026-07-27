# Deployment: Railway Postgres + Vercel

The app deploys as a single Vercel project (static Vite SPA + serverless functions under `api/`), with the database hosted on Railway. This guide takes you from nothing to a working hosted deployment.

## Architecture

```
Browser ──same-origin /api──▶ Vercel serverless functions ──TLS──▶ Railway Postgres
   │
   └─ localStorage cache (offline fallback + pending-sync queue)
```

- `blueprints` table: one row per blueprint (metadata columns + JSONB document columns)
- `blueprint_revisions`: last 20 saves per blueprint, pruned automatically
- Auth: shared secret — requests must send `x-api-key` matching the `API_TOKEN` env var

## 1. Provision Postgres on Railway

Using the dashboard (simplest):

1. Go to [railway.app](https://railway.app) → **New Project** (create a fresh project, e.g. `agent-blueprint-builder` — separate from your other projects).
2. **Add service → Database → PostgreSQL.**
3. Open the Postgres service → **Variables** tab → copy `DATABASE_URL` (use the **public** URL, `*.rlwy.net`).

Or with the CLI:

```bash
npm i -g @railway/cli
railway login                      # opens browser
railway init                       # create the new project
railway add --database postgres
railway variables                  # shows DATABASE_URL
```

## 2. Apply the schema

From this repo:

```bash
DATABASE_URL="postgresql://...from-railway..." npm run db:migrate
```

Expected output: `Applying 001_init.sql...`, `Applying 002_orchestration_pattern.sql...`, then `Applied N migration(s).` Re-running prints `Up to date` — the runner is idempotent. Migration `002` adds the nullable `orchestration_pattern` column; existing rows are treated as "freeform".

## 3. Deploy to Vercel

Using the dashboard:

1. [vercel.com](https://vercel.com) → **Add New → Project** → import `ficodegallo/agent-blueprint-builder`.
2. Framework preset: **Vite** (auto-detected; `vercel.json` is already configured with SPA rewrites).
3. **Environment variables** (Settings → Environment Variables, all environments):
   - `DATABASE_URL` — the Railway connection string from step 1
   - `API_TOKEN` — a shared secret; generate with `openssl rand -hex 24`
4. Deploy.

Or with the CLI:

```bash
npm i -g vercel
vercel login
vercel link                        # link this repo to a new Vercel project
vercel env add DATABASE_URL        # paste the Railway URL
vercel env add API_TOKEN           # paste your generated secret
vercel --prod
```

## 4. Connect the app

1. Open the deployed URL.
2. Click the small **gear icon** next to the sync-status dot in the header → **Sync Settings**.
3. Paste the same value you set as `API_TOKEN` → **Test Connection** (should report "Connected — database reachable") → **Save**.
4. Create or edit a blueprint — the sync dot turns green (`Saved to cloud`). Any blueprints that existed only in this browser's localStorage upload automatically via the pending-sync queue.

## 5. Verify

- `curl -H "x-api-key: $API_TOKEN" https://<your-app>.vercel.app/api/health` → `{"ok":true,"migrated":true}`
- Open the app in a second browser/device, enter the token — the same blueprints appear.
- Refresh a deep link like `/blueprint/<id>` — the SPA loads (rewrite working).

## Operational notes

- **Access model:** one shared token = full read/write. Don't share the URL+token beyond people who should edit blueprints. No per-user accounts yet.
- **Concurrency:** last write wins. Two people editing the same blueprint simultaneously will overwrite each other; the revisions table (last 20 saves) makes this recoverable by hand.
- **Revisions:** stored server-side per save; no UI yet. Inspect via Railway's data browser: `select saved_at from blueprint_revisions where blueprint_id = '...' order by saved_at desc;`
- **Local dev:** unchanged — `npm run dev` runs offline (localStorage only). To develop against the hosted API, set `VITE_API_BASE_URL=https://<your-app>.vercel.app/api` in `.env.local`.
- **Schema changes:** add `db/migrations/002_*.sql` and re-run `npm run db:migrate`.
