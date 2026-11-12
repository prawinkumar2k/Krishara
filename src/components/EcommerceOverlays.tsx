"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import {
  X, Plus, Minus, Trash2, ShoppingBag, Heart, Search, MapPin, ShieldCheck, Sparkles, ArrowRight,
} from "lucide-react";
import { useStore, formatINR } from "@/context/StoreContext";

type Hit = { id: string; slug: string; name: string; category: string | null; price: number; image: string };

const FREE_SHIPPING_OVER = 25000;

/** Slide-in drawer shell shared by bag + wishlist. */
function Drawer({ open, onClose, children, label }: { open: boolean; onClose: () => void; children: React.ReactNode; label: string }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex justify-end bg-[#06321f]/50 backdrop-blur-sm"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.aside
            role="dialog" aria-modal="true" aria-label={label}
            className="w-full sm:max-w-md bg-[#fbf8f3] h-dvh shadow-2xl flex flex-col border-l border-[#c6a253]/30"
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function EcommerceOverlays() {
  const {
    cart, wishlist, isBagOpen, isWishlistOpen, isStoreModalOpen, isSearchOpen, toastMessage,
    setBagOpen, setWishlistOpen, setStoreModalOpen, setSearchOpen,
    addToCart, removeFromCart, updateQuantity, toggleWishlist, cartSubtotal, showToast,
  } = useStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [searching, setSearching] = useState(false);
  const [apptSubmitted, setApptSubmitted] = useState(false);

  // Debounced server search (rate-limited endpoint).
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHits([]);
      return;
    }
    setSearching(true);
    const ac = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ac.signal });
        if (res.ok) setHits((await res.json()).items);
      } catch {
        /* aborted or offline */
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => {
      clearTimeout(t);
      ac.abort();
    };
  }, [searchQuery]);

  const remaining = Math.max(0, FREE_SHIPPING_OVER - cartSubtotal);
  const progress = Math.min(100, (cartSubtotal / FREE_SHIPPING_OVER) * 100);

  return (
    <>
      {/* Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            key={toastMessage}
            role="status"
            initial={{ y: 40, opacity: 0, scale: 0.95 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 20, opacity: 0 }}
            className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[70] max-w-[92vw] rounded-full bg-[#09492e] text-[#fbf8f3] border border-[#c6a253]/60 px-5 py-2.5 text-xs font-semibold shadow-2xl flex items-center gap-2"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#e2c887] shrink-0" />
            <span className="truncate">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bag */}
      <Drawer open={isBagOpen} onClose={() => setBagOpen(false)} label="Shopping bag">
        <div className="px-5 sm:px-6 py-5 bg-white border-b border-[#09492e]/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-[#09492e]" />
            <h3 className="font-editorial text-2xl font-bold text-[#09492e]">Your Silk Bag</h3>
          </div>
          <button type="button" onClick={() => setBagOpen(false)} aria-label="Close bag" className="p-2 rounded-full hover:bg-[#09492e]/10 text-[#09492e] cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {cart.length > 0 && (
          <div className="px-5 sm:px-6 pt-4">
            <p className="text-xs text-[#09492e]">
              {remaining === 0 ? "🎉 You've unlocked free insured shipping" : <>Add <strong>{formatINR(remaining)}</strong> more for free shipping</>}
            </p>
            <div className="mt-2 h-1.5 rounded-full bg-[#09492e]/10 overflow-hidden">
              <motion.div className="h-full rounded-full bg-gradient-to-r from-[#09492e] to-[#c6a253]" animate={{ width: `${progress}%` }} transition={{ type: "spring", damping: 25 }} />
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {cart.length === 0 ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-16">
              <ShoppingBag className="w-10 h-10 text-[#09492e]/30 mx-auto mb-3" />
              <p className="font-editorial text-2xl text-[#09492e]">Your bag is empty</p>
              <p className="text-xs text-[#09492e]/60 mt-1">Explore our Kanchipuram looms, styled looks, or bridal weaves.</p>
              <Link href="/shop" onClick={() => setBagOpen(false)} className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#09492e] text-[#fbf8f3] px-6 py-3 text-sm font-semibold">
                Browse the collection <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          ) : (
            <ul className="space-y-3">
              <AnimatePresence initial={false}>
                {cart.map((item) => (
                  <motion.li
                    layout key={`${item.id}-${item.size || "std"}`}
                    initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -60, height: 0, marginBottom: 0 }}
                    className="flex gap-3.5 rounded-2xl bg-white p-3 border border-[#09492e]/10"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.image} alt={item.name} className="w-16 h-20 rounded-xl object-cover shrink-0 bg-[#fbf8f3]" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase tracking-wider text-[#c6a253] font-semibold">
                            {item.category}{item.size ? ` · ${item.size}` : ""}
                          </p>
                          <p className="text-sm font-semibold text-[#12231a] truncate">{item.name}</p>
                        </div>
                        <button type="button" onClick={() => removeFromCart(item.id, item.size)} aria-label={`Remove ${item.name}`} className="text-[#09492e]/45 hover:text-[#b81d56] cursor-pointer p-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="mt-2.5 flex items-center justify-between">
                        <span className="text-sm font-bold text-[#09492e]">{formatINR(item.price * item.quantity)}</span>
                        <div className="flex items-center gap-1 rounded-full border border-[#09492e]/15 px-1.5 py-0.5">
                          <button type="button" aria-label="Decrease quantity" onClick={() => updateQuantity(item.id, -1, item.size)} className="p-1.5 text-[#09492e] cursor-pointer"><Minus className="w-3 h-3" /></button>
                          <span className="text-xs font-bold w-5 text-center">{item.quantity}</span>
                          <button type="button" aria-label="Increase quantity" onClick={() => updateQuantity(item.id, 1, item.size)} className="p-1.5 text-[#09492e] cursor-pointer"><Plus className="w-3 h-3" /></button>
                        </div>
                      </div>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </div>

        {cart.length > 0 && (
          <div className="p-5 sm:p-6 bg-white border-t border-[#09492e]/10 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center gap-2 text-xs text-[#09492e] mb-3">
              <ShieldCheck className="w-4 h-4 text-[#c6a253]" />
              <span>Silk Mark Certified · Insured Delivery</span>
            </div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-[#09492e]/70">Subtotal</span>
              <span className="text-xl font-bold text-[#09492e]">{formatINR(cartSubtotal)}</span>
            </div>
            <p className="text-[11px] text-[#09492e]/55 mb-4">Shipping, GST and coupons are calculated at checkout.</p>
            <Link href="/checkout" onClick={() => setBagOpen(false)} className="flex items-center justify-center gap-2 w-full rounded-full bg-[#09492e] hover:bg-[#06321f] text-[#fbf8f3] py-3.5 text-sm font-semibold shadow-md transition-colors">
              Proceed to Checkout <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </Drawer>

      {/* Wishlist */}
      <Drawer open={isWishlistOpen} onClose={() => setWishlistOpen(false)} label="Wishlist">
        <div className="px-5 sm:px-6 py-5 bg-white border-b border-[#09492e]/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Heart className="w-5 h-5 text-[#b81d56]" fill="#b81d56" />
            <h3 className="font-editorial text-2xl font-bold text-[#09492e]">Saved Treasures ({wishlist.length})</h3>
          </div>
          <button type="button" aria-label="Close wishlist" onClick={() => setWishlistOpen(false)} className="p-2 rounded-full hover:bg-[#09492e]/10 text-[#09492e] cursor-pointer"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-3">
          {wishlist.length === 0 ? (
            <div className="text-center py-16">
              <Heart className="w-10 h-10 text-[#09492e]/25 mx-auto mb-3" />
              <p className="font-editorial text-2xl text-[#09492e]">No saved drapes yet</p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {wishlist.map((item) => (
                <motion.div layout key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -50 }} className="flex items-center justify-between gap-3 rounded-2xl bg-white p-3 border border-[#09492e]/10">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.image} alt={item.name} className="w-14 h-16 rounded-xl object-cover shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-wider text-[#c6a253] font-semibold">{item.category}</p>
                      <p className="text-sm font-semibold text-[#12231a] truncate">{item.name}</p>
                      <p className="text-xs font-bold text-[#09492e]">{formatINR(item.price)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button type="button" onClick={() => { addToCart(item, true); setWishlistOpen(false); }} className="rounded-full bg-[#09492e] text-white text-[11px] font-semibold px-3 py-2 cursor-pointer">To Bag</button>
                    <button type="button" aria-label="Remove from wishlist" onClick={() => toggleWishlist(item)} className="p-1.5 text-[#09492e]/45 hover:text-[#b81d56] cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </Drawer>

      {/* Search */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            className="fixed inset-0 z-50 bg-[#06321f]/60 backdrop-blur-md flex items-start justify-center pt-[8vh] p-3 sm:p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setSearchOpen(false)}
          >
            <motion.div
              role="dialog" aria-modal="true" aria-label="Search"
              initial={{ y: -20, scale: 0.97, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: -10, opacity: 0 }}
              className="w-full max-w-2xl rounded-3xl bg-[#fbf8f3] border border-[#c6a253]/45 shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 px-4 sm:px-6 py-4 bg-white border-b border-[#09492e]/10">
                <Search className="w-5 h-5 text-[#09492e] shrink-0" />
                <input
                  autoFocus value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Kanchipuram silk, Korvai, Bridal…"
                  className="flex-1 min-w-0 bg-transparent text-base sm:text-sm text-[#12231a] focus:outline-none"
                />
                <button type="button" aria-label="Close search" onClick={() => setSearchOpen(false)} className="p-1.5 rounded-full hover:bg-[#09492e]/10 text-[#09492e] cursor-pointer"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-4 sm:p-5 max-h-[65vh] overflow-y-auto">
                {searchQuery.trim().length < 2 ? (
                  <p className="text-sm text-[#09492e]/60 py-6 text-center">Type at least 2 letters to search the collection.</p>
                ) : searching && hits.length === 0 ? (
                  <p className="text-sm text-[#09492e]/60 py-6 text-center animate-pulse">Searching…</p>
                ) : hits.length === 0 ? (
                  <p className="text-sm text-[#09492e]/60 py-6 text-center">No matches for “{searchQuery}”.</p>
                ) : (
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {hits.map((p, i) => (
                      <motion.li key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                        <Link href={`/product/${p.slug}`} onClick={() => setSearchOpen(false)} className="flex items-center gap-3 rounded-2xl bg-white p-2.5 border border-[#09492e]/10 hover:border-[#c6a253] transition-colors">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={p.image} alt="" className="w-12 h-14 rounded-xl object-cover shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[10px] uppercase tracking-wider text-[#c6a253] font-semibold">{p.category}</p>
                            <p className="text-xs font-semibold text-[#12231a] truncate">{p.name}</p>
                            <p className="text-xs font-bold text-[#09492e]">{formatINR(p.price)}</p>
                          </div>
                        </Link>
                      </motion.li>
                    ))}
                  </ul>
                )}
                <Link href={searchQuery.trim() ? `/shop?q=${encodeURIComponent(searchQuery.trim())}` : "/shop"} onClick={() => setSearchOpen(false)} className="mt-4 flex items-center justify-center gap-2 text-sm font-semibold text-[#09492e] underline decoration-[#c6a253] underline-offset-4">
                  View all results <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Visit the store */}
      <AnimatePresence>
        {isStoreModalOpen && (
          <motion.div className="fixed inset-0 z-50 bg-[#06321f]/60 backdrop-blur-md flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setStoreModalOpen(false)}>
            <motion.div
              initial={{ scale: 0.92, y: 20, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl bg-[#fbf8f3] border border-[#c6a253]/50 shadow-2xl p-6 sm:p-7 relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button type="button" aria-label="Close" onClick={() => { setStoreModalOpen(false); setApptSubmitted(false); }} className="absolute top-4 right-4 p-2 rounded-full hover:bg-[#09492e]/10 text-[#09492e] cursor-pointer"><X className="w-4 h-4" /></button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/krishara-logo.jpg" alt="Krishara" className="h-10 w-auto mix-blend-multiply mb-4" />
              <h3 className="font-editorial text-3xl font-bold text-[#09492e]">Visit Our Heritage Showrooms</h3>
              <div className="mt-4 space-y-3 text-xs text-[#09492e]/80">
                {[
                  ["Kanchipuram Flagship Looms", "14 Sannadhi Street, Near Ekambareswarar Temple · 10 AM – 8:30 PM"],
                  ["Chennai Mylapore Salon", "28 Luz Church Road, Mylapore, Chennai · 10:30 AM – 8:30 PM"],
                ].map(([t, a]) => (
                  <div key={t} className="rounded-2xl bg-white p-3.5 border border-[#09492e]/10 flex gap-3">
                    <MapPin className="w-4 h-4 text-[#c6a253] shrink-0 mt-0.5" />
                    <div><p className="font-bold text-[#09492e]">{t}</p><p>{a}</p></div>
                  </div>
                ))}
              </div>
              {apptSubmitted ? (
                <div className="mt-5 rounded-2xl bg-[#09492e] text-[#fbf8f3] p-4 text-center text-xs">Private Bridal Styling Appointment requested! Our stylist will call you shortly.</div>
              ) : (
                <button type="button" onClick={() => { setApptSubmitted(true); showToast("Showroom styling request received"); }} className="mt-6 w-full rounded-full bg-[#09492e] hover:bg-[#06321f] text-[#fbf8f3] py-3.5 text-sm font-semibold cursor-pointer">
                  Book a Private Bridal Draping Session
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
