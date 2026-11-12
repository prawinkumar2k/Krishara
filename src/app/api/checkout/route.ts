import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentUser } from "@/lib/dal";
import { withIdempotency, IdempotencyError } from "@/lib/idempotency";
import { OrderError, placeOrder } from "@/lib/orders";
import { takeToken, tooManyRequests } from "@/lib/rate-limit";

const address = z.object({
  fullName: z.string().trim().min(2).max(80),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"),
  line1: z.string().trim().min(3).max(150),
  line2: z.string().trim().max(150).optional().nullable(),
  city: z.string().trim().min(2).max(60),
  state: z.string().trim().min(2).max(60),
  pincode: z.string().trim().regex(/^[1-9]\d{5}$/, "Enter a valid 6-digit PIN code"),
});

const body = z.object({
  items: z.array(z.object({ id: z.string().max(80), size: z.string().max(20).optional(), quantity: z.number().int().min(1).max(10) })).min(1).max(40),
  address,
  paymentMethod: z.enum(["razorpay", "cod"]),
  coupon: z.string().max(30).optional().nullable(),
  saveAddress: z.boolean().optional(),
});

/**
 * POST /api/checkout — requires header `Idempotency-Key: <uuid>` (topic 14).
 * The browser generates one key per checkout attempt; if the network drops and it retries,
 * the same order is returned instead of a second one being created.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Please sign in to checkout." }, { status: 401 });

  const limit = takeToken(`checkout:${user.id}`, 5, 1 / 6);
  if (!limit.ok) return tooManyRequests(limit.retryAfterSeconds);

  const key = req.headers.get("idempotency-key");
  if (!key || key.length < 16 || key.length > 80)
    return Response.json({ error: "Missing Idempotency-Key header." }, { status: 400 });

  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return Response.json({ error: parsed.error.issues[0].message, field: parsed.error.issues[0].path.join(".") }, { status: 400 });
  const data = parsed.data;

  try {
    const { result, replayed } = await withIdempotency(`checkout:${key}`, `user:${user.id}`, data, async () => {
      const res = await placeOrder({
        userId: user.id, email: user.email, items: data.items, address: data.address,
        paymentMethod: data.paymentMethod, couponCode: data.coupon,
      });
      if (data.saveAddress) {
        const existing = await db.select({ id: schema.addresses.id }).from(schema.addresses).where(eq(schema.addresses.userId, user.id));
        if (existing.length < 10)
          await db.insert(schema.addresses).values({ ...data.address, userId: user.id, isDefault: existing.length === 0 });
      }
      return res;
    });
    return Response.json({ ...result, replayed });
  } catch (err) {
    if (err instanceof OrderError) return Response.json({ error: err.message, details: err.details }, { status: err.status });
    if (err instanceof IdempotencyError) return Response.json({ error: err.message }, { status: 409 });
    console.error("[checkout]", err);
    return Response.json({ error: "Something went wrong. You have not been charged." }, { status: 500 });
  }
}
