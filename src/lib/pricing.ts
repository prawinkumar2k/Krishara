import "server-only";
import { and, eq, inArray, or } from "drizzle-orm";
import { db, schema } from "@/db";

export type CartInput = { id: string; size?: string; quantity: number }[];

export type PricedLine = {
  productId: string;
  variantId: string;
  name: string;
  variantLabel: string;
  image: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};

export type Quote = {
  lines: PricedLine[];
  subtotal: number;
  discount: number;
  shipping: number;
  /** GST already included in prices (informational, for invoices) */
  taxIncluded: number;
  total: number;
  coupon: { code: string; description: string } | null;
  couponError?: string;
  codAllowed: boolean;
  problems: string[];
};

export async function getSettings() {
  const rows = await db.select().from(schema.settings);
  const m = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    shippingFlat: Number(m.shipping_flat ?? 250),
    freeShippingOver: Number(m.free_shipping_over ?? 25000),
    gstPercent: Number(m.gst_percent ?? 5),
    codMax: Number(m.cod_max ?? 50000),
  };
}

/**
 * The ONLY source of truth for what an order costs. Client-sent prices are never read:
 * the client sends ids + sizes + quantities, and everything else comes from the database.
 */
export async function quoteCart(items: CartInput, couponCode?: string | null): Promise<Quote> {
  const problems: string[] = [];
  const settings = await getSettings();

  // Merge duplicate lines, clamp quantity.
  const wanted = new Map<string, { id: string; size?: string; quantity: number }>();
  for (const it of items) {
    const key = `${it.id}|${it.size ?? ""}`;
    const prev = wanted.get(key);
    wanted.set(key, { ...it, quantity: Math.min(10, (prev?.quantity ?? 0) + Math.max(1, Math.floor(it.quantity))) });
  }

  const ids = [...new Set([...wanted.values()].map((w) => w.id))];
  const products = ids.length
    ? await db
        .select()
        .from(schema.products)
        .where(and(eq(schema.products.isActive, true), or(inArray(schema.products.id, ids), inArray(schema.products.legacyId, ids), inArray(schema.products.slug, ids))))
    : [];
  const variants = products.length
    ? await db.select().from(schema.variants).where(inArray(schema.variants.productId, products.map((p) => p.id)))
    : [];

  const lines: PricedLine[] = [];
  for (const w of wanted.values()) {
    const product = products.find((p) => p.id === w.id || p.legacyId === w.id || p.slug === w.id);
    if (!product) {
      problems.push("An item in your bag is no longer available and was removed.");
      continue;
    }
    const pv = variants.filter((v) => v.productId === product.id);
    const variant =
      (w.size && pv.find((v) => v.label === w.size)) ||
      (pv.length === 1 ? pv[0] : undefined) ||
      pv.find((v) => v.stock > 0 && !w.size) ||
      undefined;
    if (!variant) {
      problems.push(`Please choose a size for ${product.name}.`);
      continue;
    }
    if (variant.stock < w.quantity) {
      problems.push(
        variant.stock <= 0
          ? `${product.name} (${variant.label}) just sold out.`
          : `Only ${variant.stock} of ${product.name} (${variant.label}) left.`,
      );
      continue;
    }
    lines.push({
      productId: product.id, variantId: variant.id, name: product.name, variantLabel: variant.label,
      image: product.images[0] ?? null, unitPrice: product.price, quantity: w.quantity, lineTotal: product.price * w.quantity,
    });
  }

  const subtotal = lines.reduce((a, l) => a + l.lineTotal, 0);

  // Coupon
  let discount = 0;
  let coupon: Quote["coupon"] = null;
  let couponError: string | undefined;
  const code = couponCode?.trim().toUpperCase();
  if (code) {
    const [c] = await db.select().from(schema.coupons).where(eq(schema.coupons.code, code));
    if (!c || !c.isActive) couponError = "That coupon code isn't valid.";
    else if (c.expiresAt && c.expiresAt.getTime() < Date.now()) couponError = "That coupon has expired.";
    else if (c.maxUses != null && c.usedCount >= c.maxUses) couponError = "That coupon has been fully redeemed.";
    else if (subtotal < c.minSubtotal) couponError = `Add ₹${(c.minSubtotal - subtotal).toLocaleString("en-IN")} more to use ${c.code}.`;
    else {
      discount = c.type === "percent" ? Math.floor((subtotal * c.value) / 100) : Math.min(c.value, subtotal);
      coupon = { code: c.code, description: c.type === "percent" ? `${c.value}% off` : `₹${c.value.toLocaleString("en-IN")} off` };
    }
  }

  const afterDiscount = subtotal - discount;
  const shipping = lines.length === 0 || afterDiscount >= settings.freeShippingOver ? 0 : settings.shippingFlat;
  const total = afterDiscount + shipping;
  const taxIncluded = Math.round(afterDiscount - afterDiscount / (1 + settings.gstPercent / 100));

  return {
    lines, subtotal, discount, shipping, taxIncluded, total, coupon, couponError,
    codAllowed: total <= settings.codMax, problems,
  };
}
