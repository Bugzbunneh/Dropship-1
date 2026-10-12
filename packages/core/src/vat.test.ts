import { describe, expect, it } from "vitest";
import { orderVatMinor, vatContainedMinor } from "./vat";

describe("vatContainedMinor", () => {
  it("finds the VAT inside a VAT-inclusive price", () => {
    // £12.00 inclusive of 20% is £10.00 plus £2.00 VAT
    expect(vatContainedMinor(1200, 2000)).toBe(200);
    expect(vatContainedMinor(2400, 2000)).toBe(400);
  });

  it("rounds to the nearest penny, halves up", () => {
    // £9.99 / 6 = £1.665 -> £1.67
    expect(vatContainedMinor(999, 2000)).toBe(167);
    // £3.99 / 6 = £0.665 -> £0.67
    expect(vatContainedMinor(399, 2000)).toBe(67);
    // £1.00 / 6 = £0.1666 -> £0.17
    expect(vatContainedMinor(100, 2000)).toBe(17);
  });

  it("is zero for nothing, negatives and a zero rate", () => {
    expect(vatContainedMinor(0, 2000)).toBe(0);
    expect(vatContainedMinor(-500, 2000)).toBe(0);
    expect(vatContainedMinor(1200, 0)).toBe(0);
  });

  it("is always within half a penny of the exact figure", () => {
    for (let gross = 1; gross <= 5000; gross += 7) {
      const vat = vatContainedMinor(gross, 2000);
      const exact = gross / 6;
      expect(vat).toBeGreaterThanOrEqual(0);
      expect(vat).toBeLessThan(gross);
      expect(Math.abs(vat - exact)).toBeLessThanOrEqual(0.5 + 1e-9);
    }
  });

  it("handles other rates, such as the 5% reduced rate", () => {
    expect(vatContainedMinor(1050, 500)).toBe(50);
  });
});

describe("orderVatMinor", () => {
  it("records nothing while the business is not registered", () => {
    expect(orderVatMinor(1200, { registered: false, rateBps: 2000 })).toBe(0);
  });

  it("records the contained VAT once registered", () => {
    expect(orderVatMinor(1200, { registered: true, rateBps: 2000 })).toBe(200);
  });
});
