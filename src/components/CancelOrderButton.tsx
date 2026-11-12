"use client";

import { useState, useTransition } from "react";
import { cancelMyOrder } from "@/app/orders/[number]/actions";

export function CancelOrderButton({ number }: { number: string }) {
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!confirming)
    return <button type="button" onClick={() => setConfirming(true)} className="rounded-full border border-[#b81d56]/40 px-5 py-2.5 text-xs font-semibold text-[#b81d56] hover:bg-[#b81d56]/5 cursor-pointer">Cancel order</button>;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-[#12231a]/70">Cancel this order?</span>
      <button type="button" disabled={pending} onClick={() => start(async () => { const r = await cancelMyOrder(number); if (r?.error) setError(r.error); })} className="rounded-full bg-[#b81d56] px-4 py-2 text-xs font-semibold text-white disabled:opacity-60 cursor-pointer">{pending ? "Cancelling…" : "Yes, cancel"}</button>
      <button type="button" onClick={() => setConfirming(false)} className="rounded-full border border-[#09492e]/20 px-4 py-2 text-xs font-semibold text-[#09492e] cursor-pointer">Keep it</button>
      {error && <p role="alert" className="w-full text-xs text-[#b81d56]">{error}</p>}
    </div>
  );
}
