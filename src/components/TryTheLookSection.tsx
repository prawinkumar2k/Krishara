"use client";

import React, { useState, useRef } from "react";
import { ChevronLeft, ChevronRight, Heart, Plus, Sparkles } from "lucide-react";
import { STYLED_LOOKS } from "@/data/catalog";
import { useStore, formatINR } from "@/context/StoreContext";

export function TryTheLookSection() {
  const [activeIndex, setActiveIndex] = useState(1);
  const { addToCart, addBundleToCart, toggleWishlist, isWishlisted } = useStore();
  const dragStartX = useRef<number | null>(null);

  const currentLook = STYLED_LOOKS[activeIndex];
  const rawTotal = currentLook.pieces.reduce((sum, p) => sum + p.price, 0);
  const bundlePrice = Math.round(rawTotal * 0.9);

  const goPrev = () =>
    setActiveIndex((prev) => (prev - 1 + STYLED_LOOKS.length) % STYLED_LOOKS.length);
  const goNext = () =>
    setActiveIndex((prev) => (prev + 1) % STYLED_LOOKS.length);

  const handlePointerDown = (e: React.PointerEvent) => {
    dragStartX.current = e.clientX;
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragStartX.current === null) return;
    const diff = e.clientX - dragStartX.current;
    if (diff > 45) goPrev();
    else if (diff < -45) goNext();
    dragStartX.current = null;
  };

  return (
    <section
      id="try-the-look"
      className="bg-white py-20 md:py-28 px-6 md:px-10 border-t border-[#09492e]/10 overflow-hidden"
    >
      <div className="max-w-7xl mx-auto">
        {/* Heading */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
          <div>
            <p className="text-xs uppercase tracking-[0.26em] text-[#c6a253] font-semibold mb-2">
              Curated Styling Stage
            </p>
            <h2 className="font-editorial text-4xl sm:text-5xl md:text-6xl font-bold text-[#12231a]">
              Try the Look.
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs uppercase tracking-[0.2em] text-[#09492e]/60 hidden md:inline">
              Scroll or drag
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={goPrev}
                aria-label="Previous look"
                className="w-10 h-10 rounded-full border border-[#09492e]/25 flex items-center justify-center text-[#09492e] hover:bg-[#09492e] hover:text-white transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={goNext}
                aria-label="Next look"
                className="w-10 h-10 rounded-full border border-[#09492e]/25 flex items-center justify-center text-[#09492e] hover:bg-[#09492e] hover:text-white transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Main Stage Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left: Drag/Scroll Model Carousel */}
          <div
            className="lg:col-span-7 relative h-[480px] sm:h-[560px] flex items-center justify-center select-none cursor-grab active:cursor-grabbing"
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
          >
            {STYLED_LOOKS.map((look, idx) => {
              let offset = idx - activeIndex;
              if (offset > STYLED_LOOKS.length / 2) offset -= STYLED_LOOKS.length;
              if (offset < -STYLED_LOOKS.length / 2) offset += STYLED_LOOKS.length;

              const abs = Math.abs(offset);
              const isCenter = offset === 0;
              if (abs > 2) return null;

              const translateX = offset * 170;
              const scale = isCenter ? 1 : abs === 1 ? 0.78 : 0.6;
              const opacity = isCenter ? 1 : abs === 1 ? 0.45 : 0.18;
              const blur = isCenter ? "blur(0px)" : abs === 1 ? "blur(3px)" : "blur(6px)";

              return (
                <div
                  key={look.id}
                  onClick={() => setActiveIndex(idx)}
                  style={{
                    transform: `translateX(${translateX}px) scale(${scale})`,
                    opacity,
                    filter: blur,
                    zIndex: 10 - abs,
                  }}
                  className="absolute w-[260px] sm:w-[310px] h-[420px] sm:h-[500px] rounded-2xl overflow-hidden bg-[#fbf8f3] border border-[#c6a253]/30 shadow-[0_24px_60px_-15px_rgba(9,73,46,0.22)] transition-all duration-500 ease-out cursor-pointer"
                >
                  <img
                    src={look.modelImage}
                    alt={look.title}
                    draggable={false}
                    className="w-full h-full object-cover object-top"
                  />
                  {isCenter && (
                    <div className="absolute bottom-3 left-3 right-3 rounded-xl bg-[#fbf8f3]/90 backdrop-blur-md px-3.5 py-2 border border-[#c6a253]/30">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-[#09492e] font-bold">
                        {activeIndex + 1} of {STYLED_LOOKS.length} · {look.title}
                      </p>
                      <p className="text-[11px] text-[#09492e]/70 truncate">
                        {look.weaveNote}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right: "In this look" Panel */}
          <div className="lg:col-span-5 rounded-3xl bg-[#fbf8f3] border border-[#c6a253]/35 p-6 md:p-7 shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#09492e]/10">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-[#c6a253] font-semibold">
                  In this look
                </p>
                <h3 className="font-editorial text-2xl font-bold text-[#09492e]">
                  {currentLook.title}
                </h3>
              </div>
              <span className="text-xs font-medium text-[#09492e]/70 bg-white px-3 py-1 rounded-full border border-[#09492e]/10">
                6 Pieces
              </span>
            </div>

            {/* Pieces List */}
            <div className="space-y-2.5 max-h-[330px] overflow-y-auto pr-1 no-scrollbar">
              {currentLook.pieces.map((piece) => {
                const wished = isWishlisted(piece.id);
                return (
                  <div
                    key={piece.id}
                    className="flex items-center justify-between gap-3 rounded-2xl bg-white p-2.5 border border-[#09492e]/8 hover:border-[#c6a253]/60 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={piece.image}
                        alt={piece.name}
                        className="w-12 h-12 rounded-xl object-cover shrink-0 bg-[#fbf8f3]"
                      />
                      <div className="min-w-0">
                        <span className="text-[10px] uppercase tracking-[0.18em] text-[#c6a253] font-semibold block">
                          {piece.role}
                        </span>
                        <p className="text-xs sm:text-sm font-semibold text-[#12231a] truncate">
                          {piece.name}
                        </p>
                        <p className="text-xs font-medium text-[#09492e]">
                          {formatINR(piece.price)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          toggleWishlist({
                            id: piece.id,
                            name: piece.name,
                            price: piece.price,
                            image: piece.image,
                            category: piece.role,
                          })
                        }
                        aria-label={`Save ${piece.name} to wishlist`}
                        className={`w-8 h-8 rounded-full flex items-center justify-center border transition-colors cursor-pointer ${
                          wished
                            ? "bg-[#b81d56] border-[#b81d56] text-white"
                            : "border-[#09492e]/15 text-[#09492e] hover:border-[#b81d56] hover:text-[#b81d56]"
                        }`}
                      >
                        <Heart className="w-3.5 h-3.5" fill={wished ? "currentColor" : "none"} />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          addToCart({
                            id: piece.id,
                            name: piece.name,
                            price: piece.price,
                            image: piece.image,
                            category: piece.role,
                          })
                        }
                        aria-label={`Add ${piece.name} to bag`}
                        className="w-8 h-8 rounded-full bg-[#09492e] hover:bg-[#06321f] text-white flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bundle Footer */}
            <div className="mt-5 pt-4 border-t border-[#09492e]/10">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-[#b81d56]">
                    <Sparkles className="w-3 h-3" /> Complete Look Bundle · 10% Off
                  </span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-xl font-bold text-[#09492e]">
                      {formatINR(bundlePrice)}
                    </span>
                    <span className="text-xs line-through text-[#09492e]/45">
                      {formatINR(rawTotal)}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  addBundleToCart(
                    currentLook.pieces.map((p) => ({
                      id: p.id,
                      name: p.name,
                      price: p.price,
                      image: p.image,
                      category: p.role,
                    })),
                    currentLook.title
                  )
                }
                className="w-full rounded-full bg-[#09492e] hover:bg-[#06321f] text-[#fbf8f3] font-semibold text-sm py-3.5 px-6 shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                Add full look to bag · {formatINR(bundlePrice)}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

