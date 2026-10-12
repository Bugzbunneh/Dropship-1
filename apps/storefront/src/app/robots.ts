import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { absoluteUrl, indexingAllowed, siteOrigin } from "@/lib/site";
import { getStoreConfig } from "@/lib/store";

// Search engines may crawl the real site but not the cart, search results or the API. On staging
// and previews (ALLOW_INDEXING unset) nothing is allowed.
const robots = async (): Promise<MetadataRoute.Robots> => {
  await connection();
  if (!indexingAllowed()) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  const config = await getStoreConfig();
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/cart", "/search"] },
    sitemap: absoluteUrl(siteOrigin(config), "/sitemap.xml"),
  };
};

export default robots;
