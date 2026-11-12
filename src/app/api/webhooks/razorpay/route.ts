import { markPaid } from "@/lib/orders";
import { verifyWebhookSignature } from "@/lib/razorpay";

/**
 * Razorpay → us. This is the safety net when the customer closes the tab after paying:
 * the signed webhook marks the order paid anyway. markPaid() is idempotent, so the
 * browser verify call and this webhook can race safely.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  const sig = req.headers.get("x-razorpay-signature") ?? "";
  if (!verifyWebhookSignature(raw, sig)) return Response.json({ error: "Bad signature" }, { status: 400 });

  const event = JSON.parse(raw) as {
    event: string;
    payload?: { payment?: { entity?: { id: string; order_id: string } } };
  };
  const pay = event.payload?.payment?.entity;
  if ((event.event === "payment.captured" || event.event === "order.paid") && pay)
    await markPaid({ razorpayOrderId: pay.order_id, paymentId: pay.id });

  return Response.json({ ok: true }); // always 200 for handled/ignored events so Razorpay stops retrying
}
