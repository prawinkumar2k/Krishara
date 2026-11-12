"use client";

import React, { useState } from "react";
import { Heart, Plus } from "lucide-react";
import { PICK_A_SILK_CARDS, SilkCardItem } from "@/data/catalog";
import { useStore, formatINR } from "@/context/StoreContext";

function TiltSilkCard({
  card,
  index,
  total,
}: {
  card: SilkCardItem;
  index: number;
  total: number;
}) {
  const { addToCart, toggleWishlist, isWishlisted } = useStore();
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, scale: 1 });

  const mid = (total - 1) / 2;
  const offset = index - mid;
  const baseRotate = offset * 4.5;
  const baseTranslateY = Math.abs(offset) * 14;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({
      rx: -y * 14,
      ry: x * 14,
      scale: 1.04,
    });
  };

  const handleMouseLeave = () => {
    setTilt({ rx: 0, ry: 0, scale: 1 });
  };

  const wished = isWishlisted(card.id);

  return (
    <div
      style={{
        transform: `translateY(${baseTranslateY}px) rotate(${baseRotate}deg) perspective(900px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) scale(${tilt.scale})`,
        backgroundColor: card.bgHex,
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseDown={() => setTilt((t) => ({ ...t, scale: 0.96 }))}
      onMouseUp={() => setTilt((t) => ({ ...t, scale: 1.04 }))}
      className="relative w-[220px] sm:w-[240px] h-[360px] sm:h-[395px] rounded-[28px] overflow-hidden shadow-[0_24px_48px_-14px_rgba(9,73,46,0.35)] transition-transform duration-200 ease-out shrink-0 select-none border border-white/20"
    >
      {/* Huge Condensed Title Behind Model */}
      <div
        style={{ color: card.textHex }}
        className="absolute inset-x-3 top-10 text-center font-condensed text-4xl sm:text-5xl font-bold uppercase leading-[0.88] tracking-tight opacity-90 pointer-events-none"
      >
        {card.title}
      </div>

      {/* Model Image in Front with Soft Shadow */}
      <div className="absolute inset-x-4 bottom-0 top-16 flex items-end justify-center pointer-events-none">
        <img
          src={card.image}
          alt={card.title}
          className="w-full h-full object-cover object-top rounded-t-2xl drop-shadow-[0_12px_24px_rgba(0,0,0,0.45)]"
        />
      </div>

      {/* Top Right Heart */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          toggleWishlist({
            id: card.id,
            name: card.title,
            price: card.price,
            image: card.image,
            category: card.category,
          });
        }}
        aria-label={`Wishlist ${card.title}`}
        className="absolute top-3.5 right-3.5 z-20 w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-[#09492e] hover:text-[#b81d56] shadow-md transition-transform hover:scale-110 cursor-pointer"
      >
        <Heart
          className="w-4 h-4"
          fill={wished ? "#b81d56" : "none"}
          color={wished ? "#b81d56" : "currentColor"}
        />
      </button>

      {/* Bottom Bar: Price Left + Plus Button Right */}
      <div className="absolute inset-x-0 bottom-0 z-20 p-3.5 bg-gradient-to-t from-black/75 via-black/35 to-transparent flex items-end justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-white/80">
            {card.subtitle}
          </p>
          <p className="text-base font-bold text-white">{formatINR(card.price)}</p>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            addToCart({
              id: card.id,
              name: card.title,
              price: card.price,
              image: card.image,
              category: card.category,
            });
          }}
          aria-label={`Add ${card.title} to bag`}
          className="w-10 h-10 rounded-full bg-[#12231a] hover:bg-[#09492e] text-white flex items-center justify-center shadow-lg transition-transform hover:scale-110 cursor-pointer border border-[#c6a253]/50"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export function PickASilkSection() {
  return (
    <section
      id="pick-a-silk"
      className="bg-[#fbf8f3] py-20 md:py-28 px-6 md:px-10 border-t border-[#09492e]/10 overflow-hidden"
    >
      <div className="max-w-7xl mx-auto text-center">
        <p className="text-xs uppercase tracking-[0.26em] text-[#09492e] font-semibold mb-2">
          Tactile Color Stories
        </p>
        <h2 className="font-editorial text-4xl sm:text-5xl md:text-6xl font-bold text-[#12231a]">
          Pick a Silk
        </h2>
        <p className="mt-2 text-sm text-[#09492e]/70 italic font-editorial text-lg">
          Tilt a card, press it, poke the silk.
        </p>

        {/* Fanned Arc of Silk Cards */}
        <div className="mt-14 pb-10 flex items-center justify-start lg:justify-center gap-4 md:gap-5 overflow-x-auto no-scrollbar px-4 pt-4">
          {PICK_A_SILK_CARDS.map((card, index) => (
            <TiltSilkCard
              key={card.id}
              card={card}
              index={index}
              total={PICK_A_SILK_CARDS.length}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

