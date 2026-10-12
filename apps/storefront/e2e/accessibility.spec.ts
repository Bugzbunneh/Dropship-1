import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// Automated WCAG 2.2 AA checks (including colour contrast, which exercises both pets' palettes)
// plus a check that no page scrolls sideways. Automated tools find roughly a third of accessibility
// problems, so these are a floor, not a certificate: keyboard and screen reader testing still
// matter before launch.

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

const violationsOf = async (page: Page): Promise<string[]> => {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  return results.violations.map((violation) => {
    const targets = violation.nodes
      .slice(0, 3)
      .map((node) => node.target.join(" "))
      .join(" | ");
    return `${violation.id} (${violation.impact}): ${violation.help} -> ${targets}`;
  });
};

const pages = [
  "/",
  "/dogs",
  "/cats",
  "/dogs/dog-beds",
  "/cats/all",
  "/products/cloud-comfort-orthopaedic-dog-bed",
  "/products/multi-level-cat-tree",
  "/search?q=bed",
  "/search?q=zzzqqq",
  "/cart",
  "/delivery",
  "/returns",
  "/faq",
  "/contact",
  "/privacy",
  "/terms",
  "/nothing-here",
];

test.describe("accessibility", () => {
  for (const path of pages) {
    test(`${path} has no WCAG AA violations`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");

      expect(await violationsOf(page)).toEqual([]);
    });
  }

  test("the open cart drawer has no violations", async ({ page }) => {
    await page.goto("/dogs/dog-walking");
    await page
      .locator("article", { hasText: "Reflective Dog Lead" })
      .getByRole("button", { name: /^Add to cart: / })
      .click();
    await expect(page.getByTestId("cart-drawer")).toBeVisible();

    expect(await violationsOf(page)).toEqual([]);
  });

  test("the cart page with items in it has no violations", async ({ page }) => {
    await page.goto("/products/reflective-dog-lead");
    await page.getByTestId("add-to-cart").click();
    await page.getByRole("button", { name: "Close cart" }).click();
    await page.goto("/cart");
    await expect(page.locator("#main").getByTestId("cart-line")).toBeVisible();

    expect(await violationsOf(page)).toEqual([]);
  });

  test("the search suggestions have no violations", async ({ page }) => {
    await page.goto("/");
    await page.locator("input[role=combobox]:visible").fill("bed");
    await expect(page.getByRole("option").first()).toBeVisible();

    expect(await violationsOf(page)).toEqual([]);
  });

  test("the skip link is the first thing a keyboard user reaches and it works", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "keyboard navigation test");
    await page.goto("/");

    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to content" });
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();
    await page.keyboard.press("Enter");

    await expect(page).toHaveURL(/#main$/);
  });

  test("every page has exactly one main heading", async ({ page }) => {
    for (const path of pages) {
      await page.goto(path);

      await expect(page.getByRole("heading", { level: 1 }), path).toHaveCount(1);
    }
  });

  test("images either describe themselves or are marked decorative", async ({ page }) => {
    await page.goto("/");
    const missingAlt = await page.locator("img:not([alt])").count();

    expect(missingAlt).toBe(0);
  });
});

test.describe("layout", () => {
  for (const path of pages) {
    test(`${path} never scrolls sideways`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );

      expect(overflow).toBeLessThanOrEqual(0);
    });
  }
});
