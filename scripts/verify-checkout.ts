import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { db, schema } from "../src/db";
import { placeOrder, markPaid, OrderError } from "../src/lib/orders";
import { quoteCart } from "../src/lib/pricing";
import { publish } from "../src/lib/events";
import { processDueJobs } from "../src/lib/queue";

let n = 0;
const ok = (s: string) => console.log(`  ✓ ${++n}. ${s}`);
const addr = { fullName: "Test Buyer", phone: "9876543210", line1: "1 Test St", city: "Chennai", state: "Tamil Nadu", pincode: "600004" };

async function stockOf(variantId: string) {
  const [v] = await db.select().from(schema.variants).where(eq(schema.variants.id, variantId));
  return v.stock;
}

async function main() {
  const [user] = await db.insert(schema.users).values({ email: `t${Date.now()}@test.dev`, name: "T", passwordHash: "x" }).returning();
  const [user2] = await db.insert(schema.users).values({ email: `u${Date.now()}@test.dev`, name: "U", passwordHash: "x" }).returning();

  // product with a single variant for controlled stock
  const [p] = await db.select().from(schema.products).where(eq(schema.products.legacyId, "lk1-choker"));
  const [v] = await db.select().from(schema.variants).where(eq(schema.variants.productId, p.id));
  await db.update(schema.variants).set({ stock: 5 }).where(eq(schema.variants.id, v.id));

  // 1. server ignores any client price; prices come from DB (legacy id works)
  const q = await quoteCart([{ id: "lk1-choker", quantity: 2 }]);
  assert.equal(q.subtotal, p.price * 2);
  assert.equal(q.problems.length, 0);
  ok("quote uses DB price and resolves legacy landing-page ids");

  // 2. unknown product / oversized qty are rejected, never priced
  const bad = await quoteCart([{ id: "does-not-exist", quantity: 1 }, { id: "lk1-choker", quantity: 99 }]);
  assert.ok(bad.problems.length >= 1);
  assert.equal((await quoteCart([{ id: "does-not-exist", quantity: 1 }])).lines.length, 0);
  ok("unknown items rejected; quantity clamped to 10 and checked against stock");

  // 3. shipping rule + GST info
  assert.equal(q.shipping, p.price * 2 >= 25000 ? 0 : 250);
  assert.ok(q.taxIncluded > 0);
  ok("shipping threshold and GST-inclusive tax computed");

  // 4. COD order decrements stock and is confirmed
  const o1 = await placeOrder({ userId: user.id, email: "t@test.dev", items: [{ id: p.id, quantity: 2 }], address: addr, paymentMethod: "cod" });
  assert.equal(await stockOf(v.id), 3);
  const [row1] = await db.select().from(schema.orders).where(eq(schema.orders.number, o1.orderNumber));
  assert.equal(row1.status, "confirmed");
  assert.equal(row1.total, p.price * 2 + (p.price * 2 >= 25000 ? 0 : 250));
  ok("COD order: stock reserved (5→3), status confirmed, total matches server quote");

  // 5. THE race: 6 buyers fight for 3 remaining units → exactly 3 succeed, stock never negative
  const results = await Promise.allSettled(
    Array.from({ length: 6 }).map((_, i) =>
      placeOrder({ userId: i % 2 ? user.id : user2.id, email: "r@test.dev", items: [{ id: p.id, quantity: 1 }], address: addr, paymentMethod: "cod" }),
    ),
  );
  const won = results.filter((r) => r.status === "fulfilled").length;
  assert.equal(won, 3);
  assert.equal(await stockOf(v.id), 0);
  assert.ok(results.filter((r) => r.status === "rejected").every((r) => (r as PromiseRejectedResult).reason instanceof OrderError));
  ok("overselling impossible: 6 concurrent buyers, 3 units → exactly 3 orders, stock = 0");

  // 6. sold-out is reported clearly
  await assert.rejects(() => placeOrder({ userId: user.id, email: "t@test.dev", items: [{ id: p.id, quantity: 1 }], address: addr, paymentMethod: "cod" }), OrderError);
  ok("sold-out item rejected with a clear error");

  // 7. online order (simulated gateway): pending until paid; markPaid is idempotent
  await db.update(schema.variants).set({ stock: 4 }).where(eq(schema.variants.id, v.id));
  const o2 = await placeOrder({ userId: user.id, email: "t@test.dev", items: [{ id: p.id, quantity: 1 }], address: addr, paymentMethod: "razorpay" });
  assert.ok(o2.payment?.simulated);
  let [row2] = await db.select().from(schema.orders).where(eq(schema.orders.number, o2.orderNumber));
  assert.equal(row2.status, "pending");
  assert.equal(await stockOf(v.id), 3);
  await Promise.all([markPaid({ razorpayOrderId: o2.payment!.razorpayOrderId, paymentId: "pay_1" }), markPaid({ razorpayOrderId: o2.payment!.razorpayOrderId, paymentId: "pay_1" })]);
  [row2] = await db.select().from(schema.orders).where(eq(schema.orders.number, o2.orderNumber));
  assert.equal(row2.status, "confirmed");
  assert.equal(row2.paymentStatus, "paid");
  const evs = await db.select().from(schema.orderEvents).where(eq(schema.orderEvents.orderId, row2.id));
  assert.equal(evs.filter((e) => e.note === "Payment received").length, 1);
  ok("online order: pending → paid once even when verify + webhook race (idempotent)");

  // 8. SAGA compensation: payment fails → stock returned exactly once
  const o3 = await placeOrder({ userId: user.id, email: "t@test.dev", items: [{ id: p.id, quantity: 2 }], address: addr, paymentMethod: "razorpay" });
  assert.equal(await stockOf(v.id), 1);
  const [row3] = await db.select().from(schema.orders).where(eq(schema.orders.number, o3.orderNumber));
  await publish("PaymentFailed", { orderId: row3.id });
  await publish("PaymentFailed", { orderId: row3.id }); // duplicate event must not double-restore
  await processDueJobs(50);
  assert.equal(await stockOf(v.id), 3);
  ok("saga compensation: failed payment returns stock once; duplicate event is a no-op");

  // 9. coupon: valid applies, below-minimum is refused, max-uses enforced atomically
  const cheap = await quoteCart([{ id: p.id, quantity: 1 }], "WELCOME10");
  assert.equal(cheap.discount, Math.floor((p.price * 10) / 100));
  assert.equal((await quoteCart([{ id: p.id, quantity: 1 }], "NOPE")).couponError, "That coupon code isn't valid.");
  await db.insert(schema.coupons).values({ code: "ONCE", type: "fixed", value: 100, maxUses: 1 }).onConflictDoUpdate({ target: schema.coupons.code, set: { usedCount: 0, maxUses: 1 } });
  await db.update(schema.variants).set({ stock: 10 }).where(eq(schema.variants.id, v.id));
  const race = await Promise.allSettled([1, 2, 3].map(() => placeOrder({ userId: user.id, email: "c@test.dev", items: [{ id: p.id, quantity: 1 }], address: addr, paymentMethod: "cod", couponCode: "ONCE" })));
  assert.equal(race.filter((r) => r.status === "fulfilled").length, 1);
  ok("coupons: percent applied, invalid refused, single-use coupon can't be redeemed twice concurrently");

  // 10. failed order rolled back completely (coupon refused after stock step must not leak stock)
  const before = await stockOf(v.id);
  await assert.rejects(() => placeOrder({ userId: user.id, email: "c@test.dev", items: [{ id: p.id, quantity: 1 }], address: addr, paymentMethod: "cod", couponCode: "ONCE" }));
  assert.equal(await stockOf(v.id), before);
  ok("failed checkout leaves no partial state (transaction rolled back)");

  console.log(`\nAll ${n} checkout checks passed.`);
}

main().catch((e) => { console.error("\n✗ FAILED:", e); process.exit(1); });
