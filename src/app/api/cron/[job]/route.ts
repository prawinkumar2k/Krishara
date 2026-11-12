import { and, eq, lt } from "drizzle-orm";
import { db, schema } from "@/db";
import { withLock } from "@/lib/cron-lock";
import { processDueJobs } from "@/lib/queue";
import { publish } from "@/lib/events";

/**
 * Topic 20 — Cron. An external scheduler (Vercel Cron / GitHub Actions / EventBridge) calls these
 * with `Authorization: Bearer $CRON_SECRET`. Each job is guarded by a distributed lock so that
 * overlapping or multi-instance triggers run it once. Cron does light work and defers heavy work
 * to the queue. All timestamps are UTC (epoch).
 *
 *   process-queue      every minute        drain due jobs (retries/DLQ handled inside)
 *   cancel-unpaid      every 15 minutes   cancel online orders unpaid for 30 min → stock released (saga)
 *   purge-idempotency  daily 03:00 UTC       delete idempotency keys older than 24h
 */

const JOBS: Record<string, () => Promise<unknown>> = {
  "process-queue": () => processDueJobs(50),

  "cancel-unpaid": async () => {
    const cutoff = new Date(Date.now() - 30 * 60_000);
    const stale = await db
      .select({ id: schema.orders.id, number: schema.orders.number })
      .from(schema.orders)
      .where(
        and(
          eq(schema.orders.status, "pending"),
          eq(schema.orders.paymentMethod, "razorpay"),
          lt(schema.orders.createdAt, cutoff),
        ),
      );
    for (const o of stale) {
      await db.update(schema.orders).set({ status: "cancelled" }).where(eq(schema.orders.id, o.id));
      await db.insert(schema.orderEvents).values({ orderId: o.id, status: "cancelled", note: "Payment not received in 30 minutes" });
      await publish("OrderCancelled", { orderId: o.id, number: o.number });
    }
    return { cancelled: stale.length };
  },

  "purge-idempotency": async () => {
    await db.delete(schema.idempotencyKeys).where(lt(schema.idempotencyKeys.createdAt, new Date(Date.now() - 86_400_000)));
    return { ok: true };
  },
};

export async function GET(req: Request, ctx: { params: Promise<{ job: string }> }) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { job } = await ctx.params;
  const run = JOBS[job];
  if (!run) return Response.json({ error: "Unknown job" }, { status: 404 });

  const result = await withLock(`cron:${job}`, 5 * 60_000, run);
  return Response.json({ job, result });
}
