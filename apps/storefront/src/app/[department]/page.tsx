import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CollectionTiles } from "@/components/collection-tiles";
import { DepartmentHero } from "@/components/department-hero";
import { DepartmentTheme } from "@/components/department-theme";
import { JsonLd } from "@/components/json-ld";
import { ProductGrid } from "@/components/product-grid";
import { SectionHeading } from "@/components/section-heading";
import { TrustStrip } from "@/components/trust-strip";
import { getSnapshot } from "@/lib/catalog";
import { collectionsOf, featuredCards, newestCards, saleCards } from "@/lib/catalog/queries";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { siteOrigin } from "@/lib/site";
import { getStoreConfig } from "@/lib/store";
import { findDepartment } from "@/lib/theme";

type PageProps = { params: Promise<{ department: string }> };

export const generateStaticParams = async () => {
  const config = await getStoreConfig();
  return config.departments.map((department) => ({ department: department.slug }));
};

export const generateMetadata = async ({ params }: PageProps): Promise<Metadata> => {
  const { department: slug } = await params;
  const config = await getStoreConfig();
  const department = findDepartment(config.departments, slug);
  if (!department) {
    return {};
  }
  const snapshot = await getSnapshot();
  const count = snapshot.products.filter((product) => product.department === slug).length;

  return {
    title: `Shop ${department.name}`,
    description: `${department.tagline}. Browse ${count} products for ${department.name.toLowerCase()}, delivered within ${config.policies.deliveryMaxWorkingDays} working days.`,
    alternates: { canonical: `/${slug}` },
  };
};

const DepartmentPage = async ({ params }: PageProps) => {
  const { department: slug } = await params;
  const config = await getStoreConfig();
  const department = findDepartment(config.departments, slug);
  if (!department) {
    notFound();
  }

  const snapshot = await getSnapshot();
  const collections = collectionsOf(snapshot, slug);
  const productCount = snapshot.products.filter((product) => product.department === slug).length;
  const bestSellers = featuredCards(snapshot, { department: slug, limit: 8 });
  const onSale = saleCards(snapshot, { department: slug, limit: 4 });
  const newIn = newestCards(snapshot, { department: slug, limit: 4 });
  const origin = siteOrigin(config);

  return (
    <DepartmentTheme department={department}>
      <JsonLd
        data={breadcrumbJsonLd(
          [
            { name: "Home", path: "/" },
            { name: department.name, path: `/${slug}` },
          ],
          origin,
        )}
      />
      <DepartmentHero
        slug={slug}
        name={department.name}
        tagline={department.tagline}
        collections={collections}
        productCount={productCount}
      />

      <div className="container-page space-y-16 py-12">
        <section aria-labelledby="categories-heading">
          <SectionHeading
            id="categories-heading"
            title="Shop by category"
            link={{
              href: `/${slug}/all`,
              label: `See everything for ${department.name.toLowerCase()}`,
            }}
          />
          <CollectionTiles department={slug} collections={collections} eagerCount={6} />
        </section>

        <section aria-labelledby="favourites-heading">
          <SectionHeading
            id="favourites-heading"
            title="Customer favourites"
            eyebrow="Best sellers"
            link={{ href: `/${slug}/all`, label: "See everything" }}
          />
          <ProductGrid cards={bestSellers} />
        </section>

        {onSale.length > 0 ? (
          <section aria-labelledby="sale-heading">
            <SectionHeading
              id="sale-heading"
              title="Reduced prices"
              eyebrow="Offers"
              link={{ href: `/${slug}/all?sale=1`, label: "All offers" }}
            />
            <ProductGrid cards={onSale} />
          </section>
        ) : null}

        <section aria-labelledby="new-heading">
          <SectionHeading id="new-heading" title="New in" eyebrow="Just arrived" />
          <ProductGrid cards={newIn} />
        </section>

        <TrustStrip />
      </div>
    </DepartmentTheme>
  );
};

export default DepartmentPage;
