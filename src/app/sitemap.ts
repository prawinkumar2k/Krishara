import type { MetadataRoute } from "next";
import { getAllSlugs, getCategories } from "@/lib/catalog";

const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [slugs, cats] = await Promise.all([getAllSlugs(), getCategories()]);
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/shop`, changeFrequency: "daily", priority: 0.9 },
    ...cats.map((c) => ({ url: `${base}/shop?category=${c.slug}`, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...slugs.map((p) => ({ url: `${base}/product/${p.slug}`, changeFrequency: "weekly" as const, priority: 0.8 })),
  ];
}
