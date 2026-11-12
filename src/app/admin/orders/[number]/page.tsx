import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { formatINR } from "@/lib/format";
import { Badge, Card, PageHeader } from "@/components/admin/ui";
import { OrderStatusForm } from "@/components/admin/AdminForms";

const NEXT: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"], confirmed: ["packed", "cancelled"], packed: ["shipped", "cancelled"],
  shipped: ["delivered"], delivered: ["refunded"], cancelled: [], refunded: [],
};

export default async function AdminOrder({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const [o] = await db.select().from(schema.orders).where(eq(schema.orders.number, number));
  if (!o) notFound();
  const [items, events] = await Promise.all([
    db.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, o.id)),
    db.select().from(schema.orderEvents).where(eq(schema.orderEvents.orderId, o.id)).orderBy(asc(schema.orderEvents.createdAt)),
  ]);
  const a = o.shippingAddress;

  return (
    <>
      <Link href="/admin/orders" className="text-xs text-[#12231a]/55 hover:text-[#09492e]">← Orders</Link>
      <PageHeader title={o.number} sub={`${o.createdAt.toLocaleString("en-IN")} · ${o.email}`} />
      <div className="mb-5 flex flex-wrap gap-2"><Badge s={o.status} /><Badge s={o.paymentStatus} /><span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-bold uppercase text-gray-700">{o.paymentMethod}</span>{o.razorpayPaymentId && <span className="text-[11px] text-[#12231a]/45">pay id {o.razorpayPaymentId}</span>}</div>

      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-5">
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-[#09492e]">Items</h2>
            <ul className="divide-y divide-[#09492e]/10">
              {items.map((i) => (
                <li key={i.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={i.image ?? ""} alt="" className="h-14 w-11 rounded-lg bg-[#efe9dd] object-cover" />
                  <div className="min-w-0 flex-1 text-sm"><p className="truncate font-semibold">{i.productName}</p><p className="text-xs text-[#12231a]/55">{i.variantLabel} · {formatINR(i.unitPrice)} × {i.quantity}</p></div>
                  <span className="text-sm font-bold">{formatINR(i.unitPrice * i.quantity)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-1 border-t border-[#09492e]/10 pt-3 text-sm">
              <div className="flex justify-between"><dt className="text-[#12231a]/60">Subtotal</dt><dd>{formatINR(o.subtotal)}</dd></div>
              {o.discount > 0 && <div className="flex justify-between"><dt className="text-[#12231a]/60">Discount ({o.couponCode})</dt><dd>− {formatINR(o.discount)}</dd></div>}
              <div className="flex justify-between"><dt className="text-[#12231a]/60">Shipping</dt><dd>{formatINR(o.shipping)}</dd></div>
              <div className="flex justify-between"><dt className="text-[#12231a]/60">GST included</dt><dd>{formatINR(o.tax)}</dd></div>
              <div className="flex justify-between text-base font-bold text-[#09492e]"><dt>Total</dt><dd>{formatINR(o.total)}</dd></div>
            </dl>
          </Card>
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-[#09492e]">Timeline</h2>
            <ol className="space-y-3 border-l-2 border-[#c6a253]/50 pl-4">
              {events.map((e) => <li key={e.id} className="text-xs"><p className="font-semibold capitalize text-[#09492e]">{e.status}</p>{e.note && <p className="text-[#12231a]/65">{e.note}</p>}<p className="text-[#12231a]/40">{e.createdAt.toLocaleString("en-IN")}</p></li>)}
            </ol>
          </Card>
        </div>
        <div className="space-y-5">
          <Card><h2 className="mb-3 text-sm font-semibold text-[#09492e]">Update status</h2><OrderStatusForm number={o.number} options={NEXT[o.status] ?? []} status={o.status} /></Card>
          <Card className="text-sm leading-relaxed"><h2 className="mb-2 text-sm font-semibold text-[#09492e]">Ship to</h2><p className="font-semibold">{a.fullName}</p><p>{a.line1}{a.line2 ? `, ${a.line2}` : ""}</p><p>{a.city}, {a.state} {a.pincode}</p><p>{a.phone}</p>
            {o.trackingNumber && <p className="mt-3 text-xs text-[#12231a]/65">Tracking: {o.carrier} · {o.trackingNumber}</p>}</Card>
        </div>
      </div>
    </>
  );
}
