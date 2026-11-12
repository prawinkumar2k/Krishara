import { drizzle } from "drizzle-orm/libsql";
import { createClient, type Client } from "@libsql/client";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  __krisharaClient?: Client;
  __krisharaWriteChain?: Promise<unknown>;
};

const url = process.env.DATABASE_URL ?? "file:./krishara.db";

const isBusy = (e: unknown) =>
  /SQLITE_BUSY|database is locked/i.test(String((e as Error)?.message ?? e)) ||
  /SQLITE_BUSY/.test(String((e as { code?: string })?.code ?? "")) ||
  /SQLITE_BUSY/.test(String((e as { cause?: { code?: string } })?.cause?.code ?? ""));

/** Retry only lock contention, with exponential backoff + jitter (Tracen topics 12/13). */
async function retryBusy<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (e) {
      if (!isBusy(e) || attempt >= 8) throw e;
      const ceiling = Math.min(1000, 40 * 2 ** attempt);
      await new Promise((r) => setTimeout(r, ceiling / 2 + Math.random() * (ceiling / 2)));
    }
  }
}

function enqueueWrite<T>(fn: () => Promise<T>): Promise<T> {
  const prev = globalForDb.__krisharaWriteChain ?? Promise.resolve();
  const result = prev.then(fn, fn);
  globalForDb.__krisharaWriteChain = result.catch(() => {});
  return result;
}

function create(): Client {
  const raw = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN });
  if (url.startsWith("file:")) {
    // WAL: readers don't block on a writer. busy_timeout: writers wait instead of failing instantly.
    raw.execute("PRAGMA journal_mode=WAL").catch(() => {});
    raw.execute("PRAGMA busy_timeout=5000").catch(() => {});
  }
  // Writes go through ONE in-process queue (SQLite has a single write lock) and survive contention
  // from other processes via retry. Reads run concurrently. Transaction bodies use their own tx
  // handle, so they never re-enter this queue (no deadlock).
  const isWrite = (stmt: unknown) => {
    const text = typeof stmt === "string" ? stmt : ((stmt as { sql?: string })?.sql ?? "");
    return /^\s*(insert|update|delete|replace|create|drop|alter|pragma)/i.test(text);
  };
  return new Proxy(raw, {
    get(target, prop) {
      const v = Reflect.get(target, prop, target);
      if (typeof v !== "function") return v;
      if (prop === "execute")
        return (stmt: unknown, ...rest: unknown[]) => {
          const call = () => retryBusy(() => (v as (...a: unknown[]) => Promise<unknown>).call(target, stmt, ...rest));
          return isWrite(stmt) ? enqueueWrite(call) : call();
        };
      if (prop === "batch")
        return (...args: unknown[]) => enqueueWrite(() => retryBusy(() => (v as (...a: unknown[]) => Promise<unknown>).apply(target, args)));
      return v.bind(target);
    },
  });
}

const client = globalForDb.__krisharaClient ?? create();
if (process.env.NODE_ENV !== "production") globalForDb.__krisharaClient = client;

export const db = drizzle(client, { schema });
export { schema };

type TxCallback<T> = Parameters<typeof db.transaction<T>>[0];

/**
 * Run a write transaction safely under concurrency.
 *  1. Serialised in-process: transactions queue instead of fighting for SQLite's single write lock.
 *  2. Lock contention from another process is retried with backoff + jitter.
 * Business errors (e.g. "sold out") are NOT retried — only lock contention is.
 */
export function writeTransaction<T>(cb: TxCallback<T>): Promise<T> {
  return enqueueWrite(() => retryBusy(() => db.transaction(cb)));
}
