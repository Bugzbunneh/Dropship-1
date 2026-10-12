import type { Metadata } from "next";
import Link from "next/link";
import { PolicyPage } from "@/components/policy-page";
import { getStoreConfig } from "@/lib/store";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "What personal information we collect, why, and your rights over it.",
  alternates: { canonical: "/privacy" },
};

const PrivacyPage = async () => {
  const config = await getStoreConfig();
  const { business } = config;
  const seller = business.legalName ?? config.name;
  const contact = business.email ? (
    <a href={`mailto:${business.email}`}>{business.email}</a>
  ) : (
    <Link href="/contact">our contact page</Link>
  );

  return (
    <PolicyPage
      title="Privacy policy"
      path="/privacy"
      legal
      intro="We only collect what we need to sell to you and look after your order."
    >
      <h2>Who we are</h2>
      <p>
        {seller} is the “controller” of the personal information described here, which means we
        decide how and why it’s used. You can contact us at {contact}.
      </p>

      <h2>What we collect, and why</h2>
      <ul>
        <li>
          <strong>Your order:</strong> your name, delivery address, email address, phone number (if
          you give one) and what you bought. We use this to take payment, deliver your order, send
          order emails and handle returns. <em>Legal basis: to perform our contract with you.</em>
        </li>
        <li>
          <strong>Payment details:</strong> card payments are processed by Stripe. Your card number
          goes straight to Stripe and we never see or store it. We receive confirmation that you’ve
          paid.
        </li>
        <li>
          <strong>Our records:</strong> orders and invoices are kept for the period the law requires
          for accounts and tax. <em>Legal basis: legal obligation.</em>
        </li>
        <li>
          <strong>Marketing emails:</strong> only if you ask for them, and you can stop them at any
          time with the link in every email. <em>Legal basis: your consent.</em>
        </li>
        <li>
          <strong>Keeping the site safe and working:</strong> basic technical information such as
          your browser type and IP address, to prevent fraud and fix problems.{" "}
          <em>Legal basis: our legitimate interests.</em>
        </li>
      </ul>

      <h2>Cookies and similar technologies</h2>
      <p>
        We use only what’s needed for the store to work. Your cart is saved in your browser’s local
        storage so it’s still there when you come back. We don’t use advertising or analytics
        cookies. If that changes, we’ll ask for your consent first and update this page.
      </p>

      <h2>Who we share it with</h2>
      <p>
        We only share information with organisations that help us run the store, and only what they
        need:
      </p>
      <ul>
        <li>our payment provider (Stripe)</li>
        <li>
          the supplier or courier that packs and delivers your order, who receive your name, address
          and phone number
        </li>
        <li>our website hosting and database providers</li>
        <li>our email service, to send your order emails</li>
      </ul>
      <p>
        We don’t sell your information. Some of these providers may process data outside the UK, in
        which case we make sure appropriate safeguards are in place.
      </p>

      <h2>How long we keep it</h2>
      <p>
        We keep order information for as long as the law requires us to keep accounting records, and
        delete or anonymise other information when we no longer need it.
      </p>

      <h2>Your rights</h2>
      <p>Under UK data protection law you can ask us to:</p>
      <ul>
        <li>give you a copy of the information we hold about you</li>
        <li>correct anything that’s wrong, or delete information we no longer need</li>
        <li>restrict or object to how we use it, and move it to another provider</li>
        <li>stop marketing emails, or withdraw consent you’ve given</li>
      </ul>
      <p>
        To use any of these rights, contact {contact}. If you’re unhappy with how we’ve handled your
        information, you can complain to the Information Commissioner’s Office at{" "}
        <a href="https://ico.org.uk" rel="noopener noreferrer">
          ico.org.uk
        </a>
        .
      </p>
    </PolicyPage>
  );
};

export default PrivacyPage;
