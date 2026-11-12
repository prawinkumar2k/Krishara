"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, schema } from "@/db";
import { getCurrentUser } from "@/lib/dal";
import { rateLimit } from "@/lib/rate-limit";

export type ReviewState = { error?: string; ok?: boolean } | undefined;

/** A customer may review a product only after an order containing it was delivered. */
export async function hasDeliveredPurchase(userId: string, productId: string) {
  const rows = await db
    .select({ id: schema.orderItems.id })
    .from(schema.orderItems)
    .innerJoin(schema.orders, eq(schema.orderItems.orderId, schema.orders.id))
    .innerJoin(schema.variants, eq(schema.orderItems.variantId, schema.variants.id))
    .where(and(eq(schema.orders.userId, userId), eq(schema.orders.status, "delivered"), eq(schema.variants.productId, productId)))
    .limit(1);
  return rows.length > 0;
}

export async function submitReview(productId: string, slug: string, _: ReviewState, fd: FormData): Promise<ReviewState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in to write a review." };
  if (!rateLimit(`review:${user.id}`, 5, 60 * 60_000)) return { error: "Too many reviews — please try later." };

  const p = z.object({ rating: z.coerce.number().int().min(1).max(5), body: z.string().trim().max(1000) }).safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: "Choose a rating from 1 to 5." };
  if (!(await hasDeliveredPurchase(user.id, productId))) return { error: "Only customers who received this product can review it." };

  // One review per user per product; editing it sends it back for moderation.
  await db.insert(schema.reviews)
    .values({ productId, userId: user.id, rating: p.data.rating, body: p.data.body, isApproved: false })
    .onConflictDoUpdate({ target: [schema.reviews.userId, schema.reviews.productId], set: { rating: p.data.rating, body: p.data.body, isApproved: false } });
  revalidatePath(`/product/${slug}`);
  return { ok: true };
}
