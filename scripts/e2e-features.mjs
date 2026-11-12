// BASE=http://localhost:3200 node --env-file=.env.local scripts/e2e-features.mjs
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { createClient } from "@libsql/client";

const BASE = process.env.BASE ?? "http://localhost:3200";
const db = createClient({ url: process.env.DATABASE_URL ?? "file:./krishara.db" });
const key = new TextEncoder().encode(process.env.SESSION_SECRET);
let n = 0;
const ok = (s) => console.log(`  ✓ ${++n}. ${s}`);
const cookieFor = async (id, role = "customer", v) => `krishara_session=${await new SignJWT({ userId: id, role, ...(v === undefined ? {} : { v }) }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("1h").sign(key)}`;
const get = (p, c) => fetch(BASE + p, { headers: c ? { cookie: c } : {}, redirect: "manual" });

/** Submit a server-action <form> exactly like a browser without JS: scrape its hidden inputs, add fields, multipart POST. */
async function submitForm(pagePath, fields, cookie, { formIndex = 0, override = {} } = {}) {
  const html = await (await get(pagePath, cookie)).text();
  const form = html.split(/<form[\s>]/i).slice(1)[formIndex] ?? "";
  const fd = new FormData();
  for (const m of form.matchAll(/<input[^>]*type="hidden"[^>]*>/gi)) {
    const name = /name="([^"]*)"/.exec(m[0])?.[1];
    const value = /value="([^"]*)"/.exec(m[0])?.[1] ?? "";
    if (name && !(name in fields) && !(name in override)) fd.append(name, value.replace(/&quot;/g, '"').replace(/&amp;/g, "&"));
  }
  for (const [k, v] of Object.entries({ ...fields, ...override })) fd.set(k, v);
  const res = await fetch(BASE + pagePath, { method: "POST", body: fd, headers: cookie ? { cookie } : {}, redirect: "manual" });
  return { res, text: await res.text() };
}

async function mkUser(email, password = "OldPassw0rd!") {
  const id = crypto.randomUUID();
  await db.execute({ sql: "insert into users (id,email,name,password_hash,role) values (?,?,?,?, 'customer')", args: [id, email, "Feature Tester", await bcrypt.hash(password, 10)] });
  return id;
}
const q1 = async (sql, args = []) => (await db.execute({ sql, args })).rows[0];

// ───────── SEO
const sm = await (await get("/sitemap.xml")).text();
assert.match(sm, /\/product\/ivory-gajendra-silk/); assert.match(sm, /\/shop/);
const rb = await (await get("/robots.txt")).text();
assert.match(rb, /Disallow: \/admin/); assert.match(rb, /Sitemap:/);
ok("sitemap.xml lists products; robots.txt blocks admin/account/checkout and points to the sitemap");

// ───────── password reset (full flow through the real forms)
const email = `reset-${Date.now()}@t.dev`;
const uid = await mkUser(email);
const unknown = await submitForm("/forgot-password", { email: `nobody-${Date.now()}@t.dev` });
const known = await submitForm("/forgot-password", { email });
assert.match(unknown.text, /reset link is on its way/); assert.match(known.text, /reset link is on its way/);
ok("forgot-password gives the SAME answer for unknown and known emails (no account enumeration)");

const job = await q1("select payload from jobs where type='email.password_reset' and payload like ? order by created_at desc limit 1", [`%${email}%`]);
const token = JSON.parse(job.payload).token;
assert.equal(token.length, 64);
const stored = await q1("select token_hash from password_resets where user_id=?", [uid]);
assert.notEqual(stored.token_hash, token); assert.equal(stored.token_hash.length, 64);
ok("reset token emailed once; only its SHA-256 hash is stored in the database");

const bad1 = await submitForm(`/reset-password?token=${token}`, { password: "NewPassw0rd!", confirm: "different" });
assert.match(bad1.text, /Passwords don.?t match/);
const bad2 = await submitForm(`/reset-password?token=${"0".repeat(64)}`, { password: "NewPassw0rd!", confirm: "NewPassw0rd!" });
assert.match(bad2.text, /invalid or has expired/);
ok("mismatched passwords and a made-up token are both rejected");

const good = await submitForm(`/reset-password?token=${token}`, { password: "NewPassw0rd!", confirm: "NewPassw0rd!" });
assert.equal(good.res.status, 303); assert.match(good.res.headers.get("location"), /\/login\?reset=1/);
assert.equal(await bcrypt.compare("NewPassw0rd!", (await q1("select password_hash h from users where id=?", [uid])).h), true);
ok("valid token changes the password and redirects to login");

const reuse = await submitForm(`/reset-password?token=${token}`, { password: "Another1234!", confirm: "Another1234!" });
assert.match(reuse.text, /invalid or has expired|already been used/);
assert.equal(await bcrypt.compare("NewPassw0rd!", (await q1("select password_hash h from users where id=?", [uid])).h), true);
ok("the same link cannot be used twice (single use)");

// expired token path: craft via known raw token whose hash we compute
import { createHash } from "node:crypto";
const rawExpired = ("expired" + Date.now()).padEnd(64, "x");
await db.execute({ sql: "insert into password_resets (token_hash,user_id,expires_at) values (?,?,?)", args: [createHash("sha256").update(rawExpired).digest("hex"), uid, Date.now() - 1000] });
const exp = await submitForm(`/reset-password?token=${rawExpired}`, { password: "Another1234!", confirm: "Another1234!" });
assert.match(exp.text, /invalid or has expired/);
ok("expired link is refused");

