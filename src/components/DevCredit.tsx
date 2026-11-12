/** Site-wide credit strip. Rendered from the root layout, so it appears on every page. */
export function DevCredit() {
  return (
    <div className="print:hidden border-t border-[#c6a253]/30 bg-[#06321f] px-4 py-3 text-center text-[11px] tracking-wide text-[#fbf8f3]/70">
      <a
        href="https://dealpost.co.in/"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 hover:text-[#fbf8f3] transition-colors"
      >
        <span>Developed by</span>
        <span className="font-semibold text-[#e2c887] underline-offset-4 hover:underline">
          Dealpost Private Limited
        </span>
      </a>
    </div>
  );
}
