"use client";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="rounded-full bg-[#09492e] px-6 py-3 text-sm font-semibold text-[#fbf8f3] cursor-pointer print:hidden">
      Print / Save as PDF
    </button>
  );
}
