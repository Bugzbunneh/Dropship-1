import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CollectionTiles } from "@/components/collection-tiles";
import { ListingSkeleton } from "@/components/listing/listing-skeleton";
import { ListingView } from "@/components/listing/listing-view";
import { SectionHeading } from "@/components/section-heading";
import { getSnapshot } from "@/lib/catalog";
import { parseListingParams } from "@/lib/catalog/listing-params";
import { collectionsOf } from "@/lib/catalog/queries";
import { getStoreConfig } from "@/lib/store";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

// Search results are different for every query, so they are not worth indexing.
export const metadata: Metadata = {
  title: "Search",
  robots: { index: false, follow: true },
};

const Results = async ({ searchParams }: { searchParams: SearchParams }) => {
  const query = parseListingParams(await searchParams, { allowSearch: true });

  if (!query.search) {
    return <Browse />;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold sm:text-4xl">
        Results for <span className="text-emphasis">“{query.search}”</span>
      </h1>
      <ListingView basePath="/search" query={query} showDepartment />
    </div>
  );
};

// What to show when nobody has typed anything: a way into every pet's categories.
const Browse = async () => {
  const [config, snapshot] = await Promise.all([getStoreConfig(), getSnapshot()]);

  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-3xl font-bold sm:text-4xl">Search</h1>
        <p className="mt-2 text-foreground/80">
          Type in the box above to find a product, or start from a category.
        </p>
      </div>
      {config.departments.map((department) => (
        <section key={department.slug} aria-labelledby={`browse-${department.slug}`}>
          <SectionHeading
            id={`browse-${department.slug}`}
            title={department.name}
            link={{ href: `/${department.slug}`, label: `Shop ${department.name.toLowerCase()}` }}
          />
          <CollectionTiles
            department={department.slug}
            collections={collectionsOf(snapshot, department.slug)}
          />
        </section>
      ))}
    </div>
  );
};

const SearchPage = ({ searchParams }: { searchParams: SearchParams }) => (
  <div className="container-page py-8">
    <Breadcrumbs
      items={[
        { name: "Home", href: "/" },
        { name: "Search", href: "/search" },
      ]}
      className="mb-5"
    />
    <Suspense fallback={<ListingSkeleton />}>
      <Results searchParams={searchParams} />
    </Suspense>
    <p className="mt-12 text-center text-sm text-foreground/70">
      Can’t find it?{" "}
      <Link href="/contact" className="font-bold text-emphasis underline underline-offset-4">
        Tell us what you’re after
      </Link>
      .
    </p>
  </div>
);

export default SearchPage;
