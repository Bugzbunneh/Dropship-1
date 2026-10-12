import { expect, test, type Page } from "@playwright/test";

type JsonLd = Record<string, unknown>;

const jsonLdOn = async (page: Page): Promise<JsonLd[]> => {
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  return blocks.flatMap((block) => {
    const parsed = JSON.parse(block) as JsonLd | JsonLd[];
    return Array.isArray(parsed) ? parsed : [parsed];
  });
};

test.describe("search engine basics", () => {
  test("a product page has a title, description, canonical link and social tags", async ({
    page,
  }) => {
    await page.goto("/products/cloud-comfort-orthopaedic-dog-bed");

    await expect(page).toHaveTitle("Cloud Comfort Orthopaedic Dog Bed | Pilot Pets");
    await expect(page.locator("meta[name=description]")).toHaveAttribute("content", /supportive/);
    await expect(page.locator("link[rel=canonical]")).toHaveAttribute(
      "href",
      /\/products\/cloud-comfort-orthopaedic-dog-bed$/,
    );
    await expect(page.locator("meta[property='og:title']")).toHaveAttribute(
      "content",
      "Cloud Comfort Orthopaedic Dog Bed",
    );
  });

  test("a product page describes itself with Product and Breadcrumb data", async ({ page }) => {
    await page.goto("/products/reflective-dog-lead");

    const data = await jsonLdOn(page);
    const product = data.find((entry) => entry["@type"] === "Product");
    const crumbs = data.find((entry) => entry["@type"] === "BreadcrumbList");

    expect(product).toMatchObject({
      name: "Reflective Dog Lead 1.5m",
      brand: { name: "Wagwell" },
      offers: {
        "@type": "Offer",
        price: "9.99",
        priceCurrency: "GBP",
        availability: "https://schema.org/InStock",
      },
    });
    expect(product).not.toHaveProperty("aggregateRating");
    expect(crumbs?.["itemListElement"]).toHaveLength(4);
  });

  test("a product with several variants gives a price range", async ({ page }) => {
    await page.goto("/products/cloud-comfort-orthopaedic-dog-bed");

    const product = (await jsonLdOn(page)).find((entry) => entry["@type"] === "Product");

    expect(product?.["offers"]).toMatchObject({
      "@type": "AggregateOffer",
      lowPrice: "34.99",
      highPrice: "54.99",
      offerCount: 6,
    });
  });

  test("every page declares the site as an organisation with a search box", async ({ page }) => {
    await page.goto("/");

    const types = (await jsonLdOn(page)).map((entry) => entry["@type"]);

    expect(types).toEqual(expect.arrayContaining(["Organization", "WebSite"]));
  });

  test("the language is declared for the UK", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("html")).toHaveAttribute("lang", "en-GB");
  });

  test("staging and previews are kept out of search engines by default", async ({
    page,
    request,
  }) => {
    await page.goto("/");
    await expect(page.locator("meta[name=robots]")).toHaveAttribute("content", "noindex, nofollow");

    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Disallow: /");

    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).not.toContain("<loc>");
  });

  test("the page works before any script runs, so crawlers see the real content", async ({
    browser,
  }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();

    await page.goto("/products/reflective-dog-lead");

    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Reflective Dog Lead 1.5m");
    await expect(page.getByTestId("product-price")).toContainText("£9.99");
    await context.close();
  });

  test("the favicon is served", async ({ request }) => {
    const response = await request.get("/icon.svg");

    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("svg");
  });
});

test.describe("placeholder pictures", () => {
  test("are served as safe, long-cached SVG", async ({ request }) => {
    const response = await request.get("/placeholder.svg?d=dogs&c=dog-beds&t=Test%20Bed&n=1");

    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("image/svg+xml");
    expect(response.headers()["cache-control"]).toContain("immutable");
    expect(response.headers()["content-security-policy"]).toContain("default-src 'none'");
    expect(await response.text()).toContain("Test Bed");
  });

  test("refuse malformed requests and never echo markup", async ({ request }) => {
    expect((await request.get("/placeholder.svg?d=dogs&c=../x&t=a&n=1")).status()).toBe(400);

    const response = await request.get(
      "/placeholder.svg?d=dogs&c=dog-beds&t=%3Cscript%3Ealert(1)%3C%2Fscript%3E&n=1",
    );

    expect(response.status()).toBe(200);
    expect(await response.text()).not.toContain("<script");
  });
});
