"use client";

import React, { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Volume2,
  VolumeX,
  X,
  ShoppingBag,
} from "lucide-react";
import { MUSE_REELS, MuseReel } from "@/data/catalog";
import { useStore, formatINR } from "@/context/StoreContext";

export function MuseReelsSection() {
  const [activeIndex, setActiveIndex] = useState(2);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(25);
  const [fullScreenReel, setFullScreenReel] = useState<MuseReel | null>(null);
  const [reelSound, setReelSound] = useState(true);

  const { addToCart } = useStore();

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          setActiveIndex((idx) => (idx + 1) % MUSE_REELS.length);
          return 0;
        }
        return p + 2;
      });
    }, 120);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const goPrev = () => {
    setActiveIndex((prev) => (prev - 1 + MUSE_REELS.length) % MUSE_REELS.length);
    setProgress(0);
  };

  const goNext = () => {
    setActiveIndex((prev) => (prev + 1) % MUSE_REELS.length);
    setProgress(0);
  };

  return (
    <section
      id="muse-reels"
      className="bg-[#fbf8f3] py-20 md:py-28 px-6 md:px-10 border-t border-[#09492e]/10 overflow-hidden"
    >
      <div className="max-w-7xl mx-auto">
        {/* Header + Top-Right Controls */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-14">
          <div>
            <p className="text-xs uppercase tracking-[0.26em] text-[#09492e] font-semibold mb-2">
              The Muse Reels
            </p>
            <h2 className="font-editorial text-4xl sm:text-5xl md:text-6xl font-bold text-[#12231a]">
              Silk, in motion.
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goPrev}
              aria-label="Previous reel"
              className="w-10 h-10 rounded-full bg-white border border-[#09492e]/20 flex items-center justify-center text-[#09492e] hover:bg-[#09492e] hover:text-white transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsPlaying((p) => !p)}
              aria-label={isPlaying ? "Pause reels" : "Play reels"}
              className="w-10 h-10 rounded-full bg-[#09492e] text-[#fbf8f3] flex items-center justify-center hover:bg-[#06321f] transition-colors cursor-pointer"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label="Next reel"
              className="w-10 h-10 rounded-full bg-white border border-[#09492e]/20 flex items-center justify-center text-[#09492e] hover:bg-[#09492e] hover:text-white transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 3D Curved Arc of Vertical Reel Cards */}
        <div className="relative h-[470px] sm:h-[520px] flex items-center justify-center perspective-[1200px]">
          {MUSE_REELS.map((reel, idx) => {
            let offset = idx - activeIndex;
            if (offset > MUSE_REELS.length / 2) offset -= MUSE_REELS.length;
            if (offset < -MUSE_REELS.length / 2) offset += MUSE_REELS.length;

            const abs = Math.abs(offset);
            const isCenter = offset === 0;
            if (abs > 2) return null;

            const translateX = offset * 215;
            const translateZ = -abs * 90;
            const rotateY = -offset * 16;
            const scale = isCenter ? 1 : abs === 1 ? 0.85 : 0.72;
            const opacity = isCenter ? 1 : abs === 1 ? 0.78 : 0.45;

            return (
              <div
                key={reel.id}
                onClick={() =>
                  isCenter ? setFullScreenReel(reel) : setActiveIndex(idx)
                }
                style={{
                  transform: `translateX(${translateX}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
                  opacity,
                  zIndex: 10 - abs,
                }}
                className={`absolute w-[235px] sm:w-[270px] h-[420px] sm:h-[470px] rounded-[28px] overflow-hidden shadow-[0_24px_60px_-15px_rgba(9,73,46,0.35)] transition-all duration-500 cursor-pointer border ${
                  isCenter ? "border-[#c6a253]" : "border-white/25"
                }`}
              >
                <img
                  src={reel.poster}
                  alt={reel.title}
                  className={`w-full h-full object-cover transition-transform duration-[4000ms] ${
                    isCenter && isPlaying ? "scale-110" : "scale-100"
                  }`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#06321f]/90 via-transparent to-[#06321f]/40" />

                {/* Top Metadata */}
                <div className="absolute top-4 left-4 right-4 flex items-center justify-between text-[11px] font-semibold text-[#fbf8f3]">
                  <span className="px-2.5 py-0.5 rounded-full bg-black/40 backdrop-blur-sm border border-white/15">
                    REEL {reel.number} · {reel.duration}
                  </span>
                  <span className="text-[#e2c887]">{reel.fabricType}</span>
                </div>

                {/* Center Play Button */}
                {isCenter && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-14 h-14 rounded-full bg-[#fbf8f3]/90 backdrop-blur-md flex items-center justify-center text-[#09492e] shadow-xl hover:scale-110 transition-transform">
                      <Play className="w-6 h-6 ml-0.5 fill-current" />
                    </div>
                  </div>
                )}

                {/* Bottom Details + Gold Progress Bar */}
                <div className="absolute bottom-4 left-4 right-4">
                  <p className="font-editorial text-xl font-bold text-white leading-tight">
                    {reel.title}
                  </p>
                  <p className="text-xs text-[#e2c887]/90 mt-0.5">{reel.location}</p>

                  {isCenter && (
                    <div className="mt-3 h-1 w-full rounded-full bg-white/25 overflow-hidden">
                      <div
                        style={{ width: `${progress}%` }}
                        className="h-full bg-[#c6a253] transition-all duration-100"
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Full-Screen Reel Player Modal */}
      {fullScreenReel && (
        <div className="fixed inset-0 z-50 bg-[#06321f]/92 backdrop-blur-lg flex items-center justify-center p-4">
          <div className="relative w-full max-w-sm h-[82vh] rounded-[32px] overflow-hidden border border-[#c6a253]/60 shadow-2xl bg-black">
            <img
              src={fullScreenReel.poster}
              alt={fullScreenReel.title}
              className="w-full h-full object-cover animate-pulse"
              style={{ animationDuration: "6s" }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/40" />

            {/* Top Controls */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setReelSound((s) => !s)}
                className="inline-flex items-center gap-1.5 rounded-full bg-black/55 text-white px-3 py-1.5 text-xs cursor-pointer"
              >
                {reelSound ? (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-[#e2c887]" /> Sound On
                  </>
                ) : (
                  <>
                    <VolumeX className="w-3.5 h-3.5" /> Muted
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setFullScreenReel(null)}
                aria-label="Close reel"
                className="w-9 h-9 rounded-full bg-black/55 text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Bottom Shoppable Overlay */}
            <div className="absolute bottom-5 left-5 right-5">
              <span className="text-[10px] uppercase tracking-[0.22em] text-[#e2c887]">
                {fullScreenReel.location} · {fullScreenReel.fabricType}
              </span>
              <h3 className="font-editorial text-2xl font-bold text-white mt-0.5">
                {fullScreenReel.title}
              </h3>

              <button
                type="button"
                onClick={() => {
                  addToCart(
                    {
                      id: fullScreenReel.linkedProductId,
                      name: fullScreenReel.linkedProductName,
                      price: fullScreenReel.linkedProductPrice,
                      image: fullScreenReel.poster,
                      category: "Muse Reel Feature",
                    },
                    true
                  );
                  setFullScreenReel(null);
                }}
                className="mt-4 w-full rounded-full bg-[#09492e] hover:bg-[#0b5a39] border border-[#c6a253] text-white py-3 px-4 text-xs font-semibold flex items-center justify-between cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-[#e2c887]" />
                  Shop {fullScreenReel.linkedProductName}
                </span>
                <span className="text-[#e2c887]">
                  {formatINR(fullScreenReel.linkedProductPrice)}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

