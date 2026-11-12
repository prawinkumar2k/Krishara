"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, register, type AuthState } from "@/app/(auth)/actions";

const input =
  "w-full rounded-xl border border-[#c6a253]/40 bg-white px-4 py-3 text-sm text-[#12231a] outline-none transition focus:border-[#09492e] focus:ring-2 focus:ring-[#09492e]/15";

export function AuthForm({
  mode,
  next,
}: {
  mode: "login" | "register";
  next?: string;
}) {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    mode === "login" ? login : register,
    undefined,
  );
  const isLogin = mode === "login";
  const nextQuery = next ? `?next=${encodeURIComponent(next)}` : "";

  return (
    <main className="min-h-screen bg-[#fbf8f3] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-3xl bg-white border border-[#c6a253]/35 shadow-[0_24px_60px_-20px_rgba(9,73,46,0.3)] p-8 md:p-10">
        <Link href="/" className="flex justify-center mb-6">
          <img
            src="/images/krishara-logo.jpg"
            alt="Krishara"
            className="h-12 w-auto mix-blend-multiply"
          />
        </Link>
        <h1 className="font-editorial text-center text-3xl font-semibold text-[#09492e]">
          {isLogin ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-1 mb-6 text-center text-sm text-[#12231a]/60">
          {isLogin
            ? "Sign in to track orders and checkout faster."
            : "Save your bag, wishlist and addresses."}
        </p>

        <form action={action} className="space-y-4">
          <input type="hidden" name="next" value={next ?? ""} />
          {!isLogin && (
            <input
              name="name"
              required
              autoComplete="name"
              placeholder="Full name"
              defaultValue={state?.fields?.name}
              className={input}
            />
          )}
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="Email"
            defaultValue={state?.fields?.email}
            className={input}
          />
          {!isLogin && (
            <input
              name="phone"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="Mobile (optional, 10 digits)"
              defaultValue={state?.fields?.phone}
              className={input}
            />
          )}
          <input
            name="password"
            type="password"
            required
            autoComplete={isLogin ? "current-password" : "new-password"}
            placeholder={isLogin ? "Password" : "Password (min 8 characters)"}
            className={input}
          />

          {state?.error && (
            <p
              role="alert"
              className="rounded-lg bg-[#b81d56]/8 border border-[#b81d56]/25 px-3 py-2 text-xs text-[#b81d56]"
            >
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-full bg-[#09492e] py-3 text-sm font-semibold tracking-wide text-[#fbf8f3] transition hover:bg-[#06321f] disabled:opacity-60 cursor-pointer"
          >
            {pending ? "Please wait…" : isLogin ? "Sign in" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[#12231a]/70">
          {isLogin ? "New to Krishara? " : "Already have an account? "}
          <Link
            href={`${isLogin ? "/register" : "/login"}${nextQuery}`}
            className="font-semibold text-[#09492e] underline decoration-[#c6a253] underline-offset-4"
          >
            {isLogin ? "Create an account" : "Sign in"}
          </Link>
        </p>
      </div>
    </main>
  );
}
