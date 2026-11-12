import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { getCurrentUser } from "@/lib/dal";
import { takeToken, tooManyRequests } from "@/lib/rate-limit";

const item = z.object({
  id: z.string().max(80), name: z.string().max(160), price: z.number().int().min(0).max(10_000_000),
  image: z.string().max(300), category: z.string().max(80), size: z.string().max(20).optional(), quantity: z.number().int().min(1).max(10),
});
const wish = item.omit({ quantity: true, size: true });
const body = z.object({ cart: z.array(item).max(40), wishlist: z.array(wish).max(100) });

/** Bag + wishlist for the signed-in user (display data only — the server re-prices at checkout). */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const [row] = await db.select().from(schema.userState).where(eq(schema.userState.userId, user.id));
  return Response.json({ cart: row?.cart ?? [], wishlist: row?.wishlist ?? [] });
}

export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const limit = takeToken(`cart:${user.id}`, 30, 1);
  if (!limit.ok) return tooManyRequests(limit.retryAfterSeconds);
  const p = body.safeParse(await req.json().catch(() => null));
  if (!p.success) return Response.json({ error: "Invalid cart" }, { status: 400 });
  await db.insert(schema.userState)
    .values({ userId: user.id, cart: p.data.cart, wishlist: p.data.wishlist, updatedAt: Date.now() })
    .onConflictDoUpdate({ target: schema.userState.userId, set: { cart: p.data.cart, wishlist: p.data.wishlist, updatedAt: Date.now() } });
  return Response.json({ ok: true });
}
