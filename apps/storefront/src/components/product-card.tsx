import Link from "next/link";
import type { ProductCard as ProductCardData } from "@/lib/catalog/types";
import { getStoreConfig } from "@/lib/store";
import { findDepartment } from "@/lib/theme";
import { buttonClasses, cardClasses, cn } from "@/lib/ui";
import { AddToCartButton } from "./add-to-cart-button";
import { DepartmentTheme } from "./department-theme";
import { Price, SaleBadge } from "./price";
import { ProductImage } from "./product-image";

type ProductCardProps = {
  card: ProductCardData;
  // true for the first few cards on a page, which are likely to be on screen straight away
  priority?: boolean;
  // adds a Dogs/Cats label, for lists that mix both
  showDepartment?: boolean;
};

const CARD_IMAGE_SIZES = "(min-width: 1024px) 22vw, (min-width: 640px) 31vw, 46vw";

// Each card carries its own pet's colours, so a cat product's button is teal and a dog product's
// is amber even in a list that mixes them.
export const ProductCard = async ({
  card,
  priority = false,
  showDepartment = false,
}: ProductCardProps) => {
  const config = await getStoreConfig();
  const department = findDepartment(config.departments, card.department);
  const href = `/products/${card.slug}`;

  return (
    <DepartmentTheme
      as="article"
      department={department}
      className={cn(cardClasses, "group relative flex w-full min-w-0 flex-col overflow-hidden")}
    >
      <div className="relative aspect-square overflow-hidden bg-surface">
        <div className="absolute inset-0 transition-transform duration-500 motion-safe:group-hover:scale-105">
          <ProductImage image={card.image} sizes={CARD_IMAGE_SIZES} priority={priority} />
        </div>
        <div className="absolute left-2 top-2 flex flex-col items-start gap-1.5">
          {card.inStock ? (
            <SaleBadge priceMinor={card.priceFromMinor} compareAtMinor={card.compareAtMinor} />
          ) : (
            <span className="rounded-full bg-foreground px-2.5 py-1 text-xs font-bold text-background">
              Sold out
            </span>
          )}
        </div>
        {showDepartment && department ? (
          <span className="absolute right-2 top-2 rounded-full bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground shadow-sm">
            {department.name}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3 sm:p-4">
        {card.brand ? (
          <p className="text-xs font-semibold uppercase tracking-wide text-foreground/75">
            {card.brand}
          </p>
        ) : null}
        <h3 className="font-heading text-base font-semibold leading-snug sm:text-lg">
          {/* the link stretches over the whole card; the button below sits above it */}
          <Link
            href={href}
            className="after:absolute after:inset-0 after:content-[''] hover:text-emphasis"
          >
            {card.title}
          </Link>
        </h3>
        <Price
          priceMinor={card.priceFromMinor}
          compareAtMinor={card.inStock ? card.compareAtMinor : null}
          hasRange={card.hasPriceRange}
          currency={config.currency}
          locale={config.locale}
          size="md"
          className="mt-auto pt-2"
        />
      </div>

      <div className="relative z-10 px-3 pb-3 sm:px-4 sm:pb-4">
        {card.quickAddVariantId ? (
          <AddToCartButton
            variantId={card.quickAddVariantId}
            productTitle={card.title}
            size="sm"
            className="w-full"
          />
        ) : (
          <Link href={href} className={buttonClasses("secondary", "sm", "w-full")}>
            {card.inStock ? "Choose options" : "View details"}
          </Link>
        )}
      </div>
    </DepartmentTheme>
  );
};
