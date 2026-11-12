import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { SESSION_COOKIE, decrypt } from "./session";

/** Authoritative current user — always re-read from the DB (never trust the token's role alone). */
export const getCurrentUser = cache(async () => {
  const session = await decrypt((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const [user] = await db
    .select({
      id: schema.users.id,
      email: schema.users.email,
      name: schema.users.name,
      phone: schema.users.phone,
      role: schema.users.role,
      tokenVersion: schema.users.tokenVersion,
    })
    .from(schema.users)
    .where(eq(schema.users.id, session.userId));
  // Sessions issued before a password change carry an older version and are rejected.
  if (!user || (session.v ?? 0) !== user.tokenVersion) return null;
  return user;
});

export async function requireUser(next = "/account") {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

export async function requireAdmin() {
  const user = await requireUser("/admin");
  if (user.role !== "admin") redirect("/");
  return user;
}
