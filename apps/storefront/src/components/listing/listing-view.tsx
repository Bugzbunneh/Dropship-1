import { X } from "lucide-react";
import Link from "next/link";
import { getSnapshot } from "@/lib/catalog";
import { listingHref, withoutPrice } from "@/lib/catalog/listing-params";
import { runListing } from "@/lib/catalog/queries";
import type { ListingQuery, SortKey } from "@/lib/catalog/types";
import { getStoreConfig } from "@/lib/store";
import { formatMoney } from "@/lib/money";
import { buttonClasses } from "@/lib/ui";
import { ProductGrid } from "../product-grid";
import { FilterSheet, FilterSidebar } from "./filter-panel";
import { Pagination } from "./pagination";
import { SortSelect } from "./sort-select";

type ListingViewProps = {
  // the page's own path, for links that change a filter, sort or page
  basePath: string;
  query: ListingQuery;
  // true on pages that list both pets, so cards say which one they are for
  showDepartment?: boolean;
};

type Chip = { label: string; href: string };

// The products, with filters beside them, a sort menu, active filters as removable chips, and
// pages. Used by collections, "shop all" and search.
export const ListingView = async ({
  basePath,
  query,
  showDepartment = false,
}: ListingViewProps) => {
  const [snapshot, config] = await Promise.all([getSnapshot(), getStoreConfig()]);
  const result = runListing(snapshot, query);
  const isSearch = query.search !== undefined;
  const defaultSort: SortKey = isSearch ? "relevance" : "featured";
  const money = (minor: number): string => formatMoney(minor, config.currency, config.locale);
  const href = (changed: Partial<ListingQuery>): string =>
    listingHref(basePath, { ...query, ...changed, page: 1 });

  const chips: Chip[] = [
    ...query.brands.map((brand) => ({
      label: brand,
      href: href({ brands: query.brands.filter((existing) => existing !== brand) }),
    })),
    ...(query.inStockOnly ? [{ label: "In stock", href: href({ inStockOnly: false }) }] : []),
    ...(query.onSaleOnly ? [{ label: "On sale", href: href({ onSaleOnly: false }) }] : []),
  ];
  const priceLabel = (): string | undefined => {
    const { minPriceMinor, maxPriceMinor } = query;
    if (minPriceMinor !== undefined && maxPriceMinor !== undefined) {
      return `${money(minPriceMinor)} to ${money(maxPriceMinor)}`;
    }
    if (minPriceMinor !== undefined) {
      return `${money(minPriceMinor)} and over`;
    }
    if (maxPriceMinor !== undefined) {
      return `Up to ${money(maxPriceMinor)}`;
    }
    return undefined;
  };
  const price = priceLabel();
  if (price) {
    chips.push({ label: price, href: listingHref(basePath, { ...withoutPrice(query), page: 1 }) });
  }

  const filterProps = {
    facets: result.facets,
    activeFilterCount: result.activeFilterCount,
    selectedBrands: query.brands,
    minPound: query.minPriceMinor === undefined ? undefined : Math.floor(query.minPriceMinor / 100),
    maxPound: query.maxPriceMinor === undefined ? undefined : Math.floor(query.maxPriceMinor / 100),
    inStockOnly: query.inStockOnly,
    onSaleOnly: query.onSaleOnly,
    resultCount: result.total,
  };

  return (
    <div className="grid gap-x-10 gap-y-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside aria-labelledby="filters-heading">
        <h2 id="filters-heading" className="sr-only">
          Filters
        </h2>
        <FilterSidebar {...filterProps} />
      </aside>

      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <p className="font-semibold" aria-live="polite" data-testid="result-count">
            {result.total} {result.total === 1 ? "product" : "products"}
          </p>
          <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end">
            <FilterSheet {...filterProps} />
            <SortSelect value={query.sort} includeRelevance={isSearch} defaultSort={defaultSort} />
          </div>
        </div>

        {chips.length > 0 ? (
          <ul className="mb-5 flex flex-wrap gap-2" aria-label="Active filters">
            {chips.map((chip) => (
              <li key={chip.label}>
                <Link
                  href={chip.href}
                  scroll={false}
                  className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-sm font-semibold hover:bg-muted"
                >
                  {chip.label}
                  <X aria-hidden="true" className="h-3.5 w-3.5" />
                  <span className="sr-only">Remove filter</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}

        <h2 className="sr-only">Products</h2>
        {result.cards.length > 0 ? (
          <ProductGrid
            cards={result.cards}
            columns="three"
            priorityCount={4}
            showDepartment={showDepartment}
          />
        ) : (
          <div className="rounded-3xl bg-surface px-6 py-14 text-center" data-testid="no-results">
            <p className="font-heading text-2xl font-bold">Nothing matches just yet</p>
            <p className="mx-auto mt-2 max-w-md text-foreground/80">
              {result.activeFilterCount > 0
                ? "Try removing a filter to see more."
                : isSearch
                  ? "Check the spelling or try a more general word, like “bed” or “toy”."
                  : "We’re adding new products all the time."}
            </p>
            {result.activeFilterCount > 0 ? (
              <Link
                href={listingHref(basePath, {
                  ...withoutPrice(query),
                  brands: [],
                  inStockOnly: false,
                  onSaleOnly: false,
                  page: 1,
                })}
                className={buttonClasses("primary", "md", "mt-6")}
              >
                Clear all filters
              </Link>
            ) : null}
          </div>
        )}

        <Pagination
          basePath={basePath}
          query={query}
          page={result.page}
          pageCount={result.pageCount}
        />
      </div>
    </div>
  );
};
