"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function SortSelect({ value }: { value: string }) {
  const router = useRouter();
  const sp = useSearchParams();
  return (
    <label className="flex items-center gap-2 text-xs font-semibold text-[#09492e]">
      Sort
      <select
        value={value}
        onChange={(e) => {
          const qs = new URLSearchParams(sp.toString());
          qs.set("sort", e.target.value);
          qs.delete("page");
          router.push(`/shop?${qs.toString()}`);
        }}
        className="rounded-full border border-[#09492e]/20 bg-white px-4 py-2 text-xs font-semibold text-[#09492e] focus:border-[#09492e] focus:outline-none cursor-pointer"
      >
        <option value="featured">Featured</option>
        <option value="newest">Newest</option>
        <option value="price-asc">Price: low to high</option>
        <option value="price-desc">Price: high to low</option>
      </select>
    </label>
  );
}
