import "server-only";
import type { OrderDraft } from "@dropship/core";
import type { Json } from "@dropship/db";
import type { ServerClient } from "../supabase/server-client";
import { itemFromRow, orderFromRow, shipmentFromRow } from "./mappers";
import {
  isCheckoutEventOutcome,
  type CheckoutEventOutcome,
  type OrderDetails,
  type ShippingAddress,
} from "./types";

// Everything the storefront does with orders in the database. The client is the store-scoped
// server client, so every call is already limited to this store's rows by row-level security.

// Postgres' code for "a row with this unique value already exists".
const UNIQUE_VIOLATION = "23505";

export class OrderNumberTakenError extends Error {
  constructor() {
    super("That order number is already used");
  }
}

const fail = (action: string, message: string): never => {
  throw new Error(`Could not ${action}: ${message}`);
};

const itemsAsJson = (draft: OrderDraft): Json =>
  draft.items.map((item) => ({
    variant_id: item.variantId,
    sku: item.sku,
    title: item.title,
    variant_title: item.variantTitle,
    unit_price_minor: item.unitPriceMinor,
    quantity: item.quantity,
    line_total_minor: item.lineTotalMinor,
    image_path: item.imagePath,
  }));

// Records a new order, pending payment, and returns its id.
export const createPendingOrder = async (
  client: ServerClient,
  draft: OrderDraft,
  number: string,
): Promise<string> => {
  const { data, error } = await client.rpc("create_order", {
    p_number: number,
    p_currency: draft.currency,
    p_subtotal_minor: draft.subtotalMinor,
    p_shipping_minor: draft.shippingMinor,
    p_tax_minor: draft.taxMinor,
    p_total_minor: draft.totalMinor,
    p_items: itemsAsJson(draft),
  });
  if (error?.code === UNIQUE_VIOLATION) {
    throw new OrderNumberTakenError();
  }
  if (error) {
    return fail("create the order", error.message);
  }
  return data;
};

export const attachCheckoutSession = async (
  client: ServerClient,
  orderId: string,
  sessionId: string,
): Promise<void> => {
  const { error } = await client
    .from("orders")
    .update({ stripe_session_id: sessionId })
    .eq("id", orderId);
  if (error) {
    fail("record the checkout session on the order", error.message);
  }
};

// Used when the payment page could not be set up: nobody paid, so the order should not linger.
export const cancelPendingOrder = async (client: ServerClient, orderId: string): Promise<void> => {
  const { error } = await client
    .from("orders")
    .update({ status: "cancelled" })
    .eq("id", orderId)
    .eq("status", "pending_payment");
  if (error) {
    fail("cancel the order", error.message);
  }
};

export type CheckoutEventInput = {
  eventId: string;
  eventType: string;
  orderId: string;
  sessionId: string;
  paymentIntentId: string;
  paymentStatus: string;
  amountTotal: number;
  currency: string;
  customer: {
    email: string | null;
    name: string | null;
    phone: string | null;
    shipping: ShippingAddress | null;
  };
};

// Applies a Stripe event to its order in one database transaction (see the migration for the
// outcomes). Safe to call again with the same event: it answers "duplicate" and changes nothing.
export const applyCheckoutEvent = async (
  client: ServerClient,
  input: CheckoutEventInput,
): Promise<CheckoutEventOutcome> => {
  const { data, error } = await client.rpc("apply_checkout_event", {
    p_event_id: input.eventId,
    p_event_type: input.eventType,
    p_order_id: input.orderId,
    p_session_id: input.sessionId,
    p_payment_intent_id: input.paymentIntentId,
    p_payment_status: input.paymentStatus,
    p_amount_total: input.amountTotal,
    p_currency: input.currency,
    p_customer: input.customer,
  });
  if (error) {
    return fail("apply the Stripe event", error.message);
  }
  if (!isCheckoutEventOutcome(data)) {
    return fail("apply the Stripe event", `unexpected outcome "${String(data)}"`);
  }
  return data;
};

const loadDetails = async (
  client: ServerClient,
  orderRow: Parameters<typeof orderFromRow>[0],
): Promise<OrderDetails> => {
  const [items, shipment] = await Promise.all([
    client.from("order_items").select("*").eq("order_id", orderRow.id).order("created_at"),
    client.from("shipments").select("*").eq("order_id", orderRow.id).maybeSingle(),
  ]);
  if (items.error) {
    return fail("read the order's items", items.error.message);
  }
  if (shipment.error) {
    return fail("read the order's shipment", shipment.error.message);
  }
  return {
    order: orderFromRow(orderRow),
    items: items.data.map(itemFromRow),
    shipment: shipment.data ? shipmentFromRow(shipment.data) : null,
  };
};

export const findOrderByNumber = async (
  client: ServerClient,
  number: string,
): Promise<OrderDetails | null> => {
  const { data, error } = await client
    .from("orders")
    .select("*")
    .eq("number", number)
    .maybeSingle();
  if (error) {
    return fail("look up the order", error.message);
  }
  return data ? loadDetails(client, data) : null;
};

export const findOrderBySessionId = async (
  client: ServerClient,
  sessionId: string,
): Promise<OrderDetails | null> => {
  const { data, error } = await client
    .from("orders")
    .select("*")
    .eq("stripe_session_id", sessionId)
    .maybeSingle();
  if (error) {
    return fail("look up the order", error.message);
  }
  return data ? loadDetails(client, data) : null;
};

export const findOrderById = async (
  client: ServerClient,
  orderId: string,
): Promise<OrderDetails | null> => {
  const { data, error } = await client.from("orders").select("*").eq("id", orderId).maybeSingle();
  if (error) {
    return fail("look up the order", error.message);
  }
  return data ? loadDetails(client, data) : null;
};
