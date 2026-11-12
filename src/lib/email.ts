import "server-only";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { breaker, retry, withTimeout } from "./resilience";
import { renderEmail } from "./email-templates";

/**
 * Outbound email with the book's full protection stack:
 * timeout (2s) → retry w/ backoff+jitter on transient errors → circuit breaker.
 * Without RESEND_API_KEY it prints the email to the server console (dev mode).
 */
export async function sendEmail(msg: { template: string; to?: string; email?: string; [k: string]: unknown }) {
  let to = msg.to ?? msg.email;
  if (!to && msg.orderId) {
    const [o] = await db.select({ email: schema.orders.email }).from(schema.orders).where(eq(schema.orders.id, String(msg.orderId)));
    to = o?.email;
  }
  if (!to) return;
  const mail = await renderEmail(msg.template, msg);
  if (!mail) return; // nothing to say (e.g. order no longer exists)

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(`\n[email:dev] to=${to}\nsubject: ${mail.subject}\n${mail.text}\n`);
    return;
  }
  await breaker("email").run(() =>
    retry(
      () =>
        withTimeout(async (signal) => {
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            signal,
            headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              from: process.env.EMAIL_FROM ?? "Krishara <orders@krishara.in>",
              to,
              subject: mail.subject,
              html: mail.html,
              text: mail.text,
            }),
          });
          if (!res.ok) throw Object.assign(new Error(`Email API ${res.status}`), { status: res.status });
        }, 4000),
      { attempts: 3 },
    ),
  );
}
