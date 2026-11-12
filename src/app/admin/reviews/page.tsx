import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { PageHeader, Table } from "@/components/admin/ui";
import { ReviewActions } from "@/components/admin/AdminForms";

export default async function AdminReviews() {
  const rows = await db.select({
    id: schema.reviews.id, rating: schema.reviews.rating, body: schema.reviews.body, approved: schema.reviews.isApproved,
    createdAt: schema.reviews.createdAt, product: schema.products.name, customer: schema.users.name,
  }).from(schema.reviews)
    .innerJoin(schema.products, eq(schema.reviews.productId, schema.products.id))
    .innerJoin(schema.users, eq(schema.reviews.userId, schema.users.id))
    .orderBy(schema.reviews.isApproved, desc(schema.reviews.createdAt)).limit(100);
  const pending = rows.filter((r) => !r.approved).length;

  return (
    <>
      <PageHeader title="Reviews" sub={`${pending} awaiting approval`} />
      <Table head={["Product", "Customer", "Rating", "Review", "Status", ""]}>
        {rows.map((r) => (
          <tr key={r.id}>
            <td className="px-4 py-3 font-semibold">{r.product}</td>
            <td className="px-4 py-3 text-[#12231a]/70">{r.customer}</td>
            <td className="px-4 py-3 text-[#c6a253]">{"★".repeat(r.rating)}</td>
            <td className="max-w-xs px-4 py-3 text-xs text-[#12231a]/75">{r.body || "—"}</td>
            <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${r.approved ? "bg-emerald-100 text-emerald-800" : "bg-[#c6a253]/25 text-[#7a5c14]"}`}>{r.approved ? "Live" : "Pending"}</span></td>
            <td className="px-4 py-3"><ReviewActions id={r.id} approved={r.approved} /></td>
          </tr>
        ))}
        {rows.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-[#12231a]/50">No reviews yet.</td></tr>}
      </Table>
    </>
  );
}
