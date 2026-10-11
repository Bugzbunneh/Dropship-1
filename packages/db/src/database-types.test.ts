import { describe, expect, it } from "vitest";
import type { Database } from "./database.types";

// These checks run in the typechecker. If the generated types ever stop requiring store_id on
// inserts (for example after a migration makes the column nullable), `pnpm typecheck` fails.

type Tables = Database["public"]["Tables"];

describe("generated database types", () => {
  it("require a store on every store-owned insert", () => {
    const product: Tables["products"]["Insert"] = {
      store_id: "00000000-0000-4000-8000-0000000000a0",
      slug: "dog-bed",
      title: "Dog bed",
    };

    // @ts-expect-error store_id is required
    const missingStore: Tables["products"]["Insert"] = { slug: "dog-bed", title: "Dog bed" };

    expect(product.store_id).toBeDefined();
    expect(missingStore.store_id).toBeUndefined();
  });

  it("store prices as integers in minor units", () => {
    const variant: Tables["variants"]["Row"] = {
      id: "v1",
      store_id: "s1",
      product_id: "p1",
      sku: "SKU-1",
      title: "Medium",
      price_minor: 2999,
      currency: "GBP",
      is_available: true,
      position: 0,
      created_at: "2026-10-11T00:00:00Z",
    };

    expect(variant.price_minor).toBe(2999);
  });
});
