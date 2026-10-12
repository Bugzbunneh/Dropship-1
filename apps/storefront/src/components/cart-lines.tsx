"use client";

import { Minus, Plus, Trash2, TriangleAlert, Truck } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { MAX_LINE_QUANTITY } from "@/lib/cart/lines";
import { useCartStore } from "@/lib/cart/store";
import type { CartSummary, PricedLine } from "@/lib/cart/totals";
import { cn } from "@/lib/ui";
import { useMoney, useStoreSettings } from "./store-settings";

// ---- Free delivery progress --------------------------------------------------------------------

export const FreeShippingBar = ({ summary }: { summary: CartSummary }) => {
  const format = useMoney();
  const { shipping } = useStoreSettings();
  if (summary.itemCount === 0) {
    return null;
  }
  const unlocked = summary.freeShippingRemainingMinor === 0;
  const percent = Math.round(summary.freeShippingProgress * 100);

  return (
    <div className="rounded-2xl bg-surface p-4" data-testid="free-shipping-bar">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <Truck aria-hidden="true" className="h-4 w-4 shrink-0 text-emphasis" />
        {unlocked ? (
          <span>You’ve unlocked free delivery 🎉</span>
        ) : (
          <span>
            You’re <strong>{format(summary.freeShippingRemainingMinor)}</strong> away from free
            delivery
          </span>
        )}
      </p>
      <div
        role="progressbar"
        aria-label="Progress towards free delivery"
        aria-valuemin={0}
        aria-valuemax={shipping.freeThresholdMinor}
        aria-valuenow={Math.min(summary.subtotalMinor, shipping.freeThresholdMinor)}
        className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-emphasis transition-[width] duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
};

// ---- A single line -----------------------------------------------------------------------------

const optionText = (options: Record<string, string>): string => Object.values(options).join(" · ");

const LineItem = ({ line, compact }: { line: PricedLine; compact: boolean }) => {
  const format = useMoney();
  const setQuantity = useCartStore((state) => state.setQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const closeDrawer = useCartStore((state) => state.closeDrawer);
  const { info } = line;

  if (!info) {
    return (
      <li className="flex items-center justify-between gap-3 rounded-2xl bg-surface p-3 text-sm">
        <span className="flex items-center gap-2">
          <TriangleAlert aria-hidden="true" className="h-4 w-4" />
          This item is no longer available.
        </span>
        <button
          type="button"
          onClick={() => removeItem(line.variantId)}
          className="font-bold underline"
        >
          Remove
        </button>
      </li>
    );
  }

  const href = `/products/${info.productSlug}`;
  const variantText =
    optionText(info.options) || (info.variantTitle !== "One size" ? info.variantTitle : "");

  return (
    <li className="flex gap-3" data-testid="cart-line">
      {/* the product name beside it is the real link, so this duplicate is hidden from keyboards and
          screen readers rather than being announced as a nameless link */}
      <Link
        href={href}
        onClick={closeDrawer}
        tabIndex={-1}
        aria-hidden="true"
        className={cn(
          "relative shrink-0 overflow-hidden rounded-xl bg-surface",
          compact ? "h-20 w-20" : "h-24 w-24 sm:h-28 sm:w-28",
        )}
      >
        {info.image ? (
          <Image
            src={info.image.path}
            alt=""
            fill
            sizes="112px"
            unoptimized
            className="object-cover"
          />
        ) : null}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              href={href}
              onClick={closeDrawer}
              className="line-clamp-2 font-heading font-semibold leading-snug hover:text-emphasis"
            >
              {info.productTitle}
            </Link>
            {variantText ? <p className="text-sm text-foreground/70">{variantText}</p> : null}
          </div>
          <button
            type="button"
            onClick={() => removeItem(line.variantId)}
            aria-label={`Remove ${info.productTitle} from your cart`}
            className="-mr-2 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-foreground/75 hover:bg-surface hover:text-foreground"
          >
            <Trash2 aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        {!info.isAvailable ? (
          <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-sale">
            <TriangleAlert aria-hidden="true" className="h-4 w-4" />
            Sold out. Not included in your total.
          </p>
        ) : null}

        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div className="inline-flex items-center rounded-full border-2 border-muted">
            <button
              type="button"
              onClick={() => setQuantity(line.variantId, line.quantity - 1)}
              aria-label={`Decrease quantity of ${info.productTitle}`}
              className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-surface"
            >
              <Minus aria-hidden="true" className="h-4 w-4" />
            </button>
            <span
              className="min-w-8 text-center font-bold"
              aria-live="polite"
              data-testid="line-quantity"
            >
              {line.quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity(line.variantId, line.quantity + 1)}
              disabled={line.quantity >= MAX_LINE_QUANTITY}
              aria-label={`Increase quantity of ${info.productTitle}`}
              className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-surface disabled:opacity-40"
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>

          <p className="text-right">
            <span className={cn("font-bold", line.savingMinor > 0 && "text-sale")}>
              {format(info.isAvailable ? line.lineTotalMinor : info.priceMinor * line.quantity)}
            </span>
            {info.isAvailable && info.compareAtMinor ? (
              <del className="block text-sm text-foreground/75">
                {format(info.compareAtMinor * line.quantity)}
              </del>
            ) : null}
          </p>
        </div>
      </div>
    </li>
  );
};

type CartLinesProps = {
  summary: CartSummary;
  compact?: boolean;
};

export const CartLines = ({ summary, compact = false }: CartLinesProps) => (
  <ul
    className={cn(
      "flex flex-col",
      compact ? "gap-4" : "gap-6 divide-y divide-muted [&>li+li]:pt-6",
    )}
  >
    {summary.lines.map((line) => (
      <LineItem key={line.variantId} line={line} compact={compact} />
    ))}
  </ul>
);
