import { expect, test } from "@playwright/test";

test.describe("browsing", () => {
  test("the home page leads into both pets", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Happy pets, happy homes");
    await expect(page.getByRole("link", { name: /Shop Dogs/ }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Shop Cats/ }).first()).toBeVisible();
  });

  test("a visitor can go from the home page to a product", async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("link", { name: /Shop Dogs/ })
      .first()
      .click();
    await expect(page).toHaveURL("/dogs");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Dogs");

    await page
      .getByRole("link", { name: /Beds & Blankets/ })
      .first()
      .click();
    await expect(page).toHaveURL("/dogs/dog-beds");
    await expect(page.getByTestId("result-count")).toHaveText("3 products");

    await page.getByRole("link", { name: "Cloud Comfort Orthopaedic Dog Bed" }).first().click();
    await expect(page).toHaveURL("/products/cloud-comfort-orthopaedic-dog-bed");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Cloud Comfort Orthopaedic Dog Bed",
    );
    await expect(page.getByTestId("product-price")).toContainText("£34.99");
  });

  test("breadcrumbs lead back up the trail", async ({ page }) => {
    await page.goto("/products/cloud-comfort-orthopaedic-dog-bed");
    const trail = page.getByRole("navigation", { name: "Breadcrumb" });

    await expect(trail.getByRole("link")).toHaveText(["Home", "Dogs", "Beds & Blankets"]);
    await expect(trail.getByText("Cloud Comfort Orthopaedic Dog Bed")).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  test("each pet has its own colours", async ({ page }) => {
    await page.goto("/dogs");
    const dogPrimary = await page
      .locator("[data-department=dogs]")
      .first()
      .evaluate((element) => getComputedStyle(element).getPropertyValue("--store-primary").trim());
    await page.goto("/cats");
    const catPrimary = await page
      .locator("[data-department=cats]")
      .first()
      .evaluate((element) => getComputedStyle(element).getPropertyValue("--store-primary").trim());

    expect(dogPrimary.toLowerCase()).toBe("#f8b036");
    expect(catPrimary.toLowerCase()).toBe("#00808c");
  });

  test("a product from one pet is themed for that pet even in a mixed list", async ({ page }) => {
    await page.goto("/");
    const catCard = page.locator("article[data-department=cats]").first();

    await expect(catCard).toBeVisible();
    const primary = await catCard.evaluate((element) =>
      getComputedStyle(element).getPropertyValue("--store-primary").trim(),
    );
    expect(primary.toLowerCase()).toBe("#00808c");
  });

  test("unknown pages show a helpful 404", async ({ page }) => {
    for (const path of [
      "/nothing-here",
      "/birds",
      "/dogs/not-a-collection",
      "/products/not-a-product",
    ]) {
      const response = await page.goto(path);

      expect(response?.status(), path).toBe(404);
      await expect(page.getByRole("heading", { name: "We can’t find that page" })).toBeVisible();
    }
  });

  test("the help pages exist", async ({ page }) => {
    for (const [path, heading] of [
      ["/delivery", "Delivery"],
      ["/returns", "Returns & refunds"],
      ["/faq", "Frequently asked questions"],
      ["/contact", "Contact us"],
      ["/privacy", "Privacy policy"],
      ["/terms", "Terms & conditions"],
    ] as const) {
      await page.goto(path);

      await expect(page.getByRole("heading", { level: 1 }), path).toHaveText(heading);
    }
  });

  test("legal pages carry a draft notice until they have been reviewed", async ({ page }) => {
    for (const path of ["/delivery", "/returns", "/privacy", "/terms"]) {
      await page.goto(path);

      await expect(page.getByTestId("draft-notice"), path).toContainText(
        "not yet reviewed for launch",
      );
    }
  });

  test("the delivery page states the store's own promise", async ({ page }) => {
    await page.goto("/delivery");

    await expect(page.getByRole("main")).toContainText("within 5 working days");
    await expect(page.getByRole("main")).toContainText("£3.99");
    await expect(page.getByRole("main")).toContainText("£35.00");
  });
});
