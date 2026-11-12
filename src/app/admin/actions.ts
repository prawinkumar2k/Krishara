"use server";

import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, schema, writeTransaction } from "@/db";
import { requireAdmin } from "@/lib/dal";
import { publish } from "@/lib/events";
import { processDueJobs } from "@/lib/queue";

export type FormState = { error?: string; ok?: boolean } | undefined;

const slugify = (s: string) => s.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/* ───────────────────────── Products ───────────────────────── */

const productSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().max(120).optional(),
  categoryId: z.string().optional(),
  price: z.coerce.number().int().min(1).max(10_000_000),
  compareAtPrice: z.coerce.number().int().min(0).max(10_000_000).optional(),
  fabric: z.string().trim().max(300).optional(),
  description: z.string().trim().max(3000).optional(),
  tag: z.string().trim().max(30).optional(),
  swatchHex: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/).optional().or(z.literal("")),
  images: z.string().optional(), // newline separated
  variants: z.string().optional(), // lines: "Label:stock"
});

function parseVariants(raw: string | undefined) {
  const out: { label: string; stock: number }[] = [];
  for (const line of (raw ?? "").split("\n")) {
    const [label, stock] = line.split(":").map((x) => x.trim());
    if (!label) continue;
    const n = Number(stock ?? 0);
    if (!Number.isInteger(n) || n < 0) throw new Error(`Invalid stock for "${label}"`);
    out.push({ label, stock: n });
  }
  return out.length ? out : [{ label: "Free Size", stock: 0 }];
}

export async function saveProduct(id: string | null, _: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const p = productSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: `${p.error.issues[0].path.join(".")}: ${p.error.issues[0].message}` };
  const d = p.data;
  let variants: { label: string; stock: number }[];
  try { variants = parseVariants(d.variants); } catch (e) { return { error: (e as Error).message }; }
  const images = (d.images ?? "").split("\n").map((s) => s.trim()).filter((s) => /^(\/|https:\/\/)/.test(s)).slice(0, 8);
  const slug = slugify(d.slug || d.name);
  if (!slug) return { error: "Invalid name/slug" };

  const [clash] = await db.select({ id: schema.products.id }).from(schema.products).where(eq(schema.products.slug, slug));
  if (clash && clash.id !== id) return { error: `Slug "${slug}" is already used by another product.` };

  const values = {
    name: d.name, slug, categoryId: d.categoryId || null, price: d.price,
    compareAtPrice: d.compareAtPrice && d.compareAtPrice > d.price ? d.compareAtPrice : null,
    fabric: d.fabric ?? "", description: d.description ?? "", tag: d.tag || null, swatchHex: d.swatchHex || null,
    images, isFeatured: fd.get("isFeatured") === "on", isActive: fd.get("isActive") === "on",
  };

  const productId = await writeTransaction(async (tx) => {
    let pid = id;
    if (pid) {
      await tx.update(schema.products).set(values).where(eq(schema.products.id, pid));
    } else {
      [{ id: pid }] = await tx.insert(schema.products).values(values).returning({ id: schema.products.id });
    }
    const existing = await tx.select().from(schema.variants).where(eq(schema.variants.productId, pid!));
    for (const v of variants) {
      const match = existing.find((e) => e.label === v.label);
      if (match) await tx.update(schema.variants).set({ stock: v.stock }).where(eq(schema.variants.id, match.id));
      else await tx.insert(schema.variants).values({ productId: pid!, label: v.label, stock: v.stock, sku: `${slug}-${slugify(v.label)}-${randomUUID().slice(0, 4)}`.toUpperCase() });
    }
    // Variants removed from the form: delete them (order history keeps its own snapshot).
    const keep = new Set(variants.map((v) => v.label));
    const drop = existing.filter((e) => !keep.has(e.label)).map((e) => e.id);
    if (drop.length) await tx.delete(schema.variants).where(inArray(schema.variants.id, drop));
    return pid!;
  });

  updateTag("catalog");
  updateTag(`product:${slug}`);
  if (!id) redirect(`/admin/products/${productId}`);
  return { ok: true };
}

export async function toggleProduct(id: string, field: "isActive" | "isFeatured") {
  await requireAdmin();
  const [p] = await db.select().from(schema.products).where(eq(schema.products.id, id));
  if (!p) return;
  await db.update(schema.products).set({ [field]: !p[field] }).where(eq(schema.products.id, id));
  updateTag("catalog");
  updateTag(`product:${p.slug}`);
  revalidatePath("/admin/products");
}

export async function uploadImage(fd: FormData): Promise<{ url?: string; error?: string }> {
  await requireAdmin();
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "No file." };
  if (file.size > 4 * 1024 * 1024) return { error: "Max 4 MB." };
  const ext = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[file.type];
  if (!ext) return { error: "Only JPG, PNG or WebP." };
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  const name = `${randomUUID()}.${ext}`;
  await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return { url: `/uploads/${name}` };
}

