import "server-only";
import { breaker, retry, withTimeout } from "./resilience";

/**
 * Outbound email with the book's full protection stack:
 * timeout (2s) → retry w/ backoff+jitter on transient errors → circuit breaker.
 * Without RESEND_API_KEY it logs instead of sending (dev mode).
 */
export async function sendEmail(msg: {
  template: string;
  to?: string;
  email?: string;
  [k: string]: unknown;
}) {
  const to = msg.to ?? msg.email;
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(`[email:dev] ${msg.template} → ${to ?? "(no recipient)"}`);
    return;
  }
  await breaker("email").run(() =>
    retry(
      () =>
        withTimeout(async (signal) => {
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            signal,
            headers: {
              Authorization: `Bearer ${key}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: process.env.EMAIL_FROM ?? "Krishara <orders@krishara.in>",
              to,
              subject: `Krishara — ${msg.template.replace(/_/g, " ")}`,
              text: JSON.stringify(msg, null, 2),
            }),
          });
          if (!res.ok)
            throw Object.assign(new Error(`Email API ${res.status}`), {
              status: res.status,
            });
        }, 2000),
      { attempts: 3 },
    ),
  );
}
