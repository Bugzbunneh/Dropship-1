import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/ui";

export type BreadcrumbItem = { name: string; href: string };

type BreadcrumbsProps = {
  // the trail up to and including the current page; the last item is not a link
  items: BreadcrumbItem[];
  className?: string;
};

export const Breadcrumbs = ({ items, className }: BreadcrumbsProps) => (
  <nav aria-label="Breadcrumb" className={className}>
    <ol className="no-scrollbar flex items-center gap-x-1 gap-y-1 overflow-x-auto whitespace-nowrap text-sm text-foreground/75 sm:flex-wrap sm:overflow-visible">
      {items.map((item, index) => {
        const isCurrent = index === items.length - 1;
        return (
          <li key={item.href} className="flex items-center gap-1">
            {index > 0 ? (
              <ChevronRight aria-hidden="true" className="h-3.5 w-3.5 opacity-60" />
            ) : null}
            {isCurrent ? (
              <span aria-current="page" className={cn("py-1 font-semibold text-foreground")}>
                {item.name}
              </span>
            ) : (
              <Link
                href={item.href}
                // padding makes the tap target at least 24px tall (WCAG 2.5.8)
                className="inline-block py-1 underline-offset-4 hover:text-emphasis hover:underline"
              >
                {item.name}
              </Link>
            )}
          </li>
        );
      })}
    </ol>
  </nav>
);
