import type { Metadata } from "next";
import Link from "next/link";
import { PolicyPage } from "@/components/policy-page";
import { getStoreConfig } from "@/lib/store";

export const metadata: Metadata = {
  title: "Returns & refunds",
  description: "How to return an item, your right to cancel, and how refunds work.",
  alternates: { canonical: "/returns" },
};

const ReturnsPage = async () => {
  const config = await getStoreConfig();
  const days = config.policies.returnsWindowDays;

  return (
    <PolicyPage
      title="Returns & refunds"
      path="/returns"
      legal
      intro={`Changed your mind? You have ${days} days to send unused items back.`}
    >
      <h2>Your right to cancel</h2>
      <p>
        When you buy from us online you have the legal right to cancel your order and return it for
        a refund within <strong>14 days</strong> of receiving it, without giving a reason. We give
        you longer: <strong>{days} days</strong> from the day your order arrives.
      </p>

      <h2>How to return something</h2>
      <ol>
        <li>
          <Link href="/contact">Contact us</Link> with your order number and the items you want to
          return.
        </li>
        <li>We’ll send you the return address and instructions.</li>
        <li>Send the items back unused, in their original packaging where possible.</li>
      </ol>
      <p>
        Please keep proof of postage until we’ve confirmed your return arrived. Unless an item is
        faulty or we sent the wrong one, you pay the cost of sending it back.
      </p>

      <h2>Items we can’t take back</h2>
      <p>
        For hygiene and health reasons we can’t accept the return of food, treats, litter and
        grooming products once they have been opened, unless they are faulty. Items made to your own
        specification can’t be returned either.
      </p>

      <h2>Refunds</h2>
      <p>
        We refund you within 14 days of receiving your return (or of you proving you’ve sent it,
        whichever is earlier). The refund goes back to the card you paid with, and includes the
        standard delivery charge you paid. If you chose a more expensive delivery option than our
        standard one, we don’t refund the extra.
      </p>
      <p>
        If an item has been used or damaged beyond checking it, we may reduce the refund to reflect
        the loss in value.
      </p>

      <h2>Faulty, damaged or wrong items</h2>
      <p>
        Your legal rights under the Consumer Rights Act 2015 are not affected by anything on this
        page. In short, goods must be of satisfactory quality, fit for purpose and as described. If
        an item is faulty you can reject it within 30 days for a full refund, and after that you’re
        entitled to a repair or replacement. If we sent the wrong item, we’ll collect it at our cost
        and send the right one, or refund you.
      </p>
      <p>
        <Link href="/contact">Get in touch</Link> as soon as you notice a problem, and include a
        photo if you can.
      </p>
    </PolicyPage>
  );
};

export default ReturnsPage;
