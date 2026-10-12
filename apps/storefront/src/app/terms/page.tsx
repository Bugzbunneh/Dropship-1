import type { Metadata } from "next";
import Link from "next/link";
import { PolicyPage } from "@/components/policy-page";
import { getStoreConfig } from "@/lib/store";

export const metadata: Metadata = {
  title: "Terms & conditions",
  description: "The terms that apply when you buy from us.",
  alternates: { canonical: "/terms" },
};

const TermsPage = async () => {
  const config = await getStoreConfig();
  const { business, policies } = config;
  const seller = business.legalName ?? config.name;

  return (
    <PolicyPage
      title="Terms & conditions"
      path="/terms"
      legal
      intro="The terms that apply when you buy from us. Nothing here limits your legal rights."
    >
      <h2>About us</h2>
      <p>
        These terms apply to purchases from {config.name}, run by {seller}
        {business.address ? `, ${business.address}` : ""}
        {business.companyNumber ? `. Company number ${business.companyNumber}` : ""}
        {business.vatNumber ? `. VAT number ${business.vatNumber}` : ""}.
      </p>

      <h2>Placing an order</h2>
      <p>
        Our website is an invitation to order, not an offer. When you place an order we’ll send you
        an email confirming we’ve received it; our acceptance happens, and a contract between us is
        formed, when we email you to say your order has been dispatched. If we can’t fulfil an
        order, for example because an item is out of stock, we’ll tell you and refund anything
        you’ve paid for it.
      </p>

      <h2>Prices and payment</h2>
      <p>
        Prices are in pounds sterling and include VAT where it applies. We take payment when you
        place your order, by card through Stripe. If we notice an obvious pricing mistake we’ll tell
        you before dispatching, and you can choose to go ahead at the correct price or cancel for a
        full refund.
      </p>

      <h2>Delivery</h2>
      <p>
        We aim to deliver within {policies.deliveryMaxWorkingDays} working days. See our{" "}
        <Link href="/delivery">delivery page</Link> for details. Risk of loss or damage passes to
        you when the goods are delivered to you.
      </p>

      <h2>Cancelling and returns</h2>
      <p>
        You can cancel and return an order within {policies.returnsWindowDays} days of receiving it.
        Our <Link href="/returns">returns policy</Link> explains how, and which items can’t be
        returned.
      </p>

      <h2>Faulty goods</h2>
      <p>
        Goods we sell must be of satisfactory quality, fit for their purpose and as described. If
        they aren’t, you have legal rights to a repair, replacement or refund under the Consumer
        Rights Act 2015. These terms don’t affect those rights.
      </p>

      <h2>Our responsibility to you</h2>
      <p>
        We’re responsible for foreseeable loss or damage caused by our breaking these terms or by
        our negligence. We don’t exclude or limit liability for death or personal injury caused by
        our negligence, for fraud, or for anything else the law doesn’t allow us to limit. We aren’t
        responsible for losses that weren’t foreseeable, or for business losses, as we sell to
        consumers only.
      </p>
      <p>
        Pet products are used at your own discretion. Please read product information carefully,
        supervise your pet, and ask your vet about any health concerns.
      </p>

      <h2>Complaints</h2>
      <p>
        If something’s gone wrong, <Link href="/contact">contact us</Link> first and we’ll do our
        best to sort it quickly.
      </p>

      <h2>Which laws apply</h2>
      <p>
        These terms are governed by the law of England and Wales. If you live in Scotland or
        Northern Ireland you can also bring a claim in the courts where you live.
      </p>

      <h2>Changes</h2>
      <p>
        We may update these terms. The terms in force when you place an order are the ones that
        apply to it.
      </p>
    </PolicyPage>
  );
};

export default TermsPage;
