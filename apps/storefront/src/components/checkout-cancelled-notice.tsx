"use client";

import { useSearchParams } from "next/navigation";

// Shown when the customer used "back" on Stripe's payment page: reassurance that nothing happened.
export const CheckoutCancelledNotice = () => {
  const cancelled = useSearchParams().get("checkout") === "cancelled";
  if (!cancelled) {
    return null;
  }
  return (
    <p
      role="status"
      className="mb-6 rounded-2xl bg-surface p-4 font-semibold"
      data-testid="checkout-cancelled"
    >
      You left the payment page, so nothing has been charged. Your cart is saved below.
    </p>
  );
};
