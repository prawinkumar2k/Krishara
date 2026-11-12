"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";

export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const list = images.length ? images : ["/images/saree-fold-gold.jpg"];
  const [i, setI] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);

  return (
    <div className="grid gap-3 lg:grid-cols-[84px_1fr]">
      <div className="order-2 flex gap-2 overflow-x-auto lg:order-1 lg:flex-col [scrollbar-width:none]">
        {list.map((src, idx) => (
          <button
            key={src + idx} type="button" onClick={() => setI(idx)} aria-label={`View image ${idx + 1}`} aria-current={i === idx}
            className={`h-20 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition-all cursor-pointer lg:h-24 lg:w-full ${i === idx ? "border-[#09492e]" : "border-transparent opacity-60 hover:opacity-100"}`}
          >
            <Image src={src} alt="" width={96} height={128} unoptimized={!src.startsWith("/")} className="h-full w-full object-cover" />
          </button>
        ))}
      </div>
      <div
        className="relative order-1 aspect-[4/5] overflow-hidden rounded-3xl border border-[#09492e]/10 bg-[#efe9dd] lg:order-2 lg:cursor-zoom-in"
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
        }}
        onMouseLeave={() => setZoom(null)}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={list[i]}
            initial={{ opacity: 0, scale: 1.03 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}
            className="absolute inset-0"
            drag={list.length > 1 ? "x" : false} dragConstraints={{ left: 0, right: 0 }} dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.x < -60) setI((n) => Math.min(list.length - 1, n + 1));
              if (info.offset.x > 60) setI((n) => Math.max(0, n - 1));
            }}
          >
            <Image
              src={list[i]} alt={`${name} — view ${i + 1}`} fill priority unoptimized={!list[i].startsWith("/")}
              sizes="(min-width:1024px) 45vw, 100vw" draggable={false}
              className="object-cover transition-transform duration-200"
              style={zoom ? { transform: "scale(1.9)", transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
            />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
