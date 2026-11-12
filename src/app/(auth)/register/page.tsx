import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { getCurrentUser } from "@/lib/dal";
import { safeNext } from "@/lib/safe-redirect";

export const instant = false; // per-user page: render on request

export const metadata = { title: "Create account · Krishara" };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const next = safeNext((await searchParams).next, "");
  if (await getCurrentUser()) redirect(next || "/account");
  return <AuthForm mode="register" next={next || undefined} />;
}
