"use client";

import React, { useState } from "react";
import { ChevronLeft, ChevronRight, Heart, ShoppingBag } from "lucide-react";
import { BRIDAL_SAREES } from "@/data/catalog";
import { useStore, formatINR } from "@/context/StoreContext";

export function BridalSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const { addToCart, toggleWishlist, isWishlisted } = useStore();

  const current = BRIDAL_SAREES[activeIndex];
  const wished = isWishlisted(current.id);

  const goPrev = () =>
    setActiveIndex(
      (prev) => (prev - 1 + BRIDAL_SAREES.length) % BRIDAL_SAREES.length
    );
  const goNext = () =>
    setActiveIndex((prev) => (prev + 1) % BRIDAL_SAREES.length);

  return (
    <section
      id="bridal"
      className="bg-white py-20 md:py-28 px-6 md:px-10 border-t border-[#09492e]/10 overflow-hidden"
    >
      <div className="max-w-7xl mx-auto text-center">
        <p className="text-xs uppercase tracking-[0.26em] text-[#c6a253] font-semibold mb-2">
          Muhurtham Heirlooms
        </p>
        <h2 className="font-editorial text-4xl sm:text-5xl md:text-6xl font-bold text-[#12231a]">
          The Bridal Collection
        </h2>
        <p className="mt-2 font-editorial italic text-lg text-[#09492e]/75">
          For the muhurtham and every vow after
        </p>

        {/* Curved Arch Carousel */}
        <div className="relative mt-12 h-[420px] sm:h-[460px] flex items-center justify-center">
          {BRIDAL_SAREES.map((saree, idx) => {
            let offset = idx - activeIndex;
            if (offset > BRIDAL_SAREES.length / 2) offset -= BRIDAL_SAREES.length;
            if (offset < -BRIDAL_SAREES.length / 2) offset += BRIDAL_SAREES.length;

            const abs = Math.abs(offset);
            const isCenter = offset === 0;
            if (abs > 2) return null;

            const translateX = offset * 210;
            const translateY = abs * 22;
            const rotate = offset * 7;
            const scale = isCenter ? 1 : abs === 1 ? 0.84 : 0.7;
            const opacity = isCenter ? 1 : abs === 1 ? 0.65 : 0.3;

            return (
              <div
                key={saree.id}
                onClick={() => setActiveIndex(idx)}
                style={{
                  transform: `translateX(${translateX}px) translateY(${translateY}px) rotate(${rotate}deg) scale(${scale})`,
                  opacity,
                  zIndex: 10 - abs,
                }}
                className={`absolute w-[250px] sm:w-[285px] h-[380px] sm:h-[420px] rounded-t-[999px] rounded-b-2xl overflow-hidden transition-all duration-500 cursor-pointer bg-[#fbf8f3] ${
                  isCenter
                    ? "border-[3px] border-[#c6a253] shadow-[0_28px_60px_-15px_rgba(9,73,46,0.3)]"
                    : "border border-[#09492e]/15"
                }`}
              >
                <img
                  src={saree.image}
                  alt={saree.name}
                  className="w-full h-full object-cover object-top"
                />

                {saree.tag && (
                  <span className="absolute top-6 left-1/2 -translate-x-1/2 rounded-full bg-[#09492e]/90 text-[#e2c887] border border-[#c6a253]/60 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] shadow">
                    {saree.tag}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Active Bridal Saree Details */}
        <div className="mt-6 max-w-xl mx-auto">
          <h3 className="font-editorial text-2xl sm:text-3xl font-bold text-[#09492e]">
            {current.name}
          </h3>
          <p className="mt-1 text-xs sm:text-sm text-[#09492e]/75">
            {current.fabricNote} · <span className="italic">{current.palluNote}</span>
          </p>

          <div className="mt-3 flex items-center justify-center gap-3">
            <span className="text-2xl font-bold text-[#c6a253]">
              {formatINR(current.price)}
            </span>
            {current.originalPrice && (
              <span className="text-sm line-through text-[#09492e]/40">
                {formatINR(current.originalPrice)}
              </span>
            )}
          </div>

          {/* Controls */}
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={goPrev}
              aria-label="Previous bridal saree"
              className="w-11 h-11 rounded-full border border-[#09492e]/20 flex items-center justify-center text-[#09492e] hover:bg-[#09492e] hover:text-white transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() =>
                addToCart(
                  {
                    id: current.id,
                    name: current.name,
                    price: current.price,
                    image: current.image,
                    category: "Bridal Collection",
                  },
                  true
                )
              }
              className="inline-flex items-center gap-2 rounded-full bg-[#09492e] hover:bg-[#06321f] text-[#fbf8f3] px-7 py-3 text-sm font-semibold shadow-md transition-all cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4 text-[#e2c887]" />
              Add to cart
            </button>

            <button
              type="button"
              onClick={() =>
                toggleWishlist({
                  id: current.id,
                  name: current.name,
                  price: current.price,
                  image: current.image,
                  category: "Bridal Collection",
                })
              }
              aria-label="Wishlist bridal saree"
              className="w-11 h-11 rounded-full border border-[#09492e]/20 flex items-center justify-center text-[#09492e] hover:text-[#b81d56] transition-colors cursor-pointer"
            >
              <Heart
                className="w-4 h-4"
                fill={wished ? "#b81d56" : "none"}
                color={wished ? "#b81d56" : "currentColor"}
              />
            </button>

            <button
              type="button"
              onClick={goNext}
              aria-label="Next bridal saree"
              className="w-11 h-11 rounded-full border border-[#09492e]/20 flex items-center justify-center text-[#09492e] hover:bg-[#09492e] hover:text-white transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

