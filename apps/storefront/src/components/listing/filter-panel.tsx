"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useId, useOptimistic, useRef, useState, useTransition } from "react";
import type { ListingFacets } from "@/lib/catalog/types";
import { buttonClasses, cn } from "@/lib/ui";
import { useMoney, useStoreSettings } from "../store-settings";

type FilterPanelProps = {
  facets: ListingFacets;
  activeFilterCount: number;
  // current values, so the controls start in the right state
  selectedBrands: string[];
  minPound: number | undefined;
  maxPound: number | undefined;
  inStockOnly: boolean;
  onSaleOnly: boolean;
  resultCount: number;
};

// Filters write straight to the URL (?brand=...&min=...), so a filtered view can be shared or
// bookmarked, and the server renders it. On large screens the filters sit beside the products
// (FilterSidebar); on phones they open as a full-height sheet from a "Filters" button (FilterSheet).
export const FilterSidebar = (props: FilterPanelProps) => (
  <div className="hidden lg:block" data-testid="filters-sidebar">
    <FilterFields {...props} idPrefix="side" />
  </div>
);

export const FilterSheet = (props: FilterPanelProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className={buttonClasses("secondary", "sm", "lg:hidden")}
        data-testid="open-filters"
      >
        <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />
        Filters{props.activeFilterCount > 0 ? ` (${props.activeFilterCount})` : ""}
      </button>

      <dialog
        ref={dialogRef}
        className="drawer fixed inset-y-0 left-0 right-auto w-full max-w-sm [--drawer-from:-100%] lg:hidden"
        aria-labelledby="filters-sheet-title"
        onClick={(event) => {
          if (event.target === dialogRef.current) {
            dialogRef.current?.close();
          }
        }}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-muted px-5 py-4">
            <h2 id="filters-sheet-title" className="text-xl font-bold">
              Filters
            </h2>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label="Close filters"
              className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-surface"
            >
              <X aria-hidden="true" className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-5">
            <FilterFields {...props} idPrefix="sheet" />
          </div>
          <div className="border-t border-muted p-4">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className={buttonClasses("primary", "lg", "w-full")}
            >
              Show {props.resultCount} {props.resultCount === 1 ? "product" : "products"}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
};

// A titled group of controls. A labelled <div role="group"> rather than <fieldset>, because browsers
// lay a fieldset's legend out on its border and leave an uneven gap beneath it.
const Group = ({ title, children }: { title: string; children: React.ReactNode }) => {
  const headingId = useId();
  return (
    <div
      role="group"
      aria-labelledby={headingId}
      className="border-b border-muted py-5 first:pt-0 last:border-0"
    >
      <h3 id={headingId} className="mb-3 font-heading text-lg font-bold">
        {title}
      </h3>
      {children}
    </div>
  );
};

