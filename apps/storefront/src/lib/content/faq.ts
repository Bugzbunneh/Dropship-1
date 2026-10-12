import type { StoreConfig } from "@dropship/config";
import { formatMoney } from "../money";

// Answers to the questions people ask before buying, written from the store's own config so the
// figures can never disagree with the store's real delivery and returns terms.

export type FaqItem = {
  question: string;
  // one string per paragraph
  answer: string[];
  link?: { href: string; label: string };
};

type FaqConfig = Pick<StoreConfig, "policies" | "shipping" | "currency" | "locale" | "business">;

export const faqItems = (config: FaqConfig): FaqItem[] => {
  const { policies, shipping } = config;
  const money = (minor: number): string => formatMoney(minor, config.currency, config.locale);
  const days = policies.deliveryMaxWorkingDays;

  return [
    {
      question: "How long will my order take?",
      answer: [
        `We aim to deliver every order within ${days} working days of you placing it. Working days are Monday to Friday, not counting bank holidays.`,
        "We email you a tracking link as soon as your order is on its way.",
      ],
      link: { href: "/delivery", label: "Delivery details" },
    },
    {
      question: "Where is my order?",
      answer: [
        "You don’t need an account. Enter your order number and the email address you used at checkout, and you’ll see exactly where your order is, with tracking once it has been sent.",
        "Your order number is in your confirmation email.",
      ],
      link: { href: "/orders/lookup", label: "Find my order" },
    },
    {
      question: "How much is delivery?",
      answer: [
        `Delivery costs ${money(shipping.flatRateMinor)}, and it’s free when your basket comes to ${money(shipping.freeThresholdMinor)} or more. You’ll see the exact cost before you pay.`,
      ],
    },
    {
      question: "Where do you deliver?",
      answer: [
        "We currently deliver to addresses in the United Kingdom. We’d like to add more countries in future.",
      ],
    },
    {
      question: "Can I return something?",
      answer: [
        `Yes. You can send back unused items within ${policies.returnsWindowDays} days of receiving them. For hygiene reasons we can’t take back opened food, treats, litter or grooming products unless they’re faulty.`,
      ],
      link: { href: "/returns", label: "Returns policy" },
    },
    {
      question: "What if my item arrives damaged or isn’t right?",
      answer: [
        "Get in touch with your order number and a photo and we’ll put it right with a replacement or a refund. Your legal rights for faulty goods are not affected.",
      ],
      link: { href: "/contact", label: "Contact us" },
    },
    {
      question: "Is paying here safe?",
      answer: [
        "Card payments are handled by Stripe, a leading payment provider. Your card details go straight to Stripe and never touch our servers.",
      ],
    },
    {
      question: "Will this suit my pet?",
      answer: [
        "Each product page describes sizes and materials. If you’re unsure about something for a pet with health needs, please check with your vet first.",
      ],
    },
  ];
};
