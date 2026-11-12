import "server-only";
import { and, eq, gte, sql } from "drizzle-orm";
import { db, schema, writeTransaction } from "@/db";
import { publish } from "./events";
import { quoteCart, type CartInput } from "./pricing";
import { createRazorpayOrder, onlinePaymentsAvailable } from "./razorpay";

export class OrderError extends Error {
  constructor(message: string, public status = 400, public details?: string[]) {
    super(message);
  }
}

export type Address = {
  fullName: string; phone: string; line1: string; line2?: string | null; city: string; state: string; pincode: string;
};

export type PlaceOrderResult = {
  orderNumber: string;
  paymentMethod: "razorpay" | "cod";
  total: number;
  payment?: { razorpayOrderId: string; keyId: string | null; amountPaise: number; simulated: boolean };
};

const makeNumber = () => `KRS-${Date.now().toString(36).toUpperCase().slice(-5)}${Math.floor(1000 + Math.random() * 9000)}`;

/**
 * Place an order. This is a SAGA (Tracen topic 19):
 *   1. Re-price from DB + RESERVE stock + create order   (one local ACID transaction — topic 18:
 *      same database, so no distributed transaction is needed)
 *   2. Create the payment with Razorpay                   (external system — can fail)
 *   3. On failure → COMPENSATE: cancel order, publish PaymentFailed → inventory.release job
 * The route wrapping this is idempotent (topic 14), so a retried request never double-orders.
 */
export async function placeOrder(args: {
  userId: string; email: string; items: CartInput; address: Address;
  paymentMethod: "razorpay" | "cod"; couponCode?: string | null; traceId?: string;
}): Promise<PlaceOrderResult> {
  if (args.paymentMethod === "razorpay" && !onlinePaymentsAvailable())
    throw new OrderError("Online payments are not available right now. Please choose Cash on Delivery.", 503);

  const quote = await quoteCart(args.items, args.couponCode);
  if (quote.lines.length === 0) throw new OrderError("Your bag is empty.", 400, quote.problems);
  if (quote.problems.length) throw new OrderError("Some items in your bag changed.", 409, quote.problems);
  if (args.couponCode && quote.couponError) throw new OrderError(quote.couponError, 400);
  if (args.paymentMethod === "cod" && !quote.codAllowed)
    throw new OrderError("Cash on Delivery isn't available for orders this large. Please pay online.", 400);

  const number = makeNumber();

  // ── Step 1: local ACID transaction — reserve stock atomically.
  const orderId = await writeTransaction(async (tx) => {
    for (const l of quote.lines) {
      // Conditional decrement: only succeeds while stock >= qty, so two buyers can never oversell.
      const ok = await tx
        .update(schema.variants)
        .set({ stock: sql`${schema.variants.stock} - ${l.quantity}` })
        .where(and(eq(schema.variants.id, l.variantId), gte(schema.variants.stock, l.quantity)))
        .returning({ id: schema.variants.id });
      if (ok.length === 0) throw new OrderError(`${l.name} (${l.variantLabel}) just sold out.`, 409);
    }

    if (quote.coupon) {
      const used = await tx
        .update(schema.coupons)
        .set({ usedCount: sql`${schema.coupons.usedCount} + 1` })
        .where(and(eq(schema.coupons.code, quote.coupon.code), sql`(${schema.coupons.maxUses} is null or ${schema.coupons.usedCount} < ${schema.coupons.maxUses})`))
        .returning({ id: schema.coupons.id });
      if (used.length === 0) throw new OrderError("That coupon has just been fully redeemed.", 409);
    }

    const [order] = await tx
      .insert(schema.orders)
      .values({
        number, userId: args.userId, email: args.email,
        status: args.paymentMethod === "cod" ? "confirmed" : "pending",
        paymentMethod: args.paymentMethod, paymentStatus: "unpaid",
        subtotal: quote.subtotal, discount: quote.discount, shipping: quote.shipping, tax: quote.taxIncluded, total: quote.total,
        couponCode: quote.coupon?.code ?? null, shippingAddress: args.address,
      })
      .returning({ id: schema.orders.id });

    await tx.insert(schema.orderItems).values(
      quote.lines.map((l) => ({
        orderId: order.id, variantId: l.variantId, productName: l.name, variantLabel: l.variantLabel,
        image: l.image, unitPrice: l.unitPrice, quantity: l.quantity,
      })),
    );
    await tx.insert(schema.orderEvents).values({
      orderId: order.id,
      status: args.paymentMethod === "cod" ? "confirmed" : "pending",
      note: args.paymentMethod === "cod" ? "Order placed — pay on delivery" : "Order created — awaiting payment",
    });
    return order.id;
  });

  const base = { orderId, number, email: args.email, userId: args.userId, total: quote.total };

  // ── COD: nothing external to call; announce the fact.
  if (args.paymentMethod === "cod") {
    await publish("OrderPlaced", base, args.traceId).catch(() => {});
    return { orderNumber: number, paymentMethod: "cod", total: quote.total };
  }

  // ── Step 2: external payment creation (timeout + retry + circuit breaker inside).
  try {
    const rp = await createRazorpayOrder({ amountRupees: quote.total, receipt: number });
    await db.update(schema.orders).set({ razorpayOrderId: rp.id }).where(eq(schema.orders.id, orderId));
    await publish("OrderPlaced", base, args.traceId).catch(() => {});
    return {
      orderNumber: number, paymentMethod: "razorpay", total: quote.total,
      payment: { razorpayOrderId: rp.id, keyId: process.env.RAZORPAY_KEY_ID ?? null, amountPaise: quote.total * 100, simulated: rp.simulated },
    };
  } catch {
    // ── Step 3: compensating transaction.
    await db.update(schema.orders).set({ status: "cancelled", paymentStatus: "failed" }).where(eq(schema.orders.id, orderId));
    await db.insert(schema.orderEvents).values({ orderId, status: "cancelled", note: "Payment provider unavailable — order cancelled, stock returned" });
    await publish("PaymentFailed", base, args.traceId).catch(() => {});
    throw new OrderError("We couldn't reach the payment provider. You haven't been charged — please try again or choose Cash on Delivery.", 503);
  }
}

/** Mark an order paid. Idempotent: a repeated call (verify + webhook racing) is a no-op. */
export async function markPaid(args: { razorpayOrderId: string; paymentId: string }) {
  const [order] = await db.select().from(schema.orders).where(eq(schema.orders.razorpayOrderId, args.razorpayOrderId));
  if (!order) return null;
  if (order.paymentStatus === "paid") return order;
  if (order.status === "cancelled") return order; // paid after we cancelled → admin must refund; don't resurrect silently

  // Atomic flip: only the first caller wins.
  const won = await db
    .update(schema.orders)
    .set({ paymentStatus: "paid", status: "confirmed", razorpayPaymentId: args.paymentId })
    .where(and(eq(schema.orders.id, order.id), eq(schema.orders.paymentStatus, "unpaid")))
    .returning({ id: schema.orders.id });
  if (won.length) {
    await db.insert(schema.orderEvents).values({ orderId: order.id, status: "confirmed", note: "Payment received" });
    await publish("PaymentCaptured", { orderId: order.id, number: order.number, email: order.email, userId: order.userId, total: order.total }).catch(() => {});
  }
  return order;
}
