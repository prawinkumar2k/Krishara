"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/dal";
import { publish } from "@/lib/events";

/** Customer cancellation — allowed only before the parcel is packed. Stock returns via the saga's compensation job. */
export async function cancelMyOrder(orderNumber: string) {
  const user = await requireUser("/account");
  const [order] = await db.select().from(schema.orders).where(eq(schema.orders.number, orderNumber));
  if (!order || order.userId !== user.id) return { error: "Order not found." };

  // Atomic status guard: only flips if still cancellable (prevents racing with the admin packing it).
  const won = await db
    .update(schema.orders)
    .set({ status: "cancelled" })
    .where(and(eq(schema.orders.id, order.id), inArray(schema.orders.status, ["pending", "confirmed"])))
    .returning({ id: schema.orders.id });
  if (!won.length) return { error: "This order can no longer be cancelled — it's already being packed or shipped." };

  const note = order.paymentStatus === "paid" ? "Cancelled by customer — refund will be processed" : "Cancelled by customer";
  await db.insert(schema.orderEvents).values({ orderId: order.id, status: "cancelled", note });
  await publish("OrderCancelled", { orderId: order.id, number: order.number, email: order.email, userId: user.id }).catch(() => {});
  revalidatePath(`/orders/${orderNumber}`);
  return { ok: true };
}
