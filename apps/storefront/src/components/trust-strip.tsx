import { CreditCard, PackageCheck, RotateCcw, Truck } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { getStoreConfig } from "@/lib/store";
import { cn } from "@/lib/ui";

// Four short reassurances that answer the questions people have before buying from a shop they
// don't know yet: how fast, how much, can I send it back, is it safe. Every figure is read from the
// store's config, so the promise on the page is the promise the store has made.
export const TrustStrip = async ({ className }: { className?: string }) => {
  const config = await getStoreConfig();
  const { policies, shipping } = config;
  const threshold = formatMoney(shipping.freeThresholdMinor, config.currency, config.locale);

  const points = [
    {
      icon: Truck,
      title: `Delivered in ${policies.deliveryMaxWorkingDays} working days`,
      text: "Tracked UK delivery on every order",
    },
    {
      icon: PackageCheck,
      title: `Free delivery over ${threshold}`,
      text: "Otherwise a flat rate, shown before you pay",
    },
    {
      icon: RotateCcw,
      title: `${policies.returnsWindowDays}-day returns`,
      text: "Changed your mind? Send it back",
    },
    {
      icon: CreditCard,
      title: "Secure checkout",
      text: "Card payments handled by Stripe",
    },
  ];

  return (
    <ul className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4", className)}>
      {points.map(({ icon: Icon, title, text }) => (
        <li key={title} className="flex items-start gap-3 rounded-2xl bg-surface p-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-background text-emphasis shadow-sm">
            <Icon aria-hidden="true" className="h-5 w-5" />
          </span>
          <span>
            <span className="block font-bold leading-snug">{title}</span>
            <span className="block text-sm text-foreground/75">{text}</span>
          </span>
        </li>
      ))}
    </ul>
  );
};
