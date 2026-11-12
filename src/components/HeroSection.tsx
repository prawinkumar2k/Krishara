"use client";

import React from "react";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import { motion } from "motion/react";

const TICKER_ITEMS = [
  "KRISHARA HERITAGE",
  "TRY THE LOOK",
  "PURE ZARI",
  "BRIDAL MUHURTHAM",
  "KORVAI SILK",
  "TEMPLE ARCHIVE",
  "KANCHIPURAM LOOMS",
  "SIX MOODS",
];

export function HeroSection() {
  return (
    <section id="top" className="relative w-full min-h-[92vh] flex flex-col justify-between overflow-hidden bg-[#06321f]">
      {/* Full-bleed Showroom Image */}
      <div className="absolute inset-0">
        <Image
          src="/images/hero-showroom.jpg"
          alt="Krishara Heritage Kanchipuram Silk Showroom"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center animate-[hero-zoom_18s_ease-out_forwards]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#06321f]/90 via-[#06321f]/45 to-[#06321f]/35" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#06321f]/80 via-transparent to-transparent" />
      </div>

      {/* Top Spacer for Fixed Pill Navbar */}
      <div className="h-24" />

      {/* Center / Bottom Hero Content */}
      <div className="relative z-10 max-w-6xl mx-auto w-full px-6 md:px-10 py-14 md:py-20">
        <motion.div
          className="max-w-2xl"
          initial={{ opacity: 0, y: 36 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-[#c6a253]/50 bg-[#09492e]/70 backdrop-blur-md px-3.5 py-1 mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#e2c887]" />
            <span className="text-[11px] uppercase tracking-[0.24em] text-[#e2c887] font-semibold">
              Krishara · Kanchipuram Silk
            </span>
          </div>

          <h1 className="font-editorial text-5xl sm:text-6xl md:text-7xl lg:text-[82px] font-bold text-[#fbf8f3] leading-[0.98] tracking-tight drop-shadow-sm">
            Woven for the Divine.
          </h1>

          <p className="mt-5 text-base md:text-lg text-[#fbf8f3]/85 max-w-xl leading-relaxed">
            Handwoven on centuries-old Kanchipuram temple looms with pure mulberry
            silk and 24K gold-dipped silver zari—crafted for sacred vows and
            timeless heirloom wardrobes.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <a
              href="#try-the-look"
              className="inline-flex items-center gap-2.5 rounded-full bg-[#09492e] hover:bg-[#0b5a39] border border-[#c6a253]/60 text-[#fbf8f3] px-7 py-3.5 text-sm font-semibold tracking-wide shadow-lg transition-all hover:-translate-y-0.5"
            >
              Try the Look
              <ArrowRight className="w-4 h-4 text-[#e2c887]" />
            </a>

            <a
              href="#the-rack"
              className="inline-flex items-center gap-2.5 rounded-full bg-[#fbf8f3] hover:bg-white text-[#09492e] px-7 py-3.5 text-sm font-semibold tracking-wide shadow-lg transition-all hover:-translate-y-0.5"
            >
              Browse the Rack
              <ArrowRight className="w-4 h-4 text-[#09492e]" />
            </a>
          </div>
        </motion.div>
      </div>

      {/* Emerald & Gold Ticker Strip */}
      <div className="relative z-10 w-full bg-[#09492e] border-t border-b border-[#c6a253]/40 py-3 overflow-hidden">
        <div className="animate-ticker">
          {[...TICKER_ITEMS, ...TICKER_ITEMS, ...TICKER_ITEMS].map((item, idx) => (
            <div key={idx} className="flex items-center shrink-0">
              <span className="text-[11px] md:text-xs font-semibold uppercase tracking-[0.28em] text-[#e2c887] px-6">
                {item}
              </span>
              <span className="text-[#c6a253] text-xs">✦</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

