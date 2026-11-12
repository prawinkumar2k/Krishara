import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { db, schema } from "../src/db";
import { withIdempotency } from "../src/lib/idempotency";
import { enqueue, processDueJobs, registerHandler } from "../src/lib/queue";
import { publish } from "../src/lib/events";
import { withLock } from "../src/lib/cron-lock";
import { CircuitBreaker, retry, withTimeout, TimeoutError } from "../src/lib/resilience";
import { takeToken } from "../src/lib/rate-limit";

let n = 0;
const ok = (name: string) => console.log(`  ✓ ${++n}. ${name}`);

async function main() {
  // 1 — token bucket
  const key = `t-${Date.now()}`;
  for (let i = 0; i < 5; i++) assert.equal(takeToken(key, 5, 1).ok, true);
  const blocked = takeToken(key, 5, 1);
  assert.equal(blocked.ok, false);
  assert.ok(!blocked.ok && blocked.retryAfterSeconds >= 1);
  ok("rate limit: 6th request in a burst of 5 is rejected with retry_after");

  // 14 — idempotency: sequential replay
  let charges = 0;
  const k = `idem-${Date.now()}`;
  const body = { amount: 50 };
  const a = await withIdempotency(k, "u1", body, async () => ({ charged: ++charges }));
  const b = await withIdempotency(k, "u1", body, async () => ({ charged: ++charges }));
  assert.equal(charges, 1);
  assert.equal(a.replayed, false);
  assert.equal(b.replayed, true);
  assert.deepEqual(b.result, { charged: 1 });
  ok("idempotency: retry with same key does NOT charge twice, returns stored result");

  // 14 — idempotency: concurrent double-click
  const k2 = `idem2-${Date.now()}`;
  let runs = 0;
  const slow = async () => {
    runs++;
    await new Promise((r) => setTimeout(r, 150));
    return { ok: true };
  };
  const results = await Promise.allSettled([
    withIdempotency(k2, "u1", body, slow),
    withIdempotency(k2, "u1", body, slow),
  ]);
  assert.equal(runs, 1);
  assert.equal(results.filter((r) => r.status === "rejected").length, 1);
  ok("idempotency: two simultaneous requests → handler runs once");

  // 14 — same key, different body is rejected
  await assert.rejects(() => withIdempotency(k, "u1", { amount: 999 }, async () => 1));
  ok("idempotency: key reuse with a different body is rejected");

  // 11 — timeout
  await assert.rejects(() => withTimeout(() => new Promise((r) => setTimeout(r, 500)), 50), TimeoutError);
  ok("timeout: slow call is cut off");

  // 12/13 — retry only transient errors
  let tries = 0;
  const v = await retry(async () => {
    if (++tries < 3) throw Object.assign(new Error("503"), { status: 503 });
    return "success";
  }, { attempts: 3, baseMs: 5, maxMs: 20 });
  assert.equal(v, "success");
  assert.equal(tries, 3);
  let badTries = 0;
  await assert.rejects(() =>
    retry(async () => {
      badTries++;
      throw Object.assign(new Error("400"), { status: 400 });
    }, { attempts: 3, baseMs: 5 }),
  );
  assert.equal(badTries, 1);
  ok("retry: 503 retried with backoff until success; 400 never retried");

  // 10 — circuit breaker
  const cb = new CircuitBreaker("svc", 3, 60);
  const failing = async () => {
    throw new Error("down");
  };
  for (let i = 0; i < 3; i++) await cb.run(failing).catch(() => {});
  assert.equal(cb.state, "open");
  let called = false;
  await cb.run(async () => (called = true)).catch(() => {});
  assert.equal(called, false);
  assert.deepEqual(await cb.runOr(async () => [1], []), []);
  await new Promise((r) => setTimeout(r, 70));
  assert.equal(cb.state, "half-open");
  await cb.run(async () => 1);
  assert.equal(cb.state, "closed");
  ok("circuit breaker: opens after 3 failures, fails fast, degrades gracefully, recovers");

  // 15 — queue: retry then DLQ
  let attempts = 0;
  registerHandler("test.always_fails", async () => {
    attempts++;
    throw new Error("boom");
  });
  await db.delete(schema.jobs).where(eq(schema.jobs.type, "test.always_fails"));
  await enqueue("test.always_fails", {}, { maxAttempts: 2 });
  await processDueJobs();
  let [job] = await db.select().from(schema.jobs).where(eq(schema.jobs.type, "test.always_fails"));
  assert.equal(job.status, "pending"); // scheduled for retry, later runAt
  assert.ok(job.runAt.getTime() > Date.now());
  await db.update(schema.jobs).set({ runAt: new Date(0) }).where(eq(schema.jobs.id, job.id)); // fast-forward backoff
  await processDueJobs();
  [job] = await db.select().from(schema.jobs).where(eq(schema.jobs.id, job.id));
  assert.equal(job.status, "dead");
  assert.equal(attempts, 2);
  assert.equal(job.lastError, "boom");
  ok("queue: failed job retried with backoff, then moved to dead-letter after max attempts");

  // 16/17 — events fan out to subscribers + are logged with a trace id
  const trace = await publish("UserRegistered", { userId: "u", email: "x@y.z", name: "X" });
  const logged = await db.select().from(schema.eventLog).where(eq(schema.eventLog.traceId, trace));
  assert.equal(logged.length, 1);
  assert.equal(logged[0].type, "UserRegistered");
  const res = await processDueJobs();
  assert.ok(res.done >= 1);
  ok("pub/sub: past-tense event logged with trace id and delivered to its subscriber job");

  // 20 — lock
  let concurrent = 0;
  const job1 = withLock("cron:test", 5000, async () => {
    concurrent++;
    await new Promise((r) => setTimeout(r, 100));
    return "ran";
  });
  const job2 = withLock("cron:test", 5000, async () => {
    concurrent++;
    return "ran";
  });
  const out = await Promise.all([job1, job2]);
  assert.equal(concurrent, 1);
  assert.deepEqual(out.sort(), ["ran", "skipped"]);
  ok("cron lock: two simultaneous triggers → exactly one runs");

  console.log(`\nAll ${n} reliability checks passed.`);
}

main().catch((e) => {
  console.error("\n✗ FAILED:", e);
  process.exit(1);
});
