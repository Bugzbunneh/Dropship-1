import Link from "next/link";
import type { CollectionSummary } from "@/lib/catalog/queries";
import { Breadcrumbs } from "./breadcrumbs";
import { DepartmentMark } from "./pet-marks";

type DepartmentHeroProps = {
  slug: string;
  name: string;
  tagline: string;
  collections: CollectionSummary[];
  productCount: number;
};

// The banner at the top of a pet's page, in that pet's colours, with quick links to each
// collection so nobody has to scroll to find what they came for.
export const DepartmentHero = ({
  slug,
  name,
  tagline,
  collections,
  productCount,
}: DepartmentHeroProps) => (
  <section className="relative overflow-hidden bg-surface">
    <div
      aria-hidden="true"
      className="absolute -right-16 -top-16 h-72 w-72 rounded-full bg-primary/25"
    />
    <div
      aria-hidden="true"
      className="absolute -bottom-24 right-40 hidden h-56 w-56 rounded-full bg-accent/15 md:block"
    />
    <div className="container-page relative grid items-center gap-6 py-8 md:grid-cols-[1fr_auto] md:py-12">
      <div>
        <Breadcrumbs
          items={[
            { name: "Home", href: "/" },
            { name, href: `/${slug}` },
          ]}
          className="mb-4"
        />
        <h1 className="text-4xl font-bold text-emphasis sm:text-5xl">{name}</h1>
        <p className="mt-2 max-w-xl text-lg text-foreground/85">{tagline}</p>
        <ul className="mt-5 flex flex-wrap gap-2" aria-label={`${name} categories`}>
          {collections.map((collection) => (
            <li key={collection.slug}>
              <Link
                href={`/${slug}/${collection.slug}`}
                className="inline-block rounded-full bg-background px-4 py-2 text-sm font-bold shadow-sm transition hover:bg-primary hover:text-primary-foreground"
              >
                {collection.title}
              </Link>
            </li>
          ))}
          <li>
            <Link
              href={`/${slug}/all`}
              className="inline-block rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-sm hover:brightness-95"
            >
              All {productCount} products
            </Link>
          </li>
        </ul>
      </div>
      <DepartmentMark slug={slug} className="hidden h-44 w-44 md:block lg:h-56 lg:w-56" />
    </div>
  </section>
);
