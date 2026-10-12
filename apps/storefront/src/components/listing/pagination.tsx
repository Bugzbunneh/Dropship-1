import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { listingHref } from "@/lib/catalog/listing-params";
import type { ListingQuery } from "@/lib/catalog/types";
import { pageWindow } from "@/lib/pagination";
import { cn } from "@/lib/ui";

type PaginationProps = {
  basePath: string;
  query: ListingQuery;
  page: number;
  pageCount: number;
};

const pageHref = (basePath: string, query: ListingQuery, page: number): string =>
  listingHref(basePath, { ...query, page }, true);

const linkClass =
  "flex h-11 min-w-11 items-center justify-center rounded-full px-3 font-bold transition hover:bg-surface";

// Plain links, so paging works without JavaScript and every page can be indexed and shared.
export const Pagination = ({ basePath, query, page, pageCount }: PaginationProps) => {
  if (pageCount <= 1) {
    return null;
  }

  return (
    <nav aria-label="Pagination" className="mt-10 flex flex-wrap items-center justify-center gap-1">
      {page > 1 ? (
        <Link href={pageHref(basePath, query, page - 1)} className={linkClass} rel="prev">
          <ChevronLeft aria-hidden="true" className="h-5 w-5" />
          <span className="sr-only">Previous page</span>
        </Link>
      ) : null}

      {pageWindow(page, pageCount).map((entry, index) =>
        entry === "gap" ? (
          <span key={`gap-${index}`} aria-hidden="true" className="px-1">
            …
          </span>
        ) : (
          <Link
            key={entry}
            href={pageHref(basePath, query, entry)}
            aria-current={entry === page ? "page" : undefined}
            className={cn(
              linkClass,
              entry === page && "bg-primary text-primary-foreground hover:bg-primary",
            )}
          >
            <span className="sr-only">Page </span>
            {entry}
          </Link>
        ),
      )}

      {page < pageCount ? (
        <Link href={pageHref(basePath, query, page + 1)} className={linkClass} rel="next">
          <ChevronRight aria-hidden="true" className="h-5 w-5" />
          <span className="sr-only">Next page</span>
        </Link>
      ) : null}
    </nav>
  );
};
