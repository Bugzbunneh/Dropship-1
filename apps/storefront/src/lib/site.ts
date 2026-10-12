import type { StoreConfig } from "@dropship/config";

// The public address of this store, used for canonical links, social previews, the sitemap and
// structured data. NEXT_PUBLIC_SITE_URL overrides it for staging and previews.
export const siteOrigin = (
  config: Pick<StoreConfig, "domain">,
  env: Record<string, string | undefined> = process.env,
): string => {
  const override = env["NEXT_PUBLIC_SITE_URL"]?.trim();
  return (override ? override : `https://${config.domain}`).replace(/\/+$/, "");
};

export const absoluteUrl = (origin: string, path: string): string =>
  path.startsWith("http") ? path : `${origin}${path.startsWith("/") ? path : `/${path}`}`;

// Search engines should only index the real site. Staging and previews set ALLOW_INDEXING to
// anything but "true" (the default) and get a noindex robots file and sitemap.
export const indexingAllowed = (env: Record<string, string | undefined> = process.env): boolean =>
  env["ALLOW_INDEXING"] === "true";
