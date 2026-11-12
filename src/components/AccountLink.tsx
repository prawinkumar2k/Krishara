import { User } from "lucide-react";
import { getCurrentUser } from "@/lib/dal";

type U = { name: string; role: "customer" | "admin" } | null;

export function AccountLink({ user }: { user: U }) {
  return (
    <a
      href={user ? (user.role === "admin" ? "/admin" : "/account") : "/login"}
      aria-label={user ? "My account" : "Sign in"}
      title={user ? user.name : "Sign in"}
      className="p-2 rounded-full text-[#09492e] hover:bg-[#09492e]/10 transition-colors cursor-pointer"
    >
      <User className="w-4 h-4" />
    </a>
  );
}

/** Async server component: streams in after the static shell so the page stays prerendered. */
export async function AccountLinkLoader() {
  return <AccountLink user={await getCurrentUser()} />;
}
