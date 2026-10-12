import { Clock, Mail, MapPin, Phone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PolicyPage } from "@/components/policy-page";
import { getStoreConfig } from "@/lib/store";

export const metadata: Metadata = {
  title: "Contact us",
  description: "Get in touch about an order, a return or a product.",
  alternates: { canonical: "/contact" },
};

const ContactPage = async () => {
  const config = await getStoreConfig();
  const { business } = config;

  return (
    <PolicyPage
      title="Contact us"
      path="/contact"
      intro="Questions about an order, a return or a product? We’re happy to help."
    >
      {business.email ? (
        <ul className="not-prose max-w-xl space-y-4">
          <li className="flex items-start gap-3">
            <Mail aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-emphasis" />
            <span>
              <strong className="block">Email</strong>
              <a
                href={`mailto:${business.email}`}
                className="text-emphasis underline underline-offset-4"
              >
                {business.email}
              </a>
            </span>
          </li>
          {business.phone ? (
            <li className="flex items-start gap-3">
              <Phone aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-emphasis" />
              <span>
                <strong className="block">Phone</strong>
                {business.phone}
              </span>
            </li>
          ) : null}
          {business.address ? (
            <li className="flex items-start gap-3">
              <MapPin aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-emphasis" />
              <span>
                <strong className="block">Write to us</strong>
                {business.legalName ? `${business.legalName}, ` : ""}
                {business.address}
              </span>
            </li>
          ) : null}
        </ul>
      ) : (
        <p>
          Our contact details are being set up. In the meantime, the answers to most questions are
          in our <Link href="/faq">FAQs</Link>.
        </p>
      )}

      <h2>When you write, it helps to include</h2>
      <ul>
        <li>your order number (it’s in your confirmation email)</li>
        <li>the item you’re asking about</li>
        <li>a photo, if something has arrived damaged or isn’t right</li>
      </ul>

      <p className="flex items-center gap-2 text-foreground/75">
        <Clock aria-hidden="true" className="h-4 w-4" />
        Quick answers are on our <Link href="/faq">FAQs</Link>,{" "}
        <Link href="/delivery">delivery</Link> and <Link href="/returns">returns</Link> pages.
      </p>
    </PolicyPage>
  );
};

export default ContactPage;
