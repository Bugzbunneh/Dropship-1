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

describe("loadActiveStoreConfig", () => {
  it("reads the store from the STORE variable", async () => {
    const config = await loadActiveStoreConfig({ STORE: "pet-pilot" });

    expect(config.name).toBe("Pilot Pets");
  });

  it("fails clearly when STORE is missing", async () => {
    await expect(loadActiveStoreConfig({})).rejects.toThrow(/STORE is not set/);
  });
});
