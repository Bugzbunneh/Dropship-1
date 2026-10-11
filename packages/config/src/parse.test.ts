import { describe, expect, it } from "vitest";
import { defineStore, parseStoreConfig, StoreConfigError } from "./parse";
import type { StoreConfigInput } from "./store-config";

const validInput: StoreConfigInput = {
  slug: "test-store",
  name: "Test Store",
  domain: "test-store.example.com",
  currency: "GBP",
  locale: "en-GB",
  shippingCountries: ["GB"],
  theme: {
    colours: {
      background: "#ffffff",
      foreground: "#111111",
      primary: "#0b6e4f",
      primaryForeground: "#ffffff",
      accent: "#f4a259",
      muted: "#f1f1f1",
    },
    fonts: { heading: "Inter", body: "Inter" },
  },
  email: { fromName: "Test Store", fromAddress: "hello@test-store.example.com" },
};

describe("parseStoreConfig", () => {
  it("accepts a minimal valid config and applies defaults", () => {
    const config = parseStoreConfig(validInput);

    expect(config.policies.deliveryMaxWorkingDays).toBe(5);
    expect(config.pricingRules.rounding).toBe("ends-99");
    expect(config.stripe.secretKeyEnv).toBe("STRIPE_SECRET_KEY");
    expect(config.theme.radius).toBe("md");
    expect(config.navigation).toEqual([]);
  });

  it("keeps explicit values over defaults", () => {
    const config = parseStoreConfig({
      ...validInput,
      policies: { deliveryMaxWorkingDays: 3 },
    });

    expect(config.policies.deliveryMaxWorkingDays).toBe(3);
    expect(config.policies.returnsWindowDays).toBe(30);
  });

  it("reports every problem with its path", () => {
    const badInput = {
      ...validInput,
      currency: "pounds",
      shippingCountries: [],
      theme: { ...validInput.theme, colours: { ...validInput.theme.colours, primary: "green" } },
    };

    const attempt = () => parseStoreConfig(badInput);

    expect(attempt).toThrow(StoreConfigError);
    try {
      attempt();
    } catch (error) {
      const issues = (error as StoreConfigError).issues.join("\n");
      expect(issues).toContain("currency:");
      expect(issues).toContain("shippingCountries:");
      expect(issues).toContain("theme.colours.primary:");
    }
  });

  it("names the store in the error message", () => {
    const attempt = () => parseStoreConfig({ ...validInput, domain: "https://nope" });

    expect(attempt).toThrow(/"test-store"/);
  });

  it("rejects floats where integers are required", () => {
    const attempt = () => parseStoreConfig({ ...validInput, pricingRules: { markupBps: 40.5 } });

    expect(attempt).toThrow(/markupBps/);
  });

  it("rejects font names that could break out of a CSS value", () => {
    const attempt = () =>
      parseStoreConfig({
        ...validInput,
        theme: { ...validInput.theme, fonts: { heading: "Inter; color: red", body: "Inter" } },
      });

    expect(attempt).toThrow(/theme\.fonts\.heading/);
  });

  it("rejects non-object input", () => {
    expect(() => parseStoreConfig(null)).toThrow(StoreConfigError);
    expect(() => parseStoreConfig("store")).toThrow(StoreConfigError);
  });
});

describe("defineStore", () => {
  it("validates and returns the parsed config", () => {
    const config = defineStore(validInput);

    expect(config.slug).toBe("test-store");
  });
});
