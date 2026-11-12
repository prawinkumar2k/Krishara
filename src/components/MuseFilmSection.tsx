"use client";

import React, { useState, useEffect } from "react";
import { Volume2, VolumeX, ArrowRight } from "lucide-react";

const LEFT_COLUMN_IMAGES = [
  "/images/mood-wedding.jpg",
  "/images/look-ivory.jpg",
  "/images/mood-kanchi.jpg",
  "/images/look-emerald.jpg",
];

const RIGHT_COLUMN_IMAGES = [
  "/images/look-rani.jpg",
  "/images/mood-banarasi.jpg",
  "/images/saree-fold-gold.jpg",
  "/images/mood-wedding.jpg",
];

const FILM_FRAMES = [
  {
    src: "/images/hero-showroom.jpg",
    caption: "Act I · Inside the Kanchipuram Heritage Looms",
  },
  {
    src: "/images/mood-wedding.jpg",
    caption: "Act II · 24K Gold-Dipped Zari & Korvai Craft",
  },
  {
    src: "/images/look-emerald.jpg",
    caption: "Act III · The Krishara Emerald Signature Drape",
  },
];

export function MuseFilmSection() {
  const [soundOn, setSoundOn] = useState(false);
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % FILM_FRAMES.length);
    }, 4200);
    return () => clearInterval(timer);
  }, []);

  return (
    <section
      id="muse-film"
      className="relative bg-white py-20 md:py-28 px-6 md:px-10 border-t border-[#09492e]/10 overflow-hidden"
    >
      <div className="max-w-7xl mx-auto">
        {/* Heading */}
        <div className="text-center mb-12">
          <p className="text-xs uppercase tracking-[0.26em] text-[#09492e] font-semibold mb-2">
            The Muse Film
          </p>
          <h2 className="font-editorial text-5xl sm:text-6xl md:text-7xl font-bold text-heritage-gradient">
            Feel the drape
          </h2>
        </div>

        {/* 3-Column Stage: Left Scrolling Photos + Center 16:9 Film + Right Scrolling Photos */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left Vertical Column */}
          <div className="hidden lg:block lg:col-span-2 relative h-[440px] overflow-hidden">
            <div className="animate-col-up flex flex-col gap-4">
              {[...LEFT_COLUMN_IMAGES, ...LEFT_COLUMN_IMAGES].map((src, i) => (
                <div
                  key={i}
                  className="w-full aspect-[3/4] rounded-2xl overflow-hidden border border-[#c6a253]/25"
                >
                  <img
                    src={src}
                    alt="Krishara lifestyle saree"
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-white to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white to-transparent" />
          </div>

          {/* Center 16:9 Brand Film in Gold Frame with Corner Brackets */}
          <div className="lg:col-span-8 relative p-3">
            {/* Corner Brackets */}
            <span className="absolute top-0 left-0 w-7 h-7 border-t-2 border-l-2 border-[#c6a253]" />
            <span className="absolute top-0 right-0 w-7 h-7 border-t-2 border-r-2 border-[#c6a253]" />
            <span className="absolute bottom-0 left-0 w-7 h-7 border-b-2 border-l-2 border-[#c6a253]" />
            <span className="absolute bottom-0 right-0 w-7 h-7 border-b-2 border-r-2 border-[#c6a253]" />

            <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-[#c6a253]/60 bg-[#06321f] shadow-[0_28px_60px_-15px_rgba(9,73,46,0.3)]">
              {FILM_FRAMES.map((frame, i) => (
                <img
                  key={frame.src}
                  src={frame.src}
                  alt={frame.caption}
                  className={`absolute inset-0 w-full h-full object-cover transition-all duration-1000 ${
                    i === frameIndex
                      ? "opacity-100 scale-105"
                      : "opacity-0 scale-100"
                  }`}
                />
              ))}

              <div className="absolute inset-0 bg-gradient-to-t from-[#06321f]/80 via-transparent to-[#06321f]/30" />

              {/* Sound Pill */}
              <button
                type="button"
                onClick={() => setSoundOn((s) => !s)}
                className="absolute top-4 right-4 inline-flex items-center gap-1.5 rounded-full bg-[#06321f]/75 backdrop-blur-md border border-[#c6a253]/50 text-[#fbf8f3] px-3.5 py-1.5 text-xs font-medium cursor-pointer hover:bg-[#09492e]"
              >
                {soundOn ? (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-[#e2c887]" />
                    Sound on
                  </>
                ) : (
                  <>
                    <VolumeX className="w-3.5 h-3.5 text-[#e2c887]" />
                    Sound off
                  </>
                )}
              </button>

              {/* Film Caption & Progress */}
              <div className="absolute bottom-4 left-5 right-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.25em] text-[#e2c887]">
                    Krishara Brand Film · 2026
                  </p>
                  <p className="font-editorial text-lg sm:text-xl text-white">
                    {FILM_FRAMES[frameIndex].caption}
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  {FILM_FRAMES.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setFrameIndex(idx)}
                      aria-label={`Film act ${idx + 1}`}
                      className={`h-1.5 rounded-full transition-all cursor-pointer ${
                        idx === frameIndex
                          ? "w-7 bg-[#e2c887]"
                          : "w-2 bg-white/40"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Vertical Column */}
          <div className="hidden lg:block lg:col-span-2 relative h-[440px] overflow-hidden">
            <div className="animate-col-down flex flex-col gap-4">
              {[...RIGHT_COLUMN_IMAGES, ...RIGHT_COLUMN_IMAGES].map((src, i) => (
                <div
                  key={i}
                  className="w-full aspect-[3/4] rounded-2xl overflow-hidden border border-[#c6a253]/25"
                >
                  <img
                    src={src}
                    alt="Krishara editorial saree"
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-white to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white to-transparent" />
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-10 flex justify-center">
          <a
            href="#the-rack"
            className="inline-flex items-center gap-2.5 rounded-full bg-[#09492e] hover:bg-[#06321f] text-[#fbf8f3] px-8 py-4 text-sm font-semibold tracking-wide shadow-lg transition-all hover:-translate-y-0.5"
          >
            Purchase the Collection
            <ArrowRight className="w-4 h-4 text-[#e2c887]" />
          </a>
        </div>
      </div>
    </section>
  );
}

