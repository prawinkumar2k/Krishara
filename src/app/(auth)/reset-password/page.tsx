import { ResetForm } from "@/components/ResetForms";

export const instant = false;

export const metadata = { title: "Reset password · Krishara", robots: { index: false } };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <ResetForm token={(token ?? "").slice(0, 128)} />;
}
