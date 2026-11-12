import { desc } from "drizzle-orm";
import { db, schema } from "@/db";
import { formatINR } from "@/lib/format";
import { Card, PageHeader, Table } from "@/components/admin/ui";
import { CouponForm, CouponToggle } from "@/components/admin/AdminForms";

export default async function AdminCoupons() {
  const rows = await db.select().from(schema.coupons).orderBy(desc(schema.coupons.isActive), schema.coupons.code);
  return (
    <>
      <PageHeader title="Coupons" />
      <Card className="mb-6"><CouponForm /></Card>
      <Table head={["Code", "Discount", "Min. subtotal", "Used", "Status", ""]}>
        {rows.map((c) => (
          <tr key={c.id}>
            <td className="px-4 py-3 font-mono font-bold text-[#09492e]">{c.code}</td>
            <td className="px-4 py-3">{c.type === "percent" ? `${c.value}%` : formatINR(c.value)}</td>
            <td className="px-4 py-3">{formatINR(c.minSubtotal)}</td>
            <td className="px-4 py-3">{c.usedCount}{c.maxUses ? ` / ${c.maxUses}` : ""}</td>
            <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${c.isActive ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-600"}`}>{c.isActive ? "Active" : "Off"}</span></td>
            <td className="px-4 py-3 text-right"><CouponToggle id={c.id} on={c.isActive} /></td>
          </tr>
        ))}
      </Table>
    </>
  );
}
