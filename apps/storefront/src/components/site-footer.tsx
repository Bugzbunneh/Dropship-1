import { Lock, Mail } from "lucide-react";
import Link from "next/link";
import { catalogSource, getSnapshot } from "@/lib/catalog";
import { collectionsOf } from "@/lib/catalog/queries";
import { getCurrentYear } from "@/lib/current-year";
import { getStoreConfig } from "@/lib/store";
import { PawMark } from "./pet-marks";

// Links to every pet and its collections, the help pages, and the seller's details. Details the
// business has not filled in yet are simply left out here; the policy pages flag them.
export const SiteFooter = async () => {
  const config = await getStoreConfig();
  const snapshot = await getSnapshot();
  const { business } = config;
  const year = await getCurrentYear();
  const offline = catalogSource() === "fixtures";

  return (
    <footer className="mt-20 border-t border-muted bg-surface">
      <div className="container-page grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          <p className="flex items-center gap-2.5 font-heading text-xl font-bold">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-background">
              <PawMark className="h-5 w-5" />
            </span>
            {config.name}
          </p>
          <p className="max-w-xs text-foreground/80">{config.tagline}</p>
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground/80">
            <Lock aria-hidden="true" className="h-4 w-4" />
            Payments handled securely by Stripe
          </p>
        </div>

        {config.departments.map((department) => (
          <nav key={department.slug} aria-label={`${department.name} shop`}>
            <h2 className="mb-3 text-base font-bold">
              <Link href={`/${department.slug}`} className="hover:text-emphasis hover:underline">
                Shop {department.name}
              </Link>
            </h2>
            <ul className="space-y-2 text-foreground/85">
              {collectionsOf(snapshot, department.slug).map((collection) => (
                <li key={collection.slug}>
                  <Link
                    href={`/${department.slug}/${collection.slug}`}
                    className="hover:text-emphasis hover:underline"
                  >
                    {collection.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}

        <nav aria-label="Help">
          <h2 className="mb-3 text-base font-bold">Help</h2>
          <ul className="space-y-2 text-foreground/85">
            {config.navigation.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:text-emphasis hover:underline">
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/privacy" className="hover:text-emphasis hover:underline">
                Privacy policy
              </Link>
            </li>
            <li>
              <Link href="/terms" className="hover:text-emphasis hover:underline">
                Terms &amp; conditions
              </Link>
            </li>
          </ul>
          {business.email ? (
            <p className="mt-4 flex items-center gap-2 text-sm">
              <Mail aria-hidden="true" className="h-4 w-4" />
              <a href={`mailto:${business.email}`} className="underline">
                {business.email}
              </a>
            </p>
          ) : null}
        </nav>
      </div>

      <div className="border-t border-muted">
        <div className="container-page flex flex-col gap-1 py-5 text-sm text-foreground/75 sm:flex-row sm:items-center sm:justify-between">
          <p>
            &copy; {year} {business.legalName ?? config.name}
            {business.companyNumber ? ` · Company no. ${business.companyNumber}` : ""}
            {business.vatNumber ? ` · VAT no. ${business.vatNumber}` : ""}
          </p>
          {business.address ? <p>{business.address}</p> : null}
          {offline ? (
            <p className="font-bold text-sale" data-testid="demo-banner">
              Offline demo catalog: not real stock
            </p>
          ) : null}
        </div>
      </div>
    </footer>
  );
};
