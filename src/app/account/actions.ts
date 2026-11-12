"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/dal";

export type FormState = { error?: string; ok?: boolean } | undefined;

const address = z.object({
  fullName: z.string().trim().min(2).max(80),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"),
  line1: z.string().trim().min(3).max(150),
  line2: z.string().trim().max(150).optional(),
  city: z.string().trim().min(2).max(60),
  state: z.string().trim().min(2).max(60),
  pincode: z.string().trim().regex(/^[1-9]\d{5}$/, "Enter a valid 6-digit PIN code"),
});

export async function addAddress(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser("/account");
  const p = address.safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: p.error.issues[0].message };
  const existing = await db.select({ id: schema.addresses.id }).from(schema.addresses).where(eq(schema.addresses.userId, user.id));
  if (existing.length >= 10) return { error: "You can save up to 10 addresses." };
  await db.insert(schema.addresses).values({ ...p.data, userId: user.id, isDefault: existing.length === 0 });
  revalidatePath("/account");
  return { ok: true };
}

export async function deleteAddress(id: string) {
  const user = await requireUser("/account");
  // userId in the WHERE clause = you can only delete your own rows.
  await db.delete(schema.addresses).where(and(eq(schema.addresses.id, id), eq(schema.addresses.userId, user.id)));
  revalidatePath("/account");
}

export async function updateProfile(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser("/account");
  const p = z.object({
    name: z.string().trim().min(2).max(80),
    phone: z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number").optional().or(z.literal("")),
  }).safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: p.error.issues[0].message };
  await db.update(schema.users).set({ name: p.data.name, phone: p.data.phone || null }).where(eq(schema.users.id, user.id));
  revalidatePath("/account");
  return { ok: true };
}
