import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { getSnapshot } from "@/lib/catalog";
import { collectionsOf } from "@/lib/catalog/queries";
import { getStoreConfig } from "@/lib/store";
import { departmentToCssVariables } from "@/lib/theme";
import { CartButton } from "./cart-button";
import { CollapsibleSearchRow } from "./collapsible-search-row";
import { DepartmentTheme } from "./department-theme";
import { MobileNav, type NavDepartment } from "./mobile-nav";
import { PawMark } from "./pet-marks";
import { SearchBox } from "./search-box";

// Logo, one tab per pet (each in its own colours, with a menu of that pet's collections), search
// and the cart. On small screens the tabs move into a menu and search drops to its own row.
export const SiteHeader = async () => {
  const config = await getStoreConfig();
  const snapshot = await getSnapshot();

  const departments = config.departments.map((department) => ({
    department,
    collections: collectionsOf(snapshot, department.slug),
  }));

  const mobileDepartments: NavDepartment[] = departments.map(({ department, collections }) => ({
    slug: department.slug,
    name: department.name,
    tagline: department.tagline,
    style: departmentToCssVariables(department),
    collections: collections.map((collection) => ({
      slug: collection.slug,
      title: collection.title,
    })),
  }));

  return (
    <>
      {/* On phones the search row hangs below the pinned logo row and fades away while scrolling
          down (see CollapsibleSearchRow), so the pinned header is one row rather than a fifth of
          the screen. */}
      <header className="sticky top-0 z-40 border-b border-muted bg-background/92 backdrop-blur">
        <div className="container-page flex items-center gap-2 py-3 md:gap-6">
          <MobileNav
            storeName={config.name}
            departments={mobileDepartments}
            helpLinks={config.navigation}
          />

          <Link
            href="/"
            className="flex shrink-0 items-center gap-2.5"
            aria-label={`${config.name} home`}
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-background">
              <PawMark className="h-6 w-6" />
            </span>
            <span className="font-heading text-xl font-bold tracking-tight sm:text-2xl">
              {config.name}
            </span>
          </Link>

          <nav aria-label="Main" className="ml-2 hidden items-center gap-1 md:flex">
            {departments.map(({ department, collections }) => (
              <DepartmentTheme
                key={department.slug}
                department={department}
                className="group relative"
              >
                <Link
                  href={`/${department.slug}`}
                  className="flex items-center gap-1.5 rounded-full px-4 py-2 font-bold text-emphasis hover:bg-surface"
                >
                  <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-primary" />
                  {department.name}
                  <ChevronDown
                    aria-hidden="true"
                    className="h-4 w-4 transition-transform group-hover:rotate-180 group-focus-within:rotate-180"
                  />
                </Link>
                <div className="invisible absolute left-0 top-full z-50 w-72 pt-2 opacity-0 transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                  <ul className="rounded-2xl border border-muted bg-background p-2 shadow-lift">
                    <li>
                      <Link
                        href={`/${department.slug}`}
                        className="block rounded-xl bg-primary px-4 py-2.5 font-bold text-primary-foreground"
                      >
                        Shop all {department.name.toLowerCase()}
                      </Link>
                    </li>
                    {collections.map((collection) => (
                      <li key={collection.slug}>
                        <Link
                          href={`/${department.slug}/${collection.slug}`}
                          className="block rounded-xl px-4 py-2.5 font-semibold hover:bg-surface"
                        >
                          {collection.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </DepartmentTheme>
            ))}
          </nav>

          <SearchBox className="ml-auto hidden w-full max-w-md md:block" />
          <div className="ml-auto flex items-center md:ml-0">
            <CartButton />
          </div>
        </div>

        <CollapsibleSearchRow>
          <SearchBox />
        </CollapsibleSearchRow>
      </header>
      {/* reserves the search row's space at the top of the page on phones, and scrolls away with it */}
      <div aria-hidden="true" className="h-14 md:hidden" />
    </>
  );
};
