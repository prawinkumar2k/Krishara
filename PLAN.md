# Krishara — E‑commerce Build Plan

Existing: a polished Next.js 16 storefront (landing page, in‑memory cart, fake checkout).
Goal: a real store — customer accounts, real catalog, persistent cart, real orders + payments, full admin —
built to the **Tracen "System Design Made Visual" production‑readiness checklist** (20 topics).

## Architecture decision
A **modular monolith**, not microservices. The book's own Golden Rule: don't adopt Kubernetes/Kafka before the
problem exists. So every Tracen concept is implemented at the right size inside one app, behind seams
(`queue.ts`, `events.ts`, `rate-limit.ts`) that can be swapped for SQS/Redis/Kafka later without touching callers.

| Concern | Choice |
|---|---|
| Framework | Next.js 16 App Router, `cacheComponents` on, `proxy.ts` for route guards |
| DB | SQLite/libsql (`file:` local → Turso in prod) + Drizzle ORM |
| Auth | bcrypt + signed JWT in httpOnly cookie; role re‑read from DB on every authorised request |
| Payments | Razorpay (UPI/cards/netbanking) + COD; simulated when keys absent |
| Validation | zod on every action/route |
| Money | whole‑rupee integers; prices re‑read from DB at checkout, never trusted from client |

## Tracen checklist → where it lives

| # | Topic | Status | Implementation |
|---|---|---|---|
| 1 | Rate limiting | ✅ | `lib/rate-limit.ts` token bucket, 429 + `retry_after_seconds`; on login/register. *Edge/CDN limiting = deploy step* |
| 2 | Caching | ✅ | `"use cache"` + `cacheLife("hours")` + `updateTag("catalog")` on admin edits |
| 3/4 | LB + reverse proxy | 🔧 deploy | `/api/health` ✅; Vercel/Caddy/ALB terminates TLS in front. App never exposed raw |
| 5 | API gateway | 🔧 deploy | Single entry point = Next; JWT verified once in `proxy.ts`, authority in `dal.ts` |
| 6 | CI/CD | ✅ | `.github/workflows/ci.yml`: lint → tsc → db → test → build |
| 7 | Docker | ✅ | multi‑stage `Dockerfile`, standalone output, non‑root, HEALTHCHECK *(image not yet built locally)* |
| 8/9 | K8s + discovery | ⛔ by design | Not needed for MVP (book: "do not use K8s for a simple MVP"). Health endpoint makes it adoptable |
| 10 | Circuit breaker | ✅ | `lib/resilience.ts` `CircuitBreaker` + graceful‑degradation `runOr` (reviews/recommendations) |
| 11 | Timeouts | ✅ | `withTimeout` — email 2s, DB health 2s; Razorpay calls in phase 5 |
| 12/13 | Retries + backoff + jitter | ✅ | `retry` (5xx/429/timeout only, never 4xx); queue retries use same backoff |
| 14 | Idempotency | ✅ | `lib/idempotency.ts` atomic key claim; used by checkout + payment verify (phase 5) |
| 15 | Queue + DLQ | ✅ | `jobs` table, `queue.ts`; status `dead` = DLQ; admin DLQ viewer in phase 7 |
| 16 | Pub/Sub | ✅ | `events.ts` topics → subscriber jobs; publisher never fails because a subscriber did |
| 17 | EDA | ✅ | past‑tense events (`OrderPlaced`…), append‑only `event_log`, `traceId` through every job |
| 18/19 | Distributed tx → Saga | ✅ | Single DB ⇒ ACID for stock reservation (book: avoid distributed tx). Cross‑system step (payment) uses saga: reserve stock → pay → confirm; failure ⇒ `PaymentFailed` ⇒ `inventory.release` compensation (handler ✅, checkout wiring phase 5). UI shows "Processing" states |
| 20 | Cron | ✅ | `/api/cron/[job]` bearer‑secret, distributed `locks`, cron only enqueues/light work, UTC |

Verified by `npm test` (`scripts/verify-reliability.ts`, 10 checks incl. concurrent double‑click and cron double‑trigger).

## Roadmap (status)
1. ✅ **Foundation** — schema, seed (67 products), session auth, route guards, reliability primitives.
2. ✅ **Auth UI** — login, register, account link in navbar (incl. mobile menu).
3. ✅ **Catalog** — `/shop` (category, price band, sort, search, pagination), `/product/[slug]` (gallery with zoom/swipe, sizes, stock warnings, JSON‑LD), landing "Shop the collection" from DB. Cached 1h + tag‑revalidated on admin edits. Images via Next optimizer.
4. ✅ **Cart + wishlist** — persisted in the browser (localStorage); server re‑prices everything at checkout. *(The `cart_items` table is unused — cross‑device cart sync is not built.)*
5. ✅ **Checkout + orders** — address book, server quote, coupons, shipping/GST, COD + Razorpay, idempotent place‑order, atomic stock reservation, saga compensation, signed verify + webhook, confirmation animation.
6. ✅ **Customer account** — orders list + detail timeline + self‑cancel, addresses, profile. *(Wishlist is browser‑local; review submission UI not built — reviews display only.)*
7. ✅ **Admin** — dashboard (KPIs, 14‑day chart, low stock), orders (status workflow, tracking, cancel/refund), products (CRUD, image upload, sizes/stock), customers, coupons, system (queue/DLQ/events), settings.
8. ⏳ **Remaining** — real email templates (jobs run; emails log to console until `RESEND_API_KEY`), review submission, password reset, cross‑device cart, invoices/PDF, image storage for serverless (uploads write to `public/uploads`), deploy + schedule the 3 cron jobs, Razorpay live keys, `metadataBase`/sitemap.

## Testing
`npm test` → 20 checks (reliability + checkout money path). `npm run test:e2e` (server running; see scripts/e2e.mjs header) → 16 HTTP checks.

## Security rules
bcrypt passwords · httpOnly+SameSite+Secure cookie · role never taken from client · open‑redirect‑safe `next` · prices from DB only · payment signature verified server‑side · login/register rate‑limited · identical error for unknown email vs bad password.

## Production checklist (from the book, p20)
- [x] Idempotency primitive for payment routes (wired in phase 5)
- [x] Heavy work off the request path via Queue
- [x] Timeouts on external calls (email now, payments phase 5)
- [x] Exponential backoff + jitter on failures
- [x] Cache layer for catalog reads
- [x] Cron protected by distributed lock
- [x] Circuit breaker / graceful degradation primitive
