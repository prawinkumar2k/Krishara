import { Suspense } from "react";
import Link from "next/link";
import { AdminNav } from "@/components/admin/AdminNav";
import { requireAdmin } from "@/lib/dal";

export const metadata = { title: "Admin · Krishara", robots: { index: false } };

async function Guard({ children }: { children: React.ReactNode }) {
  await requireAdmin(); // authoritative check on every admin request (proxy is only the optimistic first gate)
  return <>{children}</>;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-[#f4f1ea] text-[#12231a] lg:flex">
      <aside className="border-b border-[#09492e]/10 bg-[#06321f] text-[#fbf8f3] lg:sticky lg:top-0 lg:h-dvh lg:w-60 lg:shrink-0 lg:border-b-0">
        <div className="flex items-center justify-between px-4 py-3 lg:block lg:px-6 lg:py-6">
          <Link href="/admin" className="font-editorial text-2xl font-semibold tracking-wide text-[#e2c887]">KRISHARA <span className="text-xs font-sans font-semibold uppercase tracking-[0.2em] text-[#fbf8f3]/60">admin</span></Link>
          <Link href="/" className="text-xs text-[#fbf8f3]/60 hover:text-[#e2c887] lg:mt-1 lg:block">← View store</Link>
        </div>
        <Suspense fallback={<div className="h-12" />}>
          <AdminNav />
        </Suspense>
      </aside>
      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-10">
        <Suspense fallback={<div className="space-y-4"><div className="skeleton h-10 w-48" /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><div className="skeleton h-28" /><div className="skeleton h-28" /><div className="skeleton h-28" /><div className="skeleton h-28" /></div></div>}>
          <Guard>{children}</Guard>
        </Suspense>
      </main>
    </div>
  );
}
