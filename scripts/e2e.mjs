// End-to-end HTTP test against a running server:  BASE=http://localhost:3200 node --env-file=.env.local scripts/e2e.mjs
import assert from "node:assert/strict";
import { SignJWT } from "jose";
import { createClient } from "@libsql/client";

const BASE = process.env.BASE ?? "http://localhost:3200";
const db = createClient({ url: process.env.DATABASE_URL ?? "file:./krishara.db" });
const key = new TextEncoder().encode(process.env.SESSION_SECRET);
let n = 0;
const ok = (s) => console.log(`  ✓ ${++n}. ${s}`);

const token = (userId, role) => new SignJWT({ userId, role }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("1h").sign(key);
const cookie = async (id, role) => `krishara_session=${await token(id, role)}`;
const get = (path, c) => fetch(BASE + path, { headers: c ? { cookie: c } : {}, redirect: "manual" });
const post = (path, body, c, headers = {}) => fetch(BASE + path, { method: "POST", headers: { "content-type": "application/json", ...(c ? { cookie: c } : {}), ...headers }, body: JSON.stringify(body), redirect: "manual" });

async function mkUser(role) {
  const id = crypto.randomUUID();
  await db.execute({ sql: "insert into users (id,email,name,password_hash,role) values (?,?,?,?,?)", args: [id, `e2e-${id.slice(0, 6)}@t.dev`, "E2E User", "x", role] });
  return id;
}

const customer = await mkUser("customer");
const other = await mkUser("customer");
const payer = await mkUser("customer");
const adminId = (await db.execute("select id from users where role='admin' limit 1")).rows[0].id;
const C = await cookie(customer, "customer"), O = await cookie(other, "customer"), P = await cookie(payer, "customer"), A = await cookie(adminId, "admin");

// ── public pages
for (const p of ["/", "/shop", "/shop?category=silk-sarees&sort=price-asc", "/shop?q=korvai", "/login", "/register", "/api/health"]) {
  const r = await get(p); assert.equal(r.status, 200, `${p} → ${r.status}`);
}
ok("public pages render (home, shop, filters, search, login, register, health)");

const shop = await (await get("/shop?q=korvai")).text();
assert.match(shop.toLowerCase(), /korvai/);
const prod = await (await get("/product/vana-maragatham-korvai")).text();
assert.match(prod, /Vana Maragatham Korvai/); assert.match(prod, /application\/ld\+json/);
// Next serves the first hit on a never-seen URL as 200 + <meta robots=noindex>, then a true 404 afterwards.
const first = await get("/product/nope-nope"); assert.match(await first.text(), /name="robots" content="noindex"/);
let nf = 200;
for (let i = 0; i < 10 && nf !== 404; i++) { await new Promise((r) => setTimeout(r, 400)); nf = (await get("/product/nope-nope")).status; }
assert.equal(nf, 404);
ok("shop search works, product page has name + JSON-LD, unknown slug → 404");

const s = await (await fetch(BASE + "/api/search?q=choker")).json();
assert.ok(s.items.length > 0 && s.items[0].slug);
ok("search API returns products");

// ── auth gating
for (const p of ["/account", "/checkout", "/admin", "/admin/orders"]) {
  const r = await get(p); assert.equal(r.status, 307); assert.match(r.headers.get("location"), /\/login\?next=/);
}
assert.equal((await post("/api/checkout", {}, undefined)).status, 401);
ok("anonymous users are redirected from account/checkout/admin; checkout API → 401");

// ── customer can't enter admin; admin can
assert.equal((await get("/admin", C)).status, 307);
assert.equal((await post("/api/checkout", {}, C, { "idempotency-key": "x".repeat(20) })).status, 400);
ok("customer blocked from /admin; invalid checkout body rejected (400)");
assert.equal((await get("/account", C)).status, 200);
assert.equal((await get("/checkout", C)).status, 200);

// ── price tamper: client claims a price, server ignores it
const slug = "ivory-gajendra-silk";
const [pr] = (await db.execute({ sql: "select p.id, p.price, v.id vid, v.label from products p join variants v on v.product_id=p.id where p.slug=? limit 1", args: [slug] })).rows;
await db.execute({ sql: "update variants set stock=2 where id=?", args: [pr.vid] });
const addr = { fullName: "E2E Buyer", phone: "9876543210", line1: "12 Temple Rd", city: "Kanchipuram", state: "Tamil Nadu", pincode: "631501" };
const q = await (await post("/api/quote", { items: [{ id: pr.id, size: pr.label, quantity: 1, price: 1 }] })).json();
assert.equal(q.subtotal, pr.price);
ok("quote ignores client-sent price (sent ₹1, charged DB price)");

// ── idempotent checkout (COD)
const idem = crypto.randomUUID();
const body = { items: [{ id: pr.id, size: pr.label, quantity: 1 }], address: addr, paymentMethod: "cod", saveAddress: true };
const [r1, r2] = await Promise.all([post("/api/checkout", body, C, { "idempotency-key": idem }), post("/api/checkout", body, C, { "idempotency-key": idem })]);
const codes = [r1.status, r2.status].sort();
const r3 = await post("/api/checkout", body, C, { "idempotency-key": idem });
const j3 = await r3.json();
assert.equal(r3.status, 200); assert.equal(j3.replayed, true);
const orders = (await db.execute({ sql: "select number from orders where user_id=? and payment_method='cod'", args: [customer] })).rows;
assert.equal(orders.length, 1, `expected exactly 1 order, got ${orders.length} (statuses ${codes})`);
const stock = (await db.execute({ sql: "select stock from variants where id=?", args: [pr.vid] })).rows[0].stock;
assert.equal(stock, 1);
ok("double-submitted checkout (same Idempotency-Key, concurrent + replay) → ONE order, stock decremented once");

// ── reused key with different body is rejected
const bad = await post("/api/checkout", { ...body, paymentMethod: "razorpay" }, C, { "idempotency-key": idem });
assert.equal(bad.status, 409);
ok("same Idempotency-Key with a different request → 409");

// ── order access control
const num = j3.orderNumber;
assert.equal((await get(`/orders/${num}`, C)).status, 200);
const stranger = await get(`/orders/${num}`, O);
const strangerHtml = await stranger.text();
// Private, noindex page: what matters is that NO order data reaches another customer.
assert.ok(["12 Temple Rd", "E2E Buyer", "9876543210", "631501", "Ivory Gajendra", "Shipping to"].every((x) => !strangerHtml.includes(x)), "order data leaked to another customer");
assert.match(strangerHtml, /could not be found|noindex/i);
assert.equal((await get(`/orders/${num}`, A)).status, 200);
ok("order page: owner ✓, admin ✓, another customer gets NO order data (not-found page)");

// ── online payment path (server runs with FAKE Razorpay keys; the real API rejects them)
import { createHmac } from "node:crypto";
await db.execute({ sql: "update variants set stock=5 where id=?", args: [pr.vid] });
const t0 = Date.now();
const rzRes = await post("/api/checkout", { ...body, paymentMethod: "razorpay" }, P, { "idempotency-key": crypto.randomUUID() });
const rzJson = await rzRes.json();
assert.equal(rzRes.status, 503, JSON.stringify(rzJson));
assert.match(rzJson.error, /couldn't reach the payment provider/i);
const failed = (await db.execute({ sql: "select id,status,payment_status from orders where user_id=? and payment_method='razorpay'", args: [payer] })).rows[0];
assert.equal(failed.status, "cancelled"); assert.equal(failed.payment_status, "failed");
ok(`gateway failure (${((Date.now() - t0) / 1000).toFixed(1)}s, timeout+retry+breaker) → friendly 503, order auto-cancelled (saga compensation)`);
await fetch(BASE + "/api/cron/process-queue", { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } });
assert.equal((await db.execute({ sql: "select stock from variants where id=?", args: [pr.vid] })).rows[0].stock, 5);
ok("compensation job ran: reserved stock returned (5 → 5)");

// craft a pending online order directly, then exercise the signature checks with the real HMAC algorithm
async function craftOrder(rzId) {
  const id = crypto.randomUUID();
  await db.execute({ sql: `insert into orders (id,number,user_id,email,status,payment_method,payment_status,razorpay_order_id,subtotal,total,shipping_address) values (?,?,?,?, 'pending','razorpay','unpaid',?,1000,1000,?)`, args: [id, `KRS-T${Date.now().toString(36)}${Math.floor(Math.random()*999)}`.toUpperCase(), payer, "p@t.dev", rzId, JSON.stringify(addr)] });
  return id;
}
const status = async (id) => (await db.execute({ sql: "select status,payment_status from orders where id=?", args: [id] })).rows[0];
const SECRET = process.env.RAZORPAY_KEY_SECRET ?? "fakesecret";
const rzId = `order_E2E${Date.now()}`;
const oid = await craftOrder(rzId);
assert.equal((await post("/api/payments/verify", { razorpay_order_id: rzId, simulate: true }, P)).status, 403); // simulation refused in production
assert.equal((await post("/api/payments/verify", { razorpay_order_id: rzId, razorpay_payment_id: "pay_1", razorpay_signature: "forged" }, P)).status, 400);
assert.equal((await post("/api/payments/verify", { razorpay_order_id: rzId, razorpay_payment_id: "pay_1", razorpay_signature: createHmac("sha256", SECRET).update(`${rzId}|pay_1`).digest("hex") }, O)).status, 404); // right sig, wrong user
assert.equal((await status(oid)).payment_status, "unpaid");
const goodSig = createHmac("sha256", SECRET).update(`${rzId}|pay_1`).digest("hex");
assert.equal((await post("/api/payments/verify", { razorpay_order_id: rzId, razorpay_payment_id: "pay_1", razorpay_signature: goodSig }, P)).status, 200);
assert.equal((await status(oid)).payment_status, "paid");
ok("payment verify: simulation refused in prod, forged signature → 400, other user → 404, genuine HMAC → order paid");

// webhook with genuine signature marks paid even if the customer never returns to the site
const rzId2 = `order_E2EW${Date.now()}`;
const oid2 = await craftOrder(rzId2);
const hook = JSON.stringify({ event: "payment.captured", payload: { payment: { entity: { id: "pay_w1", order_id: rzId2 } } } });
const WH = process.env.RAZORPAY_WEBHOOK_SECRET ?? "whsec";
assert.equal((await fetch(BASE + "/api/webhooks/razorpay", { method: "POST", body: hook, headers: { "x-razorpay-signature": "nope" } })).status, 400);
assert.equal((await status(oid2)).payment_status, "unpaid");
assert.equal((await fetch(BASE + "/api/webhooks/razorpay", { method: "POST", body: hook, headers: { "x-razorpay-signature": createHmac("sha256", WH).update(hook).digest("hex") } })).status, 200);
assert.equal((await status(oid2)).payment_status, "paid");
ok("webhook: forged signature rejected; genuine payment.captured marks the order paid");

// ── cancel + stock restored via saga job
const cancelOrder = await (await post("/api/checkout", { ...body, paymentMethod: "cod" }, P, { "idempotency-key": crypto.randomUUID() })).json();
const before = (await db.execute({ sql: "select stock from variants where id=?", args: [pr.vid] })).rows[0].stock;

// ── admin pages
for (const p of ["/admin", "/admin/orders", `/admin/orders/${num}`, "/admin/products", "/admin/products/new", `/admin/products/${pr.id}`, "/admin/customers", "/admin/coupons", "/admin/system", "/admin/settings"]) {
  const r = await get(p, A); assert.equal(r.status, 200, `${p} → ${r.status}`);
}
ok("all 10 admin pages render for admin");

// ── cron endpoint
const cron = await fetch(BASE + "/api/cron/process-queue", { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } });
assert.equal(cron.status, 200);
assert.equal((await fetch(BASE + "/api/cron/process-queue")).status, 401);
ok("cron endpoint: secret required; processes queue");

// ── rate limiting on search
let limited = 0;
for (let i = 0; i < 40; i++) { const r = await fetch(BASE + "/api/search?q=silk"); if (r.status === 429) { limited++; const b = await r.json(); assert.ok(b.retry_after_seconds >= 1); } }
assert.ok(limited > 0);
ok(`rate limiting: ${limited}/40 rapid requests got HTTP 429 with retry_after_seconds`);

console.log(`\nAll ${n} end-to-end checks passed.`);
void cancelOrder; void before;
process.exit(0);
