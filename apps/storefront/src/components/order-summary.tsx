"use client";

import { Lock } from "lucide-react";
import type { CartSummary } from "@/lib/cart/totals";
import { buttonClasses } from "@/lib/ui";
import { useMoney } from "./store-settings";

// Subtotal, delivery and total, with the checkout button. Checkout itself arrives in Phase 2, so
// for now the button says so rather than pretending: nothing here takes an order or a payment.
export const OrderSummary = ({ summary }: { summary: CartSummary }) => {
  const format = useMoney();

  return (
    <div className="space-y-3" data-testid="order-summary">
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between">
          <dt>Subtotal</dt>
          <dd className="font-semibold">{format(summary.subtotalMinor)}</dd>
        </div>
        {summary.savingsMinor > 0 ? (
          <div className="flex justify-between text-sale">
            <dt>You’re saving</dt>
            <dd className="font-semibold">-{format(summary.savingsMinor)}</dd>
          </div>
        ) : null}
        <div className="flex justify-between">
          <dt>Delivery</dt>
          <dd className="font-semibold">
            {summary.shippingMinor === 0 ? "Free" : format(summary.shippingMinor)}
          </dd>
        </div>
        <div className="flex justify-between border-t border-muted pt-3 text-lg">
          <dt className="font-bold">Total</dt>
          <dd className="font-bold" data-testid="cart-total">
            {format(summary.totalMinor)}
          </dd>
        </div>
      </dl>

      <button
        type="button"
        disabled
        className={buttonClasses("dark", "lg", "w-full")}
        aria-describedby="checkout-note"
      >
        <Lock aria-hidden="true" className="h-4 w-4" />
        Checkout
      </button>
      <p id="checkout-note" className="text-center text-sm text-foreground/70">
        Secure checkout is coming soon. Your cart is saved on this device.
      </p>
    </div>
  );
};
