import { EMAIL_KINDS } from "@dropship/core";
import { describe, expect, it } from "vitest";
import type { OrderDetails } from "../orders/types";
import { escapeHtml, renderOrderEmail, type OrderEmailContext } from "./templates";

const details: OrderDetails = {
  order: {
    id: "bbbbbbbb-cccc-4ddd-8eee-ffffffffffff",
    number: "PP-7K3M-9Q2X",
    status: "paid",
    currency: "GBP",
    subtotalMinor: 4997,
    shippingMinor: 0,
    taxMinor: 833,
    totalMinor: 4997,
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
  },
  items: [
    {
      sku: "DOG-BED-M",
      title: "Cloud Comfort Dog Bed",
      variantTitle: "Medium",
      unitPriceMinor: 2999,
      quantity: 1,
      lineTotalMinor: 2999,
      imagePath: null,
    },
    {
      sku: "BALL",
      title: "Bouncy Ball",
      variantTitle: "Default Title",
      unitPriceMinor: 999,
      quantity: 2,
      lineTotalMinor: 1998,
      imagePath: null,
    },
  ],
  shipment: {
    carrier: "Royal Mail",
    trackingNumber: "AB123456789GB",
    trackingUrl: "https://www.royalmail.com/track-your-item#/tracking-results/AB123456789GB",
    shippedAt: "2026-10-13T08:00:00Z",
    deliveredAt: null,
  },
};

const money = (minor: number): string => `£${(minor / 100).toFixed(2)}`;

const context = (overrides: Partial<OrderEmailContext> = {}): OrderEmailContext => ({
  storeName: "Pilot Pets",
  origin: "https://pilotpets.example.com",
  supportEmail: "hello@pilotpets.example.com",
  returnsWindowDays: 30,
  locale: "en-GB",
  colours: {
    primary: "#35302B",
    primaryForeground: "#FFFFFF",
    emphasis: "#6B4A2F",
    surface: "#F6EFE6",
    foreground: "#33302C",
    background: "#FFFBF5",
  },
  details,
  statusUrl: "https://pilotpets.example.com/orders/PP-7K3M-9Q2X?t=abc.def.ghi",
  money,
  delivery: { kind: "date", latest: "2026-10-19" },
  deliveryMaxWorkingDays: 5,
  ...overrides,
});

describe("escapeHtml", () => {
  it("neutralises everything that could open a tag or an attribute", () => {
    expect(escapeHtml(`<script>alert("x")</script> & 'y'`)).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;y&#39;",
    );
  });
});

describe("renderOrderEmail", () => {
  it("writes an email for every kind the database can queue", () => {
    for (const kind of EMAIL_KINDS) {
      const email = renderOrderEmail(kind, context());

      expect(email.subject, kind).toBeTruthy();
      expect(email.html, kind).toContain("<!doctype html>");
      expect(email.text, kind).toContain("PP-7K3M-9Q2X");
    }
  });

  describe("confirmation", () => {
    const email = renderOrderEmail("order_confirmation", context());

    it("names the order in the subject", () => {
      expect(email.subject).toBe("Thanks, we've got your order PP-7K3M-9Q2X");
    });

    it("lists what was bought, what was paid and where it is going", () => {
      for (const body of [email.html, email.text]) {
        expect(body).toContain("Cloud Comfort Dog Bed (Medium)");
        expect(body).toContain("Bouncy Ball");
        expect(body).not.toContain("Default Title");
        expect(body).toContain("£49.97");
        expect(body).toContain("LS1 1AA");
      }
    });

    it("promises a date, and says what is included in the price", () => {
      expect(email.text).toContain("by Mon 19 Oct");
      expect(email.text).toContain("Delivery  Free");
      expect(email.text).toContain("includes VAT of £8.33");
      expect(email.html).toContain("Includes VAT of £8.33");
    });

    it("leaves VAT out while the business is not registered", () => {
      const unregistered = renderOrderEmail(
        "order_confirmation",
        context({ details: { ...details, order: { ...details.order, taxMinor: 0 } } }),
      );

      expect(unregistered.html).not.toContain("VAT");
      expect(unregistered.text).not.toContain("VAT");
    });

    it("falls back to the promise in days when no date can be trusted", () => {
      const undated = renderOrderEmail(
        "order_confirmation",
        context({ delivery: { kind: "within", workingDays: 5 } }),
      );

      expect(undated.text).toContain("within 5 working days");
    });

    it("links to the order, the returns policy and support", () => {
      expect(email.html).toContain(
        'href="https://pilotpets.example.com/orders/PP-7K3M-9Q2X?t=abc.def.ghi"',
      );
      expect(email.html).toContain("https://pilotpets.example.com/returns");
      expect(email.html).toContain("mailto:hello@pilotpets.example.com");
      expect(email.text).toContain(
        "https://pilotpets.example.com/orders/PP-7K3M-9Q2X?t=abc.def.ghi",
      );
    });

    it("greets by first name, or politely without one", () => {
      expect(email.text).toContain("Thanks, Alex.");
      const anonymous = renderOrderEmail(
        "order_confirmation",
        context({ details: { ...details, order: { ...details.order, customerName: null } } }),
      );

      expect(anonymous.text).toContain("Thanks, there.");
    });
  });

  describe("shipped", () => {
    const email = renderOrderEmail("order_shipped", context());

    it("gives the carrier, the tracking number and a tracking link", () => {
      expect(email.subject).toBe("Your order PP-7K3M-9Q2X is on its way");
      for (const body of [email.html, email.text]) {
        expect(body).toContain("Royal Mail");
        expect(body).toContain("AB123456789GB");
        expect(body).toContain("https://www.royalmail.com/track-your-item");
      }
    });

    it("still reads well when there is no tracking yet", () => {
      const untracked = renderOrderEmail(
        "order_shipped",
        context({ details: { ...details, shipment: null } }),
      );

      expect(untracked.text).not.toContain("Carrier");
      expect(untracked.html).toContain("has been sent");
    });
  });

  describe("delivered", () => {
    const email = renderOrderEmail("order_delivered", context());

    it("says so, and says how long they have to send it back", () => {
      expect(email.subject).toBe("Your order PP-7K3M-9Q2X has been delivered");
      expect(email.text).toContain("30 days to send anything back");
    });
  });

  describe("safety", () => {
    const hostile: OrderDetails = {
      ...details,
      order: {
        ...details.order,
        customerName: `<img src=x onerror=alert(1)>`,
        shippingAddress: {
          name: `"><script>steal()</script>`,
          line1: "1 <b>Dog</b> Lane",
          city: "Leeds",
          postcode: "LS1 1AA",
          country: "GB",
        },
      },
      items: [{ ...details.items[0]!, title: `Bed <script>alert(1)</script> & more` }],
      shipment: {
        ...details.shipment!,
        carrier: `Evil" onmouseover="x`,
        trackingUrl: `https://a.example/"><script>`,
      },
    };

    it("never lets customer-supplied text become markup", () => {
      for (const kind of EMAIL_KINDS) {
        const { html } = renderOrderEmail(kind, context({ details: hostile }));

        expect(html, kind).not.toMatch(/<script|<img |<b>/);
        // the text is still there, harmlessly escaped
        expect(html, kind).toContain("&lt;");
      }
    });

    it("does not let a subject carry a line break", () => {
      for (const kind of EMAIL_KINDS) {
        expect(renderOrderEmail(kind, context()).subject).not.toMatch(/[\r\n]/);
      }
    });
  });
});
