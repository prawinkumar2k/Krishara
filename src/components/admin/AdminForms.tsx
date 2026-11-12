"use client";

import { useActionState, useState, useTransition } from "react";
import { Upload } from "lucide-react";
import {
  createCoupon, moderateReview, retryDeadJob, runQueueNow, saveProduct, saveSettings, toggleCoupon, toggleProduct, updateOrderStatus, uploadImage,
  type FormState,
} from "@/app/admin/actions";
import { adminBtn, adminBtnGhost, adminField } from "./ui";

const lbl = "mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[#09492e]";
function Msg({ s }: { s: FormState }) {
  if (s?.error) return <p role="alert" className="text-xs font-medium text-[#b81d56]">{s.error}</p>;
  if (s?.ok) return <p role="status" className="text-xs font-semibold text-[#09492e]">Saved ✓</p>;
  return null;
}

/* ───────── Order status ───────── */
export function OrderStatusForm({ number, options, status }: { number: string; options: string[]; status: string }) {
  const [state, action, pending] = useActionState(updateOrderStatus.bind(null, number), undefined);
  const [to, setTo] = useState(options[0] ?? "");
  if (options.length === 0) return <p className="text-sm text-[#12231a]/55">No further actions — this order is {status}.</p>;
  return (
    <form action={action} className="space-y-3">
      <div><label className={lbl}>Move to</label>
        <select name="status" value={to} onChange={(e) => setTo(e.target.value)} className={adminField}>{options.map((o) => <option key={o} value={o}>{o}</option>)}</select></div>
      {to === "shipped" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className={lbl}>Carrier</label><input name="carrier" placeholder="DTDC / Blue Dart…" className={adminField} /></div>
          <div><label className={lbl}>Tracking no.</label><input name="trackingNumber" required className={adminField} /></div>
        </div>
      )}
      <div><label className={lbl}>Note (shown to customer)</label><input name="note" maxLength={300} className={adminField} /></div>
      <div className="flex items-center gap-4"><button disabled={pending} className={adminBtn}>{pending ? "Updating…" : "Update status"}</button><Msg s={state} /></div>
      {to === "cancelled" && <p className="text-xs text-[#12231a]/55">Cancelling returns the reserved stock automatically.</p>}
      {to === "refunded" && <p className="text-xs text-[#12231a]/55">Marks the order refunded. Issue the actual refund from your Razorpay dashboard.</p>}
    </form>
  );
}

