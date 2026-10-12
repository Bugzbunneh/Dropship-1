// UK VAT. Prices shown to customers always include VAT, as the law requires for consumer sales,
// so VAT is never added on top: when the business is VAT registered, the VAT already inside the
// total is worked out and recorded. Rates are basis points (2000 = 20%).

export type VatSettings = {
  registered: boolean;
  rateBps: number;
};

// The VAT contained in a VAT-inclusive amount, rounded to the nearest penny (halves round up).
// Integer arithmetic only, so there is never a floating point error in a customer's receipt.
export const vatContainedMinor = (grossMinor: number, rateBps: number): number => {
  if (grossMinor <= 0 || rateBps <= 0) {
    return 0;
  }
  const denominator = 10_000 + rateBps;
  return Math.floor((2 * grossMinor * rateBps + denominator) / (2 * denominator));
};

// What to record on an order: nothing unless the business is registered for VAT.
export const orderVatMinor = (grossMinor: number, vat: VatSettings): number =>
  vat.registered ? vatContainedMinor(grossMinor, vat.rateBps) : 0;
