"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Check, Heart, ShieldCheck, Truck, Sparkles, RotateCcw } from "lucide-react";
import { useStore } from "@/context/StoreContext";
import { formatINR, percentOff } from "@/lib/format";

type Variant = { id: string; label: string; stock: number };
type P = { id: string; name: string; price: number; compareAtPrice: number | null; image: string; category: string; variants: Variant[] };

export function ProductBuyBox({ p }: { p: P }) {
  const { addToCart, toggleWishlist, isWishlisted } = useStore();
  const router = useRouter();
  const firstAvailable = p.variants.find((v) => v.stock > 0);
  const single = p.variants.length === 1;
  const [selected, setSelected] = useState<string | null>(single ? (firstAvailable?.label ?? null) : null);
  const [nudge, setNudge] = useState(false);
  const [added, setAdded] = useState(false);
  const wished = isWishlisted(p.id);
  const off = percentOff(p.price, p.compareAtPrice);
  const soldOut = !firstAvailable;
  const sel = p.variants.find((v) => v.label === selected);
  const low = sel && sel.stock > 0 && sel.stock <= 3;

  const add = (goCheckout = false) => {
    if (!selected) {
      setNudge(true);
      setTimeout(() => setNudge(false), 600);
      return false;
    }
    addToCart({ id: p.id, name: p.name, price: p.price, image: p.image, category: p.category, size: selected }, !goCheckout);
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
    if (goCheckout) router.push("/checkout");
    return true;
  };

  return (
    <div>
      <div className="flex items-baseline gap-3">
        <span className="text-3xl font-bold text-[#09492e]">{formatINR(p.price)}</span>
        {off > 0 && p.compareAtPrice && (
          <>
            <span className="text-base text-[#12231a]/45 line-through">{formatINR(p.compareAtPrice)}</span>
            <span className="rounded-full bg-[#b81d56] px-2.5 py-1 text-[11px] font-bold text-white">{off}% OFF</span>
          </>
        )}
      </div>
      <p className="mt-1 text-xs text-[#12231a]/55">Inclusive of all taxes</p>

      {!single && (
        <motion.fieldset animate={nudge ? { x: [0, -8, 8, -6, 6, 0] } : {}} transition={{ duration: 0.45 }} className="mt-6">
          <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#09492e]">
            Select size {nudge && <span className="ml-2 normal-case text-[#b81d56]">— please choose one</span>}
          </legend>
          <div className="flex flex-wrap gap-2">
            {p.variants.map((v) => {
              const out = v.stock <= 0;
              const on = selected === v.label;
              return (
                <button
                  key={v.id} type="button" disabled={out} aria-pressed={on} onClick={() => setSelected(v.label)}
                  className={`relative h-11 min-w-12 rounded-full border px-4 text-sm font-semibold transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:line-through ${
                    on ? "border-[#09492e] bg-[#09492e] text-[#fbf8f3] scale-105" : "border-[#09492e]/25 bg-white text-[#09492e] hover:border-[#09492e]"
                  }`}
                >
                  {v.label}
                </button>
              );
            })}
          </div>
        </motion.fieldset>
      )}
      {low && <p className="mt-3 text-xs font-semibold text-[#d6453d]">Only {sel.stock} left — woven in limited numbers</p>}

      <div className="mt-7 flex flex-col gap-3 sm:flex-row">
        <motion.button
          type="button" disabled={soldOut} whileTap={{ scale: 0.97 }} onClick={() => add(false)}
          className="relative flex h-14 flex-1 items-center justify-center overflow-hidden rounded-full bg-[#09492e] text-sm font-semibold text-[#fbf8f3] shadow-lg shadow-[#09492e]/25 transition-colors hover:bg-[#06321f] disabled:bg-[#12231a]/30 cursor-pointer disabled:cursor-not-allowed"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span key={added ? "ok" : "add"} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }} className="flex items-center gap-2">
              {soldOut ? "Sold out" : added ? <><Check className="h-4 w-4" /> Added to bag</> : "Add to bag"}
            </motion.span>
          </AnimatePresence>
        </motion.button>
        <motion.button
          type="button" disabled={soldOut} whileTap={{ scale: 0.97 }} onClick={() => add(true)}
          className="h-14 flex-1 rounded-full border-2 border-[#c6a253] bg-[#c6a253]/10 text-sm font-semibold text-[#06321f] hover:bg-[#c6a253]/25 transition-colors disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
        >
          Buy now
        </motion.button>
        <motion.button
          type="button" whileTap={{ scale: 0.85 }} aria-pressed={wished} aria-label={wished ? "Remove from wishlist" : "Save to wishlist"}
          onClick={() => toggleWishlist({ id: p.id, name: p.name, price: p.price, image: p.image, category: p.category })}
          className="flex h-14 w-full items-center justify-center rounded-full border border-[#09492e]/25 bg-white sm:w-14 cursor-pointer"
        >
          <Heart className={`h-5 w-5 ${wished ? "text-[#b81d56]" : "text-[#09492e]"}`} fill={wished ? "#b81d56" : "none"} />
          <span className="ml-2 text-sm font-semibold text-[#09492e] sm:hidden">{wished ? "Saved" : "Save for later"}</span>
        </motion.button>
      </div>

      <ul className="mt-8 grid gap-3 text-xs text-[#12231a]/75 sm:grid-cols-2">
        {[
          [ShieldCheck, "Silk Mark certified · tested gold zari"],
          [Truck, "Insured delivery across India, free over ₹25,000"],
          [RotateCcw, "7-day easy returns on unworn pieces"],
          [Sparkles, "Handwoven by Kanchipuram master weavers"],
        ].map(([Icon, text], i) => {
          const I = Icon as typeof ShieldCheck;
          return (
            <li key={i} className="flex items-center gap-2.5 rounded-xl bg-white p-3 border border-[#09492e]/10">
              <I className="h-4 w-4 shrink-0 text-[#c6a253]" /> {text as string}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
