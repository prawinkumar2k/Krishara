import Link from "next/link";
import { connection } from "next/server";
import { and, count, desc, gte, inArray, lte, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { formatINR } from "@/lib/format";
import { Badge, Card, PageHeader, Table } from "@/components/admin/ui";
import { Kpi, SalesChart } from "@/components/admin/SalesChart";

// Kept out of the component body: wall-clock time is intentionally impure (page opts out of prerender via connection()).
const currentTime = () => Date.now();

const LIVE = ["confirmed", "packed", "shipped", "delivered"] as const; // statuses that count as revenue

export default async function AdminHome() {
  await connection(); // time-dependent + per-request data: never prerender
  const now = currentTime();
  const since30 = new Date(now - 30 * 86_400_000);
  const since14 = Math.floor((now - 13 * 86_400_000) / 1000);

  const [rev30, [pending], [customers], series, low, recent] = await Promise.all([
    db.select({ revenue: sql<number>`coalesce(sum(${schema.orders.total}),0)`, orders: count() }).from(schema.orders)
      .where(and(inArray(schema.orders.status, [...LIVE]), gte(schema.orders.createdAt, since30))),
    db.select({ n: count() }).from(schema.orders).where(inArray(schema.orders.status, ["pending", "confirmed", "packed"])),
    db.select({ n: count() }).from(schema.users).where(sql`${schema.users.role} = 'customer'`),
    db.select({
      day: sql<string>`date(${schema.orders.createdAt}, 'unixepoch')`,
      revenue: sql<number>`coalesce(sum(${schema.orders.total}),0)`,
      orders: sql<number>`count(*)`,
    }).from(schema.orders)
      .where(and(inArray(schema.orders.status, [...LIVE]), sql`${schema.orders.createdAt} >= ${since14}`))
      .groupBy(sql`date(${schema.orders.createdAt}, 'unixepoch')`),
    db.select({ id: schema.products.id, name: schema.products.name, label: schema.variants.label, stock: schema.variants.stock })
      .from(schema.variants).innerJoin(schema.products, sql`${schema.variants.productId} = ${schema.products.id}`)
      .where(and(lte(schema.variants.stock, 2), sql`${schema.products.isActive} = 1`)).orderBy(schema.variants.stock).limit(8),
    db.select().from(schema.orders).orderBy(desc(schema.orders.createdAt)).limit(6),
  ]);

  const days = Array.from({ length: 14 }).map((_, i) => new Date(now - (13 - i) * 86_400_000).toISOString().slice(0, 10));
  const byDay = new Map(series.map((s) => [s.day, s]));
  const chart = days.map((day) => ({ day, revenue: Number(byDay.get(day)?.revenue ?? 0), orders: Number(byDay.get(day)?.orders ?? 0) }));
  const revenue = Number(rev30[0].revenue);
  const orders30 = rev30[0].orders;

  return (
    <>
      <PageHeader title="Dashboard" sub="Last 30 days" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi i={0} label="Revenue" value={formatINR(revenue)} sub={`${orders30} orders`} />
        <Kpi i={1} label="Avg. order value" value={formatINR(orders30 ? Math.round(revenue / orders30) : 0)} />
        <Kpi i={2} label="To fulfil" value={String(pending.n)} sub="pending · confirmed · packed" />
        <Kpi i={3} label="Customers" value={String(customers.n)} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Card><h2 className="mb-4 text-sm font-semibold text-[#09492e]">Revenue · last 14 days</h2><SalesChart data={chart} /></Card>
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-[#09492e]">Low stock</h2>
          {low.length === 0 ? <p className="text-sm text-[#12231a]/55">All stocked up ✓</p> : (
            <ul className="space-y-2 text-sm">
              {low.map((l, i) => (
                <li key={i} className="flex items-center justify-between gap-2">
                  <Link href={`/admin/products/${l.id}`} className="truncate hover:underline">{l.name} <span className="text-[#12231a]/45">({l.label})</span></Link>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${l.stock === 0 ? "bg-[#b81d56]/10 text-[#b81d56]" : "bg-[#c6a253]/25 text-[#7a5c14]"}`}>{l.stock === 0 ? "Out" : `${l.stock} left`}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <h2 className="mb-3 mt-8 text-sm font-semibold text-[#09492e]">Recent orders</h2>
      <Table head={["Order", "Date", "Payment", "Status", "Total"]}>
        {recent.map((o) => (
          <tr key={o.id} className="hover:bg-[#09492e]/[0.02]">
            <td className="px-4 py-3 font-semibold"><Link href={`/admin/orders/${o.number}`} className="text-[#09492e] hover:underline">{o.number}</Link></td>
            <td className="px-4 py-3 text-[#12231a]/60">{o.createdAt.toLocaleDateString("en-IN")}</td>
            <td className="px-4 py-3"><Badge s={o.paymentStatus} /></td>
            <td className="px-4 py-3"><Badge s={o.status} /></td>
            <td className="px-4 py-3 font-semibold">{formatINR(o.total)}</td>
          </tr>
        ))}
        {recent.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-[#12231a]/50">No orders yet.</td></tr>}
      </Table>
    </>
  );
}
