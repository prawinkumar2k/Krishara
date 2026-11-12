/** Only allow same-site relative paths (blocks open redirects like //evil.com). */
export function safeNext(
  value: FormDataEntryValue | string | null | undefined,
  fallback = "/",
) {
  const v = typeof value === "string" ? value : "";
  return v.startsWith("/") && !v.startsWith("//") && !v.includes("\\") ? v : fallback;
}
