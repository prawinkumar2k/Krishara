import "server-only";
import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";

export class IdempotencyError extends Error {}

/**
 * Topic 14 — Idempotency Keys.
 * Same key + same request   → returns the stored response, handler NOT re-run.
 * Same key + different body → rejected (client bug).
 * Same key still in flight  → rejected (double-click protection).
 */
export async function withIdempotency<T>(
  key: string,
  scope: string,
  body: unknown,
  handler: () => Promise<T>,
): Promise<{ replayed: boolean; result: T }> {
  const requestHash = createHash("sha256")
    .update(JSON.stringify(body))
    .digest("hex");

  // Atomic claim: the primary key means only one concurrent request wins.
  const claimed = await db
    .insert(schema.idempotencyKeys)
    .values({ key, scope, requestHash, status: "processing" })
    .onConflictDoNothing()
    .returning({ key: schema.idempotencyKeys.key });

  if (claimed.length === 0) {
    const [row] = await db
      .select()
      .from(schema.idempotencyKeys)
      .where(eq(schema.idempotencyKeys.key, key));
    if (!row || row.scope !== scope || row.requestHash !== requestHash)
      throw new IdempotencyError("Idempotency key reused with a different request.");
    if (row.status === "processing")
      throw new IdempotencyError("This request is already being processed.");
    return { replayed: true, result: row.response as T };
  }

  try {
    const result = await handler();
    await db
      .update(schema.idempotencyKeys)
      .set({ status: "done", response: result as unknown })
      .where(eq(schema.idempotencyKeys.key, key));
    return { replayed: false, result };
  } catch (err) {
    // Failed attempts must stay retryable with the same key.
    await db.delete(schema.idempotencyKeys).where(eq(schema.idempotencyKeys.key, key));
    throw err;
  }
}
