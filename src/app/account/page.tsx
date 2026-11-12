import { Suspense } from "react";
import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { ChevronRight, Shield } from "lucide-react";
import { logout } from "@/app/(auth)/actions";
import { Navbar } from "@/components/Navbar";
import { AccountLink, AccountLinkLoader } from "@/components/AccountLink";
import { AddAddressForm, DeleteAddressButton, ProfileForm } from "@/components/AccountForms";
import { Reveal } from "@/components/Reveal";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/dal";
import { formatINR } from "@/lib/format";

export const metadata = { title: "My account · Krishara", robots: { index: false } };

const badge: Record<string, string> = {
  pending: "bg-[#c6a253]/20 text-[#7a5c14]", confirmed: "bg-[#09492e]/10 text-[#09492e]", packed: "bg-[#185e4b]/10 text-[#185e4b]",
  shipped: "bg-blue-100 text-blue-800", delivered: "bg-emerald-100 text-emerald-800", cancelled: "bg-[#b81d56]/10 text-[#b81d56]", refunded: "bg-[#b81d56]/10 text-[#b81d56]",
};

async function Content() {
  const user = await requireUser("/account");
  const [orders, addresses] = await Promise.all([
    db.select({
      id: schema.orders.id, number: schema.orders.number, status: schema.orders.status, total: schema.orders.total, createdAt: schema.orders.createdAt,
      count: sql<number>`(select coalesce(sum(quantity),0) from order_items where order_id = ${schema.orders.id})`,
      first: sql<string | null>`(select image from order_items where order_id = ${schema.orders.id} limit 1)`,
    }).from(schema.orders).where(eq(schema.orders.userId, user.id)).orderBy(desc(schema.orders.createdAt)).limit(30),
    db.select().from(schema.addresses).where(eq(schema.addresses.userId, user.id)).orderBy(desc(schema.addresses.createdAt)),
  ]);

  return (
    <>
      <Reveal className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#c6a253]">My account</p>
          <h1 className="font-editorial text-4xl font-semibold text-[#09492e] sm:text-5xl">Namaste, {user.name.split(" ")[0]}</h1>
          <p className="text-sm text-[#12231a]/60">{user.email}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {user.role === "admin" && <Link href="/admin" className="flex items-center gap-2 rounded-full bg-[#c6a253] px-5 py-2.5 text-sm font-semibold text-[#06321f]"><Shield className="h-4 w-4" /> Admin</Link>}
          <form action={logout}><button className="rounded-full border border-[#09492e] px-5 py-2.5 text-sm font-semibold text-[#09492e] hover:bg-[#09492e] hover:text-[#fbf8f3] transition-colors cursor-pointer">Sign out</button></form>
        </div>
      </Reveal>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <Reveal>
          <h2 className="font-editorial text-2xl font-semibold text-[#09492e]">Orders</h2>
          {orders.length === 0 ? (
            <div className="mt-4 rounded-3xl border border-dashed border-[#c6a253]/60 bg-white p-10 text-center">
              <p className="text-sm text-[#12231a]/60">No orders yet.</p>
              <Link href="/shop" className="mt-4 inline-block rounded-full bg-[#09492e] px-6 py-3 text-sm font-semibold text-[#fbf8f3]">Start shopping</Link>
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {orders.map((o) => (
                <li key={o.id}>
                  <Link href={`/orders/${o.number}`} className="group flex items-center gap-4 rounded-2xl border border-[#09492e]/10 bg-white p-3 pr-4 transition-all hover:border-[#c6a253] hover:shadow-md">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={o.first ?? ""} alt="" className="h-16 w-14 rounded-xl bg-[#efe9dd] object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-[#09492e]">{o.number}</p>
                      <p className="text-xs text-[#12231a]/55">{o.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} · {Number(o.count)} item{Number(o.count) > 1 ? "s" : ""}</p>
                    </div>
                    <div className="text-right"><p className="text-sm font-bold text-[#12231a]">{formatINR(o.total)}</p><span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold capitalize ${badge[o.status]}`}>{o.status}</span></div>
                    <ChevronRight className="h-4 w-4 text-[#09492e]/40 transition-transform group-hover:translate-x-1" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Reveal>

        <div className="space-y-8">
          <Reveal delay={0.08}>
            <h2 className="font-editorial text-2xl font-semibold text-[#09492e]">Profile</h2>
            <div className="mt-4 rounded-3xl border border-[#09492e]/10 bg-white p-5"><ProfileForm name={user.name} phone={user.phone} /></div>
          </Reveal>
          <Reveal delay={0.12}>
            <h2 className="font-editorial text-2xl font-semibold text-[#09492e]">Addresses</h2>
            <ul className="mt-4 space-y-3">
              {addresses.map((a) => (
                <li key={a.id} className="flex items-start justify-between gap-3 rounded-2xl border border-[#09492e]/10 bg-white p-4 text-xs leading-relaxed text-[#12231a]/75">
                  <div><p className="text-sm font-semibold text-[#12231a]">{a.fullName} {a.isDefault && <span className="ml-1 rounded-full bg-[#09492e]/10 px-2 py-0.5 text-[10px] text-[#09492e]">Default</span>}</p>{a.line1}{a.line2 ? `, ${a.line2}` : ""}<br />{a.city}, {a.state} {a.pincode}<br />{a.phone}</div>
                  <DeleteAddressButton id={a.id} />
                </li>
              ))}
            </ul>
            <div className="mt-4 rounded-3xl border border-[#09492e]/10 bg-white p-5"><AddAddressForm /></div>
          </Reveal>
        </div>
      </div>
    </>
  );
}

export default function AccountPage() {
  return (
    <main className="min-h-screen bg-[#fbf8f3]">
      <Navbar accountSlot={<Suspense fallback={<AccountLink user={null} />}><AccountLinkLoader /></Suspense>} />
      <div className="mx-auto max-w-6xl px-4 pb-24 pt-28 sm:px-6 md:pt-32">
        <Suspense fallback={<div className="space-y-4"><div className="skeleton h-20 w-2/3" /><div className="skeleton h-64" /></div>}><Content /></Suspense>
      </div>
    </main>
  );
}
