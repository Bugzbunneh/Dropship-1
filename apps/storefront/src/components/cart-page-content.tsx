"use client";

import { ShoppingBag, ShieldCheck, Truck } from "lucide-react";
import Link from "next/link";
import { useCartSummary } from "@/lib/cart/use-cart";
import { buttonClasses } from "@/lib/ui";
import { CartLines, FreeShippingBar } from "./cart-lines";
import { OrderSummary } from "./order-summary";
import { useStoreSettings } from "./store-settings";

// The full cart page. The cart lives in the visitor's browser, so this is built on the client once
// the saved cart has been read; until then it shows a placeholder the same size as the real thing.
export const CartPageContent = () => {
  const { summary, hydrated, isPricing, failed } = useCartSummary();
  const { departments, deliveryMaxWorkingDays } = useStoreSettings();

  if (!hydrated) {
    return (
      <div
        className="grid gap-8 lg:grid-cols-[1fr_24rem]"
        aria-busy="true"
        aria-label="Loading your cart"
      >
        <div className="h-64 animate-pulse rounded-3xl bg-surface" />
        <div className="h-64 animate-pulse rounded-3xl bg-surface" />
      </div>
    );
  }

  if (summary.lines.length === 0) {
    return (
      <div
        className="flex flex-col items-center gap-4 rounded-3xl bg-surface px-6 py-16 text-center"
        data-testid="empty-cart"
      >
        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-background shadow-sm">
          <ShoppingBag aria-hidden="true" className="h-10 w-10 text-emphasis" />
        </span>
        <p className="font-heading text-2xl font-bold">Your cart is empty</p>
        <p className="max-w-md text-foreground/80">
          Nothing here yet. Find something your pet will love and it’ll wait for you here.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {departments.map((department) => (
            <Link
              key={department.slug}
              href={`/${department.slug}`}
              className={buttonClasses("primary", "md")}
            >
              Shop {department.name}
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[1fr_24rem] lg:gap-12">
      <div className="space-y-6">
        {failed ? (
          <p role="alert" className="rounded-2xl bg-sale/10 p-4 font-semibold text-sale">
            We couldn’t refresh your prices just now. The totals below may be out of date.
          </p>
        ) : null}
        {isPricing ? (
          <p className="text-sm text-foreground/70" role="status">
            Updating prices…
          </p>
        ) : null}
        <CartLines summary={summary} />
        {summary.hasUnavailableLines ? (
          <p className="rounded-2xl bg-surface p-4 text-sm">
            Some items can’t be bought right now. They’re not included in your total.
          </p>
        ) : null}
      </div>

      <aside
        className="space-y-5 rounded-3xl border border-muted bg-surface/50 p-6 lg:sticky lg:top-28"
        aria-label="Order summary"
      >
        <h2 className="text-xl font-bold">Order summary</h2>
        <FreeShippingBar summary={summary} />
        <OrderSummary summary={summary} />
        <ul className="space-y-2 border-t border-muted pt-5 text-sm text-foreground/80">
          <li className="flex items-center gap-2">
            <Truck aria-hidden="true" className="h-4 w-4 shrink-0 text-emphasis" />
            Delivered within {deliveryMaxWorkingDays} working days
          </li>
          <li className="flex items-center gap-2">
            <ShieldCheck aria-hidden="true" className="h-4 w-4 shrink-0 text-emphasis" />
            Secure payment with Stripe
          </li>
        </ul>
        <Link href="/" className={buttonClasses("ghost", "md", "w-full")}>
          Continue shopping
        </Link>
      </aside>
    </div>
  );
};
