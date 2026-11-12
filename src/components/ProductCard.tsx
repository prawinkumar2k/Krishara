"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import { Heart } from "lucide-react";
import { useStore } from "@/context/StoreContext";
import { formatINR, percentOff } from "@/lib/format";
import type { ProductCard as Card } from "@/lib/catalog";

export function ProductCard({ p, priority = false }: { p: Card; priority?: boolean }) {
  const { toggleWishlist, isWishlisted } = useStore();
  const wished = isWishlisted(p.id);
  const off = percentOff(p.price, p.compareAtPrice);

  return (
    <motion.article whileHover={{ y: -6 }} transition={{ type: "spring", stiffness: 300, damping: 22 }} className="group relative">
      <Link href={`/product/${p.slug}`} className="block">
        <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-[#efe9dd] border border-[#09492e]/10">
          <Image
            src={p.image} alt={p.name} fill priority={priority} unoptimized={!p.image.startsWith("/")}
            sizes="(min-width:1280px) 25vw, (min-width:768px) 33vw, 50vw"
            className={`object-cover transition-all duration-700 ${p.image2 ? "group-hover:opacity-0" : "group-hover:scale-105"}`}
          />
          {p.image2 && (
            <Image src={p.image2} alt="" fill unoptimized={!p.image2.startsWith("/")} sizes="(min-width:1280px) 25vw, (min-width:768px) 33vw, 50vw"
              className="object-cover opacity-0 scale-105 transition-all duration-700 group-hover:opacity-100 group-hover:scale-100" />
          )}
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/35 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute left-2.5 top-2.5 flex flex-col gap-1.5">
            {off > 0 && <span className="rounded-full bg-[#b81d56] px-2.5 py-1 text-[10px] font-bold tracking-wide text-white">{off}% OFF</span>}
            {p.tag && off === 0 && <span className="rounded-full bg-[#09492e] px-2.5 py-1 text-[10px] font-bold tracking-wide text-[#e2c887]">{p.tag}</span>}
            {!p.inStock && <span className="rounded-full bg-[#12231a] px-2.5 py-1 text-[10px] font-bold text-white">SOLD OUT</span>}
          </div>
          <span className="absolute bottom-3 left-1/2 -translate-x-1/2 translate-y-3 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 rounded-full bg-[#fbf8f3] px-4 py-1.5 text-[11px] font-semibold text-[#09492e] shadow-lg whitespace-nowrap max-sm:hidden">
            Quick view
          </span>
        </div>
        <div className="mt-3 px-0.5">
          {p.category && <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-[#c6a253]">{p.category}</p>}
          <h3 className="mt-0.5 text-sm font-semibold text-[#12231a] leading-snug line-clamp-2">{p.name}</h3>
          <p className="mt-1 flex items-baseline gap-2 text-sm">
            <span className="font-bold text-[#09492e]">{formatINR(p.price)}</span>
            {p.compareAtPrice && p.compareAtPrice > p.price && <span className="text-xs text-[#12231a]/45 line-through">{formatINR(p.compareAtPrice)}</span>}
          </p>
        </div>
      </Link>
      <motion.button
        type="button" whileTap={{ scale: 0.8 }} aria-pressed={wished} aria-label={wished ? `Remove ${p.name} from wishlist` : `Save ${p.name} to wishlist`}
        onClick={() => toggleWishlist({ id: p.id, name: p.name, price: p.price, image: p.image, category: p.category ?? "Silk" })}
        className="absolute right-2.5 top-2.5 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 backdrop-blur shadow-md cursor-pointer"
      >
        <Heart className={`h-4 w-4 transition-colors ${wished ? "text-[#b81d56]" : "text-[#09492e]"}`} fill={wished ? "#b81d56" : "none"} />
      </motion.button>
    </motion.article>
  );
}

export function ProductGridSkeleton({ n = 8 }: { n?: number }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 md:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i}>
          <div className="skeleton aspect-[3/4]" />
          <div className="skeleton mt-3 h-3 w-1/3" />
          <div className="skeleton mt-2 h-4 w-4/5" />
          <div className="skeleton mt-2 h-4 w-1/4" />
        </div>
      ))}
    </div>
  );
}
