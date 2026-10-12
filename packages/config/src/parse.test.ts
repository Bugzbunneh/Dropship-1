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
      surface: "#f6f6f6",
      emphasis: "#084c38",
      sale: "#b7084e",
    },
    fonts: { heading: "Fraunces", body: "Nunito Sans" },
  },
  departments: [
    {
      slug: "dogs",
      name: "Dogs",
      tagline: "For dogs",
      colours: {
        primary: "#f8b036",
        primaryForeground: "#2b2112",
        accent: "#c96f00",
        surface: "#fff1d6",
        emphasis: "#8a5300",
      },
    },
  ],
  home: { heading: "Welcome", subheading: "Things for pets" },
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
    expect(config.shipping).toEqual({ flatRateMinor: 399, freeThresholdMinor: 3500 });
    expect(config.tax).toEqual({ vatRegistered: false, vatRateBps: 2000 });
    expect(config.business).toEqual({});
  });

  it("rejects a department slug that would shadow an app route", () => {
    const [dogs] = validInput.departments;
    const attempt = () =>
      parseStoreConfig({ ...validInput, departments: [{ ...dogs!, slug: "cart" }] });

    expect(attempt).toThrow(/already used by the app/);
  });

  it("rejects duplicate department slugs", () => {
    const [dogs] = validInput.departments;
    const attempt = () => parseStoreConfig({ ...validInput, departments: [dogs!, dogs!] });

    expect(attempt).toThrow(/department slugs must be unique/);
  });

  it("requires at least one department", () => {
    const attempt = () => parseStoreConfig({ ...validInput, departments: [] });

    expect(attempt).toThrow(/departments/);
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
        theme: {
          ...validInput.theme,
          fonts: { heading: "Fraunces; color: red", body: "Nunito Sans" },
        },
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
