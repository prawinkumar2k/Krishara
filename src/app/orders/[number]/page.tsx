import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { Navbar } from "@/components/Navbar";
import { AccountLink, AccountLinkLoader } from "@/components/AccountLink";
import { OrderStatusTimeline, SuccessBurst } from "@/components/OrderStatusTimeline";
import { CancelOrderButton } from "@/components/CancelOrderButton";
import { Reveal } from "@/components/Reveal";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/dal";
import { formatINR } from "@/lib/format";

// Per-user page: resolve auth + ownership BEFORE streaming so a stranger gets a real HTTP 404.
export const instant = false;

export const metadata = { title: "Your order · Krishara", robots: { index: false } };

async function Content({ params, searchParams }: { params: Promise<{ number: string }>; searchParams: Promise<{ placed?: string; pending?: string }> }) {
  const { number } = await params;
  const sp = await searchParams;
  const user = await requireUser(`/orders/${number}`);
  const [order] = await db.select().from(schema.orders).where(eq(schema.orders.number, number));
  // Owner or admin only — a different customer gets a 404, never a hint the order exists.
  if (!order || (order.userId !== user.id && user.role !== "admin")) notFound();

  const [items, events] = await Promise.all([
    db.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, order.id)),
    db.select().from(schema.orderEvents).where(eq(schema.orderEvents.orderId, order.id)).orderBy(asc(schema.orderEvents.createdAt)),
  ]);
  const a = order.shippingAddress;
  const cancellable = order.userId === user.id && (order.status === "pending" || order.status === "confirmed");

  return (
    <>
      {sp.placed && order.status !== "pending" && (
        <div className="mb-10 text-center">
          <SuccessBurst />
          <h1 className="font-editorial mt-4 text-4xl font-semibold text-[#09492e] sm:text-5xl">Thank you, {user.name.split(" ")[0]}</h1>
          <p className="mt-2 text-sm text-[#12231a]/65">Your order is confirmed. A receipt is on its way to {order.email}.</p>
        </div>
      )}
      {sp.pending && order.status === "pending" && (
        <div className="mb-8 rounded-2xl border border-[#c6a253]/40 bg-[#c6a253]/10 p-4 text-sm text-[#7a5c14]">
          We haven&apos;t received your payment yet. If you already paid, this page will update automatically within a minute; otherwise the order is released after 30 minutes.
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#c6a253]">Order</p>
          <h2 className="font-editorial text-3xl font-semibold text-[#09492e]">{order.number}</h2>
          <p className="text-xs text-[#12231a]/55">Placed {order.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })} · {order.paymentMethod === "cod" ? "Cash on Delivery" : order.paymentStatus === "paid" ? "Paid online" : "Online payment"}</p>
        </div>
        {cancellable && <CancelOrderButton number={order.number} />}
      </div>

      <div className="mt-6 rounded-3xl border border-[#09492e]/10 bg-white p-5 sm:p-7"><OrderStatusTimeline status={order.status} />
        {order.trackingNumber && <p className="mt-5 text-xs text-[#12231a]/70">Tracking: <strong>{order.carrier}</strong> · {order.trackingNumber}</p>}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <Reveal className="rounded-3xl border border-[#09492e]/10 bg-white p-5 sm:p-7">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#09492e]">Items</h3>
          <ul className="mt-4 divide-y divide-[#09492e]/10">
            {items.map((i) => (
              <li key={i.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={i.image ?? ""} alt="" className="h-20 w-16 rounded-xl bg-[#efe9dd] object-cover" />
                <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-[#12231a]">{i.productName}</p><p className="text-xs text-[#12231a]/55">{i.variantLabel} · Qty {i.quantity}</p></div>
                <span className="text-sm font-bold text-[#09492e]">{formatINR(i.unitPrice * i.quantity)}</span>
              </li>
            ))}
          </ul>
          <h3 className="mt-8 text-xs font-semibold uppercase tracking-wider text-[#09492e]">Updates</h3>
          <ol className="mt-3 space-y-3 border-l-2 border-[#c6a253]/50 pl-4">
            {events.map((e) => (
              <li key={e.id} className="text-xs"><p className="font-semibold capitalize text-[#09492e]">{e.status}</p><p className="text-[#12231a]/65">{e.note}</p><p className="text-[#12231a]/40">{e.createdAt.toLocaleString("en-IN")}</p></li>
            ))}
          </ol>
        </Reveal>

        <Reveal delay={0.1} className="h-fit space-y-6">
          <div className="rounded-3xl border border-[#09492e]/10 bg-white p-5 sm:p-7">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#09492e]">Payment</h3>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-[#12231a]/65">Subtotal</dt><dd>{formatINR(order.subtotal)}</dd></div>
              {order.discount > 0 && <div className="flex justify-between text-[#09492e]"><dt>Discount {order.couponCode && `(${order.couponCode})`}</dt><dd>− {formatINR(order.discount)}</dd></div>}
              <div className="flex justify-between"><dt className="text-[#12231a]/65">Shipping</dt><dd>{order.shipping ? formatINR(order.shipping) : "Free"}</dd></div>
              <div className="flex justify-between border-t border-[#09492e]/10 pt-2 text-base font-bold text-[#09492e]"><dt>Total</dt><dd>{formatINR(order.total)}</dd></div>
            </dl>
          </div>
          <div className="rounded-3xl border border-[#09492e]/10 bg-white p-5 sm:p-7 text-sm leading-relaxed text-[#12231a]/75">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#09492e]">Shipping to</h3>
            <p className="font-semibold text-[#12231a]">{a.fullName}</p><p>{a.line1}{a.line2 ? `, ${a.line2}` : ""}</p><p>{a.city}, {a.state} {a.pincode}</p><p>{a.phone}</p>
          </div>
        </Reveal>
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        {order.status !== "pending" && order.status !== "cancelled" && <Link href={`/orders/${order.number}/invoice`} className="rounded-full border border-[#c6a253] px-6 py-3 text-sm font-semibold text-[#7a5c14]">Download invoice</Link>}
        <Link href="/account" className="rounded-full border border-[#09492e] px-6 py-3 text-sm font-semibold text-[#09492e]">All orders</Link>
        <Link href="/shop" className="rounded-full bg-[#09492e] px-6 py-3 text-sm font-semibold text-[#fbf8f3]">Continue shopping</Link>
      </div>
    </>
  );
}

export default function OrderPage(props: { params: Promise<{ number: string }>; searchParams: Promise<{ placed?: string; pending?: string }> }) {
  return (
    <main className="min-h-screen bg-[#fbf8f3]">
      <Navbar accountSlot={<Suspense fallback={<AccountLink user={null} />}><AccountLinkLoader /></Suspense>} />
      <div className="mx-auto max-w-5xl px-4 pb-24 pt-28 sm:px-6 md:pt-32">
        <Content {...props} />
      </div>
    </main>
  );
}
