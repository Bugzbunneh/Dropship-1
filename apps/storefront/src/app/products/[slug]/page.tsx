import { ChevronDown, RotateCcw, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { DepartmentTheme } from "@/components/department-theme";
import { JsonLd } from "@/components/json-ld";
import { ProductGallery } from "@/components/product-gallery";
import { ProductGrid } from "@/components/product-grid";
import { ProductPurchase } from "@/components/product-purchase";
import { SectionHeading } from "@/components/section-heading";
import { getSnapshot } from "@/lib/catalog";
import { findCollection, findProduct, relatedCards } from "@/lib/catalog/queries";
import { formatMoney } from "@/lib/money";
import { breadcrumbJsonLd, productJsonLd } from "@/lib/seo/jsonld";
import { absoluteUrl, siteOrigin } from "@/lib/site";
import { getStoreConfig } from "@/lib/store";
import { findDepartment } from "@/lib/theme";

type PageProps = { params: Promise<{ slug: string }> };

// Every product is built ahead of time so pages are instant. If the catalog can't be read at build
// time, products are built on their first visit instead.
export const generateStaticParams = async () => {
  try {
    const snapshot = await getSnapshot();
    return snapshot.products.map((product) => ({ slug: product.slug }));
  } catch {
    return [];
  }
};

const isVector = (path: string): boolean =>
  path.startsWith("/placeholder.svg") || path.endsWith(".svg");

export const generateMetadata = async ({ params }: PageProps): Promise<Metadata> => {
  const { slug } = await params;
  const [config, snapshot] = await Promise.all([getStoreConfig(), getSnapshot()]);
  const product = findProduct(snapshot, slug);
  if (!product) {
    return {};
  }
  const description = product.summary ?? product.description[0] ?? config.home.subheading;
  const origin = siteOrigin(config);
  // social networks don't render SVG previews, so only real photographs are offered
  const photos = product.images.filter((image) => !isVector(image.path));

  return {
    title: product.title,
    description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      type: "website",
      title: product.title,
      description,
      url: absoluteUrl(origin, `/products/${product.slug}`),
      ...(photos.length > 0
        ? {
            images: photos.map((image) => ({
              url: absoluteUrl(origin, image.path),
              alt: image.alt,
            })),
          }
        : {}),
    },
  };
};

const Details = ({
  title,
  children,
  open = false,
}: {
  title: string;
  children: React.ReactNode;
  open?: boolean;
}) => (
  <details open={open} className="group border-b border-muted py-1">
    <summary className="flex list-none items-center justify-between py-4 font-heading text-lg font-bold [&::-webkit-details-marker]:hidden">
      {title}
      <ChevronDown
        aria-hidden="true"
        className="h-5 w-5 transition-transform group-open:rotate-180"
      />
    </summary>
    <div className="space-y-3 pb-5 text-foreground/85">{children}</div>
  </details>
);

