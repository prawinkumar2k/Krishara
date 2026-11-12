import "server-only";
import { randomUUID } from "node:crypto";
import { and, eq, lt } from "drizzle-orm";
import { db, schema } from "@/db";

/**
 * Topic 20 — only one instance may run a given cron job at a time.
 * Atomic: insert the lock row, or take over only after the previous lock expired.
 */
export async function withLock<T>(
  name: string,
  ttlMs: number,
  fn: () => Promise<T>,
): Promise<T | "skipped"> {
  const owner = randomUUID();
  const now = Date.now();
  await db
    .delete(schema.locks)
    .where(and(eq(schema.locks.name, name), lt(schema.locks.lockedUntil, now)));
  const got = await db
    .insert(schema.locks)
    .values({ name, owner, lockedUntil: now + ttlMs })
    .onConflictDoNothing()
    .returning({ name: schema.locks.name });
  if (!got.length) return "skipped";
  try {
    return await fn();
  } finally {
    await db
      .delete(schema.locks)
      .where(and(eq(schema.locks.name, name), eq(schema.locks.owner, owner)));
  }
}
