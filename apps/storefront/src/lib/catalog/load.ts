import { loadFixtureSnapshot } from "./fixtures";
import { loadSupabaseSnapshot } from "./supabase-snapshot";
import type { CatalogSnapshot } from "./types";

export type CatalogSource = "supabase" | "fixtures";

// Real data is the default. The offline demo catalog has to be asked for (CATALOG_SOURCE=fixtures)
// so a misconfigured production deployment fails loudly instead of quietly showing demo products.
export const catalogSource = (
  env: Record<string, string | undefined> = process.env,
): CatalogSource => (env["CATALOG_SOURCE"] === "fixtures" ? "fixtures" : "supabase");

// Reads the catalog straight from its source, with no caching. Pages use the cached getSnapshot in
// ./index; this is for code that runs outside a page render, such as the proxy.
export const loadSnapshot = (): Promise<CatalogSnapshot> =>
  catalogSource() === "fixtures" ? loadFixtureSnapshot() : loadSupabaseSnapshot();