/* ───────── Product form ───────── */
type P = {
  id: string; name: string; slug: string; categoryId: string | null; price: number; compareAtPrice: number | null; fabric: string; description: string;
  tag: string | null; swatchHex: string | null; images: string[]; isFeatured: boolean; isActive: boolean; variants: { label: string; stock: number }[];
};
export function ProductForm({ product, categories }: { product?: P; categories: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(saveProduct.bind(null, product?.id ?? null), undefined);
  const [images, setImages] = useState((product?.images ?? []).join("\n"));
  const [uploading, setUploading] = useState(false);
  const [upErr, setUpErr] = useState<string | null>(null);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true); setUpErr(null);
    const fd = new FormData(); fd.set("file", f);
    const r = await uploadImage(fd);
    if (r.url) setImages((cur) => (cur ? `${cur}\n${r.url}` : r.url!)); else setUpErr(r.error ?? "Upload failed");
    setUploading(false); e.target.value = "";
  };

  return (
    <form action={action} className="grid gap-5 lg:grid-cols-[1fr_340px]">
      <div className="space-y-4 rounded-2xl border border-[#09492e]/10 bg-white p-4 sm:p-6">
        <div><label className={lbl}>Name</label><input name="name" required defaultValue={product?.name} className={adminField} /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className={lbl}>Price (₹)</label><input name="price" type="number" min={1} required defaultValue={product?.price} className={adminField} /></div>
          <div><label className={lbl}>Compare-at (₹, optional)</label><input name="compareAtPrice" type="number" min={0} defaultValue={product?.compareAtPrice ?? ""} className={adminField} /></div>
          <div><label className={lbl}>Category</label>
            <select name="categoryId" defaultValue={product?.categoryId ?? ""} className={adminField}><option value="">—</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div><label className={lbl}>Tag (e.g. LIMITED WEAVE)</label><input name="tag" defaultValue={product?.tag ?? ""} className={adminField} /></div>
        </div>
        <div><label className={lbl}>Fabric / short line</label><input name="fabric" defaultValue={product?.fabric} className={adminField} /></div>
        <div><label className={lbl}>Description</label><textarea name="description" rows={4} defaultValue={product?.description} className={adminField} /></div>
        <div><label className={lbl}>Sizes &amp; stock — one per line as <code>Label:stock</code></label>
          <textarea name="variants" rows={4} defaultValue={(product?.variants ?? [{ label: "Free Size", stock: 5 }]).map((v) => `${v.label}:${v.stock}`).join("\n")} className={`${adminField} font-mono`} /></div>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-[#09492e]/10 bg-white p-4 sm:p-6">
          <label className={lbl}>Images (first = hero) — one URL per line</label>
          <textarea name="images" rows={5} value={images} onChange={(e) => setImages(e.target.value)} className={`${adminField} font-mono text-xs`} />
          <label className={`${adminBtnGhost} mt-2 inline-flex items-center gap-2`}><Upload className="h-3.5 w-3.5" /> {uploading ? "Uploading…" : "Upload image"}<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={onFile} disabled={uploading} /></label>
          {upErr && <p className="mt-1 text-xs text-[#b81d56]">{upErr}</p>}
          <div className="mt-3 flex gap-2 overflow-x-auto">{images.split("\n").filter(Boolean).map((u, i) => /* eslint-disable-next-line @next/next/no-img-element */ <img key={i} src={u} alt="" className="h-16 w-14 rounded-lg object-cover bg-[#efe9dd]" />)}</div>
        </div>
        <div className="space-y-3 rounded-2xl border border-[#09492e]/10 bg-white p-4 sm:p-6">
          <div><label className={lbl}>URL slug</label><input name="slug" defaultValue={product?.slug} placeholder="auto from name" className={adminField} /></div>
          <div><label className={lbl}>Swatch colour</label><input name="swatchHex" defaultValue={product?.swatchHex ?? ""} placeholder="#09492E" className={adminField} /></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isActive" defaultChecked={product?.isActive ?? true} className="h-4 w-4 accent-[#09492e]" /> Visible in store</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isFeatured" defaultChecked={product?.isFeatured ?? false} className="h-4 w-4 accent-[#09492e]" /> Featured</label>
        </div>
        <div className="flex items-center gap-4"><button disabled={pending} className={`${adminBtn} flex-1`}>{pending ? "Saving…" : product ? "Save changes" : "Create product"}</button></div>
        <Msg s={state} />
      </div>
    </form>
  );
}

export function ToggleButton({ id, field, on }: { id: string; field: "isActive" | "isFeatured"; on: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" disabled={pending} onClick={() => start(() => toggleProduct(id, field))} aria-pressed={on}
      className={`relative h-6 w-11 rounded-full transition-colors cursor-pointer disabled:opacity-50 ${on ? "bg-[#09492e]" : "bg-[#12231a]/20"}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
      <span className="sr-only">{field}</span>
    </button>
  );
}

/* ───────── Coupons ───────── */
export function CouponForm() {
  const [state, action, pending] = useActionState(createCoupon, undefined);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <input name="code" required placeholder="CODE" className={`${adminField} uppercase`} />
      <select name="type" className={adminField}><option value="percent">% off</option><option value="fixed">₹ off</option></select>
      <input name="value" type="number" min={1} required placeholder="Value" className={adminField} />
      <input name="minSubtotal" type="number" min={0} placeholder="Min. subtotal ₹" className={adminField} />
      <input name="maxUses" type="number" min={1} placeholder="Max uses (blank = ∞)" className={adminField} />
      <div className="flex items-center gap-4 sm:col-span-2 lg:col-span-5"><button disabled={pending} className={adminBtn}>{pending ? "Creating…" : "Create coupon"}</button><Msg s={state} /></div>
    </form>
  );
}
export function CouponToggle({ id, on }: { id: string; on: boolean }) {
  const [pending, start] = useTransition();
  return <button type="button" disabled={pending} onClick={() => start(() => toggleCoupon(id))} className={adminBtnGhost}>{on ? "Disable" : "Enable"}</button>;
}

/* ───────── System ───────── */
export function RetryJobButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return <button type="button" disabled={pending} onClick={() => start(() => retryDeadJob(id))} className={adminBtnGhost}>{pending ? "…" : "Retry"}</button>;
}
export function RunQueueButton() {
  const [pending, start] = useTransition();
  return <button type="button" disabled={pending} onClick={() => start(() => runQueueNow())} className={adminBtn}>{pending ? "Running…" : "Run queue now"}</button>;
}

/* ───────── Settings ───────── */
export function SettingsForm({ values }: { values: { shippingFlat: number; freeShippingOver: number; gstPercent: number; codMax: number } }) {
  const [state, action, pending] = useActionState(saveSettings, undefined);
  return (
    <form action={action} className="grid max-w-2xl gap-4 sm:grid-cols-2">
      <div><label className={lbl}>Flat shipping (₹)</label><input name="shipping_flat" type="number" min={0} defaultValue={values.shippingFlat} className={adminField} /></div>
      <div><label className={lbl}>Free shipping over (₹)</label><input name="free_shipping_over" type="number" min={0} defaultValue={values.freeShippingOver} className={adminField} /></div>
      <div><label className={lbl}>GST % (included in prices)</label><input name="gst_percent" type="number" step="0.5" min={0} max={28} defaultValue={values.gstPercent} className={adminField} /></div>
      <div><label className={lbl}>Max COD order (₹)</label><input name="cod_max" type="number" min={0} defaultValue={values.codMax} className={adminField} /></div>
      <div className="flex items-center gap-4 sm:col-span-2"><button disabled={pending} className={adminBtn}>{pending ? "Saving…" : "Save settings"}</button><Msg s={state} /></div>
    </form>
  );
}

/* ───────── Reviews ───────── */
export function ReviewActions({ id, approved }: { id: string; approved: boolean }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex justify-end gap-2">
      {!approved && <button type="button" disabled={pending} onClick={() => start(() => moderateReview(id, "approve"))} className={adminBtn}>Approve</button>}
      <button type="button" disabled={pending} onClick={() => start(() => moderateReview(id, "delete"))} className={adminBtnGhost}>Delete</button>
    </div>
  );
}
