import "server-only";
import { eq, sql } from "drizzle-orm";
import { db, schema, writeTransaction } from "@/db";
import { registerHandler } from "./queue";
import { sendEmail } from "./email";

// Email subscribers
registerHandler("email.welcome", (p) => sendEmail({ template: "welcome", ...p }));
registerHandler("email.order_confirmation", (p) => sendEmail({ template: "order_confirmation", ...p }));
registerHandler("email.payment_receipt", (p) => sendEmail({ template: "payment_receipt", ...p }));
registerHandler("email.shipped", (p) => sendEmail({ template: "shipped", ...p }));
registerHandler("email.cancelled", (p) => sendEmail({ template: "cancelled", ...p }));

// Analytics subscriber — events already land in event_log; forward to a warehouse/GA here later.
registerHandler("analytics.record", async () => {});

// Saga compensation (topic 19): return reserved stock when payment fails or an order is cancelled.
// Idempotent — the stockReleased flag makes a duplicate job a no-op.
registerHandler("inventory.release", async (p: { orderId: string }) => {
  await writeTransaction(async (tx) => {
    const [order] = await tx.select().from(schema.orders).where(eq(schema.orders.id, p.orderId));
    if (!order || order.stockReleased) return;
    const items = await tx.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, order.id));
    for (const it of items) {
      if (!it.variantId) continue;
      await tx
        .update(schema.variants)
        .set({ stock: sql`${schema.variants.stock} + ${it.quantity}` })
        .where(eq(schema.variants.id, it.variantId));
    }
    await tx.update(schema.orders).set({ stockReleased: true }).where(eq(schema.orders.id, order.id));
  });
});
