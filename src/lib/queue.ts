import "server-only";
import { and, eq, lte, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { backoffMs } from "./resilience";

/**
 * Topic 15 — Message queue + Dead Letter Queue, backed by the DB (no extra infra).
 * Swap for SQS/BullMQ later: only enqueue() and processDueJobs() change.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Handler = (payload: any) => Promise<void>;
const handlers = new Map<string, Handler>();

export function registerHandler(type: string, fn: Handler) {
  handlers.set(type, fn);
}

export async function enqueue(
  type: string,
  payload: unknown,
  opts: { delayMs?: number; maxAttempts?: number } = {},
) {
  await db.insert(schema.jobs).values({
    type,
    payload,
    maxAttempts: opts.maxAttempts ?? 5,
    runAt: new Date(Date.now() + (opts.delayMs ?? 0)),
  });
}

/** Runs due jobs. Failures retry with backoff+jitter (topics 12/13); after maxAttempts → DLQ ("dead"). */
export async function processDueJobs(limit = 20) {
  await import("./job-handlers"); // registers handlers
  const due = await db
    .select()
    .from(schema.jobs)
    .where(and(eq(schema.jobs.status, "pending"), lte(schema.jobs.runAt, new Date())))
    .limit(limit);

  let done = 0,
    retried = 0,
    dead = 0;
  for (const job of due) {
    // atomic claim — another worker may have taken it
    const claim = await db
      .update(schema.jobs)
      .set({ status: "running", attempts: sql`${schema.jobs.attempts} + 1` })
      .where(and(eq(schema.jobs.id, job.id), eq(schema.jobs.status, "pending")))
      .returning({ attempts: schema.jobs.attempts });
    if (!claim.length) continue;
    const attempts = claim[0].attempts;

    try {
      const handler = handlers.get(job.type);
      if (!handler) throw new Error(`No handler for job type "${job.type}"`);
      await handler(job.payload);
      await db
        .update(schema.jobs)
        .set({ status: "done", lastError: null })
        .where(eq(schema.jobs.id, job.id));
      done++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (attempts >= job.maxAttempts) {
        await db
          .update(schema.jobs)
          .set({ status: "dead", lastError: message })
          .where(eq(schema.jobs.id, job.id));
        dead++;
      } else {
        await db
          .update(schema.jobs)
          .set({
            status: "pending",
            lastError: message,
            runAt: new Date(Date.now() + backoffMs(attempts, 2000, 5 * 60_000)),
          })
          .where(eq(schema.jobs.id, job.id));
        retried++;
      }
    }
  }
  return { processed: due.length, done, retried, dead };
}
