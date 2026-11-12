import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { Reveal, Stagger, StaggerItem } from "@/components/Reveal";
import { getFeatured } from "@/lib/catalog";

const PROMISES = ["Silk Mark certified", "Free insured shipping over ₹25,000", "7-day easy returns", "Handwoven in Kanchipuram", "Secure UPI · Cards · COD", "Pure zari · tested gold"];

/** Infinite promise ribbon — pure CSS animation, pauses on hover, honours reduced-motion. */
export function PromiseMarquee() {
  const row = [...PROMISES, ...PROMISES];
  return (
    <div className="overflow-hidden border-y border-[#c6a253]/40 bg-[#06321f] py-3" aria-label="Our promises">
      <div className="animate-marquee flex w-max gap-10 whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.28em] text-[#e2c887]">
        {[...row, ...row].map((t, i) => (
          <span key={i} className="flex items-center gap-10">{t}<span className="text-[#c6a253]">✦</span></span>
        ))}
      </div>
    </div>
  );
}

/** Live from the database (cached, tag-revalidated when the admin edits a product). */
export async function FeaturedSection() {
  const items = await getFeatured(8);
  if (items.length === 0) return null;
  return (
    <section id="featured" className="bg-[#fbf8f3] px-4 py-16 sm:px-6 md:py-24 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <Reveal className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#c6a253]">Fresh from the loom</p>
            <h2 className="font-editorial mt-1 text-4xl font-semibold text-[#09492e] sm:text-5xl">Shop the collection</h2>
          </div>
          <Link href="/shop" className="group inline-flex items-center gap-2 rounded-full border border-[#09492e] px-6 py-3 text-sm font-semibold text-[#09492e] transition-colors hover:bg-[#09492e] hover:text-[#fbf8f3]">
            View all <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </Reveal>
        <Stagger className="mt-8 grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 md:grid-cols-4">
          {items.map((p) => <StaggerItem key={p.id}><ProductCard p={p} /></StaggerItem>)}
        </Stagger>
      </div>
    </section>
  );
}

export function FeaturedSkeleton() {
  return (
    <section className="bg-[#fbf8f3] px-4 py-16 sm:px-6 md:py-24 lg:px-10">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton aspect-[3/4]" />)}
      </div>
    </section>
  );
}
