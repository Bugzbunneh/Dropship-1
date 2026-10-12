import { customerStageOf } from "@dropship/core";
import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { OrderDetailsCard } from "@/components/orders/order-details-card";
import { OrderProgress } from "@/components/orders/order-progress";
import { estimateDelivery, formatShortDate } from "@/lib/delivery/working-days";
import { noticeForStatus, type OrderNotice } from "@/lib/orders/notices";
import { loadOrderForVisitor } from "@/lib/orders/view";
import { getStoreConfig } from "@/lib/store";
import { buttonClasses, cn } from "@/lib/ui";

type Params = Promise<{ number: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

// Private: never indexed, and the address holds a secret, so it is not passed on to other sites.
export const metadata: Metadata = {
  title: "Your order",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

const toneClasses: Record<OrderNotice["tone"], string> = {
  info: "border-muted bg-surface",
  good: "border-emphasis bg-surface",
  warning: "border-sale bg-sale/10",
};

const dateOf = (iso: string | null, locale: string): string | undefined =>
  iso ? formatShortDate(iso.slice(0, 10), locale) : undefined;

const Content = async ({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) => {
  const [{ number }, { t: token }, config] = await Promise.all([
    params,
    searchParams,
    getStoreConfig(),
  ]);

  const details = await loadOrderForVisitor(number, typeof token === "string" ? token : undefined);
  if (!details) {
    // Not shown why: it could be a wrong number, a missing order or a bad link
    redirect(`/orders/lookup?order=${encodeURIComponent(number)}`);
  }

  const { order, shipment } = details;
  const stage = customerStageOf(order.status);
  const deliveredOn = dateOf(shipment?.deliveredAt ?? null, config.locale);
  const notice = noticeForStatus(order.status, deliveredOn);
  const estimate =
    order.paidAt && (stage === "preparing" || stage === "on_its_way")
      ? estimateDelivery(new Date(order.paidAt), config.policies.deliveryMaxWorkingDays)
      : undefined;
  const showProgress =
    stage !== "cancelled" && stage !== "refunded" && stage !== "awaiting_payment";

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold sm:text-4xl">
          Order <span data-testid="order-number">{order.number}</span>
        </h1>
        <p className="text-foreground/80">
          Placed on {formatShortDate(order.createdAt.slice(0, 10), config.locale)}
        </p>
      </div>

      {showProgress ? <OrderProgress status={order.status} /> : null}

      {notice ? (
        <aside
          role="note"
          className={cn("space-y-1 rounded-2xl border-2 p-4", toneClasses[notice.tone])}
          data-testid="order-notice"
        >
          <p className="font-bold">{notice.title}</p>
          <p className="text-sm">{notice.body}</p>
        </aside>
      ) : null}

      {estimate && stage !== "delivered" ? (
        <p className="text-lg" data-testid="order-estimate">
          {estimate.kind === "date" ? (
            <>
              Expected by <strong>{formatShortDate(estimate.latest, config.locale)}</strong>
            </>
          ) : (
            <>
              Expected within <strong>{config.policies.deliveryMaxWorkingDays} working days</strong>
            </>
          )}
        </p>
      ) : null}

      {shipment ? (
        <section
          aria-labelledby="tracking-heading"
          className="space-y-2 rounded-2xl border border-muted p-4"
          data-testid="order-tracking"
        >
          <h2 id="tracking-heading" className="font-heading text-xl font-bold">
            Tracking
          </h2>
          <p>
            Sent with <strong>{shipment.carrier}</strong>
            {shipment.trackingNumber ? (
              <>
                , tracking number <strong>{shipment.trackingNumber}</strong>
              </>
            ) : null}
          </p>
          {shipment.trackingUrl ? (
            <a
              href={shipment.trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClasses("secondary", "md")}
            >
              Track your parcel
              <ExternalLink aria-hidden="true" className="h-4 w-4" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          ) : null}
        </section>
      ) : null}

      <OrderDetailsCard details={details} locale={config.locale} />

      <p className="text-sm text-foreground/80">
        Need help? Reply to any of our emails or{" "}
        <Link href="/contact" className="font-bold text-emphasis underline underline-offset-4">
          get in touch
        </Link>
        . You can send anything back within {config.policies.returnsWindowDays} days: see our{" "}
        <Link href="/returns" className="font-bold text-emphasis underline underline-offset-4">
          returns policy
        </Link>
        .
      </p>
    </div>
  );
};

const OrderPage = ({ params, searchParams }: { params: Params; searchParams: SearchParams }) => (
  <div className="container-page py-8 lg:py-12">
    <Breadcrumbs
      items={[
        { name: "Home", href: "/" },
        { name: "Your order", href: "/orders/lookup" },
      ]}
      className="mb-6"
    />
    <Suspense
      fallback={
        <div
          className="mx-auto max-w-2xl space-y-4"
          aria-busy="true"
          aria-label="Loading your order"
        >
          <div className="h-12 w-72 animate-pulse rounded-2xl bg-surface" />
          <div className="h-24 animate-pulse rounded-3xl bg-surface" />
          <div className="h-64 animate-pulse rounded-3xl bg-surface" />
        </div>
      }
    >
      <Content params={params} searchParams={searchParams} />
    </Suspense>
  </div>
);

export default OrderPage;
