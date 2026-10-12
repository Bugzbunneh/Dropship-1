import type { OrderStatus } from "@dropship/core";

// Orders as the storefront works with them, separate from the database's column names.

export type ShippingAddress = {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  county?: string;
  postcode: string;
  country: string;
};

export type OrderRecord = {
  id: string;
  number: string;
  status: OrderStatus;
  currency: string;
  subtotalMinor: number;
  shippingMinor: number;
  // the VAT already inside the total; zero while the business is not VAT registered
  taxMinor: number;
  totalMinor: number;
  customerEmail: string | null;
  customerName: string | null;
  shippingAddress: ShippingAddress | null;
  stripeSessionId: string | null;
  createdAt: string;
  paidAt: string | null;
};

export type OrderItemRecord = {
  sku: string;
  title: string;
  variantTitle: string;
  unitPriceMinor: number;
  quantity: number;
  lineTotalMinor: number;
  imagePath: string | null;
};

export type ShipmentRecord = {
  carrier: string;
  trackingNumber: string | null;
  trackingUrl: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
};

export type OrderDetails = {
  order: OrderRecord;
  items: OrderItemRecord[];
  shipment: ShipmentRecord | null;
};

// What applying a Stripe event to an order can come back as. Mirrors the database function's
// documented results (supabase/migrations/20261012180000_orders_and_payments.sql).
export const CHECKOUT_EVENT_OUTCOMES = [
  "paid",
  "cancelled",
  "duplicate",
  "already_paid",
  "awaiting_payment",
  "amount_mismatch",
  "session_mismatch",
  "payment_after_cancel",
  "unknown_order",
  "ignored",
] as const;

export type CheckoutEventOutcome = (typeof CHECKOUT_EVENT_OUTCOMES)[number];

export const isCheckoutEventOutcome = (value: unknown): value is CheckoutEventOutcome =>
  typeof value === "string" && (CHECKOUT_EVENT_OUTCOMES as readonly string[]).includes(value);

// Outcomes that mean money and order disagree and a person has to look. They are logged loudly
// and will feed the exceptions inbox in Phase 4.
export const NEEDS_ATTENTION_OUTCOMES: readonly CheckoutEventOutcome[] = [
  "amount_mismatch",
  "session_mismatch",
  "payment_after_cancel",
  "unknown_order",
];
