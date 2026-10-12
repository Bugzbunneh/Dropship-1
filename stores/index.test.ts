import { contrastRatio, WCAG_AA_NON_TEXT, WCAG_AA_TEXT, type StoreConfig } from "@dropship/config";
import { describe, expect, it } from "vitest";
import { isStoreSlug, loadActiveStoreConfig, loadStoreConfig, storeSlugs } from "./index";

describe("store registry", () => {
  it("loads every registered store and each declares the slug it is registered under", async () => {
    for (const slug of storeSlugs) {
      const config = await loadStoreConfig(slug);

      expect(config.slug).toBe(slug);
    }
  });

  it("rejects unknown slugs, including inherited object keys", async () => {
    expect(isStoreSlug("does-not-exist")).toBe(false);
    expect(isStoreSlug("toString")).toBe(false);
    await expect(loadStoreConfig("toString")).rejects.toThrow(/Unknown store/);
  });

  it("every store keeps to the UK-first, 5 working day baseline", async () => {
    for (const slug of storeSlugs) {
      const config = await loadStoreConfig(slug);

      expect(config.currency).toBe("GBP");
      expect(config.policies.deliveryMaxWorkingDays).toBeLessThanOrEqual(5);
    }
  });
});

// Every store, in its neutral scheme and in each department's scheme, must stay readable. `accent`
// is decorative (shapes and icons, never behind text) so it is deliberately not checked here.
describe("store palettes meet WCAG AA contrast", () => {
  type Scheme = { label: string; colours: StoreConfig["theme"]["colours"] };

  const schemesOf = (config: StoreConfig): Scheme[] => {
    const neutral: Scheme = { label: "neutral", colours: config.theme.colours };
    const perDepartment = config.departments.map((department): Scheme => ({
      label: department.slug,
      colours: { ...config.theme.colours, ...department.colours },
    }));
    return [neutral, ...perDepartment];
  };

  const requiredPairs = (colours: Scheme["colours"]): [string, string, string, number][] => [
    ["foreground on background", colours.foreground, colours.background, WCAG_AA_TEXT],
    ["foreground on surface", colours.foreground, colours.surface, WCAG_AA_TEXT],
    ["button text on primary", colours.primaryForeground, colours.primary, WCAG_AA_TEXT],
    ["emphasis on background", colours.emphasis, colours.background, WCAG_AA_TEXT],
    ["emphasis on surface", colours.emphasis, colours.surface, WCAG_AA_TEXT],
    // emphasis doubles as the keyboard focus ring colour
    ["focus ring against background", colours.emphasis, colours.background, WCAG_AA_NON_TEXT],
    ["white sale label on sale colour", "#ffffff", colours.sale, WCAG_AA_TEXT],
  ];

  it("passes for every scheme of every store", async () => {
    const failures: string[] = [];

    for (const slug of storeSlugs) {
      const config = await loadStoreConfig(slug);
      for (const scheme of schemesOf(config)) {
        for (const [label, first, second, minimum] of requiredPairs(scheme.colours)) {
          const ratio = contrastRatio(first, second);
          if (ratio < minimum) {
            failures.push(
              `${slug}/${scheme.label}: ${label} is ${ratio.toFixed(2)}, needs ${minimum}`,
            );
          }
        }
      }
    }

    expect(failures).toEqual([]);
  });

  it("gives each department its own primary colour", async () => {
    for (const slug of storeSlugs) {
      const config = await loadStoreConfig(slug);
      const primaries = config.departments.map((department) => department.colours.primary);

      expect(new Set(primaries).size, slug).toBe(primaries.length);
    }
  });
});

describe("loadActiveStoreConfig", () => {
  it("reads the store from the STORE variable", async () => {
    const config = await loadActiveStoreConfig({ STORE: "pet-pilot" });

    expect(config.name).toBe("Pilot Pets");
  });

  it("fails clearly when STORE is missing", async () => {
    await expect(loadActiveStoreConfig({})).rejects.toThrow(/STORE is not set/);
  });
});
