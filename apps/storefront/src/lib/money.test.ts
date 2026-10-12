import { describe, expect, it } from "vitest";
import { decimalString, formatMoney, minorUnitsPerMajor, percentOff } from "./money";
import {
  freeShippingProgress,
  remainingForFreeShippingMinor,
  shippingChargeMinor,
} from "./shipping";

describe("formatMoney", () => {
  it("formats pence as pounds with two decimals", () => {
    expect(formatMoney(2999, "GBP", "en-GB")).toBe("£29.99");
    expect(formatMoney(1000, "GBP", "en-GB")).toBe("£10.00");
    expect(formatMoney(5, "GBP", "en-GB")).toBe("£0.05");
  });

  it("separates thousands", () => {
    expect(formatMoney(123456, "GBP", "en-GB")).toBe("£1,234.56");
  });

  it("knows currencies without minor units", () => {
    expect(minorUnitsPerMajor("GBP", "en-GB")).toBe(100);
    expect(minorUnitsPerMajor("JPY", "en-GB")).toBe(1);
  });
});

describe("decimalString", () => {
  it("writes plain decimals for structured data", () => {
    expect(decimalString(2999, "GBP", "en-GB")).toBe("29.99");
    expect(decimalString(5, "GBP", "en-GB")).toBe("0.05");
    expect(decimalString(1000, "GBP", "en-GB")).toBe("10.00");
  });
});

describe("percentOff", () => {
  it("rounds down so a sale never over-claims", () => {
    expect(percentOff(999, 1299)).toBe(23);
    expect(percentOff(5000, 10000)).toBe(50);
  });

  it("is zero when there is no reduction", () => {
    expect(percentOff(1000, 1000)).toBe(0);
    expect(percentOff(1200, 1000)).toBe(0);
  });
});

describe("delivery charges", () => {
  const rules = { flatRateMinor: 399, freeThresholdMinor: 3500 };

  it("charge the flat rate below the threshold and nothing at or above it", () => {
    expect(shippingChargeMinor(1, rules)).toBe(399);
    expect(shippingChargeMinor(3499, rules)).toBe(399);
    expect(shippingChargeMinor(3500, rules)).toBe(0);
  });

  it("charge nothing for an empty basket", () => {
    expect(shippingChargeMinor(0, rules)).toBe(0);
  });

  it("report the shortfall and progress towards free delivery", () => {
    expect(remainingForFreeShippingMinor(1000, rules)).toBe(2500);
    expect(remainingForFreeShippingMinor(9000, rules)).toBe(0);
    expect(freeShippingProgress(1750, rules)).toBeCloseTo(0.5);
    expect(freeShippingProgress(9000, rules)).toBe(1);
  });

  it("treat a zero threshold as always free", () => {
    expect(freeShippingProgress(0, { flatRateMinor: 399, freeThresholdMinor: 0 })).toBe(1);
  });
});
