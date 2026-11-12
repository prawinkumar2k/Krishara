import "server-only";

/**
 * Topic 1 — Token bucket rate limiter.
 * Each key owns a bucket of `capacity` tokens refilled at `refillPerSec`; a request costs 1 token.
 * Empty bucket → reject with retry_after_seconds (HTTP 429).
 *
 * In-memory = per-instance. The ideal place for this is the edge (Cloudflare/gateway); keep this
 * as the app-level safety net for auth + checkout, and move the store to Redis when scaling out.
 */
type Bucket = { tokens: number; updatedAt: number };
const buckets = new Map<string, Bucket>();

export type LimitResult = { ok: true } | { ok: false; retryAfterSeconds: number };

export function takeToken(key: string, capacity: number, refillPerSec: number): LimitResult {
  const now = Date.now();
  const b = buckets.get(key) ?? { tokens: capacity, updatedAt: now };
  b.tokens = Math.min(capacity, b.tokens + ((now - b.updatedAt) / 1000) * refillPerSec);
  b.updatedAt = now;

  if (b.tokens < 1) {
    buckets.set(key, b);
    return { ok: false, retryAfterSeconds: Math.ceil((1 - b.tokens) / refillPerSec) };
  }
  b.tokens -= 1;
  buckets.set(key, b);

  // opportunistic cleanup so the map can't grow forever
  if (buckets.size > 10_000) {
    for (const [k, v] of buckets) if (now - v.updatedAt > 3_600_000) buckets.delete(k);
  }
  return { ok: true };
}

/** Back-compat helper: `limit` requests per `windowMs`. */
export function rateLimit(key: string, limit: number, windowMs: number) {
  return takeToken(key, limit, limit / (windowMs / 1000)).ok;
}

/** The exact JSON shape from the Tracen book, for route handlers. */
export function tooManyRequests(retryAfterSeconds: number) {
  return Response.json(
    {
      error: "Rate limit exceeded",
      message: "You have exhausted your request quota.",
      retry_after_seconds: retryAfterSeconds,
    },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
  );
}
