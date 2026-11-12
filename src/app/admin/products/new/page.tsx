import { asc } from "drizzle-orm";
import { db, schema } from "@/db";
import { PageHeader } from "@/components/admin/ui";
import { ProductForm } from "@/components/admin/AdminForms";

export default async function NewProduct() {
  const categories = await db.select({ id: schema.categories.id, name: schema.categories.name }).from(schema.categories).orderBy(asc(schema.categories.sortOrder));
  return (<><PageHeader title="New product" /><ProductForm categories={categories} /></>);
}
