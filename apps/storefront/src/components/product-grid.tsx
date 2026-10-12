import type { ProductCard as ProductCardData } from "@/lib/catalog/types";
import { cn } from "@/lib/ui";
import { ProductCard } from "./product-card";

type ProductGridProps = {
  cards: ProductCardData[];
  // how many leading cards to load eagerly (they are above the fold)
  priorityCount?: number;
  showDepartment?: boolean;
  // fewer columns on wide screens, for sections that sit beside a sidebar
  columns?: "four" | "three";
  className?: string;
};

export const ProductGrid = ({
  cards,
  priorityCount = 0,
  showDepartment = false,
  columns = "four",
  className,
}: ProductGridProps) => (
  <ul
    className={cn(
      "grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3",
      columns === "four" && "lg:grid-cols-4",
      className,
    )}
  >
    {cards.map((card, index) => (
      <li key={card.id} className="flex min-w-0">
        <ProductCard card={card} priority={index < priorityCount} showDepartment={showDepartment} />
      </li>
    ))}
  </ul>
);
