"use client";

import { Check, Minus, Plus, ShoppingBag } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { MAX_LINE_QUANTITY } from "@/lib/cart/lines";
import { useCartStore } from "@/lib/cart/store";
import {
  defaultVariantOf,
  optionGroupsOf,
  valueStatus,
  variantAfterChoosing,
  type PickableVariant,
} from "@/lib/catalog/variant-options";
import { formatMoney, percentOff } from "@/lib/money";
import { buttonClasses, cn } from "@/lib/ui";
import { DeliveryEstimate } from "./delivery-estimate";
import { useStoreSettings } from "./store-settings";

type ProductPurchaseProps = {
  productTitle: string;
  variants: PickableVariant[];
};

const CONFIRMATION_MS = 2200;

// Choosing a size or colour, the quantity and the add-to-cart button, plus a delivery date. On
// phones a bar with the price and button sticks to the bottom once the main button has scrolled
// out of view, so buying is always one tap away.
export const ProductPurchase = ({ productTitle, variants }: ProductPurchaseProps) => {
  const { currency, locale } = useStoreSettings();
  const addItem = useCartStore((state) => state.addItem);
  const openDrawer = useCartStore((state) => state.openDrawer);

  const groups = optionGroupsOf(variants);
  const [selectedId, setSelectedId] = useState(() => defaultVariantOf(variants)?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const [stickyVisible, setStickyVisible] = useState(false);
  const mainButtonRef = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const selected = variants.find((variant) => variant.id === selectedId) ?? variants[0];

  useEffect(() => () => clearTimeout(timer.current), []);

  // Show the sticky bar whenever the main button is off screen, above or below. This reads the
  // scroll position rather than using an IntersectionObserver, which only fires when an element
  // crosses the edge of the screen and so misses a jump scroll or a reload part-way down the page.
  useEffect(() => {
    let frame = 0;
    const update = () => {
      const button = mainButtonRef.current;
      if (!button) {
        return;
      }
      const { top, bottom } = button.getBoundingClientRect();
      setStickyVisible(bottom < 0 || top > window.innerHeight);
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  if (!selected) {
    return null;
  }

  const money = (minor: number): string => formatMoney(minor, currency, locale);
  const onSale = selected.compareAtMinor !== null && selected.compareAtMinor > selected.priceMinor;
  const percent =
    onSale && selected.compareAtMinor
      ? percentOff(selected.priceMinor, selected.compareAtMinor)
      : 0;

  const choose = (name: string, value: string) => {
    const next = variantAfterChoosing(variants, selected, name, value);
    if (next) {
      setSelectedId(next.id);
    }
  };

  const add = () => {
    addItem(selected.id, quantity);
    openDrawer();
    setJustAdded(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setJustAdded(false), CONFIRMATION_MS);
  };

  const buttonLabel = !selected.isAvailable
    ? "Sold out"
    : justAdded
      ? "Added to cart"
      : "Add to cart";
  const ButtonIcon = justAdded ? Check : ShoppingBag;

  return (
    <div className="space-y-6">
      <div>
        <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1" data-testid="product-price">
          <span className={cn("text-4xl font-bold", onSale && "text-sale")}>
            <span className="sr-only">{onSale ? "Sale price " : "Price "}</span>
            {money(selected.priceMinor)}
          </span>
          {onSale && selected.compareAtMinor ? (
            <>
              <del className="text-lg text-foreground/75">
                <span className="sr-only">Was </span>
                {money(selected.compareAtMinor)}
              </del>
              <span className="rounded-full bg-sale px-2.5 py-1 text-sm font-bold text-white">
                Save {percent}%
              </span>
            </>
          ) : null}
        </p>
        <p
          className={cn(
            "mt-2 flex items-center gap-2 text-sm font-bold",
            selected.isAvailable ? "text-emphasis" : "text-sale",
          )}
          data-testid="stock-status"
        >
          <span
            aria-hidden="true"
            className={cn(
              "h-2.5 w-2.5 rounded-full",
              selected.isAvailable ? "bg-emphasis" : "bg-sale",
            )}
          />
          {selected.isAvailable ? "In stock" : "Sold out"}
        </p>
      </div>

      {groups.map((group) => {
        const currentValue = selected.options[group.name];
        return (
          <fieldset key={group.name}>
            <legend className="mb-2 font-bold">
              {group.name}: <span className="font-semibold text-foreground/75">{currentValue}</span>
            </legend>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={group.name}>
              {group.values.map((value) => {
                const isSelected = value === currentValue;
                const soldOut = valueStatus(variants, selected, group.name, value) === "sold-out";
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => choose(group.name, value)}
                    className={cn(
                      "min-h-11 rounded-full border-2 px-5 py-2 font-bold transition",
                      isSelected
                        ? "border-emphasis bg-emphasis text-background"
                        : "border-muted bg-background hover:border-emphasis",
                      soldOut && !isSelected && "text-foreground/75 line-through decoration-2",
                    )}
                  >
                    {value}
                    {soldOut ? <span className="sr-only"> (sold out)</span> : null}
                  </button>
                );
              })}
            </div>
          </fieldset>
        );
      })}

      <div className="flex flex-wrap items-stretch gap-3">
        <div
          className="inline-flex items-center rounded-full border-2 border-muted"
          role="group"
          aria-label="Quantity"
        >
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity <= 1}
            aria-label="Decrease quantity"
            className="flex h-12 w-12 items-center justify-center rounded-full hover:bg-surface disabled:opacity-40"
          >
            <Minus aria-hidden="true" className="h-4 w-4" />
          </button>
          <output
            className="min-w-10 text-center text-lg font-bold"
            aria-live="polite"
            data-testid="quantity"
          >
            {quantity}
          </output>
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.min(MAX_LINE_QUANTITY, q + 1))}
            disabled={quantity >= MAX_LINE_QUANTITY}
            aria-label="Increase quantity"
            className="flex h-12 w-12 items-center justify-center rounded-full hover:bg-surface disabled:opacity-40"
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        <button
          ref={mainButtonRef}
          type="button"
          onClick={add}
          disabled={!selected.isAvailable}
          className={buttonClasses("primary", "lg", "min-w-0 flex-1")}
          data-testid="add-to-cart"
        >
          <ButtonIcon aria-hidden="true" className="h-5 w-5" />
          {buttonLabel}
        </button>
      </div>

      <DeliveryEstimate />

      {/* sticky bar for phones */}
      <div
        aria-hidden={!stickyVisible}
        className={cn(
          "fixed inset-x-0 bottom-0 z-30 border-t border-muted bg-background/95 px-4 py-3 shadow-lift backdrop-blur transition-transform duration-300 lg:hidden",
          stickyVisible ? "translate-y-0" : "translate-y-full",
        )}
        data-testid="sticky-add-to-cart"
      >
        <div className="mx-auto flex max-w-xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{productTitle}</p>
            <p className={cn("font-bold", onSale && "text-sale")}>{money(selected.priceMinor)}</p>
          </div>
          <button
            type="button"
            onClick={add}
            disabled={!selected.isAvailable}
            tabIndex={stickyVisible ? 0 : -1}
            className={buttonClasses("primary", "md")}
          >
            <ButtonIcon aria-hidden="true" className="h-4 w-4" />
            {buttonLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
