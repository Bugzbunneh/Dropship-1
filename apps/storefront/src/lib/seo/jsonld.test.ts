import { loadStoreSeed } from "@dropship/stores";
import { beforeAll, describe, expect, it } from "vitest";
import { snapshotFromSeed } from "../catalog/fixtures";
import { findProduct } from "../catalog/queries";
import type { CatalogSnapshot } from "../catalog/types";
import { absoluteUrl, indexingAllowed, siteOrigin } from "../site";
import {
  breadcrumbJsonLd,
  organizationJsonLd,
  productJsonLd,
  serialiseJsonLd,
  websiteJsonLd,
} from "./jsonld";

let snapshot: CatalogSnapshot;

beforeAll(async () => {
  snapshot = snapshotFromSeed(await loadStoreSeed("pet-pilot"), "GBP");
});

const context = (slug: string) => ({
  product: findProduct(snapshot, slug)!,
  origin: "https://shop.example.com",
  path: `/products/${slug}`,
  currency: "GBP",
  locale: "en-GB",
});

describe("productJsonLd", () => {
  it("describes a single-variant product with one offer", () => {
    const data = productJsonLd(context("reflective-dog-lead"));

    expect(data["@type"]).toBe("Product");
    expect(data["name"]).toBe("Reflective Dog Lead 1.5m");
    expect(data["offers"]).toMatchObject({
      "@type": "Offer",
      price: "9.99",
      priceCurrency: "GBP",
      availability: "https://schema.org/InStock",
      url: "https://shop.example.com/products/reflective-dog-lead",
    });
  });

  it("describes a multi-variant product with a price range", () => {
    const data = productJsonLd(context("cloud-comfort-orthopaedic-dog-bed"));

    expect(data["offers"]).toMatchObject({
      "@type": "AggregateOffer",
      lowPrice: "34.99",
      highPrice: "54.99",
      offerCount: 6,
      priceCurrency: "GBP",
    });
  });

  it("uses absolute image URLs and the brand", () => {
    const data = productJsonLd(context("reflective-dog-lead"));

    expect(data["brand"]).toEqual({ "@type": "Brand", name: "Wagwell" });
    for (const image of data["image"] as string[]) {
      expect(image.startsWith("https://shop.example.com/")).toBe(true);
    }
  });

  it("reports out of stock when no variant can be bought", () => {
    const base = context("reflective-dog-lead");
    const soldOut = {
      ...base,
      product: {
        ...base.product,
        variants: base.product.variants.map((variant) => ({ ...variant, isAvailable: false })),
      },
    };

    expect(productJsonLd(soldOut)["offers"]).toMatchObject({
      availability: "https://schema.org/OutOfStock",
    });
  });

  it("never invents ratings or reviews", () => {
    const data = productJsonLd(context("reflective-dog-lead"));

    expect(data).not.toHaveProperty("aggregateRating");
    expect(data).not.toHaveProperty("review");
  });
});

describe("breadcrumbJsonLd, organizationJsonLd, websiteJsonLd", () => {
  it("number the breadcrumb trail from 1 with absolute URLs", () => {
    const data = breadcrumbJsonLd(
      [
        { name: "Home", path: "/" },
        { name: "Dogs", path: "/dogs" },
      ],
      "https://shop.example.com",
    );

    expect(data["itemListElement"]).toEqual([
      { "@type": "ListItem", position: 1, name: "Home", item: "https://shop.example.com/" },
      { "@type": "ListItem", position: 2, name: "Dogs", item: "https://shop.example.com/dogs" },
    ]);
  });

  it("offer a site search to search engines", () => {
    const data = websiteJsonLd({ name: "Shop", origin: "https://shop.example.com" });

    expect(JSON.stringify(data)).toContain(
      "https://shop.example.com/search?q={search_term_string}",
    );
  });

  it("include the contact email only when there is one", () => {
    expect(organizationJsonLd({ name: "Shop", origin: "https://x.test" })).not.toHaveProperty(
      "email",
    );
    expect(
      organizationJsonLd({ name: "Shop", origin: "https://x.test", email: "a@x.test" }),
    ).toHaveProperty("email");
  });
});

describe("serialiseJsonLd", () => {
  it("cannot be used to close the script tag it is placed in", () => {
    const text = serialiseJsonLd({ name: "</script><script>alert(1)</script>" });

    expect(text).not.toContain("</script>");
    expect(text).toContain("\\u003c/script>");
    expect(JSON.parse(text)).toEqual({ name: "</script><script>alert(1)</script>" });
  });
});

describe("site helpers", () => {
  it("build the origin from the domain, or from an override", () => {
    expect(siteOrigin({ domain: "pets.example.com" }, {})).toBe("https://pets.example.com");
    expect(
      siteOrigin(
        { domain: "pets.example.com" },
        { NEXT_PUBLIC_SITE_URL: "https://staging.x.test/" },
      ),
    ).toBe("https://staging.x.test");
  });

  it("make absolute URLs without doubling slashes", () => {
    expect(absoluteUrl("https://x.test", "/a")).toBe("https://x.test/a");
    expect(absoluteUrl("https://x.test", "a")).toBe("https://x.test/a");
    expect(absoluteUrl("https://x.test", "https://cdn.test/i.png")).toBe("https://cdn.test/i.png");
  });

  it("only allow indexing when explicitly switched on", () => {
    expect(indexingAllowed({})).toBe(false);
    expect(indexingAllowed({ ALLOW_INDEXING: "false" })).toBe(false);
    expect(indexingAllowed({ ALLOW_INDEXING: "true" })).toBe(true);
  });
});
