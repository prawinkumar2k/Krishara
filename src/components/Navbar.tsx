"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Heart, ShoppingBag, Search, MapPin, Menu, X } from "lucide-react";
import { useStore } from "@/context/StoreContext";

const NAV_LINKS = [
  { label: "Shop", href: "/shop" },
  { label: "Archive", href: "/#archive" },
  { label: "Try the Look", href: "/#try-the-look" },
  { label: "Pick a Silk", href: "/#pick-a-silk" },
  { label: "The Rack", href: "/#the-rack" },
  { label: "Muse", href: "/#muse-film" },
  { label: "Bridal", href: "/#bridal" },
];

export function Navbar({ accountSlot }: { accountSlot?: React.ReactNode }) {
  const {
    cartCount,
    wishlist,
    setBagOpen,
    setWishlistOpen,
    setStoreModalOpen,
    setSearchOpen,
  } = useStore();

  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="fixed top-4 left-0 right-0 z-40 flex justify-center px-4 pointer-events-none">
      <nav className="pointer-events-auto flex items-center justify-between gap-3 md:gap-6 rounded-full bg-[#fbf8f3]/88 backdrop-blur-xl border border-[#c6a253]/35 shadow-[0_12px_40px_-10px_rgba(9,73,46,0.28)] px-4 md:px-6 py-2 max-w-6xl w-full">
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          className="lg:hidden p-2 -ml-1 rounded-full text-[#09492e] hover:bg-[#09492e]/10 cursor-pointer"
        >
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        {/* Krishara Brand Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0 group">
          <img
            src="/images/krishara-logo.jpg"
            alt="Krishara Kanchipuram Silk"
            className="h-9 md:h-10 w-auto object-contain mix-blend-multiply transition-transform duration-300 group-hover:scale-[1.03]"
          />
        </Link>

        {/* Section Links */}
        <div className="hidden lg:flex items-center gap-6 text-[13px] font-medium tracking-wide text-[#09492e]">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="relative py-1 hover:text-[#b81d56] transition-colors after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[1.5px] after:bg-[#c6a253] hover:after:w-full after:transition-all after:duration-300"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Utility Actions */}
        <div className="flex items-center gap-1.5 md:gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label="Search sarees"
            className="p-2 rounded-full text-[#09492e] hover:bg-[#09492e]/10 transition-colors cursor-pointer"
          >
            <Search className="w-4 h-4" />
          </button>

          {accountSlot}

          <button
            type="button"
            onClick={() => setWishlistOpen(true)}
            aria-label="Open wishlist"
            className="relative p-2 rounded-full text-[#09492e] hover:bg-[#09492e]/10 transition-colors cursor-pointer"
          >
            <Heart className="w-4 h-4" />
            {wishlist.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[#b81d56] text-white text-[10px] font-bold flex items-center justify-center">
                {wishlist.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setBagOpen(true)}
            aria-label="Open shopping bag"
            className="relative p-2 rounded-full text-[#09492e] hover:bg-[#09492e]/10 transition-colors cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4" />
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[#09492e] text-[#e2c887] text-[10px] font-bold flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setStoreModalOpen(true)}
            className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-[#09492e] hover:bg-[#06321f] text-[#fbf8f3] text-xs font-semibold tracking-wide px-4 py-2 transition-all shadow-sm cursor-pointer"
          >
            <MapPin className="w-3.5 h-3.5 text-[#c6a253]" />
            Visit the Store
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            className="pointer-events-auto absolute top-full mt-2 left-4 right-4 lg:hidden rounded-3xl bg-[#fbf8f3]/95 backdrop-blur-xl border border-[#c6a253]/35 shadow-2xl p-3"
          >
            {NAV_LINKS.map((link, i) => (
              <motion.a
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="block rounded-2xl px-4 py-3 text-sm font-semibold text-[#09492e] hover:bg-[#09492e]/8"
              >
                {link.label}
              </motion.a>
            ))}
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setStoreModalOpen(true);
              }}
              className="mt-2 w-full rounded-2xl bg-[#09492e] text-[#fbf8f3] px-4 py-3 text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer"
            >
              <MapPin className="w-4 h-4 text-[#c6a253]" /> Visit the Store
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

