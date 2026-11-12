"use client";

import { motion } from "motion/react";
import { formatINR } from "@/lib/format";

export function SalesChart({ data }: { data: { day: string; revenue: number; orders: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.revenue));
  return (
    <div>
      <div className="flex h-44 items-end gap-1.5 sm:gap-2" role="img" aria-label="Revenue for the last 14 days">
        {data.map((d, i) => (
          <div key={d.day} className="group relative flex h-full flex-1 flex-col justify-end">
            <motion.div
              initial={{ height: 0 }} animate={{ height: `${Math.max(3, (d.revenue / max) * 100)}%` }} transition={{ duration: 0.7, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-t-md bg-gradient-to-t from-[#09492e] to-[#c6a253]"
            />
            <div className="pointer-events-none absolute -top-10 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-[#12231a] px-2.5 py-1.5 text-[11px] text-white group-hover:block">
              {d.day}: {formatINR(d.revenue)} · {d.orders} order{d.orders === 1 ? "" : "s"}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-1.5 sm:gap-2 text-[9px] text-[#12231a]/45">
        {data.map((d) => <span key={d.day} className="flex-1 text-center">{d.day.slice(8)}</span>)}
      </div>
    </div>
  );
}

export function Kpi({ label, value, sub, i = 0 }: { label: string; value: string; sub?: string; i?: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} className="rounded-2xl border border-[#09492e]/10 bg-white p-5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#12231a]/55">{label}</p>
      <p className="mt-1 text-2xl font-bold text-[#09492e] sm:text-3xl">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-[#12231a]/50">{sub}</p>}
    </motion.div>
  );
}