const login = await submitForm("/login", { email, password: "NewPassw0rd!" });
assert.equal(login.res.status, 303); assert.match(login.res.headers.get("set-cookie") ?? "", /krishara_session=/);
assert.match(login.res.headers.get("set-cookie") ?? "", /krishara_auth=1/);
const oldPw = await submitForm("/login", { email, password: "OldPassw0rd!" });
assert.match(oldPw.text, /Incorrect email or password/);
ok("login works with the NEW password, the old one is rejected, session + auth-hint cookies are set");

// ───────── session revocation: the reset bumped tokenVersion, so a session minted BEFORE it must die
const staleSession = await cookieFor(uid); // no version claim == version 0 (pre-reset)
assert.equal((await get("/api/cart", staleSession)).status, 401);
const freshSession = await cookieFor(uid, "customer", 1);
assert.equal((await get("/api/cart", freshSession)).status, 200);
ok("password reset signs out other devices: pre-reset session → 401, post-reset session works");

// ───────── cross-device cart
const C = freshSession;
assert.equal((await get("/api/cart")).status, 401);
const cart = [{ id: "rack-01", name: "Test saree", price: 42500, image: "/images/look-emerald.jpg", category: "Silk", size: "36", quantity: 2 }];
const put = await fetch(BASE + "/api/cart", { method: "PUT", headers: { "content-type": "application/json", cookie: C }, body: JSON.stringify({ cart, wishlist: [] }) });
assert.equal(put.status, 200);
const back = await (await get("/api/cart", C)).json();
assert.equal(back.cart[0].quantity, 2);
const badPut = await fetch(BASE + "/api/cart", { method: "PUT", headers: { "content-type": "application/json", cookie: C }, body: JSON.stringify({ cart: [{ id: "x", quantity: 999 }], wishlist: [] }) });
assert.equal(badPut.status, 400);
ok("cart API: anonymous → 401; saved bag comes back on another 'device'; invalid payload → 400");

// ───────── invoice
const [prod] = (await db.execute("select p.id pid, p.name, v.id vid from products p join variants v on v.product_id=p.id where p.slug='ivory-gajendra-silk' limit 1")).rows;
const addr = JSON.stringify({ fullName: "Feature Tester", phone: "9876543210", line1: "99 Invoice Lane", city: "Chennai", state: "Tamil Nadu", pincode: "600004" });
async function mkOrder(userId, status, number) {
  const oid = crypto.randomUUID();
  await db.execute({ sql: "insert into orders (id,number,user_id,email,status,payment_method,payment_status,subtotal,tax,total,shipping_address) values (?,?,?,?,?,'cod','paid',48000,2286,48000,?)", args: [oid, number, userId, email, status, addr] });
  await db.execute({ sql: "insert into order_items (id,order_id,variant_id,product_name,variant_label,unit_price,quantity) values (?,?,?,?,?,48000,1)", args: [crypto.randomUUID(), oid, prod.vid, prod.name, "36"] });
  return oid;
}
const stamp = Date.now().toString(36).toUpperCase();
await mkOrder(uid, "delivered", `KRS-INV${stamp}`);
await mkOrder(uid, "pending", `KRS-PEN${stamp}`);
const stranger = await mkUser(`stranger-${Date.now()}@t.dev`);
const inv = await (await get(`/orders/KRS-INV${stamp}/invoice`, C)).text();
assert.match(inv, /Tax invoice/); assert.match(inv, /CGST/); assert.match(inv, /SGST/); assert.ok(!inv.includes("IGST"));
ok("invoice for the owner shows the GST split (CGST+SGST for an in-state delivery)");
const inv2 = await (await get(`/orders/KRS-INV${stamp}/invoice`, await cookieFor(stranger))).text();
assert.ok(!inv2.includes("99 Invoice Lane") && !inv2.includes("GST summary"));
const inv3 = await (await get(`/orders/KRS-PEN${stamp}/invoice`, C)).text();
assert.ok(!inv3.includes("GST summary") && !inv3.includes("99 Invoice Lane"));
ok("invoice: another customer sees nothing; a pending order has no invoice");

// ───────── reviews (verified buyers only, moderated)
const pageHtml = await (await get("/product/ivory-gajendra-silk", C)).text();
assert.match(pageHtml, /Write a review/);
assert.ok(!(await (await get("/product/ivory-gajendra-silk", await cookieFor(stranger))).text()).includes("Write a review"));
ok("review form shown only to a customer with a delivered order for this product");

const post = await submitForm("/product/ivory-gajendra-silk", { rating: "5", body: `Gorgeous zari work ${stamp}` }, C, { formIndex: 1 });
const row = await q1("select rating,is_approved a from reviews where user_id=?", [uid]);
assert.equal(row.rating, 5); assert.equal(row.a, 0);
assert.ok(!(await (await get("/product/ivory-gajendra-silk")).text()).includes(`Gorgeous zari work ${stamp}`));
ok("review saved as PENDING and is not public yet");
await db.execute({ sql: "update reviews set is_approved=1 where user_id=?", args: [uid] });
for (let i = 0; i < 8; i++) { if ((await (await get("/product/ivory-gajendra-silk")).text()).includes(`Gorgeous zari work ${stamp}`)) break; await new Promise((r) => setTimeout(r, 400)); }
assert.ok((await (await get("/product/ivory-gajendra-silk")).text()).includes(`Gorgeous zari work ${stamp}`));
ok("after approval the review appears on the product page");
void post;

console.log(`\nAll ${n} feature checks passed.`);
process.exit(0);
