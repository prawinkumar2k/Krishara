import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { db, schema } from "../src/db";
import { placeOrder } from "../src/lib/orders";
import { renderEmail } from "../src/lib/email-templates";

let n = 0;
const ok = (s: string) => console.log(`  ✓ ${++n}. ${s}`);

async function main() {
  const [u] = await db.insert(schema.users).values({ email: `m${Date.now()}@t.dev`, name: "M", passwordHash: "x" }).returning();
  const [p] = await db.select().from(schema.products).where(eq(schema.products.legacyId, "lk2-jhumkas"));
  const [v] = await db.select().from(schema.variants).where(eq(schema.variants.productId, p.id));
  await db.update(schema.variants).set({ stock: 5 }).where(eq(schema.variants.id, v.id));
  const addr = { fullName: "<script>alert(1)</script> Buyer", phone: "9876543210", line1: "1 <b>Bold</b> St", city: "Chennai", state: "Tamil Nadu", pincode: "600004" };
  const o = await placeOrder({ userId: u.id, email: u.email, items: [{ id: p.id, quantity: 1 }], address: addr, paymentMethod: "cod" });
  const [row] = await db.select().from(schema.orders).where(eq(schema.orders.number, o.orderNumber));

  const conf = await renderEmail("order_confirmation", { orderId: row.id });
  assert.ok(conf && conf.subject.includes(o.orderNumber) && conf.html.includes(p.name) && conf.html.includes("₹"));
  assert.ok(conf!.html.includes("/orders/" + o.orderNumber) && conf!.text.includes(o.orderNumber));
  ok("order confirmation has order number, item, price, link and a plain-text part");

  assert.ok(!conf!.html.includes("<script>alert(1)</script>") && conf!.html.includes("&lt;script&gt;"));
  const w = await renderEmail("welcome", { name: "<img src=x onerror=alert(1)>" });
  assert.ok(!w!.html.includes("<img src=x") && w!.html.includes("&lt;img"));
  ok("customer-supplied text is HTML-escaped (no injection through names/addresses)");

  await db.update(schema.orders).set({ carrier: "DTDC", trackingNumber: "D123456" }).where(eq(schema.orders.id, row.id));
  const sh = await renderEmail("shipped", { orderId: row.id });
  assert.ok(sh!.html.includes("D123456") && sh!.html.includes("DTDC"));
  const rc = await renderEmail("payment_receipt", { orderId: row.id });
  const ca = await renderEmail("cancelled", { orderId: row.id });
  assert.ok(rc && ca && ca.subject.includes("cancelled"));
  ok("shipped (carrier + tracking), payment receipt and cancellation templates render");

  const pr = await renderEmail("password_reset", { token: "abc123" });
  assert.ok(pr!.html.includes("/reset-password?token=abc123") && pr!.html.includes("1 hour"));
  assert.equal(await renderEmail("order_confirmation", { orderId: "does-not-exist" }), null);
  ok("password-reset email carries the link and expiry; a vanished order renders nothing (no crash)");

  console.log(`\nAll ${n} email checks passed.`);
}
main().catch((e) => { console.error("✗ FAILED:", e); process.exit(1); });
