"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, BadgeCheck, Banknote, CreditCard, Loader2, Lock, MapPin, Tag, X } from "lucide-react";
import { useStore } from "@/context/StoreContext";
import { formatINR } from "@/lib/format";

type Addr = { id: string; fullName: string; phone: string; line1: string; line2: string | null; city: string; state: string; pincode: string };
type Quote = {
  lines: { variantId: string; name: string; variantLabel: string; image: string | null; unitPrice: number; quantity: number; lineTotal: number }[];
  subtotal: number; discount: number; shipping: number; taxIncluded: number; total: number;
  coupon: { code: string; description: string } | null; couponError?: string; codAllowed: boolean; problems: string[]; onlineAvailable: boolean;
};
type CheckoutResponse = {
  error?: string; details?: string[]; orderNumber?: string; paymentMethod?: "cod" | "razorpay";
  payment?: { razorpayOrderId: string; keyId: string | null; amountPaise: number; simulated: boolean };
};

const STATES = ["Andhra Pradesh","Karnataka","Kerala","Tamil Nadu","Telangana","Puducherry","Maharashtra","Gujarat","Delhi","Uttar Pradesh","West Bengal","Rajasthan","Madhya Pradesh","Punjab","Haryana","Bihar","Odisha","Assam","Other"];

const field = "w-full rounded-xl border border-[#09492e]/20 bg-white px-4 py-3 text-base sm:text-sm text-[#12231a] outline-none transition focus:border-[#09492e] focus:ring-2 focus:ring-[#09492e]/15";
const label = "mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[#09492e]";

/** Topics 12+13 on the client: retry network errors / 5xx with backoff+jitter. SAME idempotency key every time. */
async function postWithRetry(url: string, body: unknown, idemKey: string): Promise<{ status: number; data: CheckoutResponse }> {
  let last: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": idemKey }, body: JSON.stringify(body) });
      const data = (await res.json().catch(() => ({}))) as CheckoutResponse;
      if (res.status < 500 || attempt === 3) return { status: res.status, data };
    } catch (e) {
      last = e;
      if (attempt === 3) throw last;
    }
    const ceiling = 600 * 2 ** (attempt - 1);
    await new Promise((r) => setTimeout(r, ceiling / 2 + Math.random() * (ceiling / 2)));
  }
  throw last;
}

declare global {
  interface Window { Razorpay?: new (o: Record<string, unknown>) => { open: () => void; on: (e: string, cb: () => void) => void } }
}

