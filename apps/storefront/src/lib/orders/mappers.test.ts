import { describe, expect, it } from "vitest";
import {
  itemFromRow,
  orderFromRow,
  parseShippingAddress,
  shipmentFromRow,
  type OrderRow,
} from "./mappers";

const row: OrderRow = {
  id: "bbbbbbbb-cccc-4ddd-8eee-ffffffffffff",
  store_id: "00000000-0000-4000-8000-0000000000a0",
  number: "PP-7K3M-9Q2X",
  status: "paid",
  currency: "GBP",
  subtotal_minor: 2999,
  shipping_minor: 399,
  tax_minor: 566,
  total_minor: 3398,
  customer_email: "alex@example.com",
  customer_name: "Alex Example",
  customer_phone: null,
  shipping_address: {
    name: "Alex Example",
    line1: "1 Dog Lane",
    city: "Leeds",
    postcode: "LS1 1AA",
    country: "GB",
  },
  stripe_session_id: "cs_test_1",
  stripe_payment_intent_id: "pi_1",
  paid_at: "2026-10-12T10:00:00Z",
  created_at: "2026-10-12T09:55:00Z",
  updated_at: "2026-10-12T10:00:00Z",
};

describe("parseShippingAddress", () => {
  it("reads a complete address and drops empty optional lines", () => {
    expect(
      parseShippingAddress({ ...(row.shipping_address as object), line2: "  ", county: "" }),
    ).toEqual({
      name: "Alex Example",
      line1: "1 Dog Lane",
      city: "Leeds",
      postcode: "LS1 1AA",
      country: "GB",
    });
  });

  it("keeps the optional lines when present", () => {
    const parsed = parseShippingAddress({
      name: "A",
      line1: "1",
      line2: "Flat 2",
      city: "C",
      county: "West Yorkshire",
      postcode: "P",
      country: "GB",
    });

    expect(parsed).toMatchObject({ line2: "Flat 2", county: "West Yorkshire" });
  });

  it.each([null, undefined, "text", 5, [], {}, { name: "A", line1: "1" }])(
    "returns null for %j",
    (value) => {
      expect(parseShippingAddress(value)).toBeNull();
    },
  );
});

describe("orderFromRow", () => {
  it("maps a row to the storefront's shape", () => {
    expect(orderFromRow(row)).toEqual({
      id: row.id,
      number: "PP-7K3M-9Q2X",
      status: "paid",
      currency: "GBP",
      subtotalMinor: 2999,
      shippingMinor: 399,
      taxMinor: 566,
      totalMinor: 3398,
      customerEmail: "alex@example.com",
      customerName: "Alex Example",
      shippingAddress: {
        name: "Alex Example",
        line1: "1 Dog Lane",
        city: "Leeds",
        postcode: "LS1 1AA",
        country: "GB",
      },
      stripeSessionId: "cs_test_1",
      createdAt: "2026-10-12T09:55:00Z",
      paidAt: "2026-10-12T10:00:00Z",
    });
  });

  it("refuses a status the code does not know, rather than guessing", () => {
    expect(() => orderFromRow({ ...row, status: "teleported" })).toThrow(/unknown status/);
  });
});

describe("itemFromRow and shipmentFromRow", () => {
  it("map line and shipment rows", () => {
    expect(
      itemFromRow({
        id: "i1",
        store_id: row.store_id,
        order_id: row.id,
        variant_id: null,
        sku: "SKU",
        title: "Dog bed",
        variant_title: "Medium",
        unit_price_minor: 2999,
        quantity: 1,
        line_total_minor: 2999,
        image_path: null,
        created_at: "2026-10-12T09:55:00Z",
      }),
    ).toEqual({
      sku: "SKU",
      title: "Dog bed",
      variantTitle: "Medium",
      unitPriceMinor: 2999,
      quantity: 1,
      lineTotalMinor: 2999,
      imagePath: null,
    });

    expect(
      shipmentFromRow({
        id: "s1",
        store_id: row.store_id,
        order_id: row.id,
        carrier: "Royal Mail",
        tracking_number: "AB123",
        tracking_url: "https://track.example.com/AB123",
        shipped_at: "2026-10-13T08:00:00Z",
        delivered_at: null,
        created_at: "2026-10-13T08:00:00Z",
      }),
    ).toEqual({
      carrier: "Royal Mail",
      trackingNumber: "AB123",
      trackingUrl: "https://track.example.com/AB123",
      shippedAt: "2026-10-13T08:00:00Z",
      deliveredAt: null,
    });
  });
});
