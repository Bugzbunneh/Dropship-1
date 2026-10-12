import type { OrderDraft } from "@dropship/core";
import type Stripe from "stripe";

// The Checkout Session a customer is sent to. Pure: it only builds the request, so it can be
// tested without Stripe. Everything in it comes from the order we already recorded, never from the
// browser.

export type SessionStore = {
  id: string;
  slug: string;
  name: string;
};

export type SessionInput = {
  orderId: string;
  orderNumber: string;
  draft: OrderDraft;
  store: SessionStore;
  // the public address of this storefront, with no trailing slash
  origin: string;
  shippingCountries: string[];
  deliveryMaxWorkingDays: number;
  // seconds since the epoch; passed in so tests are exact
  nowSeconds: number;
};

// Stripe refuses a checkout that lasts less than 30 minutes; a little more avoids a race at the edge.
export const CHECKOUT_LIFETIME_SECONDS = 31 * 60;

const productName = (title: string, variantTitle: string): string => {
  const isDefault = /^(default|default title)$/i.test(variantTitle.trim());
  const sameAsTitle = variantTitle.trim().toLowerCase() === title.trim().toLowerCase();
  return isDefault || sameAsTitle || variantTitle.trim() === ""
    ? title
    : `${title} (${variantTitle})`;
};

// Stripe shows product pictures on its page, but only from public https addresses. Our demo
// illustrations are generated SVGs on the storefront itself, which Stripe would not render.
const publicImage = (origin: string, path: string | null): string[] => {
  if (!path || path.startsWith("/placeholder.svg") || path.endsWith(".svg")) {
    return [];
  }
  const absolute = path.startsWith("http") ? path : `${origin}${path}`;
  return absolute.startsWith("https://") ? [absolute] : [];
};

// The tags that tie everything in Stripe back to one store and one order (README: Stripe objects
// are tagged with the store). Metadata values are strings.
export const stripeMetadata = (input: SessionInput): Record<string, string> => ({
  store_id: input.store.id,
  store_slug: input.store.slug,
  order_id: input.orderId,
  order_number: input.orderNumber,
});

export const buildCheckoutSessionParams = (
  input: SessionInput,
): Stripe.Checkout.SessionCreateParams => {
  const { draft, store, origin } = input;
  const currency = draft.currency.toLowerCase();
  const metadata = stripeMetadata(input);

  return {
    mode: "payment",
    client_reference_id: input.orderId,
    locale: "en-GB",
    currency,
    // The store sells in pounds. Left on, Stripe offers visitors a euro price with a conversion
    // fee added, which is confusing and costs the customer money for no reason.
    adaptive_pricing: { enabled: false },
    line_items: draft.items.map((item) => ({
      quantity: item.quantity,
      price_data: {
        currency,
        unit_amount: item.unitPriceMinor,
        product_data: {
          name: productName(item.title, item.variantTitle),
          images: publicImage(origin, item.imagePath),
          metadata: { sku: item.sku },
        },
      },
    })),
    shipping_address_collection: {
      allowed_countries:
        input.shippingCountries as Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[],
    },
    shipping_options: [
      {
        shipping_rate_data: {
          type: "fixed_amount",
          display_name: draft.shippingMinor === 0 ? "Free delivery" : "Standard delivery",
          fixed_amount: { amount: draft.shippingMinor, currency },
          delivery_estimate: {
            minimum: { unit: "business_day", value: 1 },
            maximum: { unit: "business_day", value: input.deliveryMaxWorkingDays },
          },
        },
      },
    ],
    phone_number_collection: { enabled: true },
    billing_address_collection: "auto",
    custom_text: {
      submit: {
        message: `By paying you agree to our [Terms](${origin}/terms) and [Returns policy](${origin}/returns).`,
      },
    },
    success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/cart?checkout=cancelled`,
    expires_at: input.nowSeconds + CHECKOUT_LIFETIME_SECONDS,
    metadata,
    payment_intent_data: {
      description: `${store.name} order ${input.orderNumber}`,
      metadata,
    },
  };
};
