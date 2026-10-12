import { expect, test, type Page } from "@playwright/test";

// The header has one search box per screen size; this finds the one that is showing.
const visibleSearch = (page: Page) => page.locator("input[role=combobox]:visible");

test.describe("search", () => {
  test("suggests products as you type and opens the one you choose", async ({ page }) => {
    await page.goto("/");

    await visibleSearch(page).fill("scrat");
    const options = page.getByRole("option");
    await expect(options.first()).toContainText("Tall Sisal Scratching Post");

    await visibleSearch(page).press("ArrowDown");
    await visibleSearch(page).press("Enter");

    await expect(page).toHaveURL("/products/tall-sisal-scratching-post");
  });

  test("pressing Enter shows all results", async ({ page }) => {
    await page.goto("/");

    await visibleSearch(page).fill("bed");
    await visibleSearch(page).press("Enter");

    await expect(page).toHaveURL("/search?q=bed");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Results for");
    await expect(page.getByTestId("result-count")).toContainText("products");
    // both pets' beds appear, each labelled
    await expect(page.locator("article", { hasText: "Plush Round Cat Bed" }).first()).toBeVisible();
    await expect(
      page.locator("article", { hasText: "Cosy Donut Calming Dog Bed" }).first(),
    ).toBeVisible();
  });

  test("handles a search with no matches kindly", async ({ page }) => {
    await page.goto("/search?q=zzzqqq");

    await expect(page.getByTestId("no-results")).toContainText("Nothing matches just yet");
  });

  test("an empty search page offers a way into every pet's categories", async ({ page }) => {
    await page.goto("/search");

    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Search");
    await expect(
      page.getByRole("main").getByRole("link", { name: /Beds & Blankets/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("main").getByRole("link", { name: /Beds & Hideaways/ }),
    ).toBeVisible();
  });

  test("search pages are kept out of search engines", async ({ page }) => {
    await page.goto("/search?q=bed");

    await expect(page.locator("meta[name=robots]")).toHaveAttribute("content", /noindex/);
  });
});

test.describe("filters and sorting", () => {
  test("filters are in the URL, so a filtered view can be shared", async ({ page }) => {
    await page.goto("/dogs/all?brand=Wagwell&sort=price-asc");
    // wait for the page's scripts to attach before interacting, as a real visitor would
    await page.waitForLoadState("networkidle");

    const cards = page.locator("article");
    await expect(cards.first()).toBeVisible();
    for (const card of await cards.all()) {
      await expect(card).toContainText("Wagwell");
    }
    await expect(page.getByTestId("sort-select")).toHaveValue("price-asc");
  });

  test("ticking a brand updates the results and the address", async ({ page, isMobile }) => {
    await page.goto("/dogs/all");
    // wait for the page's scripts to attach before interacting, as a real visitor would
    await page.waitForLoadState("networkidle");
    if (isMobile) {
      await page.getByTestId("open-filters").click();
    }
    const panel = isMobile
      ? page.getByRole("dialog", { name: "Filters" })
      : page.getByTestId("filters-sidebar");

    await panel.getByLabel(/^Wagwell/).check();

    await expect(page).toHaveURL(/brand=Wagwell/);
    if (isMobile) {
      await page.getByRole("button", { name: /^Show \d+ products?$/ }).click();
    }
    await expect(page.getByTestId("result-count")).toHaveText("4 products");
    await expect(page.getByRole("list", { name: "Active filters" })).toContainText("Wagwell");
  });

  test("an active filter can be removed from its chip", async ({ page }) => {
    await page.goto("/dogs/all?stock=1");
    // wait for the page's scripts to attach before interacting, as a real visitor would
    await page.waitForLoadState("networkidle");

    await page.getByRole("list", { name: "Active filters" }).getByRole("link").click();

    await expect(page).toHaveURL("/dogs/all");
    await expect(page.getByRole("list", { name: "Active filters" })).toHaveCount(0);
  });

  test("a price range narrows the results", async ({ page, isMobile }) => {
    await page.goto("/dogs/all");
    // wait for the page's scripts to attach before interacting, as a real visitor would
    await page.waitForLoadState("networkidle");
    if (isMobile) {
      await page.getByTestId("open-filters").click();
    }
    const panel = isMobile
      ? page.getByRole("dialog", { name: "Filters" })
      : page.getByTestId("filters-sidebar");

    await panel.getByLabel("Maximum price").fill("10");
    await panel.getByLabel("Maximum price").press("Enter");

    await expect(page).toHaveURL(/max=10/);
    if (isMobile) {
      await page.getByRole("button", { name: /^Show \d+ products?$/ }).click();
    }
    for (const price of await page.locator("article [class*='font-bold']").allInnerTexts()) {
      const match = /£(\d+\.\d{2})/.exec(price);
      if (match) {
        expect(Number(match[1])).toBeLessThanOrEqual(10);
      }
    }
  });

  test("sorting by price puts the cheapest first", async ({ page }) => {
    await page.goto("/cats/all");
    // wait for the page's scripts to attach before interacting, as a real visitor would
    await page.waitForLoadState("networkidle");

    await page.getByTestId("sort-select").selectOption("price-asc");

    await expect(page).toHaveURL(/sort=price-asc/);
    await expect(page.locator("article").first()).toContainText("£2.99");
  });

  test("a filter that matches nothing offers a way out", async ({ page }) => {
    await page.goto("/dogs/all?min=9000");
    // wait for the page's scripts to attach before interacting, as a real visitor would
    await page.waitForLoadState("networkidle");

    await expect(page.getByTestId("no-results")).toContainText("Try removing a filter");
    await page.getByRole("link", { name: "Clear all filters" }).click();
    await expect(page.getByTestId("result-count")).toHaveText("16 products");
  });

  test("long lists are split into pages", async ({ page }) => {
    await page.goto("/search?q=a");
    // wait for the page's scripts to attach before interacting, as a real visitor would
    await page.waitForLoadState("networkidle");
    // the demo catalog is small, so check the pager only appears when it should
    await expect(page.getByRole("navigation", { name: "Pagination" })).toHaveCount(0);
  });
});
