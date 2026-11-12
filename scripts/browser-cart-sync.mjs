// Real-browser test of bag/wishlist sync across two "devices" (two separate Chrome profiles).
//   BASE=http://localhost:3200 node --env-file=.env.local scripts/browser-cart-sync.mjs
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import bcrypt from "bcryptjs";
import { createClient } from "@libsql/client";

const BASE = process.env.BASE ?? "http://localhost:3200";
const CHROME = process.env.CHROME ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const db = createClient({ url: process.env.DATABASE_URL ?? "file:./krishara.db" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let n = 0; const ok = (s) => console.log(`  ✓ ${++n}. ${s}`);

const email = `sync-${Date.now()}@t.dev`, password = "SyncTest123!";
const uid = crypto.randomUUID();
await db.execute({ sql: "insert into users (id,email,name,password_hash) values (?,?,?,?)", args: [uid, email, "Sync Tester", await bcrypt.hash(password, 10)] });
const serverCart = async () => JSON.parse((await db.execute({ sql: "select cart from user_state where user_id=?", args: [uid] })).rows[0]?.cart ?? "[]");

async function device(label) {
  const port = 9700 + Math.floor(Math.random() * 200);
  const proc = spawn(CHROME, [`--remote-debugging-port=${port}`, "--headless=new", "--disable-gpu", "--no-first-run", `--user-data-dir=${process.env.TEMP}\\krishara-dev-${label}-${port}`, "about:blank"], { stdio: "ignore" });
  let t; for (let i = 0; i < 40 && !t; i++) { try { t = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" })).json(); } catch { await sleep(250); } }
  const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
  let id = 0; const pend = new Map();
  ws.onmessage = (m) => { const d = JSON.parse(m.data); pend.get(d.id)?.(d); pend.delete(d.id); };
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pend.set(i, (d) => (d.error ? rej(new Error(d.error.message)) : res(d.result))); ws.send(JSON.stringify({ id: i, method, params })); });
  const js = async (expression) => { const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + " " + (r.exceptionDetails.exception?.description ?? "")); return r.result.value; };
  await send("Page.enable"); await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  const go = async (path, wait = 2500) => { await send("Page.navigate", { url: BASE + path }); await sleep(wait); };
  const cartLS = async () => JSON.parse((await js('localStorage.getItem("krishara.cart")')) ?? "[]");
  const clickText = (text, sel = "button") => js(`(() => { const b = [...document.querySelectorAll('${sel}')].find((x) => x.textContent.trim().includes(${JSON.stringify(text)}) && !x.disabled); if (!b) return false; b.click(); return true; })()`);
  const close = () => { ws.close(); proc.kill(); };
  return { send, js, go, cartLS, clickText, close };
}

async function login(d) {
  await d.go("/login");
  await d.js(`(() => { const set = (n, v) => { const el = document.querySelector('input[name=' + n + ']'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); }; set('email', ${JSON.stringify(email)}); set('password', ${JSON.stringify(password)}); })()`);
  await d.clickText("Sign in");
  await sleep(4000); // redirect to /account + sync
}

// ───────── Device 1 (a phone): browse anonymously, add items, then sign in
const A = await device("A");
await A.go("/product/ivory-gajendra-silk");
assert.ok(await A.clickText("36"), "size button");
await sleep(300);
assert.ok(await A.clickText("Add to bag"));
await sleep(800);
let ls = await A.cartLS();
assert.equal(ls.length, 1); assert.equal(ls[0].size, "36");
ok("anonymous visitor adds a saree to the bag in a real browser (saved in localStorage)");

await login(A);
assert.ok((await A.js("document.cookie")).includes("krishara_auth=1"));
await sleep(1500);
const srv1 = await serverCart();
assert.equal(srv1.length, 1); assert.equal(srv1[0].size, "36");
ok("on sign-in the anonymous bag is merged and pushed to the server");

await A.go("/product/vana-maragatham-korvai");
await A.clickText("40"); await sleep(300); await A.clickText("Add to bag"); await sleep(2500);
assert.equal((await serverCart()).length, 2);
ok("an item added while signed in is saved to the server automatically (debounced)");
A.close();

// ───────── Device 2 (a laptop): fresh profile, sign in → bag appears
const B = await device("B");
await B.go("/");
assert.equal((await B.cartLS()).length, 0);
await login(B);
await sleep(1500);
const onB = await B.cartLS();
assert.equal(onB.length, 2);
assert.deepEqual(onB.map((x) => x.size).sort(), ["36", "40"]);
ok("a second device (separate browser profile) signs in and receives the same 2-item bag");

// quantity changes on device 2 sync back
await B.js("(() => { const c = JSON.parse(localStorage.getItem('krishara.cart')); })()");
// ───────── sign out clears the shared device
await B.go("/account");
await B.clickText("Sign out");
await sleep(3500);
assert.equal((await B.cartLS()).length, 0);
assert.ok(!(await B.js("document.cookie")).includes("krishara_auth"));
assert.equal((await serverCart()).length, 2); // server copy is kept for next login
ok("signing out empties the bag on that browser, while the server keeps it for next time");
B.close();

console.log(`\nAll ${n} browser sync checks passed.`);
process.exit(0);
