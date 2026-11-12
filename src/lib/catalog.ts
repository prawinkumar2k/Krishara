import { and, asc, desc, eq, gte, inArray, like, lte, ne, sql, type SQL } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db, schema } from "@/db";
import { breaker } from "./resilience";

/**
 * Tracen topic 2 — cache-aside with TTL. Catalog reads are frequent, rarely change and the
 * product page is the hottest path, so they're cached (1h TTL) and tagged; admin edits call
 * updateTag("catalog") so changes show immediately instead of waiting for the TTL.
 */

export type Sort = "featured" | "newest" | "price-asc" | "price-desc";

export type ProductCard = {
  id: string;
  slug: string;
  name: string;
  price: number;
  compareAtPrice: number | null;
  image: string;
  image2: string | null;
  category: string | null;
  tag: string | null;
  swatchHex: string | null;
  inStock: boolean;
};

const cardColumns = {
  id: schema.products.id,
  slug: schema.products.slug,
  name: schema.products.name,
  price: schema.products.price,
  compareAtPrice: schema.products.compareAtPrice,
  images: schema.products.images,
  tag: schema.products.tag,
  swatchHex: schema.products.swatchHex,
  category: schema.categories.name,
  stock: sql<number>`coalesce((select sum(stock) from variants where variants.product_id = ${schema.products.id}), 0)`,
};

function toCard(r: {
  id: string; slug: string; name: string; price: number; compareAtPrice: number | null;
  images: string[]; tag: string | null; swatchHex: string | null; category: string | null; stock: number;
}): ProductCard {
  return {
    id: r.id, slug: r.slug, name: r.name, price: r.price, compareAtPrice: r.compareAtPrice,
    image: r.images[0] ?? "/images/saree-fold-gold.jpg", image2: r.images[1] ?? null,
    category: r.category, tag: r.tag, swatchHex: r.swatchHex, inStock: Number(r.stock) > 0,
  };
}

export async function getCategories() {
  "use cache";
  cacheTag("catalog");
  cacheLife("hours");
  return db.select().from(schema.categories).orderBy(asc(schema.categories.sortOrder));
}

export async function listProducts(opts: {
  category?: string; q?: string; sort?: Sort; min?: number; max?: number; page?: number;
}) {
  "use cache";
  cacheTag("catalog");
  cacheLife("hours");
  const pageSize = 12;
  const page = Math.max(1, opts.page ?? 1);

  const where: SQL[] = [eq(schema.products.isActive, true)];
  if (opts.category) where.push(eq(schema.categories.slug, opts.category));
  if (opts.q) where.push(like(schema.products.name, `%${opts.q.replace(/[%_]/g, "")}%`));
  if (opts.min != null) where.push(gte(schema.products.price, opts.min));
  if (opts.max != null) where.push(lte(schema.products.price, opts.max));

  const order =
    opts.sort === "price-asc" ? asc(schema.products.price)
    : opts.sort === "price-desc" ? desc(schema.products.price)
    : opts.sort === "newest" ? desc(schema.products.createdAt)
    : desc(schema.products.isFeatured);

  const base = db
    .select(cardColumns)
    .from(schema.products)
    .leftJoin(schema.categories, eq(schema.products.categoryId, schema.categories.id))
    .where(and(...where));

  const [rows, [{ total }]] = await Promise.all([
    base.orderBy(order, asc(schema.products.name)).limit(pageSize).offset((page - 1) * pageSize),
    db
      .select({ total: sql<number>`count(*)` })
      .from(schema.products)
      .leftJoin(schema.categories, eq(schema.products.categoryId, schema.categories.id))
      .where(and(...where)),
  ]);
  return { items: rows.map(toCard), total: Number(total), page, pageSize, pages: Math.max(1, Math.ceil(Number(total) / pageSize)) };
}

export async function getFeatured(limit = 8) {
  "use cache";
  cacheTag("catalog");
  cacheLife("hours");
  const rows = await db
    .select(cardColumns)
    .from(schema.products)
    .leftJoin(schema.categories, eq(schema.products.categoryId, schema.categories.id))
    .where(and(eq(schema.products.isActive, true), eq(schema.products.isFeatured, true)))
    .limit(limit);
  return rows.map(toCard);
}

export async function getAllSlugs() {
  "use cache";
  cacheTag("catalog");
  cacheLife("hours");
  return db.select({ slug: schema.products.slug }).from(schema.products).where(eq(schema.products.isActive, true));
}

export async function getProductBySlug(slug: string) {
  "use cache";
  cacheTag("catalog", `product:${slug}`);
  cacheLife("hours");
  const [p] = await db
    .select({
      id: schema.products.id, slug: schema.products.slug, name: schema.products.name,
      description: schema.products.description, fabric: schema.products.fabric,
      price: schema.products.price, compareAtPrice: schema.products.compareAtPrice,
      images: schema.products.images, tag: schema.products.tag, swatchHex: schema.products.swatchHex,
      categoryId: schema.products.categoryId, categoryName: schema.categories.name,
      categorySlug: schema.categories.slug, isActive: schema.products.isActive,
    })
    .from(schema.products)
    .leftJoin(schema.categories, eq(schema.products.categoryId, schema.categories.id))
    .where(eq(schema.products.slug, slug));
  if (!p || !p.isActive) return null;

  const variants = await db
    .select({ id: schema.variants.id, label: schema.variants.label, stock: schema.variants.stock })
    .from(schema.variants)
    .where(eq(schema.variants.productId, p.id))
    .orderBy(asc(schema.variants.label));

  const related = p.categoryId
    ? await db
        .select(cardColumns)
        .from(schema.products)
        .leftJoin(schema.categories, eq(schema.products.categoryId, schema.categories.id))
        .where(and(eq(schema.products.categoryId, p.categoryId), ne(schema.products.id, p.id), eq(schema.products.isActive, true)))
        .limit(4)
    : [];

  return { ...p, variants, related: related.map(toCard) };
}

/**
 * Topic 10 — graceful degradation. Reviews are non-critical: if this query is slow/failing the
 * circuit opens and the product page still renders (with no reviews) instead of erroring.
 */
export async function getReviews(productId: string) {
  return breaker("reviews").runOr(async () => {
    const rows = await db
      .select({
        id: schema.reviews.id, rating: schema.reviews.rating, body: schema.reviews.body,
        createdAt: schema.reviews.createdAt, name: schema.users.name,
      })
      .from(schema.reviews)
      .innerJoin(schema.users, eq(schema.reviews.userId, schema.users.id))
      .where(and(eq(schema.reviews.productId, productId), eq(schema.reviews.isApproved, true)))
      .orderBy(desc(schema.reviews.createdAt))
      .limit(20);
    const avg = rows.length ? rows.reduce((a, r) => a + r.rating, 0) / rows.length : 0;
    return { rows, avg, count: rows.length };
  }, { rows: [], avg: 0, count: 0 });
}

export async function searchProducts(q: string) {
  const term = q.trim().replace(/[%_]/g, "");
  if (term.length < 2) return [];
  const rows = await db
    .select(cardColumns)
    .from(schema.products)
    .leftJoin(schema.categories, eq(schema.products.categoryId, schema.categories.id))
    .where(and(eq(schema.products.isActive, true), like(schema.products.name, `%${term}%`)))
    .limit(8);
  return rows.map(toCard);
}

export async function productsByIds(ids: string[]) {
  if (!ids.length) return [];
  return db.select().from(schema.products).where(inArray(schema.products.id, ids));
}
