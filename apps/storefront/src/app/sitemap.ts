import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { getSnapshot } from "@/lib/catalog";
import { collectionsOf } from "@/lib/catalog/queries";
import { absoluteUrl, indexingAllowed, siteOrigin } from "@/lib/site";
import { getStoreConfig } from "@/lib/store";

type Entry = MetadataRoute.Sitemap[number];

const STATIC_PAGES = ["/delivery", "/returns", "/faq", "/contact", "/privacy", "/terms"];

// Every page worth finding in search: the home page, each pet, its collections, every product and
// the help pages. Left empty on staging, where nothing should be indexed. Read per request so it
// always matches the current catalog.
const sitemap = async (): Promise<MetadataRoute.Sitemap> => {
  await connection();
  if (!indexingAllowed()) {
    return [];
  }

  const [config, snapshot] = await Promise.all([getStoreConfig(), getSnapshot()]);
  const origin = siteOrigin(config);
  const url = (path: string): string => absoluteUrl(origin, path);

  const departments: Entry[] = config.departments.flatMap((department) => [
    { url: url(`/${department.slug}`), changeFrequency: "weekly", priority: 0.9 },
    ...collectionsOf(snapshot, department.slug).map((collection): Entry => ({
      url: url(`/${department.slug}/${collection.slug}`),
      changeFrequency: "weekly",
      priority: 0.8,
    })),
  ]);

  const products = snapshot.products.map((product): Entry => ({
    url: url(`/products/${product.slug}`),
    lastModified: new Date(product.updatedAt),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const help = STATIC_PAGES.map((path): Entry => ({
    url: url(path),
    changeFrequency: "yearly",
    priority: 0.3,
  }));

  return [
    { url: url("/"), changeFrequency: "daily", priority: 1 },
    ...departments,
    ...products,
    ...help,
  ];
};

export default sitemap;
