import { desc, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { Card, PageHeader, Table } from "@/components/admin/ui";
import { RetryJobButton, RunQueueButton } from "@/components/admin/AdminForms";
import { razorpayConfigured, simulatedPayments } from "@/lib/razorpay";

/** Operations view for the reliability machinery: queue depth, the dead-letter queue, recent events. */
export default async function AdminSystem() {
  const [counts, dead, events] = await Promise.all([
    db.select({ status: schema.jobs.status, n: sql<number>`count(*)` }).from(schema.jobs).groupBy(schema.jobs.status),
    db.select().from(schema.jobs).where(eq(schema.jobs.status, "dead")).orderBy(desc(schema.jobs.createdAt)).limit(25),
    db.select().from(schema.eventLog).orderBy(desc(schema.eventLog.createdAt)).limit(25),
  ]);
  const n = (s: string) => Number(counts.find((c) => c.status === s)?.n ?? 0);

  return (
    <>
      <PageHeader title="System" sub="Queue, dead-letter queue and event log" />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(["pending", "running", "done", "dead"] as const).map((s) => (
          <Card key={s}><p className="text-[11px] font-semibold uppercase tracking-wider text-[#12231a]/55">{s === "dead" ? "Dead-letter" : s}</p><p className={`text-3xl font-bold ${s === "dead" && n(s) > 0 ? "text-[#b81d56]" : "text-[#09492e]"}`}>{n(s)}</p></Card>
        ))}
      </div>
      <Card className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm"><p className="font-semibold text-[#09492e]">Payments: {razorpayConfigured() ? "Razorpay (live keys)" : simulatedPayments() ? "Simulated (test mode — no keys)" : "Not configured — online payments disabled"}</p>
          <p className="text-xs text-[#12231a]/55">The queue also drains every minute via <code>/api/cron/process-queue</code>.</p></div>
        <RunQueueButton />
      </Card>

      <h2 className="mb-3 text-sm font-semibold text-[#09492e]">Dead-letter queue ({dead.length})</h2>
      <Table head={["Job", "Attempts", "Last error", "Created", ""]}>
        {dead.map((j) => (
          <tr key={j.id}><td className="px-4 py-3 font-mono text-xs font-semibold">{j.type}</td><td className="px-4 py-3">{j.attempts}</td><td className="max-w-xs truncate px-4 py-3 text-xs text-[#b81d56]">{j.lastError}</td><td className="px-4 py-3 text-xs text-[#12231a]/55">{j.createdAt.toLocaleString("en-IN")}</td><td className="px-4 py-3 text-right"><RetryJobButton id={j.id} /></td></tr>
        ))}
        {dead.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-[#12231a]/50">Nothing failed permanently ✓</td></tr>}
      </Table>

      <h2 className="mb-3 mt-8 text-sm font-semibold text-[#09492e]">Recent events</h2>
      <Table head={["Event", "Trace", "When"]}>
        {events.map((e) => (
          <tr key={e.id}><td className="px-4 py-3 font-semibold">{e.type}</td><td className="px-4 py-3 font-mono text-[11px] text-[#12231a]/55">{e.traceId.slice(0, 8)}</td><td className="px-4 py-3 text-xs text-[#12231a]/55">{e.createdAt.toLocaleString("en-IN")}</td></tr>
        ))}
      </Table>
    </>
  );
}
