import { sql } from "drizzle-orm";
import { connection } from "next/server";
import { db } from "@/db";
import { withTimeout } from "@/lib/resilience";

/** Topics 3/8 — health check endpoint for load balancers / Docker / Kubernetes probes. */

export async function GET() {
  await connection(); // always evaluate at request time, never at build
  try {
    await withTimeout(() => db.run(sql`select 1`), 2000);
    return Response.json({ status: "ok" });
  } catch {
    return Response.json({ status: "degraded", db: "unreachable" }, { status: 503 });
  }
}