const ProductPage = async ({ params }: PageProps) => {
  const { slug } = await params;
  const [config, snapshot] = await Promise.all([getStoreConfig(), getSnapshot()]);
  const product = findProduct(snapshot, slug);
  if (!product) {
    notFound();
  }

  const department = findDepartment(config.departments, product.department);
  const mainCollection = product.collectionSlugs
    .map((collectionSlug) => findCollection(snapshot, product.department, collectionSlug))
    .find((collection) => collection !== undefined);
  const origin = siteOrigin(config);
  const related = relatedCards(snapshot, product, 4);

  const trail = [
    { name: "Home", href: "/" },
    ...(department ? [{ name: department.name, href: `/${department.slug}` }] : []),
    ...(department && mainCollection
      ? [{ name: mainCollection.title, href: `/${department.slug}/${mainCollection.slug}` }]
      : []),
    { name: product.title, href: `/products/${product.slug}` },
  ];

  const pickable = product.variants.map((variant) => ({
    id: variant.id,
    title: variant.title,
    priceMinor: variant.priceMinor,
    compareAtMinor: variant.compareAtMinor,
    options: variant.options,
    isAvailable: variant.isAvailable,
  }));

  const threshold = formatMoney(config.shipping.freeThresholdMinor, config.currency, config.locale);

  return (
    <DepartmentTheme department={department}>
      <JsonLd
        data={[
          productJsonLd({
            product,
            origin,
            path: `/products/${product.slug}`,
            currency: config.currency,
            locale: config.locale,
          }),
          breadcrumbJsonLd(
            trail.map((crumb) => ({ name: crumb.name, path: crumb.href })),
            origin,
          ),
        ]}
      />

      <div className="bg-surface">
        <div className="container-page py-4">
          <Breadcrumbs items={trail} />
        </div>
      </div>

      <div className="container-page py-8 lg:py-12">
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-14">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <ProductGallery images={product.images} productTitle={product.title} />
          </div>

          <div className="space-y-8">
            <div>
              {product.brand ? (
                <p className="mb-2 text-sm font-bold uppercase tracking-wider text-emphasis">
                  {product.brand}
                </p>
              ) : null}
              <h1 className="text-3xl font-bold sm:text-4xl">{product.title}</h1>
              {product.summary ? (
                <p className="mt-3 text-lg text-foreground/85">{product.summary}</p>
              ) : null}
            </div>

            <ProductPurchase productTitle={product.title} variants={pickable} />

            <ul className="grid gap-3 rounded-2xl bg-surface p-5 text-sm sm:grid-cols-2">
              <li className="flex items-start gap-3">
                <ShieldCheck aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-emphasis" />
                <span>
                  <strong>Free delivery over {threshold}</strong>, otherwise a flat rate shown
                  before you pay
                </span>
              </li>
              <li className="flex items-start gap-3">
                <RotateCcw aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-emphasis" />
                <span>
                  <strong>{config.policies.returnsWindowDays}-day returns</strong> on unused items
                </span>
              </li>
            </ul>

            <div className="border-t border-muted">
              <Details title="Description" open>
                {product.description.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </Details>
              <Details title="Delivery & returns">
                <p>
                  We aim to deliver within {config.policies.deliveryMaxWorkingDays} working days of
                  your order. Delivery is free over {threshold}.
                </p>
                <p>
                  You can return unused items within {config.policies.returnsWindowDays} days.{" "}
                  <Link
                    href="/delivery"
                    className="font-bold text-emphasis underline underline-offset-4"
                  >
                    Delivery details
                  </Link>{" "}
                  ·{" "}
                  <Link
                    href="/returns"
                    className="font-bold text-emphasis underline underline-offset-4"
                  >
                    Returns policy
                  </Link>
                </p>
              </Details>
              <Details title="Product details">
                <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
                  {product.brand ? (
                    <>
                      <dt className="font-bold">Brand</dt>
                      <dd>{product.brand}</dd>
                    </>
                  ) : null}
                  {department ? (
                    <>
                      <dt className="font-bold">For</dt>
                      <dd>{department.name}</dd>
                    </>
                  ) : null}
                  {mainCollection ? (
                    <>
                      <dt className="font-bold">Category</dt>
                      <dd>{mainCollection.title}</dd>
                    </>
                  ) : null}
                  <dt className="font-bold">Item code</dt>
                  <dd>{product.variants[0]?.sku}</dd>
                </dl>
              </Details>
            </div>
          </div>
        </div>

        {related.length > 0 ? (
          <section className="mt-20" aria-labelledby="related-heading">
            <SectionHeading
              id="related-heading"
              title="You might also like"
              {...(department
                ? {
                    link: {
                      href: `/${department.slug}/all`,
                      label: `More for ${department.name.toLowerCase()}`,
                    },
                  }
                : {})}
            />
            <ProductGrid cards={related} />
          </section>
        ) : null}
      </div>

      {/* leaves room for the sticky add-to-cart bar on phones */}
      <div aria-hidden="true" className="h-20 lg:hidden" />
    </DepartmentTheme>
  );
};

export default ProductPage;
