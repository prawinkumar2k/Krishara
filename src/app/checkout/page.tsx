import { Suspense } from "react";
import { desc, eq } from "drizzle-orm";
import { Navbar } from "@/components/Navbar";
import { AccountLink, AccountLinkLoader } from "@/components/AccountLink";
import { CheckoutClient } from "@/components/CheckoutClient";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/dal";

export const metadata = { title: "Checkout · Krishara", robots: { index: false } };

async function Content() {
  const user = await requireUser("/checkout");
  const addresses = await db.select().from(schema.addresses).where(eq(schema.addresses.userId, user.id)).orderBy(desc(schema.addresses.isDefault), desc(schema.addresses.createdAt));
  return <CheckoutClient user={{ name: user.name, email: user.email, phone: user.phone }} addresses={addresses} />;
}

export default function CheckoutPage() {
  return (
    <main className="min-h-screen bg-[#fbf8f3]">
      <Navbar accountSlot={<Suspense fallback={<AccountLink user={null} />}><AccountLinkLoader /></Suspense>} />
      <div className="mx-auto max-w-6xl px-4 pb-24 pt-28 sm:px-6 md:pt-32">
        <h1 className="font-editorial mb-8 text-4xl font-semibold text-[#09492e] sm:text-5xl">Checkout</h1>
        <Suspense fallback={<div className="grid gap-8 lg:grid-cols-[1fr_420px]"><div className="skeleton h-96" /><div className="skeleton h-96" /></div>}>
          <Content />
        </Suspense>
      </div>
    </main>
  );
}
