import type { CartVariantInfo } from "../catalog/types";
import {
  freeShippingProgress,
  remainingForFreeShippingMinor,
  shippingChargeMinor,
  type ShippingRules,
} from "../shipping";
import type { CartLine } from "./lines";

// What the cart page and drawer show: each line joined to today's catalog data, and the totals.
// Sold-out and withdrawn items stay visible (so nothing silently disappears) but cost nothing.

export type PricedLine = {
  variantId: string;
  quantity: number;
  // undefined when the product is no longer in the catalog
  info: CartVariantInfo | undefined;
  lineTotalMinor: number;
  // what the customer saves on this line against the "was" price
  savingMinor: number;
  purchasable: boolean;
};

export type CartSummary = {
  lines: PricedLine[];
  itemCount: number;
  subtotalMinor: number;
  savingsMinor: number;
  shippingMinor: number;
  totalMinor: number;
  freeShippingRemainingMinor: number;
  freeShippingProgress: number;
  hasUnavailableLines: boolean;
};

const priceLine = (line: CartLine, info: CartVariantInfo | undefined): PricedLine => {
  const purchasable = info !== undefined && info.isAvailable;
  const unitPrice = purchasable ? info.priceMinor : 0;
  const unitSaving = purchasable && info.compareAtMinor ? info.compareAtMinor - info.priceMinor : 0;

  return {
    variantId: line.variantId,
    quantity: line.quantity,
    info,
    lineTotalMinor: unitPrice * line.quantity,
    savingMinor: unitSaving * line.quantity,
    purchasable,
  };
};

export const summariseCart = (
  lines: CartLine[],
  infos: CartVariantInfo[],
  rules: ShippingRules,
): CartSummary => {
  const infoById = new Map(infos.map((info) => [info.variantId, info]));
  const priced = lines.map((line) => priceLine(line, infoById.get(line.variantId)));
  const purchasable = priced.filter((line) => line.purchasable);

  const subtotalMinor = purchasable.reduce((sum, line) => sum + line.lineTotalMinor, 0);
  const savingsMinor = purchasable.reduce((sum, line) => sum + line.savingMinor, 0);
  const shippingMinor = shippingChargeMinor(subtotalMinor, rules);

  return {
    lines: priced,
    itemCount: purchasable.reduce((sum, line) => sum + line.quantity, 0),
    subtotalMinor,
    savingsMinor,
    shippingMinor,
    totalMinor: subtotalMinor + shippingMinor,
    freeShippingRemainingMinor: remainingForFreeShippingMinor(subtotalMinor, rules),
    freeShippingProgress: freeShippingProgress(subtotalMinor, rules),
    hasUnavailableLines: priced.some((line) => !line.purchasable),
  };
};
