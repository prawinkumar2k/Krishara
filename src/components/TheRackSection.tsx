"use client";

import React, { useState, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  X,
  CheckCircle2,
  MapPin,
} from "lucide-react";
import { RACK_PRODUCTS, RackCategory, RackProduct } from "@/data/catalog";
import { useStore, formatINR } from "@/context/StoreContext";

const CATEGORIES: RackCategory[] = [
  "All pieces",
  "Silk Sarees",
  "Half Sarees",
  "Blouses",
  "Checked Sarees",
  "Zari & Brocade",
];

export function TheRackSection() {
  const [selectedCategory, setSelectedCategory] =
    useState<RackCategory>("All pieces");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [activeProduct, setActiveProduct] = useState<RackProduct | null>(null);
  const [viewSide, setViewSide] = useState<"Front" | "Back">("Front");
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [showAvailability, setShowAvailability] = useState(false);

  const { addToCart, toggleWishlist, isWishlisted, showToast } = useStore();

  const filteredProducts = useMemo(() => {
    if (selectedCategory === "All pieces") return RACK_PRODUCTS;
    return RACK_PRODUCTS.filter((p) => p.category === selectedCategory);
  }, [selectedCategory]);

  const getCategoryCount = (cat: RackCategory) =>
    cat === "All pieces"
      ? RACK_PRODUCTS.length
      : RACK_PRODUCTS.filter((p) => p.category === cat).length;

  const openDetail = (product: RackProduct) => {
    setActiveProduct(product);
    setViewSide("Front");
    setSelectedSize(null);
    setShowAvailability(false);
  };

  const cycleDetail = (dir: -1 | 1) => {
    if (!activeProduct) return;
    const idx = filteredProducts.findIndex((p) => p.id === activeProduct.id);
    const nextIdx =
      (idx + dir + filteredProducts.length) % filteredProducts.length;
    openDetail(filteredProducts[nextIdx]);
  };

  const handleAddActive = () => {
    if (!activeProduct) return;
    if (!selectedSize) {
      showToast("Please select a size (34–42) first");
      return;
    }
    addToCart(
      {
        id: activeProduct.id,
        name: activeProduct.name,
        price: activeProduct.price,
        image: activeProduct.frontImage,
        category: activeProduct.category,
        size: selectedSize,
      },
      true
    );
  };

  return (
    <section
      id="the-rack"
      className="relative bg-white py-20 md:py-28 px-6 md:px-10 border-t border-[#09492e]/10 overflow-hidden"
    >
      <div className="max-w-7xl mx-auto">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-xs uppercase tracking-[0.26em] text-[#c6a253] font-semibold mb-2">
              Explore the collection · {filteredProducts.length} pieces
            </p>
            <h2 className="font-editorial text-4xl sm:text-5xl md:text-6xl font-bold text-[#12231a]">
              Every silk, on the rail.
            </h2>
          </div>

          <span className="text-xs uppercase tracking-[0.18em] text-[#09492e]/55">
            Curated heritage studio imagery
          </span>
        </div>

        {/* Filter Chips */}
        <div className="flex flex-wrap items-center gap-2.5 mb-12">
          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-full px-4 py-2 text-xs font-semibold tracking-wide transition-all cursor-pointer border ${
                  active
                    ? "bg-[#09492e] text-[#fbf8f3] border-[#09492e] shadow-sm"
                    : "bg-[#fbf8f3] text-[#09492e] border-[#09492e]/15 hover:border-[#c6a253]"
                }`}
              >
                {cat}{" "}
                <span className={active ? "text-[#e2c887]" : "text-[#09492e]/55"}>
                  ({getCategoryCount(cat)})
                </span>
              </button>
            );
          })}
        </div>

        {/* Clothes Rail Stage (Blurred when detail modal is open) */}
        <div
          className={`relative pt-8 pb-12 transition-all duration-500 ${
            activeProduct ? "blur-md opacity-40 scale-[0.98]" : ""
          }`}
        >
          {/* Chrome Rod */}
          <div className="relative h-3 w-full rounded-full bg-gradient-to-b from-slate-200 via-slate-400 to-slate-200 shadow-[0_6px_14px_rgba(0,0,0,0.18)] border border-slate-300" />

          {/* Hanging Products */}
          <div className="flex items-start justify-start lg:justify-center gap-5 md:gap-7 overflow-x-auto no-scrollbar pt-0 pb-6 px-4 -mt-1">
            {filteredProducts.map((product) => {
              const isHovered = hoveredId === product.id;
              return (
                <button
                  key={product.id}
                  type="button"
                  onMouseEnter={() => setHoveredId(product.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => openDetail(product)}
                  className={`group relative flex flex-col items-center shrink-0 transition-all duration-300 cursor-pointer focus:outline-none ${
                    isHovered ? "scale-105 z-20 -translate-y-1" : "z-10"
                  }`}
                >
                  {/* Wooden Hanger Hook & Shoulder */}
                  <div className="flex flex-col items-center">
                    <div className="w-2.5 h-5 border-2 border-slate-400 rounded-t-full border-b-0 -mb-0.5" />
                    <svg width="96" height="24" viewBox="0 0 96 24" fill="none">
                      <path
                        d="M48 2L8 20C5.5 21 6.5 23 9 23H87C89.5 23 90.5 21 88 20L48 2Z"
                        fill="#7C4D2B"
                        stroke="#5C351B"
                        strokeWidth="1.5"
                      />
                    </svg>
                  </div>

                  {/* Garment Card Hanging */}
                  <div className="w-[128px] sm:w-[144px] h-[220px] rounded-xl overflow-hidden bg-[#fbf8f3] border border-[#c6a253]/35 shadow-md group-hover:shadow-[0_20px_40px_-10px_rgba(9,73,46,0.3)] transition-all">
                    <img
                      src={product.frontImage}
                      alt={product.name}
                      className="w-full h-full object-cover object-top"
                    />
                  </div>

                  {/* Hover Label Below Rail */}
                  <div
                    className={`mt-3 text-center transition-all duration-200 ${
                      isHovered
                        ? "opacity-100 translate-y-0"
                        : "opacity-70 sm:opacity-0 sm:translate-y-1"
                    }`}
                  >
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#09492e] max-w-[140px] truncate">
                      {product.name}
                    </p>
                    <p className="text-xs font-semibold text-[#c6a253]">
                      {formatINR(product.price)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Section 6: Rack Detail Overlay (Lifted Hanger) */}
      {activeProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#06321f]/55 backdrop-blur-md p-4">
          <div className="relative w-full max-w-4xl rounded-3xl bg-[#fbf8f3] border border-[#c6a253]/45 shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setActiveProduct(null)}
              className="absolute top-4 right-4 z-20 inline-flex items-center gap-1 rounded-full bg-white/90 hover:bg-white text-[#09492e] px-3.5 py-1.5 text-xs font-semibold shadow cursor-pointer"
            >
              Close <X className="w-3.5 h-3.5" />
            </button>

            {/* Left: Lifted Hanger Image + Front/Back + Prev/Next */}
            <div className="md:col-span-6 bg-white p-6 flex flex-col items-center justify-center relative">
              {/* Prev / Next Arrows */}
              <button
                type="button"
                onClick={() => cycleDetail(-1)}
                aria-label="Previous hanger"
                className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-[#fbf8f3] border border-[#09492e]/15 flex items-center justify-center text-[#09492e] hover:bg-[#09492e] hover:text-white cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => cycleDetail(1)}
                aria-label="Next hanger"
                className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-[#fbf8f3] border border-[#09492e]/15 flex items-center justify-center text-[#09492e] hover:bg-[#09492e] hover:text-white cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {/* Hanger Visual */}
              <svg width="110" height="24" viewBox="0 0 96 24" fill="none" className="-mb-1">
                <path
                  d="M48 2L8 20C5.5 21 6.5 23 9 23H87C89.5 23 90.5 21 88 20L48 2Z"
                  fill="#7C4D2B"
                />
              </svg>
              <div className="w-[240px] sm:w-[270px] h-[340px] rounded-2xl overflow-hidden border border-[#c6a253]/30 shadow-lg bg-[#fbf8f3]">
                <img
                  src={
                    viewSide === "Front"
                      ? activeProduct.frontImage
                      : activeProduct.backImage
                  }
                  alt={activeProduct.name}
                  className="w-full h-full object-cover object-top"
                />
              </div>

              {/* Front / Back Toggle */}
              <div className="mt-4 inline-flex rounded-full bg-[#fbf8f3] p-1 border border-[#09492e]/15">
                {(["Front", "Back"] as const).map((side) => (
                  <button
                    key={side}
                    type="button"
                    onClick={() => setViewSide(side)}
                    className={`px-4 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      viewSide === side
                        ? "bg-[#09492e] text-white"
                        : "text-[#09492e]/70 hover:text-[#09492e]"
                    }`}
                  >
                    {side}
                  </button>
                ))}
              </div>
            </div>

            {/* Right: Product Info, Size 34-42, Availability */}
            <div className="md:col-span-6 p-7 md:p-8 flex flex-col justify-between">
              <div>
                <span className="text-[11px] uppercase tracking-[0.22em] text-[#c6a253] font-semibold">
                  {activeProduct.category}
                </span>
                <h3 className="mt-1 font-editorial text-2xl sm:text-3xl font-bold uppercase tracking-[0.08em] text-[#09492e]">
                  {activeProduct.name}
                </h3>
                <p className="mt-2 text-2xl font-bold text-[#12231a]">
                  {formatINR(activeProduct.price)}
                </p>
                <p className="mt-2 text-xs text-[#09492e]/75 leading-relaxed">
                  {activeProduct.fabric}
                </p>

                {/* Size Chips 34-42 */}
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#09492e]">
                      Blouse / Drape Size
                    </span>
                    <span className="text-[11px] text-[#09492e]/60">
                      {selectedSize ? `Selected: ${selectedSize}` : "Choose 34–42"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {activeProduct.sizes.map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setSelectedSize(size)}
                        className={`w-11 h-10 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          selectedSize === size
                            ? "bg-[#09492e] text-white border-[#09492e]"
                            : "bg-white text-[#09492e] border-[#09492e]/20 hover:border-[#c6a253]"
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Availability Link & Panel */}
                <div className="mt-5">
                  <button
                    type="button"
                    onClick={() => setShowAvailability((v) => !v)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#09492e] underline underline-offset-4 hover:text-[#b81d56] cursor-pointer"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    See availability
                  </button>

                  {showAvailability && (
                    <div className="mt-2.5 rounded-xl bg-white p-3 border border-[#09492e]/15 space-y-1.5">
                      {activeProduct.inStockAt.map((loc) => (
                        <div
                          key={loc}
                          className="flex items-center gap-2 text-xs text-[#09492e]"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#09492e]" />
                          <span>In stock · {loc}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Row */}
              <div className="mt-8 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleAddActive}
                  className="flex-1 rounded-full bg-[#09492e] hover:bg-[#06321f] text-[#fbf8f3] font-semibold text-sm py-3.5 px-6 shadow-md transition-all cursor-pointer"
                >
                  {selectedSize ? `Add to Bag · Size ${selectedSize}` : "Select a size"}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    toggleWishlist({
                      id: activeProduct.id,
                      name: activeProduct.name,
                      price: activeProduct.price,
                      image: activeProduct.frontImage,
                      category: activeProduct.category,
                    })
                  }
                  aria-label="Wishlist item"
                  className="w-12 h-12 rounded-full bg-white border border-[#09492e]/20 flex items-center justify-center text-[#09492e] hover:text-[#b81d56] cursor-pointer"
                >
                  <Heart
                    className="w-5 h-5"
                    fill={isWishlisted(activeProduct.id) ? "#b81d56" : "none"}
                    color={
                      isWishlisted(activeProduct.id) ? "#b81d56" : "currentColor"
                    }
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

