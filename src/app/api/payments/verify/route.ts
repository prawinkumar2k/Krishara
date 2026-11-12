import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentUser } from "@/lib/dal";
import { markPaid } from "@/lib/orders";
import { simulatedPayments, verifyPaymentSignature } from "@/lib/razorpay";

const body = z.object({
  razorpay_order_id: z.string().max(80),
  razorpay_payment_id: z.string().max(80).optional(),
  razorpay_signature: z.string().max(200).optional(),
  simulate: z.boolean().optional(),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const b = parsed.data;

  const [order] = await db.select().from(schema.orders).where(eq(schema.orders.razorpayOrderId, b.razorpay_order_id));
  if (!order || order.userId !== user.id) return Response.json({ error: "Order not found" }, { status: 404 });

  let paymentId: string;
  if (b.simulate) {
    // Test mode only — impossible in production (simulatedPayments() is false there).
    if (!simulatedPayments()) return Response.json({ error: "Not allowed" }, { status: 403 });
    paymentId = `pay_SIM_${Date.now()}`;
  } else {
    if (!b.razorpay_payment_id || !b.razorpay_signature || !verifyPaymentSignature(b.razorpay_order_id, b.razorpay_payment_id, b.razorpay_signature))
      return Response.json({ error: "Payment verification failed" }, { status: 400 });
    paymentId = b.razorpay_payment_id;
  }

  await markPaid({ razorpayOrderId: b.razorpay_order_id, paymentId });
  return Response.json({ ok: true, orderNumber: order.number });
}
