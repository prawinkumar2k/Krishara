import Link from "next/link";
import { and, desc, eq, like, or, sql, type SQL } from "drizzle-orm";
import { db, schema, } from "@/db";
import { ORDER_STATUSES } from "@/db/schema";
import { formatINR } from "@/lib/format";
import { Badge, PageHeader, Table } from "@/components/admin/ui";

export default async function AdminOrders({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const sp = await searchParams;
  const where: SQL[] = [];
  if (sp.status && (ORDER_STATUSES as readonly string[]).includes(sp.status)) where.push(eq(schema.orders.status, sp.status as (typeof ORDER_STATUSES)[number]));
  if (sp.q) { const q = `%${sp.q.replace(/[%_]/g, "").slice(0, 40)}%`; where.push(or(like(schema.orders.number, q), like(schema.orders.email, q))!); }

  const rows = await db.select({
    id: schema.orders.id, number: schema.orders.number, email: schema.orders.email, status: schema.orders.status, paymentStatus: schema.orders.paymentStatus,
    method: schema.orders.paymentMethod, total: schema.orders.total, createdAt: schema.orders.createdAt,
    items: sql<number>`(select coalesce(sum(quantity),0) from order_items where order_id = ${schema.orders.id})`,
  }).from(schema.orders).where(and(...where)).orderBy(desc(schema.orders.createdAt)).limit(100);

  const tab = (s?: string) => `rounded-full px-4 py-2 text-xs font-semibold whitespace-nowrap ${sp.status === s || (!sp.status && !s) ? "bg-[#09492e] text-[#fbf8f3]" : "bg-white border border-[#09492e]/20 text-[#09492e]"}`;

  return (
    <>
      <PageHeader title="Orders" sub={`${rows.length} shown`} />
      <form className="mb-4 flex gap-2"><input name="q" defaultValue={sp.q} placeholder="Search order no. or email" className="w-full max-w-sm rounded-full border border-[#09492e]/20 bg-white px-4 py-2.5 text-sm outline-none focus:border-[#09492e]" />{sp.status && <input type="hidden" name="status" value={sp.status} />}<button className="rounded-full bg-[#09492e] px-5 text-sm font-semibold text-[#fbf8f3] cursor-pointer">Search</button></form>
      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0 [scrollbar-width:none]">
        <Link href="/admin/orders" className={tab()}>All</Link>
        {ORDER_STATUSES.map((s) => <Link key={s} href={`/admin/orders?status=${s}`} className={`${tab(s)} capitalize`}>{s}</Link>)}
      </div>
      <Table head={["Order", "Customer", "Items", "Payment", "Status", "Total", "Date"]}>
        {rows.map((o) => (
          <tr key={o.id} className="hover:bg-[#09492e]/[0.02]">
            <td className="px-4 py-3 font-semibold"><Link href={`/admin/orders/${o.number}`} className="text-[#09492e] hover:underline">{o.number}</Link></td>
            <td className="px-4 py-3 text-[#12231a]/70">{o.email}</td>
            <td className="px-4 py-3">{Number(o.items)}</td>
            <td className="px-4 py-3"><span className="mr-1 text-[11px] uppercase text-[#12231a]/45">{o.method}</span><Badge s={o.paymentStatus} /></td>
            <td className="px-4 py-3"><Badge s={o.status} /></td>
            <td className="px-4 py-3 font-semibold">{formatINR(o.total)}</td>
            <td className="px-4 py-3 text-[#12231a]/55">{o.createdAt.toLocaleDateString("en-IN")}</td>
          </tr>
        ))}
        {rows.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-[#12231a]/50">No orders match.</td></tr>}
      </Table>
    </>
  );
}
