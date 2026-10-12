import { describe, expect, it } from "vitest";
import {
  defaultVariantOf,
  optionGroupsOf,
  valueStatus,
  variantAfterChoosing,
  type PickableVariant,
} from "./variant-options";

const variant = (
  id: string,
  size: string,
  colour: string,
  priceMinor: number,
  isAvailable = true,
): PickableVariant => ({
  id,
  title: `${size}, ${colour}`,
  priceMinor,
  compareAtMinor: null,
  options: { Size: size, Colour: colour },
  isAvailable,
});

// Large Slate is sold out, like the real bed in the demo catalog.
const variants = [
  variant("s-oat", "Small", "Oat", 3499),
  variant("m-oat", "Medium", "Oat", 4499),
  variant("l-oat", "Large", "Oat", 5499),
  variant("s-slate", "Small", "Slate", 3499),
  variant("m-slate", "Medium", "Slate", 4499),
  variant("l-slate", "Large", "Slate", 5499, false),
];

const byId = (id: string): PickableVariant => variants.find((v) => v.id === id)!;

describe("optionGroupsOf", () => {
  it("lists each option once with its values in order", () => {
    expect(optionGroupsOf(variants)).toEqual([
      { name: "Size", values: ["Small", "Medium", "Large"] },
      { name: "Colour", values: ["Oat", "Slate"] },
    ]);
  });

  it("is empty for a product with nothing to choose", () => {
    const single: PickableVariant = { ...variant("x", "", "", 100), options: {} };

    expect(optionGroupsOf([single])).toEqual([]);
  });
});

describe("defaultVariantOf", () => {
  it("picks the cheapest variant that can be bought", () => {
    expect(defaultVariantOf(variants)?.id).toBe("s-oat");
  });

  it("skips sold-out variants", () => {
    const soldOutCheapest = variants.map((v) =>
      v.id === "s-oat" ? { ...v, isAvailable: false } : v,
    );

    expect(defaultVariantOf(soldOutCheapest)?.id).toBe("s-slate");
  });

  it("still picks something when everything is sold out", () => {
    const allGone = variants.map((v) => ({ ...v, isAvailable: false }));

    expect(defaultVariantOf(allGone)?.id).toBe("s-oat");
  });

  it("returns nothing for no variants", () => {
    expect(defaultVariantOf([])).toBeUndefined();
  });
});

describe("variantAfterChoosing", () => {
  it("keeps the other choices when the combination exists", () => {
    expect(variantAfterChoosing(variants, byId("s-oat"), "Size", "Medium")?.id).toBe("m-oat");
    expect(variantAfterChoosing(variants, byId("m-oat"), "Colour", "Slate")?.id).toBe("m-slate");
  });

  it("selects the sold-out combination when it is exactly what was chosen", () => {
    expect(variantAfterChoosing(variants, byId("l-oat"), "Colour", "Slate")?.id).toBe("l-slate");
  });

  it("falls back to the closest variant when a combination does not exist", () => {
    const partial = variants.filter((v) => v.id !== "m-slate");

    const chosen = variantAfterChoosing(partial, byId("m-oat"), "Colour", "Slate");

    // there is no Medium Slate, so it picks a Slate one that is in stock
    expect(chosen?.options["Colour"]).toBe("Slate");
    expect(chosen?.isAvailable).toBe(true);
  });

  it("returns nothing for a value no variant has", () => {
    expect(variantAfterChoosing(variants, byId("s-oat"), "Size", "Huge")).toBeUndefined();
  });
});

describe("valueStatus", () => {
  it("marks a value sold out only when every matching variant is gone", () => {
    // with Slate selected, Large is sold out; with Oat selected it is not
    expect(valueStatus(variants, byId("s-slate"), "Size", "Large")).toBe("sold-out");
    expect(valueStatus(variants, byId("s-oat"), "Size", "Large")).toBe("available");
  });

  it("treats a value with no compatible variant as sold out", () => {
    const partial = variants.filter((v) => v.id !== "m-slate");

    expect(valueStatus(partial, byId("s-slate"), "Size", "Medium")).toBe("sold-out");
  });
});
