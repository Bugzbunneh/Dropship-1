import { describe, expect, it } from "vitest";
import {
  addLine,
  countItems,
  isValidVariantId,
  MAX_CART_LINES,
  MAX_LINE_QUANTITY,
  removeLine,
  sanitiseLines,
  setLineQuantity,
} from "./lines";

describe("addLine", () => {
  it("adds a new line", () => {
    expect(addLine([], "v1")).toEqual([{ variantId: "v1", quantity: 1 }]);
  });

  it("increases the quantity of a line that is already there", () => {
    const lines = addLine([{ variantId: "v1", quantity: 2 }], "v1", 3);

    expect(lines).toEqual([{ variantId: "v1", quantity: 5 }]);
  });

  it("caps a line at the maximum quantity", () => {
    const lines = addLine([{ variantId: "v1", quantity: 9 }], "v1", 5);

    expect(lines[0]?.quantity).toBe(MAX_LINE_QUANTITY);
  });

  it("refuses invalid ids and quantities", () => {
    expect(addLine([], "../etc/passwd")).toEqual([]);
    expect(addLine([], "")).toEqual([]);
    expect(addLine([], "v1", 0)).toEqual([]);
    expect(addLine([], "v1", -3)).toEqual([]);
    expect(addLine([], "v1", Number.NaN)).toEqual([]);
  });

  it("stops adding new lines at the cap, but still lets existing ones grow", () => {
    const full = Array.from({ length: MAX_CART_LINES }, (_, i) => ({
      variantId: `v${i}`,
      quantity: 1,
    }));

    expect(addLine(full, "another")).toHaveLength(MAX_CART_LINES);
    expect(addLine(full, "v0")[0]?.quantity).toBe(2);
  });

  it("does not change the list it was given", () => {
    const original = [{ variantId: "v1", quantity: 1 }];

    addLine(original, "v1");

    expect(original).toEqual([{ variantId: "v1", quantity: 1 }]);
  });
});

describe("setLineQuantity and removeLine", () => {
  const lines = [
    { variantId: "a", quantity: 2 },
    { variantId: "b", quantity: 1 },
  ];

  it("sets a quantity", () => {
    expect(setLineQuantity(lines, "a", 4)[0]?.quantity).toBe(4);
  });

  it("removes the line at zero or below", () => {
    expect(setLineQuantity(lines, "a", 0).map((l) => l.variantId)).toEqual(["b"]);
    expect(setLineQuantity(lines, "a", -2).map((l) => l.variantId)).toEqual(["b"]);
  });

  it("clamps big and fractional quantities", () => {
    expect(setLineQuantity(lines, "a", 500)[0]?.quantity).toBe(MAX_LINE_QUANTITY);
    expect(setLineQuantity(lines, "a", 2.9)[0]?.quantity).toBe(2);
    expect(setLineQuantity(lines, "a", Number.NaN).map((l) => l.variantId)).toEqual(["b"]);
  });

  it("removes a line by id and ignores unknown ids", () => {
    expect(removeLine(lines, "a").map((l) => l.variantId)).toEqual(["b"]);
    expect(removeLine(lines, "zzz")).toEqual(lines);
  });
});

describe("countItems", () => {
  it("adds up quantities, not lines", () => {
    expect(
      countItems([
        { variantId: "a", quantity: 2 },
        { variantId: "b", quantity: 3 },
      ]),
    ).toBe(5);
    expect(countItems([])).toBe(0);
  });
});

describe("sanitiseLines (untrusted data from browser storage)", () => {
  it("keeps valid lines", () => {
    expect(sanitiseLines([{ variantId: "a", quantity: 2 }])).toEqual([
      { variantId: "a", quantity: 2 },
    ]);
  });

  it("returns an empty cart for anything that is not a list", () => {
    expect(sanitiseLines(null)).toEqual([]);
    expect(sanitiseLines("cart")).toEqual([]);
    expect(sanitiseLines({ variantId: "a", quantity: 1 })).toEqual([]);
  });

  it("drops malformed entries, zero quantities and duplicates, and clamps the rest", () => {
    const lines = sanitiseLines([
      { variantId: "a", quantity: 99 },
      { variantId: "a", quantity: 1 },
      { variantId: "b", quantity: 0 },
      { variantId: "c", quantity: "3" },
      { variantId: "<script>", quantity: 1 },
      null,
      42,
      { quantity: 2 },
    ]);

    expect(lines).toEqual([{ variantId: "a", quantity: MAX_LINE_QUANTITY }]);
  });

  it("limits the number of lines", () => {
    const huge = Array.from({ length: 500 }, (_, i) => ({ variantId: `v${i}`, quantity: 1 }));

    expect(sanitiseLines(huge)).toHaveLength(MAX_CART_LINES);
  });
});

describe("isValidVariantId", () => {
  it("accepts uuids and offline-catalog ids, and rejects anything with odd characters", () => {
    expect(isValidVariantId("11111111-2222-4333-8444-555555555555")).toBe(true);
    expect(isValidVariantId("fx-var-PP-CCB-M-OAT")).toBe(true);
    expect(isValidVariantId("a b")).toBe(false);
    expect(isValidVariantId("a".repeat(65))).toBe(false);
    expect(isValidVariantId(7)).toBe(false);
  });
});
