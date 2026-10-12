import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { CollectionTiles } from "@/components/collection-tiles";
import { DepartmentTheme } from "@/components/department-theme";
import { FaqList } from "@/components/faq-list";
import { DepartmentMark } from "@/components/pet-marks";
import { ProductGrid } from "@/components/product-grid";
import { SectionHeading } from "@/components/section-heading";
import { TrustStrip } from "@/components/trust-strip";
import { getSnapshot } from "@/lib/catalog";
import { collectionsOf, featuredCards, newestCards, saleCards } from "@/lib/catalog/queries";
import { faqItems } from "@/lib/content/faq";
import { getStoreConfig } from "@/lib/store";
import { buttonClasses } from "@/lib/ui";

const HomePage = async () => {
  const [config, snapshot] = await Promise.all([getStoreConfig(), getSnapshot()]);
  const favourites = featuredCards(snapshot, { limit: 8 });
  const onSale = saleCards(snapshot, { limit: 4 });
  const newIn = newestCards(snapshot, { limit: 4 });

  return (
    <>
      <section className="relative overflow-hidden bg-surface">
        <div
          aria-hidden="true"
          className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-accent/20"
        />
        <div className="container-page relative grid items-center gap-10 py-10 md:py-16 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <p className="mb-3 text-sm font-bold uppercase tracking-wider text-emphasis">
              Pet supplies, delivered fast
            </p>
            <h1 className="text-5xl font-bold leading-[1.05] sm:text-6xl">{config.home.heading}</h1>
            <p className="mt-5 max-w-xl text-lg text-foreground/85">{config.home.subheading}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              {config.departments.map((department) => (
                <DepartmentTheme key={department.slug} department={department}>
                  <Link href={`/${department.slug}`} className={buttonClasses("primary", "lg")}>
                    Shop {department.name}
                    <ArrowRight aria-hidden="true" className="h-5 w-5" />
                  </Link>
                </DepartmentTheme>
              ))}
            </div>
          </div>

          <ul className="grid grid-cols-2 gap-4">
            {config.departments.map((department) => (
              <li key={department.slug}>
                <DepartmentTheme department={department}>
                  <Link
                    href={`/${department.slug}`}
                    className="group flex h-full flex-col items-center rounded-3xl bg-background p-5 text-center shadow-card transition motion-safe:hover:-translate-y-1 hover:shadow-lift"
                  >
                    <span className="flex aspect-square w-full items-center justify-center rounded-2xl bg-surface">
                      <DepartmentMark
                        slug={department.slug}
                        className="h-4/5 w-4/5 transition-transform duration-500 motion-safe:group-hover:scale-105"
                      />
                    </span>
                    <span className="mt-4 font-heading text-2xl font-bold text-emphasis">
                      {department.name}
                    </span>
                    <span className="text-sm text-foreground/75">{department.tagline}</span>
                  </Link>
                </DepartmentTheme>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="container-page space-y-20 py-12 md:py-16">
        <TrustStrip />

        {config.departments.map((department) => (
          <DepartmentTheme key={department.slug} department={department}>
            <section aria-labelledby={`shop-${department.slug}`}>
              <SectionHeading
                id={`shop-${department.slug}`}
                eyebrow={department.name}
                title={`Shop ${department.name.toLowerCase()} by category`}
                link={{
                  href: `/${department.slug}/all`,
                  label: `See everything for ${department.name.toLowerCase()}`,
                }}
              />
              <CollectionTiles
                department={department.slug}
                collections={collectionsOf(snapshot, department.slug)}
              />
            </section>
          </DepartmentTheme>
        ))}

        <section aria-labelledby="favourites">
          <SectionHeading id="favourites" eyebrow="Best sellers" title="Customer favourites" />
          <ProductGrid cards={favourites} showDepartment />
        </section>

        {onSale.length > 0 ? (
          <section aria-labelledby="offers">
            <SectionHeading
              id="offers"
              eyebrow="Offers"
              title="Reduced prices"
              description="Real savings on things pets actually use."
            />
            <ProductGrid cards={onSale} showDepartment />
          </section>
        ) : null}

        <section aria-labelledby="new-in">
          <SectionHeading id="new-in" eyebrow="Just arrived" title="New in" />
          <ProductGrid cards={newIn} showDepartment />
        </section>

        <section aria-labelledby="questions" className="mx-auto max-w-3xl">
          <SectionHeading
            id="questions"
            title="Good to know"
            description="The questions people ask before they order."
            link={{ href: "/faq", label: "All FAQs" }}
          />
          <FaqList items={faqItems(config)} limit={4} />
        </section>
      </div>
    </>
  );
};

export default HomePage;
