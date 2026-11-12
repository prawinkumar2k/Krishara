import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { PageHeader } from "@/components/admin/ui";
import { ProductForm } from "@/components/admin/AdminForms";

export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [p] = await db.select().from(schema.products).where(eq(schema.products.id, id));
  if (!p) notFound();
  const [variants, categories] = await Promise.all([
    db.select({ label: schema.variants.label, stock: schema.variants.stock }).from(schema.variants).where(eq(schema.variants.productId, id)).orderBy(asc(schema.variants.label)),
    db.select({ id: schema.categories.id, name: schema.categories.name }).from(schema.categories).orderBy(asc(schema.categories.sortOrder)),
  ]);
  return (
    <>
      <Link href="/admin/products" className="text-xs text-[#12231a]/55 hover:text-[#09492e]">← Products</Link>
      <PageHeader title={p.name} sub={`/product/${p.slug}`} />
      <ProductForm categories={categories} product={{ ...p, variants }} />
    </>
  );
}
