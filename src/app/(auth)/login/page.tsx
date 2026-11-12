import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { getCurrentUser } from "@/lib/dal";
import { safeNext } from "@/lib/safe-redirect";

export const instant = false; // per-user page: render on request

export const metadata = { title: "Sign in · Krishara" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reset?: string }>;
}) {
  const sp = await searchParams;
  const next = safeNext(sp.next, "");
  if (await getCurrentUser()) redirect(next || "/account");
  return <AuthForm mode="login" next={next || undefined} notice={sp.reset ? "Password updated — please sign in." : undefined} />;
}
