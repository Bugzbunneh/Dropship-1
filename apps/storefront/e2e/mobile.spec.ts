import { expect, test } from "@playwright/test";

test.describe("on a phone", () => {
  test.skip(({ isMobile }) => !isMobile, "phone-only behaviour");

  test("the menu opens, expands a pet and leads to a category", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "Open menu" }).click();
    const menu = page.getByRole("dialog", { name: "Pilot Pets menu" });
    await expect(menu).toBeVisible();

    await menu.getByText("Cats", { exact: true }).click();
    await menu.getByRole("link", { name: "Scratchers & Trees" }).click();

    await expect(page).toHaveURL("/cats/cat-scratchers");
    await expect(menu).toBeHidden();
  });

  test("the search row folds away on the way down and returns on the way up", async ({ page }) => {
    await page.goto("/dogs/all");
    const search = page.locator("input[role=combobox]:visible");
    await expect(search).toBeInViewport();

    await page.evaluate(() => window.scrollTo(0, 900));

    // only the logo row stays pinned
    await expect(search).not.toBeInViewport();
    await expect(page.getByRole("link", { name: "Pilot Pets home" })).toBeInViewport();
    await expect(page.getByTestId("cart-button")).toBeInViewport();

    await page.evaluate(() => window.scrollTo(0, 700));

    await expect(search).toBeInViewport();
  });

  test("the search row stays put while someone is typing in it", async ({ page }) => {
    await page.goto("/dogs/all");
    await page.locator("input[role=combobox]:visible").tap();
    await page.evaluate(() => window.scrollTo(0, 900));

    await expect(page.locator("input[role=combobox]:visible")).toBeInViewport();
  });

  test("a bar with the price and an add button is on screen whenever the main button is not", async ({
    page,
  }) => {
    await page.goto("/products/reflective-dog-lead");
    const bar = page.getByTestId("sticky-add-to-cart");
    const mainButton = page.getByTestId("add-to-cart");

    // the main button starts below the fold, so the bar is there from the start
    await expect(bar).toHaveAttribute("aria-hidden", "false");
    await expect(bar).toContainText("£9.99");

    // once the main button is in view the bar steps aside
    await mainButton.scrollIntoViewIfNeeded();
    await expect(bar).toHaveAttribute("aria-hidden", "true");

    // a long jump past it (which an IntersectionObserver would miss) brings the bar back
    await page.evaluate(() => window.scrollTo(0, 2400));
    await expect(bar).toHaveAttribute("aria-hidden", "false");

    await bar.getByRole("button", { name: /Add to cart/ }).click();
    await expect(page.getByTestId("cart-line")).toContainText("Reflective Dog Lead");
  });

  test("the filter sheet opens and reports how many products it will show", async ({ page }) => {
    await page.goto("/dogs/all");

    await page.getByTestId("open-filters").click();
    const sheet = page.getByRole("dialog", { name: "Filters" });

    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole("button", { name: "Show 16 products" })).toBeVisible();
    await page.getByRole("button", { name: "Close filters" }).click();
    await expect(sheet).toBeHidden();
  });

  test("buttons and links are big enough to tap", async ({ page }) => {
    await page.goto("/dogs/dog-beds");
    const tooSmall: string[] = [];

    for (const control of await page
      .locator("main a:visible, main button:visible, header button:visible")
      .all()) {
      const box = await control.boundingBox();
      const text = (
        (await control.innerText().catch(() => "")) ||
        (await control.getAttribute("aria-label")) ||
        "?"
      ).slice(0, 30);
      // WCAG 2.2 asks for 24 CSS pixels minimum; we aim for more on the main controls
      if (box && (box.height < 24 || box.width < 24)) {
        tooSmall.push(`${text} (${Math.round(box.width)}x${Math.round(box.height)})`);
      }
    }

    expect(tooSmall).toEqual([]);
  });
});
