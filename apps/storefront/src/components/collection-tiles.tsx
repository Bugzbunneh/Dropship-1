import Image from "next/image";
import Link from "next/link";
import { placeholderPath } from "@dropship/stores";
import type { CollectionSummary } from "@/lib/catalog/queries";
import { cardClasses } from "@/lib/ui";

type CollectionTilesProps = {
  department: string;
  collections: CollectionSummary[];
  // how many of the first tiles are on the first screen, so their pictures are fetched straight
  // away instead of waiting until the browser decides they are close enough to scroll into view
  eagerCount?: number;
};

// "Shop by category": a picture, a name and a count for each collection of a pet. The pictures are
// generated illustrations until real collection photos exist.
export const CollectionTiles = ({
  department,
  collections,
  eagerCount = 0,
}: CollectionTilesProps) => (
  <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-6">
    {collections.map((collection, index) => (
      <li key={collection.slug} className="flex">
        <Link
          href={`/${department}/${collection.slug}`}
          className={`${cardClasses} group flex w-full flex-col overflow-hidden`}
        >
          <span className="relative block aspect-square bg-surface">
            <Image
              src={placeholderPath({
                department,
                category: collection.slug,
                title: collection.title,
                index: 1,
              })}
              alt=""
              fill
              loading={index < eagerCount ? "eager" : "lazy"}
              sizes="(min-width: 1024px) 15vw, (min-width: 768px) 30vw, 46vw"
              unoptimized
              className="object-cover transition-transform duration-500 motion-safe:group-hover:scale-105"
            />
          </span>
          <span className="block p-3 text-center">
            <span className="block font-heading text-base font-semibold leading-snug group-hover:text-emphasis sm:text-lg">
              {collection.title}
            </span>
            <span className="block text-sm text-foreground/70">
              {collection.productCount} {collection.productCount === 1 ? "product" : "products"}
            </span>
          </span>
        </Link>
      </li>
    ))}
  </ul>
);
