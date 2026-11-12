import Link from "next/link";
import { and, asc, desc, eq, like, sql, type SQL } from "drizzle-orm";
import { db, schema } from "@/db";
import { formatINR } from "@/lib/format";
import { PageHeader, Table } from "@/components/admin/ui";
import { ToggleButton } from "@/components/admin/AdminForms";

export default async function AdminProducts({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const where: SQL[] = [];
  if (q) where.push(like(schema.products.name, `%${q.replace(/[%_]/g, "").slice(0, 40)}%`));
  const rows = await db.select({
    id: schema.products.id, name: schema.products.name, price: schema.products.price, images: schema.products.images, isActive: schema.products.isActive,
    isFeatured: schema.products.isFeatured, category: schema.categories.name,
    stock: sql<number>`coalesce((select sum(stock) from variants where variants.product_id = ${schema.products.id}),0)`,
  }).from(schema.products).leftJoin(schema.categories, eq(schema.products.categoryId, schema.categories.id))
    .where(and(...where)).orderBy(desc(schema.products.createdAt), asc(schema.products.name)).limit(200);

  return (
    <>
      <PageHeader title="Products" sub={`${rows.length} shown`} action={{ href: "/admin/products/new", label: "+ New product" }} />
      <form className="mb-4"><input name="q" defaultValue={q} placeholder="Search products" className="w-full max-w-sm rounded-full border border-[#09492e]/20 bg-white px-4 py-2.5 text-sm outline-none focus:border-[#09492e]" /></form>
      <Table head={["Product", "Category", "Price", "Stock", "Featured", "Visible"]}>
        {rows.map((p) => (
          <tr key={p.id} className="hover:bg-[#09492e]/[0.02]">
            <td className="px-4 py-3"><Link href={`/admin/products/${p.id}`} className="flex items-center gap-3 font-semibold text-[#09492e] hover:underline">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.images[0] ?? ""} alt="" className="h-12 w-10 rounded-lg bg-[#efe9dd] object-cover" /><span className="line-clamp-2">{p.name}</span></Link></td>
            <td className="px-4 py-3 text-[#12231a]/65">{p.category ?? "—"}</td>
            <td className="px-4 py-3 font-semibold">{formatINR(p.price)}</td>
            <td className="px-4 py-3"><span className={Number(p.stock) <= 2 ? "font-bold text-[#b81d56]" : ""}>{Number(p.stock)}</span></td>
            <td className="px-4 py-3"><ToggleButton id={p.id} field="isFeatured" on={p.isFeatured} /></td>
            <td className="px-4 py-3"><ToggleButton id={p.id} field="isActive" on={p.isActive} /></td>
          </tr>
        ))}
      </Table>
    </>
  );
}
