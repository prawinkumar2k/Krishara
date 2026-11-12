# Krishara — Kanchipuram silk e-commerce

Storefront, customer accounts, checkout (Razorpay + COD), order management and an admin panel.
Next.js 16 (App Router) · SQLite/libSQL + Drizzle · Tailwind 4 · Motion.
Developed by **Dealpost Private Limited**.

> Next.js 16 differs from older versions (`proxy.ts` instead of middleware, async `cookies()`/`params`,
> Cache Components). Read `node_modules/next/dist/docs/` before changing framework-level code.
> The build plan and the mapping to the Tracen system-design checklist live in [PLAN.md](PLAN.md).

## Quick start

```bash
npm install
cp .env.example .env.local        # then fill it in (see below)
npm run db:migrate                # create tables (use db:push only for throw-away dev DBs)
npm run db:seed                   # 67 products, coupons, settings, admin user
npm run dev                       # http://localhost:3000
```

Admin login: the `ADMIN_EMAIL` / `ADMIN_PASSWORD` you set in `.env.local` → `/admin`. **Change it after first login.**

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | `file:./krishara.db` locally; `libsql://…` (Turso) in production |
| `DATABASE_AUTH_TOKEN` | prod | Turso auth token |
| `SESSION_SECRET` | yes | ≥32 random chars: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `APP_URL` | yes (prod) | Public site URL — used in emails, sitemap, social previews |
| `CRON_SECRET` | prod | Bearer secret for `/api/cron/*` (Vercel Cron sends it automatically) |
| `RAZORPAY_KEY_ID` / `_KEY_SECRET` / `_WEBHOOK_SECRET` | prod | Online payments. **Without keys, prod offers COD only** (simulated payments exist in dev only) |
| `RESEND_API_KEY`, `EMAIL_FROM` | prod | Transactional email. Without a key, emails print to the server console |
| `SELLER_NAME`, `SELLER_GSTIN`, `SELLER_ADDRESS`, `SELLER_STATE` | prod | Printed on GST invoices; `SELLER_STATE` decides CGST+SGST vs IGST |
| `S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_URL` | prod | Product-image storage (AWS S3 / Cloudflare R2). Empty → local `public/uploads` |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | seed | Initial admin account |

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Standard Next.js |
| `npm run db:generate` | Create a SQL migration after editing `src/db/schema.ts` |
| `npm run db:migrate` | Apply migrations (run this against the production DB on every deploy) |
| `npm run db:seed` | Idempotent seed |
| `npm test` | 28 unit/integration checks (reliability, money path, emails, storage) |
| `npm run test:e2e` | 31 HTTP checks against a running production server (see headers in `scripts/e2e*.mjs`) |
| `node --env-file=.env.local scripts/browser-cart-sync.mjs` | Real-browser, two-device bag-sync test |
| `node --env-file=.env.local scripts/mobile-audit.mjs` | Phone-emulation overflow check + screenshots (`BASE`, `OUT`, `W`) |

## How money-critical flows are protected

- Prices are **never** read from the browser: the client sends ids/sizes/quantities, the server re-prices from the DB.
- Stock is reserved with an atomic conditional decrement inside one transaction — concurrent buyers cannot oversell.
- Checkout requires an `Idempotency-Key`; a retried request returns the same order instead of creating another.
- Payment failure triggers a compensating step (order cancelled, stock returned exactly once).
- Razorpay checkout signatures and webhooks are verified with HMAC; the webhook is the safety net if the buyer closes the tab.
- External calls use timeout → retry with backoff+jitter → circuit breaker. Background work runs through a DB-backed queue with a dead-letter state (visible in **Admin → System**).

## Deploying

**Vercel + Turso (recommended)**
1. Create a Turso database; set `DATABASE_URL` + `DATABASE_AUTH_TOKEN`; run `npm run db:migrate && npm run db:seed` once against it.
2. Import the repo in Vercel and set the environment variables above. [vercel.json](vercel.json) schedules the cron jobs
   (queue every minute, unpaid-order cleanup every 15 min, housekeeping daily). *Vercel Hobby allows daily crons only — use Pro or an external pinger for the per-minute queue job.*
3. Set a Razorpay webhook → `https://<your-domain>/api/webhooks/razorpay` (events `payment.captured`, `order.paid`) with `RAZORPAY_WEBHOOK_SECRET`.
4. Configure S3/R2 for images (serverless disks are ephemeral).

**Docker / VPS**: `docker build -t krishara .` → run with the env vars, a persistent volume (or Turso) for the DB, and call `/api/cron/<job>` from a scheduler.
Run `npm run db:migrate` as a separate deploy step. A reverse proxy (Caddy/Nginx) should terminate TLS; `/api/health` is the health check.

## Go-live checklist

- [ ] Admin password changed; `SESSION_SECRET`, `CRON_SECRET` are fresh random values
- [ ] `APP_URL` set to the real HTTPS domain
- [ ] Razorpay live keys + webhook configured and a real ₹1 test order placed
- [ ] `RESEND_API_KEY` + verified sender domain; place a COD order and check the emails arrive
- [ ] `SELLER_GSTIN` / address set; open an invoice and check the numbers with your accountant
- [ ] S3/R2 configured; upload a product image from Admin
- [ ] Cron jobs running (Admin → System shows the queue draining)
- [ ] Delete test coupons; review shipping/GST/COD limits in Admin → Settings