/* ───────────────────────── Orders ───────────────────────── */

const NEXT: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["packed", "cancelled"],
  packed: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: ["refunded"],
  cancelled: [],
  refunded: [],
};

export async function updateOrderStatus(number: string, _: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const to = String(fd.get("status") ?? "");
  const note = String(fd.get("note") ?? "").slice(0, 300);
  const tracking = String(fd.get("trackingNumber") ?? "").trim().slice(0, 60);
  const carrier = String(fd.get("carrier") ?? "").trim().slice(0, 40);

  const [o] = await db.select().from(schema.orders).where(eq(schema.orders.number, number));
  if (!o) return { error: "Order not found." };
  if (!NEXT[o.status]?.includes(to)) return { error: `Can't move an order from ${o.status} to ${to}.` };
  if (to === "shipped" && !tracking) return { error: "Enter a tracking number to mark as shipped." };

  // Compare-and-set on the current status so two admins can't both apply a transition.
  const won = await db.update(schema.orders)
    .set({
      status: to as typeof o.status,
      ...(to === "shipped" ? { trackingNumber: tracking, carrier: carrier || "Courier" } : {}),
      ...(to === "delivered" && o.paymentMethod === "cod" ? { paymentStatus: "paid" as const } : {}),
      ...(to === "refunded" ? { paymentStatus: "refunded" as const } : {}),
    })
    .where(and(eq(schema.orders.id, o.id), eq(schema.orders.status, o.status)))
    .returning({ id: schema.orders.id });
  if (!won.length) return { error: "Order changed in the meantime — refresh and try again." };

  await db.insert(schema.orderEvents).values({ orderId: o.id, status: to, note: note || null });
  const base = { orderId: o.id, number: o.number, email: o.email, userId: o.userId };
  if (to === "shipped") await publish("OrderShipped", { ...base, trackingNumber: tracking });
  if (to === "delivered") await publish("OrderDelivered", base);
  if (to === "cancelled") await publish("OrderCancelled", base); // → saga compensation returns stock

  revalidatePath(`/admin/orders/${number}`);
  revalidatePath("/admin/orders");
  return { ok: true };
}

/* ───────────────────────── Coupons ───────────────────────── */

export async function createCoupon(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const p = z.object({
    code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{3,20}$/, "Code: 3–20 letters/numbers"),
    type: z.enum(["percent", "fixed"]),
    value: z.coerce.number().int().min(1),
    minSubtotal: z.coerce.number().int().min(0).default(0),
    maxUses: z.coerce.number().int().min(1).optional().or(z.literal("").transform(() => undefined)),
  }).superRefine((v, ctx) => { if (v.type === "percent" && v.value > 90) ctx.addIssue({ code: "custom", message: "Percent can't exceed 90", path: ["value"] }); }).safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: p.error.issues[0].message };
  const [exists] = await db.select().from(schema.coupons).where(eq(schema.coupons.code, p.data.code));
  if (exists) return { error: "That code already exists." };
  await db.insert(schema.coupons).values({ ...p.data, maxUses: p.data.maxUses ?? null });
  revalidatePath("/admin/coupons");
  return { ok: true };
}

export async function toggleCoupon(id: string) {
  await requireAdmin();
  const [c] = await db.select().from(schema.coupons).where(eq(schema.coupons.id, id));
  if (c) await db.update(schema.coupons).set({ isActive: !c.isActive }).where(eq(schema.coupons.id, id));
  revalidatePath("/admin/coupons");
}

/* ───────────────────────── Queue / DLQ ───────────────────────── */

export async function retryDeadJob(id: string) {
  await requireAdmin();
  await db.update(schema.jobs).set({ status: "pending", attempts: 0, runAt: new Date(), lastError: null }).where(and(eq(schema.jobs.id, id), eq(schema.jobs.status, "dead")));
  revalidatePath("/admin/system");
}

export async function runQueueNow() {
  await requireAdmin();
  await processDueJobs(50);
  revalidatePath("/admin/system");
}

/* ───────────────────────── Settings ───────────────────────── */

export async function saveSettings(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const p = z.object({
    shipping_flat: z.coerce.number().int().min(0).max(5000),
    free_shipping_over: z.coerce.number().int().min(0),
    gst_percent: z.coerce.number().min(0).max(28),
    cod_max: z.coerce.number().int().min(0),
  }).safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: p.error.issues[0].message };
  for (const [key, value] of Object.entries(p.data))
    await db.insert(schema.settings).values({ key, value: String(value) }).onConflictDoUpdate({ target: schema.settings.key, set: { value: String(value) } });
  revalidatePath("/admin/settings");
  return { ok: true };
}
