import { z } from "zod";
import { quoteCart } from "@/lib/pricing";
import { takeToken, tooManyRequests } from "@/lib/rate-limit";
import { onlinePaymentsAvailable } from "@/lib/razorpay";

const body = z.object({
  items: z.array(z.object({ id: z.string().max(80), size: z.string().max(20).optional(), quantity: z.number().int().min(1).max(10) })).max(40),
  coupon: z.string().max(30).optional().nullable(),
});

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const limit = takeToken(`quote:${ip}`, 30, 3);
  if (!limit.ok) return tooManyRequests(limit.retryAfterSeconds);

  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });

  const q = await quoteCart(parsed.data.items, parsed.data.coupon);
  return Response.json({ ...q, onlineAvailable: onlinePaymentsAvailable() });
}
