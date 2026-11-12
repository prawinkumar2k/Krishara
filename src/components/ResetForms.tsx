"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset, resetPassword, type AuthState } from "@/app/(auth)/actions";

const input = "w-full rounded-xl border border-[#c6a253]/40 bg-white px-4 py-3 text-base sm:text-sm text-[#12231a] outline-none transition focus:border-[#09492e] focus:ring-2 focus:ring-[#09492e]/15";
const btn = "w-full rounded-full bg-[#09492e] py-3 text-sm font-semibold tracking-wide text-[#fbf8f3] transition hover:bg-[#06321f] disabled:opacity-60 cursor-pointer";

function Shell({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <main className="flex min-h-[calc(100dvh-44px)] items-center justify-center bg-[#fbf8f3] px-4 py-16">
      <div className="w-full max-w-md rounded-3xl border border-[#c6a253]/35 bg-white p-8 shadow-[0_24px_60px_-20px_rgba(9,73,46,0.3)] md:p-10">
        <h1 className="font-editorial text-center text-3xl font-semibold text-[#09492e]">{title}</h1>
        <p className="mb-6 mt-1 text-center text-sm text-[#12231a]/60">{sub}</p>
        {children}
        <p className="mt-6 text-center text-sm"><Link href="/login" className="font-semibold text-[#09492e] underline decoration-[#c6a253] underline-offset-4">Back to sign in</Link></p>
      </div>
    </main>
  );
}

export function ForgotForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(requestPasswordReset, undefined);
  return (
    <Shell title="Forgot password?" sub="Enter your email and we'll send you a reset link.">
      {state?.fields?.sent ? (
        <p role="status" className="rounded-xl border border-[#09492e]/20 bg-[#09492e]/5 p-4 text-sm text-[#09492e]">If an account exists for that email, a reset link is on its way. It&apos;s valid for 1 hour.</p>
      ) : (
        <form action={action} className="space-y-4">
          <input name="email" type="email" required autoComplete="email" placeholder="Email" className={input} />
          {state?.error && <p role="alert" className="rounded-lg border border-[#b81d56]/25 bg-[#b81d56]/5 px-3 py-2 text-xs text-[#b81d56]">{state.error}</p>}
          <button disabled={pending} className={btn}>{pending ? "Sending…" : "Send reset link"}</button>
        </form>
      )}
    </Shell>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(resetPassword, undefined);
  return (
    <Shell title="Choose a new password" sub="At least 8 characters.">
      <form action={action} className="space-y-4">
        <input type="hidden" name="token" value={token} />
        <input name="password" type="password" required minLength={8} maxLength={72} autoComplete="new-password" placeholder="New password" className={input} />
        <input name="confirm" type="password" required minLength={8} maxLength={72} autoComplete="new-password" placeholder="Confirm password" className={input} />
        {state?.error && <p role="alert" className="rounded-lg border border-[#b81d56]/25 bg-[#b81d56]/5 px-3 py-2 text-xs text-[#b81d56]">{state.error}</p>}
        <button disabled={pending} className={btn}>{pending ? "Saving…" : "Update password"}</button>
      </form>
    </Shell>
  );
}
