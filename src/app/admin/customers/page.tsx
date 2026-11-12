import { desc, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { formatINR } from "@/lib/format";
import { PageHeader, Table } from "@/components/admin/ui";

export default async function AdminCustomers() {
  const rows = await db.select({
    id: schema.users.id, name: schema.users.name, email: schema.users.email, phone: schema.users.phone, role: schema.users.role, createdAt: schema.users.createdAt,
    orders: sql<number>`(select count(*) from orders where user_id = ${schema.users.id} and status not in ('cancelled','pending'))`,
    spent: sql<number>`(select coalesce(sum(total),0) from orders where user_id = ${schema.users.id} and status in ('confirmed','packed','shipped','delivered'))`,
  }).from(schema.users).orderBy(desc(schema.users.createdAt)).limit(200);

  return (
    <>
      <PageHeader title="Customers" sub={`${rows.length} accounts`} />
      <Table head={["Name", "Email", "Phone", "Orders", "Lifetime value", "Joined"]}>
        {rows.map((u) => (
          <tr key={u.id}>
            <td className="px-4 py-3 font-semibold">{u.name} {u.role === "admin" && <span className="ml-1 rounded-full bg-[#c6a253]/30 px-2 py-0.5 text-[10px] font-bold text-[#7a5c14]">admin</span>}</td>
            <td className="px-4 py-3 text-[#12231a]/70">{u.email}</td>
            <td className="px-4 py-3 text-[#12231a]/70">{u.phone ?? "—"}</td>
            <td className="px-4 py-3">{Number(u.orders)}</td>
            <td className="px-4 py-3 font-semibold">{formatINR(Number(u.spent))}</td>
            <td className="px-4 py-3 text-[#12231a]/55">{u.createdAt.toLocaleDateString("en-IN")}</td>
          </tr>
        ))}
      </Table>
    </>
  );
}
