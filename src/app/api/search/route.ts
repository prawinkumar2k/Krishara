import { searchProducts } from "@/lib/catalog";
import { takeToken, tooManyRequests } from "@/lib/rate-limit";

// Topic 1: public endpoint → token bucket per client (burst 20, refill 5/s).
export async function GET(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const limit = takeToken(`search:${ip}`, 20, 5);
  if (!limit.ok) return tooManyRequests(limit.retryAfterSeconds);

  const q = new URL(req.url).searchParams.get("q") ?? "";
  const items = (await searchProducts(q.slice(0, 60))).map((p) => ({
    id: p.id, slug: p.slug, name: p.name, category: p.category, price: p.price, image: p.image,
  }));
  return Response.json({ items });
}
