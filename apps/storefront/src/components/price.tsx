import { formatMoney, percentOff } from "@/lib/money";
import { cn } from "@/lib/ui";

type PriceProps = {
  priceMinor: number;
  compareAtMinor?: number | null | undefined;
  // true when the product's variants cost different amounts, so the price reads "From £x"
  hasRange?: boolean;
  currency: string;
  locale: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizes = {
  sm: "text-base",
  md: "text-lg",
  lg: "text-3xl",
};

export const Price = ({
  priceMinor,
  compareAtMinor,
  hasRange = false,
  currency,
  locale,
  size = "md",
  className,
}: PriceProps) => {
  const onSale =
    compareAtMinor !== null && compareAtMinor !== undefined && compareAtMinor > priceMinor;

  return (
    <p className={cn("flex flex-wrap items-baseline gap-x-2 gap-y-0", className)}>
      {hasRange ? <span className="text-sm text-foreground/70">From</span> : null}
      <span className={cn("font-bold", sizes[size], onSale && "text-sale")}>
        <span className="sr-only">{onSale ? "Sale price " : "Price "}</span>
        {formatMoney(priceMinor, currency, locale)}
      </span>
      {onSale ? (
        <del className="text-sm text-foreground/75">
          <span className="sr-only">Was </span>
          {formatMoney(compareAtMinor, currency, locale)}
        </del>
      ) : null}
    </p>
  );
};

// "-23%" badge for the corner of a picture.
export const SaleBadge = ({
  priceMinor,
  compareAtMinor,
}: {
  priceMinor: number;
  compareAtMinor: number | null;
}) => {
  if (compareAtMinor === null) {
    return null;
  }
  const percent = percentOff(priceMinor, compareAtMinor);
  if (percent < 1) {
    return null;
  }
  return (
    <span className="rounded-full bg-sale px-2.5 py-1 text-xs font-bold text-white shadow-sm">
      <span className="sr-only">Save </span>-{percent}%
    </span>
  );
};
