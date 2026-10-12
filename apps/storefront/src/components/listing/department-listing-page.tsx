import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getSnapshot } from "@/lib/catalog";
import { parseListingParams } from "@/lib/catalog/listing-params";
import { collectionsOf, findCollection } from "@/lib/catalog/queries";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { siteOrigin } from "@/lib/site";
import { getStoreConfig } from "@/lib/store";
import { findDepartment } from "@/lib/theme";
import { cn } from "@/lib/ui";
import { Breadcrumbs } from "../breadcrumbs";
import { DepartmentTheme } from "../department-theme";
import { JsonLd } from "../json-ld";
import { ListingSkeleton } from "./listing-skeleton";
import { ListingView } from "./listing-view";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type DepartmentListingPageProps = {
  departmentSlug: string;
  // leave out to list everything the pet has
  collectionSlug?: string;
  searchParams: SearchParams;
};

// Reading the URL's filters is what makes a page dynamic, so only the product area sits behind
// it. The banner and breadcrumbs around it are ready immediately.
const Results = async ({
  searchParams,
  basePath,
  departmentSlug,
  collectionSlug,
}: {
  searchParams: SearchParams;
  basePath: string;
  departmentSlug: string;
  collectionSlug: string | undefined;
}) => {
  const raw = await searchParams;
  const query = parseListingParams(raw, {
    department: departmentSlug,
    ...(collectionSlug ? { collection: collectionSlug } : {}),
  });
  return <ListingView basePath={basePath} query={query} />;
};

// A pet's collection (/dogs/dog-beds) or everything for that pet (/dogs/all).
export const DepartmentListingPage = async ({
  departmentSlug,
  collectionSlug,
  searchParams,
}: DepartmentListingPageProps) => {
  const config = await getStoreConfig();
  const department = findDepartment(config.departments, departmentSlug);
  if (!department) {
    notFound();
  }

  const snapshot = await getSnapshot();
  const collection = collectionSlug
    ? findCollection(snapshot, departmentSlug, collectionSlug)
    : undefined;
  if (collectionSlug && !collection) {
    notFound();
  }

  const collections = collectionsOf(snapshot, departmentSlug);
  const title = collection ? collection.title : `Everything for ${department.name.toLowerCase()}`;
  const basePath = collection ? `/${departmentSlug}/${collection.slug}` : `/${departmentSlug}/all`;
  const trail = [
    { name: "Home", href: "/" },
    { name: department.name, href: `/${departmentSlug}` },
    { name: title, href: basePath },
  ];

  return (
    <DepartmentTheme department={department}>
      <JsonLd
        data={breadcrumbJsonLd(
          trail.map((crumb) => ({ name: crumb.name, path: crumb.href })),
          siteOrigin(config),
        )}
      />
      <section className="bg-surface">
        <div className="container-page py-6 md:py-8">
          <Breadcrumbs items={trail} className="mb-3" />
          <h1 className="text-3xl font-bold text-emphasis sm:text-4xl">{title}</h1>
          {collection?.description ? (
            <p className="mt-2 max-w-2xl text-foreground/85">{collection.description}</p>
          ) : null}
          <ul
            className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
            aria-label={`${department.name} categories`}
          >
            {[{ slug: "all", title: "All" }, ...collections].map((entry) => {
              const active = entry.slug === (collectionSlug ?? "all");
              return (
                <li key={entry.slug} className="shrink-0">
                  <Link
                    href={`/${departmentSlug}/${entry.slug}`}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "inline-block rounded-full px-4 py-2 text-sm font-bold shadow-sm transition",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-background hover:bg-primary hover:text-primary-foreground",
                    )}
                  >
                    {entry.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <div className="container-page py-8">
        <Suspense fallback={<ListingSkeleton />}>
          <Results
            searchParams={searchParams}
            basePath={basePath}
            departmentSlug={departmentSlug}
            collectionSlug={collectionSlug}
          />
        </Suspense>
      </div>
    </DepartmentTheme>
  );
};
