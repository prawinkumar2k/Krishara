"use client";

import React, { useState } from "react";
import { ShieldCheck, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useStore } from "@/context/StoreContext";

export function Footer() {
  const [email, setEmail] = useState("");
  const { showToast, setStoreModalOpen } = useStore();

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    showToast("Welcome to the Krishara Heritage Circle");
    setEmail("");
  };

  return (
    <footer className="bg-[#06321f] text-[#fbf8f3] pt-16 pb-10 px-6 md:px-10 border-t border-[#c6a253]/35">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-[#c6a253]/20">
          {/* Brand Column */}
          <div className="md:col-span-5">
            <div className="inline-block rounded-2xl bg-[#fbf8f3] px-4 py-2 mb-4">
              <img
                src="/images/krishara-logo.jpg"
                alt="Krishara"
                className="h-10 w-auto object-contain mix-blend-multiply"
              />
            </div>
            <p className="text-sm text-[#fbf8f3]/75 max-w-sm leading-relaxed">
              Handwoven Kanchipuram pure mulberry silk sarees &amp; 24K gold-dipped
              zari heirlooms. Woven in Kanchipuram, worn across generations.
            </p>
            <div className="mt-5 inline-flex items-center gap-2 text-xs text-[#e2c887]">
              <ShieldCheck className="w-4 h-4" />
              <span>Silk Mark India Certified · Pure Handloom</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="md:col-span-3 space-y-2.5 text-sm">
            <p className="text-xs uppercase tracking-[0.22em] text-[#c6a253] font-semibold mb-3">
              Explore
            </p>
            <Link href="/#archive" className="block text-[#fbf8f3]/80 hover:text-[#e2c887]">
              The Krishara Archive
            </Link>
            <Link href="/#try-the-look" className="block text-[#fbf8f3]/80 hover:text-[#e2c887]">
              Try the Look
            </Link>
            <Link href="/#pick-a-silk" className="block text-[#fbf8f3]/80 hover:text-[#e2c887]">
              Pick a Silk
            </Link>
            <Link href="/#the-rack" className="block text-[#fbf8f3]/80 hover:text-[#e2c887]">
              The Rack
            </Link>
            <Link href="/#bridal" className="block text-[#fbf8f3]/80 hover:text-[#e2c887]">
              Bridal Muhurtham
            </Link>
            <button
              type="button"
              onClick={() => setStoreModalOpen(true)}
              className="block text-[#fbf8f3]/80 hover:text-[#e2c887] cursor-pointer"
            >
              Visit Showrooms
            </button>
          </div>

          {/* Newsletter */}
          <div className="md:col-span-4">
            <p className="text-xs uppercase tracking-[0.22em] text-[#c6a253] font-semibold mb-3">
              Private Loom Previews
            </p>
            <p className="text-xs text-[#fbf8f3]/70 mb-4">
              Receive early access to limited-edition bridal korvai weaves and
              showroom trunk shows.
            </p>
            <form onSubmit={handleSubscribe} className="flex items-center gap-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="flex-1 rounded-full bg-[#09492e] border border-[#c6a253]/40 px-4 py-2.5 text-xs text-white placeholder:text-white/50 focus:outline-none focus:border-[#e2c887]"
              />
              <button
                type="submit"
                aria-label="Subscribe"
                className="w-10 h-10 rounded-full bg-[#c6a253] hover:bg-[#e2c887] text-[#06321f] flex items-center justify-center shrink-0 cursor-pointer transition-colors"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#fbf8f3]/55">
          <p>© 2026 Krishara Kanchipuram Silk. All rights reserved.</p>
          <p className="inline-flex items-center gap-1.5 text-[#e2c887]/80">
            <Sparkles className="w-3.5 h-3.5" /> Woven for the Divine
          </p>
        </div>
      </div>
    </footer>
  );
}