export function CheckoutClient({ user, addresses, defaultCoupon }: { user: { name: string; email: string; phone: string | null }; addresses: Addr[]; defaultCoupon?: string }) {
  const { cart, clearCart } = useStore();
  const router = useRouter();
  const first = addresses[0];

  const [form, setForm] = useState({
    fullName: first?.fullName ?? user.name, phone: first?.phone ?? user.phone ?? "", line1: first?.line1 ?? "",
    line2: first?.line2 ?? "", city: first?.city ?? "", state: first?.state ?? "Tamil Nadu", pincode: first?.pincode ?? "",
  });
  const [saveAddress, setSaveAddress] = useState(addresses.length === 0);
  const [method, setMethod] = useState<"razorpay" | "cod">("razorpay");
  const [couponInput, setCouponInput] = useState(defaultCoupon ?? "");
  const [coupon, setCoupon] = useState<string | null>(defaultCoupon ?? null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [simModal, setSimModal] = useState<{ orderNumber: string; razorpayOrderId: string } | null>(null);

  const items = useMemo(() => cart.map((c) => ({ id: c.id, size: c.size, quantity: c.quantity })), [cart]);
  const itemsKey = JSON.stringify(items);

  // Live quote from the server (the only place prices are computed).
  useEffect(() => {
    if (items.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoadingQuote(false);
      return;
    }
    setLoadingQuote(true);
    const ac = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch("/api/quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items, coupon }), signal: ac.signal });
        if (res.ok) {
          const q = (await res.json()) as Quote;
          setQuote(q);
          if (q.onlineAvailable === false) setMethod("cod");
          else if (!q.codAllowed) setMethod("razorpay");
        }
      } catch { /* aborted */ } finally { setLoadingQuote(false); }
    }, 200);
    return () => { clearTimeout(t); ac.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsKey, coupon]);

  // One idempotency key per distinct checkout payload.
  const keyRef = useRef<{ sig: string; key: string } | null>(null);
  const keyFor = (payload: unknown) => {
    const sig = JSON.stringify(payload);
    if (keyRef.current?.sig !== sig) keyRef.current = { sig, key: crypto.randomUUID() };
    return keyRef.current.key;
  };

  const finish = (orderNumber: string, query = "placed=1") => {
    clearCart();
    router.push(`/orders/${orderNumber}?${query}`);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !quote) return;
    setError(null);
    if (quote.problems.length) { setError(quote.problems[0]); return; }
    setSubmitting(true);
    const payload = { items, address: { ...form, line2: form.line2 || null }, paymentMethod: method, coupon: quote.coupon?.code ?? null, saveAddress };
    try {
      const { status, data } = await postWithRetry("/api/checkout", payload, keyFor(payload));
      if (status >= 400 || !data.orderNumber) {
        setError(data.details?.[0] ?? data.error ?? "Could not place your order.");
        keyRef.current = null; // definitive failure → next attempt gets a fresh key
        setSubmitting(false);
        return;
      }
      if (data.paymentMethod === "cod") return finish(data.orderNumber);

      const pay = data.payment!;
      if (pay.simulated) {
        setSimModal({ orderNumber: data.orderNumber, razorpayOrderId: pay.razorpayOrderId });
        setSubmitting(false);
        return;
      }
      await openRazorpay(data.orderNumber, pay);
    } catch {
      setError("Network problem — your order was not duplicated. Please tap Pay again.");
      setSubmitting(false);
    }
  };

  const openRazorpay = async (orderNumber: string, pay: NonNullable<CheckoutResponse["payment"]>) => {
    if (!window.Razorpay) {
      await new Promise<void>((resolve, reject) => {
        const s = document.createElement("script");
        s.src = "https://checkout.razorpay.com/v1/checkout.js";
        s.onload = () => resolve();
        s.onerror = () => reject(new Error("script"));
        document.body.appendChild(s);
      });
    }
    const rzp = new window.Razorpay!({
      key: pay.keyId, amount: pay.amountPaise, currency: "INR", name: "Krishara", description: `Order ${orderNumber}`, order_id: pay.razorpayOrderId,
      prefill: { name: form.fullName, email: user.email, contact: form.phone }, theme: { color: "#09492e" },
      handler: async (r: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
        const res = await fetch("/api/payments/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(r) });
        if (res.ok) finish(orderNumber);
        else { setError("Payment couldn't be verified. If you were charged, your order will confirm automatically."); setSubmitting(false); }
      },
      modal: { ondismiss: () => finish(orderNumber, "pending=1") },
    });
    rzp.open();
  };

  const simulatePay = async () => {
    if (!simModal) return;
    const res = await fetch("/api/payments/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ razorpay_order_id: simModal.razorpayOrderId, simulate: true }) });
    if (res.ok) finish(simModal.orderNumber);
    else { setError("Simulated payment failed."); setSimModal(null); }
  };

  if (cart.length === 0 && !submitting)
    return (
      <div className="mx-auto max-w-md rounded-3xl border border-dashed border-[#c6a253]/60 bg-white p-12 text-center">
        <p className="font-editorial text-3xl text-[#09492e]">Your bag is empty</p>
        <Link href="/shop" className="mt-6 inline-block rounded-full bg-[#09492e] px-6 py-3 text-sm font-semibold text-[#fbf8f3]">Browse the collection</Link>
      </div>
    );

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <form onSubmit={submit} className="grid gap-8 lg:grid-cols-[1fr_420px]">
      <div className="space-y-6">
        {/* Address */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-[#09492e]/10 bg-white p-5 sm:p-7">
          <h2 className="flex items-center gap-2 font-editorial text-2xl font-semibold text-[#09492e]"><MapPin className="h-5 w-5 text-[#c6a253]" /> Delivery address</h2>
          {addresses.length > 0 && (
            <div className="-mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
              {addresses.map((a) => (
                <button key={a.id} type="button" onClick={() => setForm({ fullName: a.fullName, phone: a.phone, line1: a.line1, line2: a.line2 ?? "", city: a.city, state: a.state, pincode: a.pincode })}
                  className="shrink-0 rounded-2xl border border-[#09492e]/20 px-4 py-2.5 text-left text-xs hover:border-[#09492e] cursor-pointer">
                  <span className="block font-semibold text-[#09492e]">{a.fullName}</span>
                  <span className="text-[#12231a]/60">{a.line1}, {a.city}</span>
                </button>
              ))}
            </div>
          )}
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div><label className={label} htmlFor="fullName">Full name</label><input id="fullName" required autoComplete="name" value={form.fullName} onChange={set("fullName")} className={field} /></div>
            <div><label className={label} htmlFor="phone">Mobile</label><input id="phone" required inputMode="numeric" autoComplete="tel-national" maxLength={10} pattern="[6-9][0-9]{9}" title="10-digit Indian mobile number" value={form.phone} onChange={set("phone")} className={field} /></div>
            <div className="sm:col-span-2"><label className={label} htmlFor="line1">Address</label><input id="line1" required autoComplete="address-line1" placeholder="House no, street" value={form.line1} onChange={set("line1")} className={field} /></div>
            <div className="sm:col-span-2"><label className={label} htmlFor="line2">Landmark (optional)</label><input id="line2" autoComplete="address-line2" value={form.line2} onChange={set("line2")} className={field} /></div>
            <div><label className={label} htmlFor="city">City</label><input id="city" required autoComplete="address-level2" value={form.city} onChange={set("city")} className={field} /></div>
            <div><label className={label} htmlFor="pincode">PIN code</label><input id="pincode" required inputMode="numeric" autoComplete="postal-code" maxLength={6} pattern="[1-9][0-9]{5}" title="6-digit PIN code" value={form.pincode} onChange={set("pincode")} className={field} /></div>
            <div className="sm:col-span-2"><label className={label} htmlFor="state">State</label>
              <select id="state" required autoComplete="address-level1" value={form.state} onChange={set("state")} className={field}>{STATES.map((s) => <option key={s}>{s}</option>)}</select></div>
          </div>
          <label className="mt-4 flex items-center gap-2 text-xs text-[#12231a]/70"><input type="checkbox" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} className="h-4 w-4 accent-[#09492e]" /> Save this address for next time</label>
        </motion.section>

        {/* Payment */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="rounded-3xl border border-[#09492e]/10 bg-white p-5 sm:p-7">
          <h2 className="flex items-center gap-2 font-editorial text-2xl font-semibold text-[#09492e]"><CreditCard className="h-5 w-5 text-[#c6a253]" /> Payment</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {([
              ["razorpay", "UPI · Cards · Netbanking", "Pay securely online", CreditCard, quote?.onlineAvailable !== false],
              ["cod", "Cash on Delivery", quote && !quote.codAllowed ? "Not available for this order value" : "Pay when it arrives", Banknote, quote?.codAllowed !== false],
            ] as const).map(([id, title, sub, Icon, enabled]) => (
              <button key={id} type="button" disabled={!enabled} onClick={() => setMethod(id)} aria-pressed={method === id}
                className={`flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-45 ${method === id ? "border-[#09492e] bg-[#09492e]/5" : "border-[#09492e]/15 hover:border-[#09492e]/40"}`}>
                <Icon className="h-6 w-6 shrink-0 text-[#09492e]" />
                <span><span className="block text-sm font-semibold text-[#12231a]">{title}</span><span className="text-xs text-[#12231a]/60">{sub}</span></span>
                {method === id && <BadgeCheck className="ml-auto h-5 w-5 shrink-0 text-[#09492e]" />}
              </button>
            ))}
          </div>
        </motion.section>
      </div>

      {/* Summary */}
      <motion.aside initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="h-fit rounded-3xl border border-[#c6a253]/40 bg-white p-5 sm:p-7 lg:sticky lg:top-28">
        <h2 className="font-editorial text-2xl font-semibold text-[#09492e]">Order summary</h2>
        <ul className="mt-4 max-h-72 space-y-3 overflow-y-auto pr-1">
          {(quote?.lines ?? cart.map((c) => ({ variantId: c.id + c.size, name: c.name, variantLabel: c.size ?? "", image: c.image, unitPrice: c.price, quantity: c.quantity, lineTotal: c.price * c.quantity }))).map((l) => (
            <li key={l.variantId} className="flex gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={l.image ?? ""} alt="" className="h-16 w-12 rounded-lg bg-[#efe9dd] object-cover" />
              <div className="min-w-0 flex-1 text-xs"><p className="truncate font-semibold text-[#12231a]">{l.name}</p><p className="text-[#12231a]/55">{l.variantLabel} · Qty {l.quantity}</p></div>
              <span className="text-xs font-bold text-[#09492e]">{formatINR(l.lineTotal)}</span>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex gap-2">
          <div className="relative flex-1"><Tag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#c6a253]" />
            <input value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())} placeholder="Coupon code" aria-label="Coupon code" className={`${field} pl-9`} /></div>
          {quote?.coupon ? (
            <button type="button" onClick={() => { setCoupon(null); setCouponInput(""); }} aria-label="Remove coupon" className="rounded-xl border border-[#09492e]/20 px-3 cursor-pointer"><X className="h-4 w-4" /></button>
          ) : (
            <button type="button" onClick={() => setCoupon(couponInput.trim() || null)} className="rounded-xl bg-[#09492e] px-4 text-xs font-semibold text-[#fbf8f3] cursor-pointer">Apply</button>
          )}
        </div>
        <AnimatePresence>
          {quote?.coupon && <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-2 text-xs font-semibold text-[#09492e]">✓ {quote.coupon.code} applied — {quote.coupon.description}</motion.p>}
          {quote?.couponError && coupon && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-2 text-xs text-[#b81d56]">{quote.couponError}</motion.p>}
        </AnimatePresence>

        <dl className={`mt-5 space-y-2 border-t border-[#09492e]/10 pt-4 text-sm transition-opacity ${loadingQuote ? "opacity-50" : ""}`}>
          <div className="flex justify-between"><dt className="text-[#12231a]/70">Subtotal</dt><dd>{formatINR(quote?.subtotal ?? 0)}</dd></div>
          {!!quote?.discount && <div className="flex justify-between text-[#09492e]"><dt>Discount</dt><dd>− {formatINR(quote.discount)}</dd></div>}
          <div className="flex justify-between"><dt className="text-[#12231a]/70">Shipping</dt><dd>{quote ? (quote.shipping === 0 ? <span className="font-semibold text-[#09492e]">Free</span> : formatINR(quote.shipping)) : "—"}</dd></div>
          <div className="flex justify-between border-t border-[#09492e]/10 pt-3 text-lg font-bold text-[#09492e]"><dt>Total</dt><dd>{formatINR(quote?.total ?? 0)}</dd></div>
          {!!quote?.taxIncluded && <p className="text-right text-[11px] text-[#12231a]/50">Includes GST of {formatINR(quote.taxIncluded)}</p>}
        </dl>

        <AnimatePresence>
          {(error || quote?.problems.length) ? (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} role="alert" className="mt-4 flex gap-2 rounded-xl border border-[#b81d56]/30 bg-[#b81d56]/5 p-3 text-xs text-[#b81d56]">
              <AlertTriangle className="h-4 w-4 shrink-0" /> <span>{error ?? quote?.problems[0]}</span>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <motion.button type="submit" whileTap={{ scale: 0.98 }} disabled={submitting || loadingQuote || !quote || quote.lines.length === 0}
          className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[#09492e] text-sm font-semibold text-[#fbf8f3] shadow-lg shadow-[#09492e]/25 transition-colors hover:bg-[#06321f] disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed">
          {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</> : <><Lock className="h-4 w-4" /> {method === "cod" ? "Place order" : `Pay ${formatINR(quote?.total ?? 0)}`}</>}
        </motion.button>
        <p className="mt-3 text-center text-[11px] text-[#12231a]/50">Prices are confirmed on our server. You won&apos;t be charged twice if you retry.</p>
      </motion.aside>

      {/* Simulated gateway (dev/test mode only) */}
      <AnimatePresence>
        {simModal && (
          <motion.div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#d6453d]">Test mode · no real money</p>
              <h3 className="font-editorial mt-2 text-2xl font-semibold text-[#09492e]">Simulated payment</h3>
              <p className="mt-1 text-sm text-[#12231a]/65">Order {simModal.orderNumber}. Add Razorpay keys to .env.local for real UPI/cards.</p>
              <button type="button" onClick={simulatePay} className="mt-5 h-12 w-full rounded-full bg-[#09492e] text-sm font-semibold text-[#fbf8f3] cursor-pointer">Pay {formatINR(quote?.total ?? 0)}</button>
              <button type="button" onClick={() => { const n = simModal.orderNumber; setSimModal(null); finish(n, "pending=1"); }} className="mt-2 h-12 w-full rounded-full border border-[#09492e]/20 text-sm font-semibold text-[#09492e] cursor-pointer">Close without paying</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}
