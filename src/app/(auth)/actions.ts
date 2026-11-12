"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, schema } from "@/db";
import { createSession, deleteSession } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { safeNext } from "@/lib/safe-redirect";
import { publish } from "@/lib/events";

export type AuthState =
  | { error?: string; fields?: Record<string, string> }
  | undefined;

const registerSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number")
    .optional()
    .or(z.literal("")),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password is too long"),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

async function clientKey() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

export async function register(
  _: AuthState,
  formData: FormData,
): Promise<AuthState> {
  if (!rateLimit(`register:${await clientKey()}`, 5, 15 * 60_000))
    return { error: "Too many attempts. Please try again in a few minutes." };

  const raw = Object.fromEntries(formData) as Record<string, string>;
  const fields = {
    name: raw.name ?? "",
    email: raw.email ?? "",
    phone: raw.phone ?? "",
  };
  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message, fields };

  const { name, email, phone, password } = parsed.data;
  const [existing] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, email));
  if (existing)
    return {
      error: "An account with this email already exists. Try signing in.",
      fields,
    };

  const [user] = await db
    .insert(schema.users)
    .values({
      name,
      email,
      phone: phone || null,
      passwordHash: await bcrypt.hash(password, 12),
      role: "customer", // role is never taken from the client
    })
    .returning({ id: schema.users.id, role: schema.users.role });

  await createSession({ userId: user.id, role: user.role });
  // Fire-and-forget fact: a failing email subscriber must never fail sign-up.
  await publish("UserRegistered", { userId: user.id, email, name }).catch(() => {});
  redirect(safeNext(raw.next, "/account"));
}

export async function login(
  _: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const raw = Object.fromEntries(formData) as Record<string, string>;
  const fields = { email: raw.email ?? "" };
  const ip = await clientKey();
  if (
    !rateLimit(`login:${ip}:${(raw.email ?? "").toLowerCase()}`, 8, 15 * 60_000)
  )
    return { error: "Too many attempts. Please try again in a few minutes.", fields };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) return { error: "Enter your email and password.", fields };

  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, parsed.data.email));

  // Same message either way, and always run a hash compare, so we don't leak which emails exist.
  const dummy = await DUMMY_HASH();
  const ok = await bcrypt.compare(
    parsed.data.password,
    user?.passwordHash ?? dummy,
  );
  if (!user || !ok) return { error: "Incorrect email or password.", fields };

  await createSession({ userId: user.id, role: user.role });
  redirect(safeNext(raw.next, user.role === "admin" ? "/admin" : "/account"));
}

let dummyHash: Promise<string> | undefined;
function DUMMY_HASH() {
  return (dummyHash ??= bcrypt.hash("krishara-dummy-password", 12));
}

export async function logout() {
  await deleteSession();
  redirect("/");
}
