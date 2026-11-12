import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AccountLink, AccountLinkLoader } from "@/components/AccountLink";
import { ProductCard, ProductGridSkeleton } from "@/components/ProductCard";
import { SortSelect } from "@/components/SortSelect";
import { Reveal, Stagger, StaggerItem } from "@/components/Reveal";
import { getCategories, listProducts, type Sort } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Shop Kanchipuram Silk Sarees · Krishara",
  description: "Handwoven Kanchipuram silk sarees, bridal weaves, zari brocades, blouses and temple jewellery.",
};

type SP = { category?: string; q?: string; sort?: string; min?: string; max?: string; page?: string };

const PRICE_BANDS = [
  { label: "Under ₹10,000", min: undefined, max: 10000 },
  { label: "₹10,000 – ₹40,000", min: 10000, max: 40000 },
  { label: "₹40,000 – ₹70,000", min: 40000, max: 70000 },
  { label: "Above ₹70,000", min: 70000, max: undefined },
];

const href = (sp: SP, patch: Partial<SP>) => {
  const merged = { ...sp, ...patch, page: undefined, ...("page" in patch ? { page: patch.page } : {}) };
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) if (v) qs.set(k, String(v));
  const s = qs.toString();
  return s ? `/shop?${s}` : "/shop";
};

const chip = (active: boolean) =>
  `shrink-0 rounded-full border px-4 py-2 text-xs font-semibold whitespace-nowrap transition-colors ${
    active ? "bg-[#09492e] border-[#09492e] text-[#fbf8f3]" : "bg-white border-[#09492e]/20 text-[#09492e] hover:border-[#09492e]"
  }`;

async function Results({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const num = (v?: string) => (v && /^\d+$/.test(v) ? Number(v) : undefined);
  const [cats, data] = await Promise.all([
    getCategories(),
    listProducts({
      category: sp.category, q: sp.q?.slice(0, 60), sort: (sp.sort as Sort) || "featured",
      min: num(sp.min), max: num(sp.max), page: num(sp.page),
    }),
  ]);

  return (
    <>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:px-0 [scrollbar-width:none]">
        <Link href={href(sp, { category: undefined })} className={chip(!sp.category)}>All pieces</Link>
        {cats.map((c) => (
          <Link key={c.id} href={href(sp, { category: c.slug })} className={chip(sp.category === c.slug)}>{c.name}</Link>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0 [scrollbar-width:none]">
          {PRICE_BANDS.map((b) => {
            const active = String(b.min ?? "") === (sp.min ?? "") && String(b.max ?? "") === (sp.max ?? "");
            return (
              <Link key={b.label} href={href(sp, active ? { min: undefined, max: undefined } : { min: b.min?.toString(), max: b.max?.toString() })} className={chip(active)}>
                {b.label}
              </Link>
            );
          })}
        </div>
        <SortSelect value={sp.sort || "featured"} />
      </div>

      <p className="mt-5 text-xs text-[#12231a]/60" aria-live="polite">
        {data.total} {data.total === 1 ? "piece" : "pieces"}{sp.q ? <> for “{sp.q}”</> : null}
      </p>

      {data.items.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-[#c6a253]/60 bg-white py-20 text-center">
          <p className="font-editorial text-3xl text-[#09492e]">Nothing matches yet</p>
          <p className="mt-1 text-sm text-[#12231a]/60">Try removing a filter.</p>
          <Link href="/shop" className="mt-6 inline-block rounded-full bg-[#09492e] px-6 py-3 text-sm font-semibold text-[#fbf8f3]">Clear filters</Link>
        </div>
      ) : (
        <Stagger key={JSON.stringify(sp)} className="mt-5 grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 md:grid-cols-3 xl:grid-cols-4">
          {data.items.map((p, i) => (
            <StaggerItem key={p.id}><ProductCard p={p} priority={i < 4} /></StaggerItem>
          ))}
        </Stagger>
      )}

      {data.pages > 1 && (
        <nav aria-label="Pagination" className="mt-12 flex items-center justify-center gap-2">
          {Array.from({ length: data.pages }).map((_, i) => (
            <Link key={i} href={href(sp, { page: String(i + 1) })} aria-current={data.page === i + 1 ? "page" : undefined}
              className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${data.page === i + 1 ? "bg-[#09492e] text-[#fbf8f3]" : "bg-white border border-[#09492e]/20 text-[#09492e]"}`}>
              {i + 1}
            </Link>
          ))}
        </nav>
      )}
    </>
  );
}

export default function ShopPage({ searchParams }: { searchParams: Promise<SP> }) {
  return (
    <main className="min-h-screen bg-[#fbf8f3]">
      <Navbar accountSlot={<Suspense fallback={<AccountLink user={null} />}><AccountLinkLoader /></Suspense>} />
      <section className="mx-auto max-w-7xl px-4 pb-20 pt-28 sm:px-6 md:pt-32 lg:px-10">
        <Reveal>
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#c6a253]">The Collection</p>
          <h1 className="font-editorial mt-1 text-4xl font-semibold text-[#09492e] sm:text-5xl md:text-6xl">Woven for the Divine</h1>
          <p className="mt-2 max-w-xl text-sm text-[#12231a]/65">Handloom Kanchipuram silks, bridal muhurtham weaves, matching blouses and temple jewellery.</p>
        </Reveal>
        <div className="mt-8">
          <Suspense fallback={<ProductGridSkeleton />}>
            <Results searchParams={searchParams} />
          </Suspense>
        </div>
      </section>
      <Footer />
    </main>
  );
}
