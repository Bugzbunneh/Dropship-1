import { isOrderStatus } from "@dropship/core";
import type { Database } from "@dropship/db";
import type { OrderItemRecord, OrderRecord, ShipmentRecord, ShippingAddress } from "./types";

// Turns database rows into the shapes the storefront uses. Pure, so it is tested without a
// database.

type Tables = Database["public"]["Tables"];
export type OrderRow = Tables["orders"]["Row"];
export type OrderItemRow = Tables["order_items"]["Row"];
export type ShipmentRow = Tables["shipments"]["Row"];

const text = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;

// The address is stored as JSON that Stripe's data was copied into, so check it rather than trust it.
export const parseShippingAddress = (value: unknown): ShippingAddress | null => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  const source = value as Record<string, unknown>;
  const name = text(source["name"]);
  const line1 = text(source["line1"]);
  const city = text(source["city"]);
  const postcode = text(source["postcode"]);
  const country = text(source["country"]);
  if (!name || !line1 || !city || !postcode || !country) {
    return null;
  }

  const line2 = text(source["line2"]);
  const county = text(source["county"]);
  return {
    name,
    line1,
    city,
    postcode,
    country,
    ...(line2 ? { line2 } : {}),
    ...(county ? { county } : {}),
  };
};

export const orderFromRow = (row: OrderRow): OrderRecord => {
  if (!isOrderStatus(row.status)) {
    throw new Error(`Order ${row.number} has an unknown status "${row.status}"`);
  }
  return {
    id: row.id,
    number: row.number,
    status: row.status,
    currency: row.currency,
    subtotalMinor: row.subtotal_minor,
    shippingMinor: row.shipping_minor,
    taxMinor: row.tax_minor,
    totalMinor: row.total_minor,
    customerEmail: row.customer_email,
    customerName: row.customer_name,
    shippingAddress: parseShippingAddress(row.shipping_address),
    stripeSessionId: row.stripe_session_id,
    createdAt: row.created_at,
    paidAt: row.paid_at,
  };
};

export const itemFromRow = (row: OrderItemRow): OrderItemRecord => ({
  sku: row.sku,
  title: row.title,
  variantTitle: row.variant_title,
  unitPriceMinor: row.unit_price_minor,
  quantity: row.quantity,
  lineTotalMinor: row.line_total_minor,
  imagePath: row.image_path,
});

export const shipmentFromRow = (row: ShipmentRow): ShipmentRecord => ({
  carrier: row.carrier,
  trackingNumber: row.tracking_number,
  trackingUrl: row.tracking_url,
  shippedAt: row.shipped_at,
  deliveredAt: row.delivered_at,
});
