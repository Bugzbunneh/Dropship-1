"use client";

import { Loader2, Lock } from "lucide-react";
import { useState } from "react";
import { beginCheckout } from "@/app/checkout/actions";
import { useCartStore } from "@/lib/cart/store";
import type { CartSummary } from "@/lib/cart/totals";
import { buttonClasses } from "@/lib/ui";

// Sends the customer to Stripe's payment page. Only the variants and quantities leave the browser:
// the server prices the order again from scratch, so nothing here can change what is charged.
export const CheckoutButton = ({ summary }: { summary: CartSummary }) => {
  const hydrated = useCartStore((state) => state.hydrated);
  const [working, setWorking] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const buyable = summary.lines
    .filter((line) => line.purchasable)
    .map((line) => ({ variantId: line.variantId, quantity: line.quantity }));
  const disabled = !hydrated || buyable.length === 0 || working;

  const handleClick = async () => {
    setWorking(true);
    setProblem(null);
    try {
      const result = await beginCheckout(buyable);
      if (result.ok) {
        // leave the button in its busy state: the browser is about to move to Stripe's page
        window.location.assign(result.url);
        return;
      }
      setProblem(result.message);
    } catch {
      setProblem("Something went wrong on our side. Nothing has been charged. Please try again.");
    }
    setWorking(false);
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        aria-busy={working}
        className={buttonClasses("dark", "lg", "w-full")}
        data-testid="checkout-button"
      >
        {working ? (
          <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
        ) : (
          <Lock aria-hidden="true" className="h-4 w-4" />
        )}
        {working ? "Taking you to payment…" : "Checkout securely"}
      </button>
      {problem ? (
        <p role="alert" className="rounded-xl bg-sale/10 p-3 text-sm font-semibold text-sale">
          {problem}
        </p>
      ) : null}
      <p className="text-center text-sm text-foreground/85">
        You’ll pay on Stripe’s secure page. We never see your card details.
      </p>
    </div>
  );
};
