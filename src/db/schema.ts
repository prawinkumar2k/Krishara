import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());
const createdAt = () =>
  integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`);

/* ───────────── Users & addresses ───────────── */

export const users = sqliteTable(
  "users",
  {
    id: id(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    phone: text("phone"),
    passwordHash: text("password_hash").notNull(),
    role: text("role", { enum: ["customer", "admin"] })
      .notNull()
      .default("customer"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("users_email_uq").on(t.email)],
);

export const addresses = sqliteTable(
  "addresses",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    fullName: text("full_name").notNull(),
    phone: text("phone").notNull(),
    line1: text("line1").notNull(),
    line2: text("line2"),
    city: text("city").notNull(),
    state: text("state").notNull(),
    pincode: text("pincode").notNull(),
    isDefault: integer("is_default", { mode: "boolean" })
      .notNull()
      .default(false),
    createdAt: createdAt(),
  },
  (t) => [index("addresses_user_idx").on(t.userId)],
);

/* ───────────── Catalog ───────────── */

export const categories = sqliteTable(
  "categories",
  {
    id: id(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [uniqueIndex("categories_slug_uq").on(t.slug)],
);

export const products = sqliteTable(
  "products",
  {
    id: id(),
    slug: text("slug").notNull(),
    /** id used by the original landing-page data (rack-01, lk1-saree …) so existing buttons map to DB rows */
    legacyId: text("legacy_id"),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    fabric: text("fabric").notNull().default(""),
    categoryId: text("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    /** whole rupees */
    price: integer("price").notNull(),
    /** strike‑through price, whole rupees */
    compareAtPrice: integer("compare_at_price"),
    /** ordered list of image URLs; first is the hero */
    images: text("images", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    swatchHex: text("swatch_hex"),
    tag: text("tag"),
    isActive: integer("is_active", { mode: "boolean" })
      .notNull()
      .default(true),
    isFeatured: integer("is_featured", { mode: "boolean" })
      .notNull()
      .default(false),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("products_slug_uq").on(t.slug),
    index("products_category_idx").on(t.categoryId),
  ],
);

/** Sellable unit. Products with no size choice get a single "Free Size" variant. */
export const variants = sqliteTable(
  "variants",
  {
    id: id(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    sku: text("sku").notNull(),
    stock: integer("stock").notNull().default(0),
  },
  (t) => [
    uniqueIndex("variants_sku_uq").on(t.sku),
    index("variants_product_idx").on(t.productId),
  ],
);

/* ───────────── Wishlist & cart (server copy for logged‑in users) ───────────── */

export const wishlistItems = sqliteTable(
  "wishlist_items",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("wishlist_uq").on(t.userId, t.productId)],
);

export const cartItems = sqliteTable(
  "cart_items",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    variantId: text("variant_id")
      .notNull()
      .references(() => variants.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull(),
  },
  (t) => [uniqueIndex("cart_uq").on(t.userId, t.variantId)],
);

/* ───────────── Coupons ───────────── */

export const coupons = sqliteTable(
  "coupons",
  {
    id: id(),
    code: text("code").notNull(),
    type: text("type", { enum: ["percent", "fixed"] }).notNull(),
    /** percent (1‑100) or whole rupees */
    value: integer("value").notNull(),
    minSubtotal: integer("min_subtotal").notNull().default(0),
    maxUses: integer("max_uses"),
    usedCount: integer("used_count").notNull().default(0),
    expiresAt: integer("expires_at", { mode: "timestamp" }),
    isActive: integer("is_active", { mode: "boolean" })
      .notNull()
      .default(true),
  },
  (t) => [uniqueIndex("coupons_code_uq").on(t.code)],
);

/* ───────────── Orders ───────────── */

export const ORDER_STATUSES = [
  "pending", // created, awaiting payment (online)
  "confirmed", // paid, or COD accepted
  "packed",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const orders = sqliteTable(
  "orders",
  {
    id: id(),
    /** human‑friendly, e.g. KRS-100234 */
    number: text("number").notNull(),
    userId: text("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    email: text("email").notNull(),
    status: text("status", { enum: ORDER_STATUSES }).notNull().default("pending"),
    paymentMethod: text("payment_method", {
      enum: ["razorpay", "cod"],
    }).notNull(),
    paymentStatus: text("payment_status", {
      enum: ["unpaid", "paid", "failed", "refunded"],
    })
      .notNull()
      .default("unpaid"),
    razorpayOrderId: text("razorpay_order_id"),
    razorpayPaymentId: text("razorpay_payment_id"),
    subtotal: integer("subtotal").notNull(),
    discount: integer("discount").notNull().default(0),
    shipping: integer("shipping").notNull().default(0),
    tax: integer("tax").notNull().default(0),
    total: integer("total").notNull(),
    couponCode: text("coupon_code"),
    /** snapshot so later address edits don't rewrite history */
    shippingAddress: text("shipping_address", { mode: "json" })
      .$type<{
        fullName: string;
        phone: string;
        line1: string;
        line2?: string | null;
        city: string;
        state: string;
        pincode: string;
      }>()
      .notNull(),
    /** saga bookkeeping: has reserved stock been returned for this order? */
    stockReleased: integer("stock_released", { mode: "boolean" })
      .notNull()
      .default(false),
    trackingNumber: text("tracking_number"),
    carrier: text("carrier"),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("orders_number_uq").on(t.number),
    index("orders_user_idx").on(t.userId),
    index("orders_status_idx").on(t.status),
  ],
);

export const orderItems = sqliteTable(
  "order_items",
  {
    id: id(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    variantId: text("variant_id").references(() => variants.id, {
      onDelete: "set null",
    }),
    /** snapshots */
    productName: text("product_name").notNull(),
    variantLabel: text("variant_label").notNull(),
    image: text("image"),
    unitPrice: integer("unit_price").notNull(),
    quantity: integer("quantity").notNull(),
  },
  (t) => [index("order_items_order_idx").on(t.orderId)],
);

export const orderEvents = sqliteTable(
  "order_events",
  {
    id: id(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    status: text("status").notNull(),
    note: text("note"),
    createdAt: createdAt(),
  },
  (t) => [index("order_events_order_idx").on(t.orderId)],
);

/* ───────────── Reviews ───────────── */

export const reviews = sqliteTable(
  "reviews",
  {
    id: id(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    body: text("body").notNull().default(""),
    isApproved: integer("is_approved", { mode: "boolean" })
      .notNull()
      .default(false),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("reviews_user_product_uq").on(t.userId, t.productId)],
);

/* ───────────── Settings (single‑row key/value) ───────────── */

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

/* ───────────── Reliability primitives (Tracen topics 14–20) ───────────── */

/** Topic 14 — Idempotency: a repeated POST with the same key returns the stored result. */
export const idempotencyKeys = sqliteTable("idempotency_keys", {
  key: text("key").primaryKey(),
  scope: text("scope").notNull(), // e.g. "checkout:<userId>"
  requestHash: text("request_hash").notNull(),
  status: text("status", { enum: ["processing", "done"] }).notNull(),
  response: text("response", { mode: "json" }).$type<unknown>(),
  createdAt: createdAt(),
});

/** Topic 15 — Queue + Dead Letter Queue. status "dead" = DLQ. */
export const jobs = sqliteTable(
  "jobs",
  {
    id: id(),
    type: text("type").notNull(), // "send_email", "release_stock", ...
    payload: text("payload", { mode: "json" }).$type<unknown>().notNull(),
    status: text("status", { enum: ["pending", "running", "done", "dead"] })
      .notNull()
      .default("pending"),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(5),
    runAt: integer("run_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    lastError: text("last_error"),
    createdAt: createdAt(),
  },
  (t) => [index("jobs_due_idx").on(t.status, t.runAt)],
);

/** Topics 16/17 — Pub/Sub + EDA: append-only log of past-tense domain events (with trace id). */
export const eventLog = sqliteTable(
  "event_log",
  {
    id: id(),
    type: text("type").notNull(), // "OrderPlaced", "PaymentCaptured" …
    traceId: text("trace_id").notNull(),
    payload: text("payload", { mode: "json" }).$type<unknown>().notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("event_log_type_idx").on(t.type), index("event_log_trace_idx").on(t.traceId)],
);

/** Topic 20 — distributed lock so a cron job runs once even with N instances. */
export const locks = sqliteTable("locks", {
  name: text("name").primaryKey(),
  owner: text("owner").notNull(),
  lockedUntil: integer("locked_until").notNull(), // epoch ms
});
