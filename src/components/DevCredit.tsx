/** Site-wide credit strip. Rendered from the root layout, so it appears on every page. */
export function DevCredit() {
  return (
    <div className="border-t border-[#c6a253]/30 bg-[#06321f] px-4 py-3 text-center text-[11px] tracking-wide text-[#fbf8f3]/70">
      Developed by{" "}
      <span className="font-semibold text-[#e2c887]">Dealpost Private Limited</span>
    </div>
  );
}
