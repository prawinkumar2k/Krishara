"use client";

import { motion } from "motion/react";
import { Check, Package, PackageCheck, Truck, Home, XCircle, Clock } from "lucide-react";

const STEPS = [
  { key: "confirmed", label: "Confirmed", icon: Check },
  { key: "packed", label: "Packed", icon: Package },
  { key: "shipped", label: "Shipped", icon: Truck },
  { key: "delivered", label: "Delivered", icon: Home },
] as const;

export function OrderStatusTimeline({ status }: { status: string }) {
  if (status === "cancelled" || status === "refunded")
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-[#b81d56]/30 bg-[#b81d56]/5 p-4 text-sm font-semibold text-[#b81d56]">
        <XCircle className="h-5 w-5" /> Order {status}
      </div>
    );
  if (status === "pending")
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-[#c6a253]/40 bg-[#c6a253]/10 p-4 text-sm font-semibold text-[#7a5c14]">
        <Clock className="h-5 w-5 animate-pulse" /> Processing — waiting for payment confirmation
      </div>
    );

  const current = Math.max(0, STEPS.findIndex((s) => s.key === status));
  return (
    <ol className="relative grid grid-cols-4 gap-2">
      <div className="absolute left-[12.5%] right-[12.5%] top-5 h-0.5 bg-[#09492e]/15" />
      <motion.div className="absolute left-[12.5%] top-5 h-0.5 bg-[#09492e]" initial={{ width: 0 }} animate={{ width: `${(current / (STEPS.length - 1)) * 75}%` }} transition={{ duration: 0.9, ease: "easeOut" }} />
      {STEPS.map((s, i) => {
        const done = i <= current;
        const Icon = s.icon === Check && i < current ? PackageCheck : s.icon;
        return (
          <li key={s.key} className="relative flex flex-col items-center text-center">
            <motion.span
              initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: i * 0.12 }}
              className={`z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 ${done ? "border-[#09492e] bg-[#09492e] text-[#e2c887]" : "border-[#09492e]/20 bg-white text-[#09492e]/40"}`}
            >
              <Icon className="h-4 w-4" />
            </motion.span>
            <span className={`mt-2 text-[11px] font-semibold ${done ? "text-[#09492e]" : "text-[#12231a]/40"}`}>{s.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function SuccessBurst() {
  return (
    <div className="relative mx-auto flex h-24 w-24 items-center justify-center">
      {Array.from({ length: 12 }).map((_, i) => (
        <motion.span
          key={i} className="absolute h-2 w-2 rounded-full bg-[#c6a253]"
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{ x: Math.cos((i / 12) * Math.PI * 2) * 60, y: Math.sin((i / 12) * Math.PI * 2) * 60, opacity: 0, scale: 0.4 }}
          transition={{ duration: 0.9, delay: 0.35, ease: "easeOut" }}
        />
      ))}
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 16 }} className="flex h-20 w-20 items-center justify-center rounded-full bg-[#09492e]">
        <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="#e2c887" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.25, duration: 0.5 }} />
        </svg>
      </motion.div>
    </div>
  );
}
