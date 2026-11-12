import "server-only";
import { randomUUID } from "node:crypto";
import { db, schema } from "@/db";
import { enqueue } from "./queue";

/**
 * Topics 16+17 — Pub/Sub + Event-Driven Architecture.
 * Events are named in the PAST TENSE, are immutable facts, and carry a traceId.
 * Subscribers never run inline: each gets its own queue job, so a failing subscriber
 * (e.g. email down) can never fail the publisher (e.g. the order).
 */
export type DomainEvent =
  | "UserRegistered"
  | "OrderPlaced"
  | "PaymentCaptured"
  | "PaymentFailed"
  | "OrderShipped"
  | "OrderDelivered"
  | "OrderCancelled";

// event → job types that react to it. Add a subscriber = add a string; the publisher is untouched.
const SUBSCRIBERS: Record<DomainEvent, string[]> = {
  UserRegistered: ["email.welcome"],
  OrderPlaced: ["email.order_confirmation", "analytics.record"],
  PaymentCaptured: ["email.payment_receipt", "analytics.record"],
  PaymentFailed: ["inventory.release", "analytics.record"], // saga compensation
  OrderShipped: ["email.shipped"],
  OrderDelivered: ["analytics.record"],
  OrderCancelled: ["inventory.release", "email.cancelled", "analytics.record"],
};

export async function publish(
  type: DomainEvent,
  payload: Record<string, unknown>,
  traceId: string = randomUUID(),
) {
  await db.insert(schema.eventLog).values({ type, traceId, payload });
  for (const jobType of SUBSCRIBERS[type]) {
    await enqueue(jobType, { ...payload, event: type, traceId });
  }
  return traceId;
}
