import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { PrintButton } from "@/components/PrintButton";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/dal";
import { formatINR } from "@/lib/format";
import { getSettings } from "@/lib/pricing";

export const instant = false;
export const metadata = { title: "Tax invoice · Krishara", robots: { index: false } };

// Seller details come from env so you can put the real registered details in without a code change.
const seller = {
  name: process.env.SELLER_NAME ?? "Krishara Silks",
  address: process.env.SELLER_ADDRESS ?? "14 Sannadhi Street, Kanchipuram, Tamil Nadu 631501",
  gstin: process.env.SELLER_GSTIN ?? "(GSTIN not configured)",
  state: process.env.SELLER_STATE ?? "Tamil Nadu",
};

export default async function InvoicePage({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const user = await requireUser(`/orders/${number}/invoice`);
  const [order] = await db.select().from(schema.orders).where(eq(schema.orders.number, number));
  if (!order || (order.userId !== user.id && user.role !== "admin")) notFound();
  if (order.status === "pending" || order.status === "cancelled") notFound(); // no invoice until it's a real sale

  const items = await db.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, order.id)).orderBy(asc(schema.orderItems.productName));
  const { gstPercent } = await getSettings();
  const a = order.shippingAddress;
  const intra = a.state.trim().toLowerCase() === seller.state.trim().toLowerCase();
  const half = Math.round(order.tax / 2);
  const taxable = order.subtotal - order.discount - order.tax;

  return (
    <main className="min-h-screen bg-[#fbf8f3] px-4 py-10 print:bg-white print:p-0">
      <div className="mx-auto max-w-3xl rounded-2xl border border-[#09492e]/15 bg-white p-6 sm:p-10 print:border-0 print:p-0">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#09492e]/15 pb-6">
          <div>
            <p className="font-editorial text-3xl font-semibold tracking-wide text-[#09492e]">KRISHARA</p>
            <p className="mt-1 max-w-xs text-xs leading-relaxed text-[#12231a]/65">{seller.name}<br />{seller.address}<br />GSTIN: {seller.gstin}</p>
          </div>
          <div className="text-right text-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#c6a253]">Tax invoice</p>
            <p className="font-bold text-[#09492e]">{order.number}</p>
            <p className="text-xs text-[#12231a]/60">{order.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>
          </div>
        </div>

        <div className="grid gap-6 py-6 text-sm sm:grid-cols-2">
          <div><p className="text-[11px] font-semibold uppercase tracking-wider text-[#09492e]">Billed &amp; shipped to</p>
            <p className="mt-1 leading-relaxed">{a.fullName}<br />{a.line1}{a.line2 ? `, ${a.line2}` : ""}<br />{a.city}, {a.state} {a.pincode}<br />{a.phone}</p></div>
          <div><p className="text-[11px] font-semibold uppercase tracking-wider text-[#09492e]">Payment</p>
            <p className="mt-1">{order.paymentMethod === "cod" ? "Cash on Delivery" : "Online (Razorpay)"} · {order.paymentStatus}</p></div>
        </div>

        <table className="w-full text-sm">
          <thead><tr className="border-y border-[#09492e]/15 text-left text-[11px] uppercase tracking-wider text-[#09492e]"><th className="py-2">Item</th><th className="py-2 text-right">Qty</th><th className="py-2 text-right">Rate</th><th className="py-2 text-right">Amount</th></tr></thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id} className="border-b border-[#09492e]/8">
                <td className="py-2.5">{i.productName}<span className="block text-xs text-[#12231a]/55">{i.variantLabel}</span></td>
                <td className="py-2.5 text-right">{i.quantity}</td><td className="py-2.5 text-right">{formatINR(i.unitPrice)}</td><td className="py-2.5 text-right">{formatINR(i.unitPrice * i.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="ml-auto mt-5 w-full max-w-xs space-y-1.5 text-sm">
          <div className="flex justify-between"><dt className="text-[#12231a]/65">Subtotal (incl. GST)</dt><dd>{formatINR(order.subtotal)}</dd></div>
          {order.discount > 0 && <div className="flex justify-between"><dt className="text-[#12231a]/65">Discount {order.couponCode && `(${order.couponCode})`}</dt><dd>− {formatINR(order.discount)}</dd></div>}
          <div className="flex justify-between"><dt className="text-[#12231a]/65">Shipping</dt><dd>{order.shipping ? formatINR(order.shipping) : "Free"}</dd></div>
          <div className="flex justify-between border-t border-[#09492e]/15 pt-2 text-base font-bold text-[#09492e]"><dt>Total</dt><dd>{formatINR(order.total)}</dd></div>
        </dl>

        <div className="mt-6 rounded-xl bg-[#fbf8f3] p-4 text-xs text-[#12231a]/75 print:border print:border-[#09492e]/15">
          <p className="mb-1 font-semibold text-[#09492e]">GST summary @ {gstPercent}% (included in prices)</p>
          <p>Taxable value: {formatINR(taxable)}</p>
          {intra ? <p>CGST {gstPercent / 2}%: {formatINR(half)} · SGST {gstPercent / 2}%: {formatINR(order.tax - half)}</p> : <p>IGST {gstPercent}%: {formatINR(order.tax)}</p>}
        </div>

        <p className="mt-8 text-center text-[11px] text-[#12231a]/45">This is a computer-generated invoice and needs no signature. Thank you for choosing handwoven silk.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3 print:hidden"><PrintButton /><Link href={`/orders/${order.number}`} className="rounded-full border border-[#09492e] px-6 py-3 text-sm font-semibold text-[#09492e]">Back to order</Link></div>
      </div>
    </main>
  );
}
