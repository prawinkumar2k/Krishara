import "server-only";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";

export const APP_URL = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

const inr = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export type Rendered = { subject: string; html: string; text: string };

/** Shared brand shell. Table layout + inline styles because email clients ignore modern CSS. */
function shell(title: string, bodyHtml: string, cta?: { label: string; href: string }) {
  return `<!doctype html><html><body style="margin:0;background:#fbf8f3;font-family:Arial,Helvetica,sans-serif;color:#12231a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fbf8f3"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #e7dcc0;border-radius:16px;overflow:hidden">
<tr><td style="background:#06321f;padding:22px 28px;color:#e2c887;font-size:22px;letter-spacing:3px;font-weight:bold">KRISHARA</td></tr>
<tr><td style="padding:28px">
<h1 style="margin:0 0 14px;font-size:22px;color:#09492e">${esc(title)}</h1>
${bodyHtml}
${cta ? `<p style="margin:26px 0 0"><a href="${esc(cta.href)}" style="background:#09492e;color:#fbf8f3;text-decoration:none;padding:13px 26px;border-radius:999px;font-weight:bold;font-size:14px;display:inline-block">${esc(cta.label)}</a></p>` : ""}
</td></tr>
<tr><td style="padding:18px 28px;background:#f4efe3;color:#6b7a70;font-size:11px;line-height:1.6">Handwoven in Kanchipuram · Silk Mark certified<br><a href="https://dealpost.co.in/" style="color:#09492e;text-decoration:none;font-weight:600">Developed by Dealpost Private Limited</a></td></tr>
</table></td></tr></table></body></html>`;
}

async function loadOrder(orderId: string) {
  const [order] = await db.select().from(schema.orders).where(eq(schema.orders.id, orderId));
  if (!order) return null;
  const items = await db.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, orderId));
  return { order, items };
}

function orderTable(items: { productName: string; variantLabel: string; unitPrice: number; quantity: number }[], o: { subtotal: number; discount: number; shipping: number; total: number }) {
  const rows = items.map((i) => `<tr><td style="padding:8px 0;border-bottom:1px solid #eee">${esc(i.productName)}<br><span style="color:#6b7a70;font-size:12px">${esc(i.variantLabel)} · Qty ${i.quantity}</span></td><td align="right" style="padding:8px 0;border-bottom:1px solid #eee">${inr(i.unitPrice * i.quantity)}</td></tr>`).join("");
  const line = (l: string, v: string, bold = false) => `<tr><td style="padding:4px 0;${bold ? "font-weight:bold;font-size:16px;color:#09492e" : "color:#555"}">${l}</td><td align="right" style="padding:4px 0;${bold ? "font-weight:bold;font-size:16px;color:#09492e" : ""}">${v}</td></tr>`;
  return `<table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;margin-top:10px">${rows}
${line("Subtotal", inr(o.subtotal))}${o.discount ? line("Discount", "− " + inr(o.discount)) : ""}${line("Shipping", o.shipping ? inr(o.shipping) : "Free")}${line("Total", inr(o.total), true)}</table>`;
}

const textTable = (items: { productName: string; variantLabel: string; quantity: number }[], total: number) =>
  items.map((i) => `- ${i.productName} (${i.variantLabel}) × ${i.quantity}`).join("\n") + `\nTotal: ${inr(total)}`;

type Data = Record<string, unknown>;

export async function renderEmail(template: string, data: Data): Promise<Rendered | null> {
  if (template === "welcome") {
    const name = String(data.name ?? "there"); // shell() escapes the title exactly once
    return {
      subject: "Welcome to Krishara",
      html: shell(`Namaste, ${name}`, `<p style="font-size:14px;line-height:1.7">Your Krishara account is ready. Browse handwoven Kanchipuram silks, save favourites, and track every order in one place.</p>`, { label: "Start exploring", href: `${APP_URL}/shop` }),
      text: `Namaste ${data.name ?? ""},\nYour Krishara account is ready.\n${APP_URL}/shop`,
    };
  }

  if (template === "password_reset") {
    const link = `${APP_URL}/reset-password?token=${encodeURIComponent(String(data.token))}`;
    return {
      subject: "Reset your Krishara password",
      html: shell("Reset your password", `<p style="font-size:14px;line-height:1.7">We received a request to reset your password. This link works for <strong>1 hour</strong> and can be used once. If you didn't ask for this, you can ignore this email — your password stays unchanged.</p>`, { label: "Choose a new password", href: link }),
      text: `Reset your Krishara password (valid 1 hour, single use):\n${link}\n\nIf you didn't request this, ignore this email.`,
    };
  }

  // everything below is about an order
  const loaded = data.orderId ? await loadOrder(String(data.orderId)) : null;
  if (!loaded) return null; // order vanished (e.g. wiped) — nothing to send
  const { order, items } = loaded;
  const orderUrl = `${APP_URL}/orders/${order.number}`;
  const addr = order.shippingAddress;

  if (template === "order_confirmation") {
    return {
      subject: `Order ${order.number} received`,
      html: shell(`Thank you — order ${order.number}`,
        `<p style="font-size:14px;line-height:1.7">${order.paymentMethod === "cod" ? "Your order is confirmed — pay on delivery." : "We're waiting for your payment to confirm this order."}</p>${orderTable(items, order)}<p style="font-size:13px;color:#555;margin-top:16px">Shipping to ${esc(addr.fullName)}, ${esc(addr.line1)}, ${esc(addr.city)} ${esc(addr.pincode)}</p>`,
        { label: "View your order", href: orderUrl }),
      text: `Order ${order.number} received.\n${textTable(items, order.total)}\n${orderUrl}`,
    };
  }
  if (template === "payment_receipt") {
    return {
      subject: `Payment received for ${order.number}`,
      html: shell("Payment received", `<p style="font-size:14px;line-height:1.7">Thank you! We've received <strong>${inr(order.total)}</strong> for order ${esc(order.number)}. Our weavers' team will pack it shortly.</p>${orderTable(items, order)}`, { label: "Track your order", href: orderUrl }),
      text: `Payment of ${inr(order.total)} received for ${order.number}.\n${orderUrl}`,
    };
  }
  if (template === "shipped") {
    return {
      subject: `Your order ${order.number} has shipped`,
      html: shell("It's on its way", `<p style="font-size:14px;line-height:1.7">Order ${esc(order.number)} has shipped via <strong>${esc(order.carrier ?? "courier")}</strong>.<br>Tracking number: <strong>${esc(order.trackingNumber ?? "—")}</strong></p>`, { label: "Track your order", href: orderUrl }),
      text: `Order ${order.number} shipped via ${order.carrier}. Tracking: ${order.trackingNumber}\n${orderUrl}`,
    };
  }
  if (template === "cancelled") {
    return {
      subject: `Order ${order.number} cancelled`,
      html: shell("Order cancelled", `<p style="font-size:14px;line-height:1.7">Order ${esc(order.number)} has been cancelled.${order.paymentStatus === "paid" ? " Your refund will be processed to the original payment method within 5–7 working days." : ""}</p>`, { label: "Continue shopping", href: `${APP_URL}/shop` }),
      text: `Order ${order.number} cancelled.${order.paymentStatus === "paid" ? " Refund in 5–7 working days." : ""}`,
    };
  }
  return null;
}
