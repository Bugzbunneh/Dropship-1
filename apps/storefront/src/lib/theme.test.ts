import { parseStoreConfig, type StoreConfigInput } from "@dropship/config";
import { describe, expect, it } from "vitest";
import { departmentToCssVariables, findDepartment, themeToCssVariables } from "./theme";

const input: StoreConfigInput = {
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
      surface: "#f5f5f5",
      emphasis: "#084c38",
      sale: "#b7084e",
    },
    fonts: { heading: "Fraunces", body: "Nunito Sans" },
    radius: "sm",
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
  email: { fromName: "Theme Test", fromAddress: "hi@theme-test.example.com" },
};

const config = parseStoreConfig(input);

describe("themeToCssVariables", () => {
  const variables = themeToCssVariables(config.theme);

  it("maps every colour role", () => {
    expect(variables["--store-background"]).toBe("#ffffff");
    expect(variables["--store-primary"]).toBe("#0b6e4f");
    expect(variables["--store-primary-foreground"]).toBe("#fafafa");
    expect(variables["--store-surface"]).toBe("#f5f5f5");
    expect(variables["--store-emphasis"]).toBe("#084c38");
    expect(variables["--store-sale"]).toBe("#b7084e");
  });

  it("points fonts at the next/font variables with a fallback", () => {
    expect(variables["--store-font-heading"]).toBe(
      "var(--font-fraunces), Georgia, 'Times New Roman', serif",
    );
    expect(variables["--store-font-body"]).toBe("var(--font-nunito-sans), system-ui, sans-serif");
  });

  it("turns the radius token into a length", () => {
    expect(variables["--store-radius"]).toBe("0.375rem");
  });
});

describe("departmentToCssVariables", () => {
  const [dogs] = config.departments;
  const overrides = departmentToCssVariables(dogs!);

  it("overrides only the roles that give a department its character", () => {
    expect(Object.keys(overrides).sort()).toEqual([
      "--store-accent",
      "--store-emphasis",
      "--store-primary",
      "--store-primary-foreground",
      "--store-surface",
    ]);
    expect(overrides["--store-primary"]).toBe("#f8b036");
  });

  it("leaves text, background and sale colours to the store theme", () => {
    expect(overrides).not.toHaveProperty("--store-background");
    expect(overrides).not.toHaveProperty("--store-foreground");
    expect(overrides).not.toHaveProperty("--store-sale");
  });
});

describe("findDepartment", () => {
  it("finds a department by slug and returns nothing for an unknown one", () => {
    expect(findDepartment(config.departments, "dogs")?.name).toBe("Dogs");
    expect(findDepartment(config.departments, "birds")).toBeUndefined();
    expect(findDepartment(config.departments, null)).toBeUndefined();
  });
});
