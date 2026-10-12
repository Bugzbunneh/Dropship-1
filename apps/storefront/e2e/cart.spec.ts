import { expect, test, type Page } from "@playwright/test";

const addLeadFromCard = async (page: Page) => {
  await page.goto("/dogs/dog-walking");
  const card = page.locator("article", { hasText: "Reflective Dog Lead 1.5m" });
  await card.getByRole("button", { name: /^Add to cart: / }).click();
};

test.describe("cart", () => {
  test("adding from a card opens the drawer with the item, delivery and totals", async ({
    page,
  }) => {
    await addLeadFromCard(page);

    const drawer = page.getByTestId("cart-drawer");
    await expect(drawer).toBeVisible();
    await expect(drawer.getByTestId("cart-line")).toContainText("Reflective Dog Lead 1.5m");
    await expect(drawer.getByTestId("order-summary")).toContainText("£9.99");
    await expect(drawer.getByTestId("order-summary")).toContainText("£3.99");
    await expect(drawer.getByTestId("cart-total")).toHaveText("£13.98");
  });

  test("the cart icon shows how many items are in it", async ({ page }) => {
    await addLeadFromCard(page);
    await page.getByRole("button", { name: "Close cart" }).click();

    await expect(page.getByTestId("cart-button")).toHaveAccessibleName("Open cart, 1 item");
  });

  test("quantities change totals, and delivery becomes free over the threshold", async ({
    page,
  }) => {
    await addLeadFromCard(page);
    const drawer = page.getByTestId("cart-drawer");

    for (let click = 0; click < 3; click += 1) {
      await drawer.getByRole("button", { name: /Increase quantity/ }).click();
    }

    // 4 x £9.99 = £39.96, above the £35 threshold
    await expect(drawer.getByTestId("line-quantity")).toHaveText("4");
    await expect(drawer.getByTestId("cart-total")).toHaveText("£39.96");
    await expect(drawer.getByTestId("free-shipping-bar")).toContainText("unlocked free delivery");
    await expect(drawer.getByTestId("order-summary")).toContainText("Free");
  });

  test("shows how far the basket is from free delivery", async ({ page }) => {
    await addLeadFromCard(page);

    await expect(page.getByTestId("free-shipping-bar")).toContainText("£25.01");
  });

  test("an item can be removed, leaving an empty cart", async ({ page }) => {
    await addLeadFromCard(page);
    const drawer = page.getByTestId("cart-drawer");

    await drawer.getByRole("button", { name: /Remove .* from your cart/ }).click();

    await expect(drawer).toContainText("Your cart is empty");
  });

  test("the cart is still there after a reload", async ({ page }) => {
    await addLeadFromCard(page);
    await page.getByRole("button", { name: "Close cart" }).click();

    await page.reload();

    await expect(page.getByTestId("cart-button")).toHaveAccessibleName("Open cart, 1 item");
    await page.getByTestId("cart-button").click();
    await expect(page.getByTestId("cart-line")).toContainText("Reflective Dog Lead 1.5m");
  });

  test("the full cart page shows the same cart", async ({ page }) => {
    await addLeadFromCard(page);
    await page.getByRole("link", { name: "View full cart" }).click();

    await expect(page).toHaveURL("/cart");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Your cart");
    await expect(page.locator("#main").getByTestId("cart-line")).toContainText(
      "Reflective Dog Lead 1.5m",
    );
    await expect(page.locator("#main").getByTestId("cart-total")).toHaveText("£13.98");
  });

  test("an empty cart page points the way into each shop", async ({ page }) => {
    await page.goto("/cart");

    await expect(page.getByTestId("empty-cart")).toBeVisible();
    await expect(
      page.getByTestId("empty-cart").getByRole("link", { name: "Shop Dogs" }),
    ).toBeVisible();
    await expect(
      page.getByTestId("empty-cart").getByRole("link", { name: "Shop Cats" }),
    ).toBeVisible();
  });

  test("checkout is honest that it is not live yet", async ({ page }) => {
    await addLeadFromCard(page);

    await expect(
      page.getByTestId("cart-drawer").getByRole("button", { name: "Checkout" }),
    ).toBeDisabled();
    await expect(page.getByTestId("cart-drawer")).toContainText("Secure checkout is coming soon");
  });

  test("a corrupted saved cart is ignored rather than breaking the site", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "dropship-cart",
        JSON.stringify({
          state: {
            lines: [{ variantId: "<script>alert(1)</script>", quantity: 999 }, "junk", null],
          },
          version: 1,
        }),
      );
    });

    await page.goto("/");

    await expect(page.getByTestId("cart-button")).toHaveAccessibleName("Open cart");
  });
});

test.describe("product page purchase", () => {
  test("choosing options changes the price and adds that exact variant", async ({ page }) => {
    await page.goto("/products/cloud-comfort-orthopaedic-dog-bed");

    await page.getByRole("radio", { name: "Large" }).click();
    await expect(page.getByTestId("product-price")).toContainText("£54.99");
    await expect(page.getByTestId("product-price")).toContainText("£69.99");
    await expect(page.getByTestId("product-price")).toContainText("Save 21%");

    await page.getByTestId("add-to-cart").click();

    const line = page.getByTestId("cart-line");
    await expect(line).toContainText("Cloud Comfort Orthopaedic Dog Bed");
    await expect(line).toContainText("Large · Oat");
  });

  test("a sold-out combination cannot be bought", async ({ page }) => {
    await page.goto("/products/cloud-comfort-orthopaedic-dog-bed");

    await page.getByRole("radio", { name: "Large" }).click();
    await page.getByRole("radio", { name: /Slate/ }).click();

    await expect(page.getByTestId("stock-status")).toHaveText("Sold out");
    await expect(page.getByTestId("add-to-cart")).toBeDisabled();
    await expect(page.getByTestId("add-to-cart")).toHaveText("Sold out");
  });

  test("quantity is respected and capped", async ({ page }) => {
    await page.goto("/products/reflective-dog-lead");

    for (let click = 0; click < 15; click += 1) {
      await page.getByRole("button", { name: "Increase quantity" }).click({ force: true });
    }
    await expect(page.getByTestId("quantity")).toHaveText("10");
    await page.getByTestId("add-to-cart").click();

    await expect(page.getByTestId("line-quantity")).toHaveText("10");
  });

  test("shows a delivery date worked out from today", async ({ page }) => {
    await page.goto("/products/reflective-dog-lead");

    await expect(page.getByTestId("delivery-estimate")).toContainText(
      /delivered by (Mon|Tue|Wed|Thu|Fri) \d{1,2} \w{3}/,
    );
  });

  test("the gallery lets you move between pictures", async ({ page }) => {
    await page.goto("/products/cloud-comfort-orthopaedic-dog-bed");
    const gallery = page.getByTestId("product-gallery");

    await expect(gallery).toContainText("1 / 3");
    await gallery.getByRole("tab", { name: "Show picture 2 of 3" }).click();

    await expect(gallery).toContainText("2 / 3");
  });
});