const FilterFields = ({
  facets,
  activeFilterCount,
  selectedBrands,
  minPound,
  maxPound,
  inStockOnly,
  onSaleOnly,
  idPrefix,
}: FilterPanelProps & { idPrefix: string }) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const format = useMoney();
  const { currency, locale } = useStoreSettings();
  const [pending, startTransition] = useTransition();
  const baseId = useId();

  // A tick shows straight away, then settles to whatever the server confirms through the URL.
  const [shownBrands, showBrands] = useOptimistic(selectedBrands);
  const [shownInStock, showInStock] = useOptimistic(inStockOnly);
  const [shownOnSale, showOnSale] = useOptimistic(onSaleOnly);

  const currencySymbol =
    new Intl.NumberFormat(locale, { style: "currency", currency, currencyDisplay: "narrowSymbol" })
      .formatToParts(0)
      .find((part) => part.type === "currency")?.value ?? "";

  // Rewrites the URL's query string, always returning to page 1, and keeps everything else (such as
  // the search text) as it was. `showNow` applies the optimistic update inside the same transition.
  const update = (change: (params: URLSearchParams) => void, showNow?: () => void) => {
    const params = new URLSearchParams(searchParams.toString());
    change(params);
    params.delete("page");
    const queryString = params.toString();
    startTransition(() => {
      showNow?.();
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
    });
  };

  const toggleBrand = (brand: string, checked: boolean) => {
    const nextBrands = [...shownBrands.filter((existing) => existing !== brand)];
    if (checked) {
      nextBrands.push(brand);
    }
    update(
      (params) => {
        params.delete("brand");
        nextBrands.forEach((value) => params.append("brand", value));
      },
      () => showBrands(nextBrands),
    );
  };

  const toggleFlag = (name: "stock" | "sale", checked: boolean) =>
    update(
      (params) => (checked ? params.set(name, "1") : params.delete(name)),
      () => (name === "stock" ? showInStock(checked) : showOnSale(checked)),
    );

  const setPrice = (name: "min" | "max", value: string) =>
    update((params) => {
      const digits = value.replace(/\D/g, "");
      if (digits) {
        params.set(name, digits);
      } else {
        params.delete(name);
      }
    });

  const clearAll = () =>
    update((params) => {
      ["brand", "min", "max", "stock", "sale"].forEach((name) => params.delete(name));
    });

  const lowestPound = Math.floor(facets.priceMinMinor / 100);
  const highestPound = Math.ceil(facets.priceMaxMinor / 100);

  return (
    <div className={cn("transition-opacity", pending && "opacity-60")} aria-busy={pending}>
      <Group title="Availability">
        <div className="space-y-2">
          <Check
            id={`${baseId}-${idPrefix}-stock`}
            label="In stock only"
            checked={shownInStock}
            onChange={(checked) => toggleFlag("stock", checked)}
          />
          <Check
            id={`${baseId}-${idPrefix}-sale`}
            label={`On sale${facets.onSaleCount > 0 ? ` (${facets.onSaleCount})` : ""}`}
            checked={shownOnSale}
            onChange={(checked) => toggleFlag("sale", checked)}
          />
        </div>
      </Group>

      {facets.brands.length > 1 ? (
        <Group title="Brand">
          <div className="space-y-2">
            {facets.brands.map((brand) => (
              <Check
                key={brand.name}
                id={`${baseId}-${idPrefix}-brand-${brand.name}`}
                label={`${brand.name} (${brand.count})`}
                checked={shownBrands.includes(brand.name)}
                onChange={(checked) => toggleBrand(brand.name, checked)}
              />
            ))}
          </div>
        </Group>
      ) : null}

      {highestPound > lowestPound ? (
        <Group title="Price">
          <div className="flex items-center gap-2">
            <PriceInput
              key={`min-${minPound ?? "none"}`}
              label="Minimum price"
              symbol={currencySymbol}
              placeholder={String(lowestPound)}
              value={minPound}
              onCommit={(value) => setPrice("min", value)}
            />
            <span aria-hidden="true">to</span>
            <PriceInput
              key={`max-${maxPound ?? "none"}`}
              label="Maximum price"
              symbol={currencySymbol}
              placeholder={String(highestPound)}
              value={maxPound}
              onCommit={(value) => setPrice("max", value)}
            />
          </div>
          <p className="mt-2 text-sm text-foreground/70">
            Prices from {format(facets.priceMinMinor)} to {format(facets.priceMaxMinor)}
          </p>
        </Group>
      ) : null}

      {activeFilterCount > 0 ? (
        <button
          type="button"
          onClick={clearAll}
          className="mt-2 font-bold text-emphasis underline underline-offset-4"
        >
          Clear all filters
        </button>
      ) : null}
    </div>
  );
};

const Check = ({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) => (
  <label
    htmlFor={id}
    className="flex cursor-pointer items-center gap-3 rounded-lg py-1 hover:text-emphasis"
  >
    <input
      id={id}
      type="checkbox"
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
      className="h-5 w-5 shrink-0 cursor-pointer rounded border-2 border-foreground/40 accent-(--color-emphasis)"
    />
    <span>{label}</span>
  </label>
);

// A price box that applies on Enter or when it loses focus, not on every keystroke.
const PriceInput = ({
  label,
  symbol,
  placeholder,
  value,
  onCommit,
}: {
  label: string;
  symbol: string;
  placeholder: string;
  value: number | undefined;
  onCommit: (value: string) => void;
}) => {
  // Starts from the URL's value. The caller gives each box a key that changes with that value, so
  // the box starts afresh when the URL changes elsewhere (for example "Clear all filters").
  const [text, setText] = useState(value === undefined ? "" : String(value));

  const commit = () => {
    if (text !== (value === undefined ? "" : String(value))) {
      onCommit(text);
    }
  };

  return (
    <label className="relative block w-full">
      <span className="sr-only">{label}</span>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-foreground/75"
      >
        {symbol}
      </span>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={text}
        placeholder={placeholder}
        onChange={(event) => setText(event.target.value.replace(/\D/g, ""))}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit();
          }
        }}
        className="h-11 w-full rounded-xl border-2 border-muted bg-background pl-7 pr-2 focus:border-emphasis focus:outline-none"
      />
    </label>
  );
};
