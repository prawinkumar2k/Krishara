"use client";

import React from "react";
import { MOODS } from "@/data/catalog";

export function SixMoodsSection() {
  return (
    <section id="archive" className="bg-white py-20 md:py-28 px-6 md:px-10">
      <div className="max-w-7xl mx-auto">
        {/* Header Row */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14">
          <div>
            <p className="text-xs uppercase tracking-[0.26em] text-[#09492e] font-semibold mb-2">
              The KRISHARA Archive
            </p>
            <h2 className="font-editorial text-4xl sm:text-5xl md:text-6xl font-bold text-[#12231a] leading-tight">
              Six Moods.{" "}
              <span className="text-heritage-gradient italic font-semibold">
                Timeless Drapes
              </span>
            </h2>
          </div>

          <p className="font-editorial italic text-lg md:text-xl text-[#09492e]/80 md:text-right">
            &ldquo;Woven by hand, worn for a lifetime.&rdquo;
          </p>
        </div>

        {/* Six Gopuram Temple-Arch Windows */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-5 md:gap-6">
          {MOODS.map((mood) => (
            <a
              key={mood.id}
              href={mood.targetSection}
              className="group flex flex-col items-center text-center"
            >
              {/* Finial (Kalasam) on top of Gopuram Arch */}
              <div className="flex flex-col items-center -mb-[1px] transition-transform duration-500 group-hover:-translate-y-1.5">
                <svg
                  width="26"
                  height="18"
                  viewBox="0 0 26 18"
                  fill="none"
                  className="text-[#c6a253] drop-shadow-sm"
                >
                  <path
                    d="M13 1C13 4 16 6.5 16 9.5C16 11.2 14.7 12.5 13 12.5C11.3 12.5 10 11.2 10 9.5C10 6.5 13 4 13 1Z"
                    fill="currentColor"
                  />
                  <path
                    d="M4 17C7 14 10 13 13 13C16 13 19 14 22 17"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              {/* Temple Arch Frame */}
              <div className="relative w-full aspect-[3/4.3] rounded-t-[999px] rounded-b-xl p-[3px] bg-gradient-to-b from-[#c6a253] via-[#e2c887]/70 to-[#09492e]/40 shadow-sm transition-all duration-500 group-hover:-translate-y-2 group-hover:shadow-[0_18px_36px_-10px_rgba(198,162,83,0.45)]">
                <div className="w-full h-full rounded-t-[999px] rounded-b-[10px] overflow-hidden bg-[#fbf8f3] relative">
                  <img
                    src={mood.image}
                    alt={mood.label}
                    className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#06321f]/55 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-3 px-2">
                    <span className="text-[10px] uppercase tracking-[0.18em] text-[#fbf8f3] font-medium">
                      {mood.subtitle}
                    </span>
                  </div>
                </div>
              </div>

              {/* Spaced Capitals Label */}
              <span className="mt-3.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#09492e] group-hover:text-[#b81d56] transition-colors">
                {mood.label}
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

