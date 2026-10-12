import { STATIC_PATHS } from "../routing/known-paths";
import { parseStoreConfig, type StoreConfigInput } from "@dropship/config";
import { describe, expect, it } from "vitest";
import { missingBusinessDetails, policiesReadyForLaunch } from "./business";
import { faqItems } from "./faq";

const input: StoreConfigInput = {
  slug: "content-test",
  name: "Content Test",
  domain: "content-test.example.com",
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
      muted: "#eeeeee",
      surface: "#f5f5f5",
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
  shipping: { flatRateMinor: 499, freeThresholdMinor: 4000 },
  policies: { deliveryMaxWorkingDays: 4, returnsWindowDays: 21 },
  email: { fromName: "Content Test", fromAddress: "hi@content-test.example.com" },
};

const config = parseStoreConfig(input);

describe("faqItems", () => {
  const items = faqItems(config);
  const everything = items.flatMap((item) => [item.question, ...item.answer]).join(" ");

  it("quotes the store's own delivery promise, charges and returns window", () => {
    expect(everything).toContain("within 4 working days");
    expect(everything).toContain("£4.99");
    expect(everything).toContain("£40.00");
    expect(everything).toContain("within 21 days");
  });

  it("answers every question and links only to pages that exist", () => {
    // the router's own list of real pages, so a link can never point at one that does not exist
    const pages = STATIC_PATHS;

    for (const item of items) {
      expect(item.answer.length, item.question).toBeGreaterThan(0);
      if (item.link) {
        expect(pages, item.question).toContain(item.link.href);
      }
    }
  });

  it("makes no health or guarantee claims", () => {
    expect(everything.toLowerCase()).not.toMatch(/vet[- ]approved|guarantee|cures|clinically/);
  });
});

describe("missingBusinessDetails", () => {
  it("lists what the law expects that is not filled in yet", () => {
    expect(missingBusinessDetails({})).toEqual([
      "legal or trading name",
      "postal address",
      "contact email address",
    ]);
  });

  it("is empty once the essentials are there", () => {
    expect(
      missingBusinessDetails({
        legalName: "Pets Ltd",
        address: "1 High Street, London",
        email: "hi@pets.test",
      }),
    ).toEqual([]);
  });
});

describe("policiesReadyForLaunch", () => {
  const complete = {
    legalName: "Pets Ltd",
    address: "1 High Street, London",
    email: "hi@pets.test",
  };

  it("needs both the business details and a solicitor's review", () => {
    expect(
      policiesReadyForLaunch({
        business: complete,
        policies: { ...config.policies, reviewed: false },
      }),
    ).toBe(false);
    expect(
      policiesReadyForLaunch({ business: {}, policies: { ...config.policies, reviewed: true } }),
    ).toBe(false);
    expect(
      policiesReadyForLaunch({
        business: complete,
        policies: { ...config.policies, reviewed: true },
      }),
    ).toBe(true);
  });

  it("is not ready by default", () => {
    expect(config.policies.reviewed).toBe(false);
  });
});
