import Link from "next/link";

export const adminField = "w-full rounded-xl border border-[#09492e]/20 bg-white px-3.5 py-2.5 text-base sm:text-sm outline-none transition focus:border-[#09492e] focus:ring-2 focus:ring-[#09492e]/15";
export const adminBtn = "rounded-full bg-[#09492e] px-5 py-2.5 text-sm font-semibold text-[#fbf8f3] hover:bg-[#06321f] disabled:opacity-60 cursor-pointer transition-colors";
export const adminBtnGhost = "rounded-full border border-[#09492e]/25 px-4 py-2 text-xs font-semibold text-[#09492e] hover:bg-[#09492e]/5 cursor-pointer transition-colors";

export function PageHeader({ title, sub, action }: { title: string; sub?: string; action?: { href: string; label: string } }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-editorial text-3xl font-semibold text-[#09492e] sm:text-4xl">{title}</h1>
        {sub && <p className="text-sm text-[#12231a]/60">{sub}</p>}
      </div>
      {action && <Link href={action.href} className={adminBtn}>{action.label}</Link>}
    </div>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-[#09492e]/10 bg-white p-4 sm:p-6 ${className}`}>{children}</div>;
}

export const statusBadge: Record<string, string> = {
  pending: "bg-[#c6a253]/20 text-[#7a5c14]", confirmed: "bg-[#09492e]/10 text-[#09492e]", packed: "bg-[#185e4b]/10 text-[#185e4b]",
  shipped: "bg-blue-100 text-blue-800", delivered: "bg-emerald-100 text-emerald-800", cancelled: "bg-[#b81d56]/10 text-[#b81d56]", refunded: "bg-[#b81d56]/10 text-[#b81d56]",
  paid: "bg-emerald-100 text-emerald-800", unpaid: "bg-[#c6a253]/20 text-[#7a5c14]", failed: "bg-[#b81d56]/10 text-[#b81d56]",
};

export function Badge({ s }: { s: string }) {
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold capitalize ${statusBadge[s] ?? "bg-gray-100 text-gray-700"}`}>{s}</span>;
}

export function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-[#09492e]/10 bg-white">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-[#09492e]/10 bg-[#09492e]/[0.03] text-[11px] uppercase tracking-wider text-[#09492e]">
          <tr>{head.map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-[#09492e]/8">{children}</tbody>
      </table>
    </div>
  );
}
