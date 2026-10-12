import type { Metadata } from "next";
import Link from "next/link";
import { PolicyPage } from "@/components/policy-page";
import { formatMoney } from "@/lib/money";
import { getStoreConfig } from "@/lib/store";

export const metadata: Metadata = {
  title: "Delivery",
  description: "How long delivery takes, what it costs and what to do if something goes wrong.",
  alternates: { canonical: "/delivery" },
};

const DeliveryPage = async () => {
  const config = await getStoreConfig();
  const { policies, shipping } = config;
  const money = (minor: number): string => formatMoney(minor, config.currency, config.locale);
  const days = policies.deliveryMaxWorkingDays;

  return (
    <PolicyPage
      title="Delivery"
      path="/delivery"
      legal
      intro={`We aim to get every order to you within ${days} working days.`}
    >
      <h2>Where we deliver</h2>
      <p>We currently deliver to addresses in the United Kingdom.</p>

      <h2>How long it takes</h2>
      <p>
        We aim to deliver your order within <strong>{days} working days</strong> of you placing it.
        Working days are Monday to Friday, not counting bank holidays. An order placed at a weekend
        or on a bank holiday counts from the next working day.
      </p>
      <p>
        On each product page we show the latest date you can expect it, worked out from today’s
        date. This is an estimate of when your order should arrive, not a guarantee, but it’s the
        date we work to.
      </p>

      <h2>What it costs</h2>
      <ul>
        <li>
          Delivery is <strong>{money(shipping.flatRateMinor)}</strong>.
        </li>
        <li>
          Delivery is <strong>free</strong> when your basket comes to{" "}
          <strong>{money(shipping.freeThresholdMinor)}</strong> or more.
        </li>
      </ul>
      <p>
        The delivery cost is always shown in your basket before you pay. There are no hidden
        charges.
      </p>

      <h2>Tracking your order</h2>
      <p>
        When your order is dispatched we’ll email you with tracking details, so you can see where it
        is. You can also check on any order at any time, with no account needed, using your order
        number and email address: <Link href="/orders/lookup">find my order</Link>. If you haven’t
        heard from us, check your spam folder, then get in touch.
      </p>

      <h2>If your order is late, damaged or wrong</h2>
      <ul>
        <li>
          <strong>Late:</strong> if your order hasn’t arrived within {days} working days,{" "}
          <Link href="/contact">contact us</Link> and we’ll chase it straight away. If we don’t
          deliver within the time we promised, you may also have the right to cancel and be refunded
          under the Consumer Rights Act 2015.
        </li>
        <li>
          <strong>Damaged or wrong item:</strong> tell us as soon as you can with your order number
          and a photo, and we’ll arrange a replacement or refund. See our{" "}
          <Link href="/returns">returns policy</Link>.
        </li>
      </ul>
    </PolicyPage>
  );
};

export default DeliveryPage;
