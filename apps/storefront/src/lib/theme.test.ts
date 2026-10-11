import { parseStoreConfig } from "@dropship/config";
import { describe, expect, it } from "vitest";
import { themeToCssVariables } from "./theme";

const config = parseStoreConfig({
  slug: "theme-test",
  name: "Theme Test",
  domain: "theme-test.example.com",
  currency: "GBP",
  locale: "en-GB",
  shippingCountries: ["GB"],
  theme: {
    colours: {
      background: "#ffffff",
      foreground: "#111111",
      primary: "#0b6e4f",
      primaryForeground: "#fafafa",
      accent: "#f4a259",
      muted: "#eeeeee",
    },
    fonts: { heading: "Playfair Display", body: "Inter" },
    radius: "sm",
  },
  email: { fromName: "Theme Test", fromAddress: "hi@theme-test.example.com" },
});

describe("themeToCssVariables", () => {
  const variables = themeToCssVariables(config.theme);

  it("maps every colour token", () => {
    expect(variables["--store-background"]).toBe("#ffffff");
    expect(variables["--store-primary"]).toBe("#0b6e4f");
    expect(variables["--store-primary-foreground"]).toBe("#fafafa");
  });

  it("turns font names into quoted stacks with a fallback", () => {
    expect(variables["--store-font-heading"]).toBe('"Playfair Display", system-ui, sans-serif');
    expect(variables["--store-font-body"]).toBe('"Inter", system-ui, sans-serif');
  });

  it("turns the radius token into a length", () => {
    expect(variables["--store-radius"]).toBe("0.25rem");
  });
});
