import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { breaker, retry, withTimeout } from "./resilience";

/**
 * Razorpay client. Every outbound call is wrapped with the Tracen stack:
 * timeout (5s) → retry with backoff+jitter on 5xx/429/timeout → circuit breaker.
 *
 * With no keys configured we run in TEST MODE (simulated payments) — but ONLY outside production,
 * so a misconfigured production deploy can never mark orders paid without real money.
 */
export const razorpayConfigured = () => !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
export const simulatedPayments = () => !razorpayConfigured() && process.env.NODE_ENV !== "production";
export const onlinePaymentsAvailable = () => razorpayConfigured() || simulatedPayments();

export async function createRazorpayOrder(args: { amountRupees: number; receipt: string }) {
  if (simulatedPayments()) return { id: `order_SIM_${args.receipt}`, simulated: true as const };

  const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64");
  const body = JSON.stringify({ amount: args.amountRupees * 100, currency: "INR", receipt: args.receipt });

  const out = await breaker("razorpay").run(() =>
    retry(
      () =>
        withTimeout(async (signal) => {
          const res = await fetch("https://api.razorpay.com/v1/orders", {
            method: "POST", signal, body,
            headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
          });
          if (!res.ok) throw Object.assign(new Error(`Razorpay ${res.status}`), { status: res.status });
          return (await res.json()) as { id: string };
        }, 5000),
      { attempts: 3, baseMs: 400 },
    ),
  );
  return { id: out.id, simulated: false as const };
}

const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

/** Checkout signature = HMAC_SHA256(order_id|payment_id, key_secret) */
export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string) {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;
  return safeEqual(createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex"), signature);
}

/** Webhook signature = HMAC_SHA256(raw body, webhook_secret) */
export function verifyWebhookSignature(rawBody: string, signature: string) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  return safeEqual(createHmac("sha256", secret).update(rawBody).digest("hex"), signature);
}
