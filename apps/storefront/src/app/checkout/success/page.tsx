import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CheckCircle2, Clock3, ShoppingBag } from "lucide-react";
import { ClearCart } from "@/components/orders/clear-cart";
import { OrderDetailsCard } from "@/components/orders/order-details-card";
import { OrderProgress } from "@/components/orders/order-progress";
import { OrderRefresher } from "@/components/orders/order-refresher";
import { loadReturnedCheckout } from "@/lib/checkout/return";
import { getStoreConfig } from "@/lib/store";
import { buttonClasses } from "@/lib/ui";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

// Private to the customer who just paid: not for search engines, and the address holds a secret.
export const metadata: Metadata = {
  title: "Thank you",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

const firstName = (name: string | null): string => name?.trim().split(/\s+/)[0] ?? "";

const NotFound = () => (
  <div className="mx-auto max-w-xl space-y-4 text-center">
    <h1 className="text-3xl font-bold">We couldn’t find that order</h1>
    <p className="text-foreground/80">
      If you’ve just paid, give it a minute and try again. Otherwise, you can look your order up
      with its number and email address.
    </p>
    <div className="flex flex-wrap justify-center gap-3">
      <Link href="/orders/lookup" className={buttonClasses("primary", "md")}>
        Find my order
      </Link>
      <Link href="/contact" className={buttonClasses("secondary", "md")}>
        Contact us
      </Link>
    </div>
  </div>
);

const Content = async ({ searchParams }: { searchParams: SearchParams }) => {
  const { session_id: sessionId } = await searchParams;
  const [result, config] = await Promise.all([loadReturnedCheckout(sessionId), getStoreConfig()]);

  if (result.kind === "not_found") {
    return <NotFound />;
  }

  const { details, paymentReceived, abandoned, statusUrl } = result;
  const { order } = details;
  const isConfirmed = order.status !== "pending_payment" && order.status !== "cancelled";

  if (!isConfirmed && !paymentReceived) {
    return (
      <div className="mx-auto max-w-xl space-y-4 text-center" data-testid="payment-incomplete">
        <ShoppingBag aria-hidden="true" className="mx-auto h-12 w-12 text-emphasis" />
        <h1 className="text-3xl font-bold">
          {abandoned ? "Your payment wasn’t completed" : "Waiting for your payment"}
        </h1>
        <p className="text-foreground/80">
          {abandoned
            ? "You haven’t been charged, and everything in your cart is still saved."
            : "Your bank is still confirming the payment. We’ll email you the moment it arrives."}
        </p>
        <Link href="/cart" className={buttonClasses("primary", "md")}>
          Back to my cart
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <ClearCart />
      {isConfirmed ? null : <OrderRefresher />}

      <div className="space-y-3 text-center" data-testid="order-confirmed">
        {isConfirmed ? (
          <CheckCircle2 aria-hidden="true" className="mx-auto h-14 w-14 text-emphasis" />
        ) : (
          <Clock3 aria-hidden="true" className="mx-auto h-14 w-14 text-emphasis" />
        )}
        <h1 className="text-3xl font-bold sm:text-4xl">
          {isConfirmed
            ? `Thank you${firstName(order.customerName) ? `, ${firstName(order.customerName)}` : ""}!`
            : "Payment received"}
        </h1>
        <p className="text-lg text-foreground/85">
          {isConfirmed ? (
            <>
              Your order number is <strong data-testid="order-number">{order.number}</strong>.
              {order.customerEmail ? (
                <> We’re emailing a confirmation to {order.customerEmail}.</>
              ) : null}
            </>
          ) : (
            <>
              We’re confirming your order. This page updates by itself, so there’s no need to
              refresh.
            </>
          )}
        </p>
      </div>

      {isConfirmed ? <OrderProgress status={order.status} /> : null}

      <OrderDetailsCard details={details} locale={config.locale} />

      <div className="flex flex-wrap justify-center gap-3">
        <Link href={statusUrl} className={buttonClasses("primary", "md")}>
          Track this order
        </Link>
        <Link href="/" className={buttonClasses("secondary", "md")}>
          Keep shopping
        </Link>
      </div>
    </div>
  );
};

const CheckoutSuccessPage = ({ searchParams }: { searchParams: SearchParams }) => (
  <div className="container-page py-10 lg:py-14">
    <Suspense
      fallback={
        <div
          className="mx-auto max-w-2xl space-y-4"
          aria-busy="true"
          aria-label="Loading your order"
        >
          <div className="mx-auto h-12 w-64 animate-pulse rounded-2xl bg-surface" />
          <div className="h-64 animate-pulse rounded-3xl bg-surface" />
        </div>
      }
    >
      <Content searchParams={searchParams} />
    </Suspense>
  </div>
);

export default CheckoutSuccessPage;
