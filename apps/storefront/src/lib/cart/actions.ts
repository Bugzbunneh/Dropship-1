"use server";

import { getSnapshot } from "@/lib/catalog";
import { cartVariantInfo } from "@/lib/catalog/queries";
import type { CartVariantInfo } from "@/lib/catalog/types";
import { isValidVariantId, MAX_CART_LINES } from "./lines";

// Prices the cart. The browser sends only variant ids; names, prices and stock come from the
// catalog here, so nothing a visitor edits in their browser can change what they are shown (and
// at checkout the server prices the order again from scratch).
export const lookupCartVariants = async (variantIds: unknown): Promise<CartVariantInfo[]> => {
  if (!Array.isArray(variantIds)) {
    return [];
  }
  const ids = variantIds.filter(isValidVariantId).slice(0, MAX_CART_LINES);
  if (ids.length === 0) {
    return [];
  }
  return cartVariantInfo(await getSnapshot(), ids);
};
