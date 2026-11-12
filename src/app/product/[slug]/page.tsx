import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Star } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AccountLink, AccountLinkLoader } from "@/components/AccountLink";
import { ProductGallery } from "@/components/ProductGallery";
import { ProductBuyBox } from "@/components/ProductBuyBox";
import { ProductCard } from "@/components/ProductCard";
import { Reveal } from "@/components/Reveal";
import { ReviewForm } from "@/components/ReviewForm";
import { getCurrentUser } from "@/lib/dal";
import { hasDeliveredPurchase } from "./review-actions";
import { db, schema } from "@/db";
import { and, eq } from "drizzle-orm";
import { getAllSlugs, getProductBySlug, getReviews } from "@/lib/catalog";

export async function generateStaticParams() {
  return (await getAllSlugs()).slice(0, 100);
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await getProductBySlug((await params).slug);
  if (!p) return {};
  return {
    title: `${p.name} · Krishara`,
    description: p.fabric || p.description || `Handwoven ${p.name} from Krishara, Kanchipuram.`,
    openGraph: { images: p.images[0] ? [p.images[0]] : [] },
  };
}

async function Reviews({ productId }: { productId: string }) {
  const r = await getReviews(productId);
  if (r.count === 0) return <p className="text-sm text-[#12231a]/55">No reviews yet — be the first after your order arrives.</p>;
  return (
    <div>
      <p className="flex items-center gap-2 text-sm font-semibold text-[#09492e]">
        <Star className="h-4 w-4 text-[#c6a253]" fill="#c6a253" /> {r.avg.toFixed(1)} · {r.count} review{r.count > 1 ? "s" : ""}
      </p>
      <ul className="mt-4 space-y-3">
        {r.rows.map((x) => (
          <li key={x.id} className="rounded-2xl border border-[#09492e]/10 bg-white p-4">
            <p className="text-xs font-semibold text-[#09492e]">{x.name} <span className="ml-1 text-[#c6a253]">{"★".repeat(x.rating)}</span></p>
            <p className="mt-1 text-sm text-[#12231a]/75">{x.body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Only verified buyers (delivered order) see the form. Streams in separately so the page shell stays static. */
async function ReviewBox({ productId, slug }: { productId: string; slug: string }) {
  const user = await getCurrentUser();
  if (!user || !(await hasDeliveredPurchase(user.id, productId))) return null;
  const [existing] = await db.select().from(schema.reviews).where(and(eq(schema.reviews.productId, productId), eq(schema.reviews.userId, user.id)));
  return <div className="mt-5"><ReviewForm productId={productId} slug={slug} existing={existing} /></div>;
}

async function Detail({ params }: { params: Promise<{ slug: string }> }) {
  const p = await getProductBySlug((await params).slug);
  if (!p) notFound();
  const category = p.categoryName ?? "Silk";
  const total = p.variants.reduce((a, v) => a + v.stock, 0);

  const jsonLd = {
    "@context": "https://schema.org", "@type": "Product", name: p.name, image: p.images,
    description: p.fabric || p.description, brand: { "@type": "Brand", name: "Krishara" },
    offers: { "@type": "Offer", priceCurrency: "INR", price: p.price, availability: total > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock" },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <nav aria-label="Breadcrumb" className="text-xs text-[#12231a]/55">
        <Link href="/shop" className="hover:text-[#09492e]">Shop</Link> /{" "}
        {p.categorySlug && <><Link href={`/shop?category=${p.categorySlug}`} className="hover:text-[#09492e]">{category}</Link> / </>}
        <span className="text-[#12231a]">{p.name}</span>
      </nav>

      <div className="mt-5 grid gap-8 lg:grid-cols-2 lg:gap-14">
        <Reveal y={0}><ProductGallery images={p.images} name={p.name} /></Reveal>
        <Reveal delay={0.1}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#c6a253]">{category}</p>
          <h1 className="font-editorial mt-1 text-3xl font-semibold leading-tight text-[#09492e] sm:text-4xl md:text-5xl">{p.name}</h1>
          {p.fabric && <p className="mt-3 text-sm text-[#12231a]/70">{p.fabric}</p>}
          <div className="mt-6">
            <ProductBuyBox p={{ id: p.id, name: p.name, price: p.price, compareAtPrice: p.compareAtPrice, image: p.images[0] ?? "/images/saree-fold-gold.jpg", category, variants: p.variants }} />
          </div>
          {p.description && (
            <div className="mt-8 border-t border-[#09492e]/10 pt-6">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#09492e]">The weave</h2>
              <p className="mt-2 text-sm leading-relaxed text-[#12231a]/75">{p.description}</p>
            </div>
          )}
          <div className="mt-8 border-t border-[#09492e]/10 pt-6">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#09492e]">Reviews</h2>
            <Suspense fallback={<div className="skeleton h-16" />}><Reviews productId={p.id} /></Suspense>
            <Suspense fallback={null}><ReviewBox productId={p.id} slug={p.slug} /></Suspense>
          </div>
        </Reveal>
      </div>

      {p.related.length > 0 && (
        <section className="mt-20">
          <Reveal><h2 className="font-editorial text-3xl font-semibold text-[#09492e]">You may also love</h2></Reveal>
          <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 md:grid-cols-4">
            {p.related.map((r) => <ProductCard key={r.id} p={r} />)}
          </div>
        </section>
      )}
    </>
  );
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  // Check existence BEFORE streaming starts so unknown URLs return a real HTTP 404 (not a soft 404).
  // Known slugs are prerendered via generateStaticParams, so this costs nothing for them.
  if (!(await getProductBySlug((await params).slug))) notFound();
  return (
    <main className="min-h-screen bg-[#fbf8f3]">
      <Navbar accountSlot={<Suspense fallback={<AccountLink user={null} />}><AccountLinkLoader /></Suspense>} />
      <div className="mx-auto max-w-7xl px-4 pb-24 pt-28 sm:px-6 md:pt-32 lg:px-10">
        <Suspense fallback={<div className="grid gap-8 lg:grid-cols-2"><div className="skeleton aspect-[4/5]" /><div className="space-y-4"><div className="skeleton h-10 w-3/4" /><div className="skeleton h-6 w-1/3" /><div className="skeleton h-14" /></div></div>}>
          <Detail params={params} />
        </Suspense>
      </div>
      <Footer />
    </main>
  );
}
