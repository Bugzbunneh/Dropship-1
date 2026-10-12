// Delivery charges. The rules (a flat rate, free above a basket value) come from the store's
// config. They are placeholders until real supplier costs are known in Phase 3, and the real
// charge is always recalculated on the server at checkout (Phase 2): this is for display.

export type ShippingRules = {
  flatRateMinor: number;
  freeThresholdMinor: number;
};

export const shippingChargeMinor = (subtotalMinor: number, rules: ShippingRules): number => {
  if (subtotalMinor <= 0) {
    return 0;
  }
  return subtotalMinor >= rules.freeThresholdMinor ? 0 : rules.flatRateMinor;
};

// How much more to spend for free delivery. Zero once the basket qualifies.
export const remainingForFreeShippingMinor = (
  subtotalMinor: number,
  rules: ShippingRules,
): number => Math.max(0, rules.freeThresholdMinor - subtotalMinor);

// 0 to 1, for a progress bar.
export const freeShippingProgress = (subtotalMinor: number, rules: ShippingRules): number => {
  if (rules.freeThresholdMinor <= 0) {
    return 1;
  }
  return Math.min(1, Math.max(0, subtotalMinor / rules.freeThresholdMinor));
};
