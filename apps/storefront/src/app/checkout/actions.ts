"use server";

import { headers } from "next/headers";
import { startStoreCheckout } from "@/lib/checkout/start";
import { clientAddress } from "@/lib/client-address";
import { createRateLimiter } from "@/lib/rate-limit";

// What the cart button gets back. Plain, serialisable, and with wording safe to show a customer:
// nothing here reveals how the server works.
export type CheckoutActionResult = { ok: true; url: string } | { ok: false; message: string };

// Each attempt records an order and calls Stripe, so a script must not be able to spin them up
// endlessly. Ten attempts in ten minutes is generous for a real customer.
const limiter = createRateLimiter({ limit: 10, windowMs: 10 * 60 * 1000 });

const GENERIC_FAILURE =
  "We couldn’t start your payment just now. Nothing has been charged. Please try again in a moment.";

export const beginCheckout = async (lines: unknown): Promise<CheckoutActionResult> => {
  const address = clientAddress(await headers());
  if (!limiter.take(address).allowed) {
    return {
      ok: false,
      message: "That’s a lot of attempts. Please wait a few minutes and try again.",
    };
  }

  try {
    const result = await startStoreCheckout(lines);
    if (result.ok) {
      return { ok: true, url: result.url };
    }

    switch (result.reason) {
      case "demo_mode":
        return { ok: false, message: "Checkout isn’t switched on for this demo catalog." };
      case "invalid_request":
        return {
          ok: false,
          message: "Your cart couldn’t be read. Please refresh the page and try again.",
        };
      case "cart_problems":
        return {
          ok: false,
          message:
            "Some items in your cart can’t be bought right now. Please check your cart and try again.",
        };
      case "payment_unavailable":
        return { ok: false, message: GENERIC_FAILURE };
    }
  } catch (error) {
    console.error("[checkout] unexpected failure", error);
    return { ok: false, message: GENERIC_FAILURE };
  }
};
