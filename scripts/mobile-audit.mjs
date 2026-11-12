// Real mobile emulation via Chrome DevTools Protocol.
//   BASE=http://localhost:3200 OUT=<dir> W=390 node --env-file=.env.local scripts/mobile-audit.mjs
import { spawn } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { SignJWT } from "jose";
import { createClient } from "@libsql/client";

const BASE = process.env.BASE ?? "http://localhost:3200";
const OUT = process.env.OUT ?? "./mobile-shots";
const W = Number(process.env.W ?? 390), H = 844;
const CHROME = process.env.CHROME ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
mkdirSync(OUT, { recursive: true });

const db = createClient({ url: process.env.DATABASE_URL ?? "file:./krishara.db" });
const key = new TextEncoder().encode(process.env.SESSION_SECRET);
const jwt = (userId, role) => new SignJWT({ userId, role }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("1h").sign(key);
const adminId = (await db.execute("select id from users where role='admin' limit 1")).rows[0].id;
const adminJwt = await jwt(adminId, "admin");

const port = 9333 + Math.floor(Math.random() * 500);
const chrome = spawn(CHROME, [`--remote-debugging-port=${port}`, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run", `--user-data-dir=${process.env.TEMP}\\krishara-cdp-${port}`, "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let target;
for (let i = 0; i < 40; i++) { try { target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" })).json(); break; } catch { await sleep(250); } }
if (!target) throw new Error("Chrome did not start");

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const pending = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } };
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, (d) => (d.error ? rej(new Error(d.error.message)) : res(d.result))); ws.send(JSON.stringify({ id: i, method, params })); });
const evalJs = async (expression) => (await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result.value;

await send("Page.enable"); await send("Network.enable");
await send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 2, mobile: true });
await send("Emulation.setTouchEmulationEnabled", { enabled: true });
await send("Emulation.setUserAgentOverride", { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1" });

const CART = JSON.stringify([{ id: "rack-01", name: "Vana Maragatham Korvai", price: 42500, image: "/images/look-emerald.jpg", category: "Silk Sarees", size: "36", quantity: 1 }, { id: "lk1-choker", name: "Nagas Kemp Temple Choker", price: 14500, image: "/images/mood-wedding.jpg", category: "Temple Jewellery", size: "Free Size", quantity: 1 }]);
const PAGES = [
  ["home", "/"], ["shop", "/shop"], ["product", "/product/ivory-gajendra-silk"], ["login", "/login"], ["forgot", "/forgot-password"],
  ["checkout", "/checkout", "auth"], ["checkout-filled", "/checkout", "auth", "cart"], ["account", "/account", "auth"], ["admin", "/admin", "admin"], ["admin-orders", "/admin/orders", "admin"], ["admin-product-new", "/admin/products/new", "admin"],
];
const customerId = (await db.execute("select id from users where role='customer' limit 1")).rows[0]?.id
  ?? (await (async () => { const id = crypto.randomUUID(); await db.execute({ sql: "insert into users (id,email,name,password_hash) values (?,?,?,?)", args: [id, `mobile-${id.slice(0, 5)}@t.dev`, "Mobile Tester", "x"] }); return id; })());
const customerJwt = await jwt(customerId, "customer");

let problems = 0;
for (const [name, path, authKind, withCart] of PAGES) {
  await send("Network.clearBrowserCookies");
  if (authKind) await send("Network.setCookie", { name: "krishara_session", value: authKind === "admin" ? adminJwt : customerJwt, url: BASE });
  await send("Page.navigate", { url: BASE + path });
  await sleep(1500);
  if (withCart) { await evalJs(`localStorage.setItem("krishara.cart", ${JSON.stringify(CART)})`); await send("Page.reload"); }
  await sleep(3000);
  // scroll through so IntersectionObserver-based reveals fire
  const height = await evalJs("document.documentElement.scrollHeight");
  for (let y = 0; y < height; y += 500) { await evalJs(`window.scrollTo(0, ${y})`); await sleep(120); }
  await evalJs("window.scrollTo(0,0)"); await sleep(600);

  const m = await evalJs(`(() => {
    const vw = window.innerWidth, de = document.documentElement;
    const wide = [...document.querySelectorAll('body *')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > vw + 1 && getComputedStyle(e).position !== 'fixed' && !e.closest('[class*="overflow-x-auto"], [class*="overflow-hidden"], .animate-marquee, [aria-label="Our promises"]'); })
      .slice(0, 6).map((e) => e.tagName.toLowerCase() + '.' + String(e.className).split(' ').slice(0, 3).join('.') + ' right=' + Math.round(e.getBoundingClientRect().right));
    const small = [...document.querySelectorAll('a,button,input,select,textarea')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (r.height < 30 || r.width < 30) && getComputedStyle(e).visibility !== 'hidden' && !e.className.toString().includes('sr-only'); }).length;
    return { vw, scrollW: de.scrollWidth, overflowX: de.scrollWidth > vw + 1, wide, smallTargets: small, title: document.title };
  })()`);
  const lay = await send("Page.getLayoutMetrics");
  const full = Math.min(Math.ceil(lay.cssContentSize.height), 9000);
  const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { x: 0, y: 0, width: W, height: full, scale: 1 } });
  writeFileSync(`${OUT}/${W}-${name}.png`, Buffer.from(shot.data, "base64"));
  const flag = m.overflowX ? "✗ OVERFLOW" : "✓";
  if (m.overflowX) problems++;
  console.log(`${flag} ${name.padEnd(18)} scrollW=${m.scrollW}/${m.vw}  tapTargets<30px=${m.smallTargets}  ${m.overflowX ? m.wide.join(" | ") : ""}`);
}
console.log(problems ? `\n${problems} page(s) scroll sideways at ${W}px` : `\nNo horizontal overflow at ${W}px on any page.`);
ws.close(); chrome.kill(); process.exit(0);
