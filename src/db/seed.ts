import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, schema } from "./index";
import {
  BRIDAL_SAREES,
  PICK_A_SILK_CARDS,
  RACK_PRODUCTS,
  STYLED_LOOKS,
} from "../data/catalog";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const titleCase = (s: string) =>
  s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

type Seed = {
  legacyId: string;
  name: string;
  category: string;
  price: number;
  compareAtPrice?: number;
  fabric?: string;
  description?: string;
  images: string[];
  swatchHex?: string;
  tag?: string;
  sizes?: string[];
  featured?: boolean;
};

async function main() {
  const seeds: Seed[] = [];

  for (const p of RACK_PRODUCTS)
    seeds.push({
      legacyId: p.id,
      name: titleCase(p.name),
      category: p.category,
      price: p.price,
      fabric: p.fabric,
      images: [p.frontImage, p.backImage],
      swatchHex: p.swatchHex,
      sizes: p.sizes,
      featured: true,
    });

  for (const b of BRIDAL_SAREES)
    seeds.push({
      legacyId: b.id,
      name: b.name,
      category: "Bridal Collection",
      price: b.price,
      compareAtPrice: b.originalPrice,
      fabric: b.fabricNote,
      description: b.palluNote,
      images: [b.image],
      tag: b.tag,
      featured: true,
    });

  for (const s of PICK_A_SILK_CARDS)
    seeds.push({
      legacyId: s.id,
      name: `${titleCase(s.title)} Silk`,
      category: s.category,
      price: s.price,
      fabric: s.subtitle,
      images: [s.image],
      swatchHex: s.bgHex,
    });

  for (const look of STYLED_LOOKS)
    for (const piece of look.pieces) {
      seeds.push({
        legacyId: piece.id,
        name: piece.name,
        category:
          piece.role === "Saree"
            ? "Silk Sarees"
            : piece.role === "Blouse"
              ? "Blouses"
              : "Temple Jewellery",
        price: piece.price,
        images: [piece.image],
      });
    }

  // ── categories
  const catNames = [...new Set(seeds.map((s) => s.category))];
  const catIds = new Map<string, string>();
  for (const [i, name] of catNames.entries()) {
    const slug = slugify(name);
    await db
      .insert(schema.categories)
      .values({ name, slug, sortOrder: i })
      .onConflictDoNothing();
    const [row] = await db
      .select()
      .from(schema.categories)
      .where(eq(schema.categories.slug, slug));
    catIds.set(name, row.id);
  }

  // ── products + variants
  const usedSlugs = new Set<string>();
  let created = 0;
  for (const s of seeds) {
    let slug = slugify(s.name);
    for (let n = 2; usedSlugs.has(slug); n++) slug = `${slugify(s.name)}-${n}`;
    usedSlugs.add(slug);

    const existing = await db
      .select({ id: schema.products.id })
      .from(schema.products)
      .where(eq(schema.products.slug, slug));
    if (existing.length) continue;

    const [prod] = await db
      .insert(schema.products)
      .values({
        slug,
        legacyId: s.legacyId,
        name: s.name,
        description: s.description ?? "",
        fabric: s.fabric ?? "",
        categoryId: catIds.get(s.category),
        price: s.price,
        compareAtPrice: s.compareAtPrice,
        images: s.images,
        swatchHex: s.swatchHex,
        tag: s.tag,
        isFeatured: s.featured ?? false,
      })
      .returning();

    const labels = s.sizes?.length ? s.sizes : ["Free Size"];
    await db.insert(schema.variants).values(
      labels.map((label) => ({
        productId: prod.id,
        label,
        sku: `${slug}-${slugify(label)}`.toUpperCase(),
        stock: 10,
      })),
    );
    created++;
  }

  // ── coupons
  await db
    .insert(schema.coupons)
    .values([
      { code: "WELCOME10", type: "percent", value: 10, minSubtotal: 5000 },
      { code: "FESTIVE2000", type: "fixed", value: 2000, minSubtotal: 30000 },
    ])
    .onConflictDoNothing();

  // ── settings
  await db
    .insert(schema.settings)
    .values([
      { key: "shipping_flat", value: "250" },
      { key: "free_shipping_over", value: "25000" },
      { key: "gst_percent", value: "5" }, // GST on sarees; prices are tax-inclusive
    ])
    .onConflictDoNothing();

  // ── admin
  const email = (process.env.ADMIN_EMAIL ?? "admin@krishara.in").toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "ChangeMe!123";
  const [admin] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email));
  if (!admin) {
    await db.insert(schema.users).values({
      email,
      name: "Krishara Admin",
      passwordHash: await bcrypt.hash(password, 12),
      role: "admin",
    });
    console.log(`Admin created: ${email}`);
  }

  console.log(`Seed complete — ${created} new products, ${catNames.length} categories.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
