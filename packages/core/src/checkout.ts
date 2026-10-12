import { shippingChargeMinor, type ShippingRules } from "./shipping";
import { orderVatMinor, type VatSettings } from "./vat";

// Pricing an order from scratch. The browser only ever says "these variants, these quantities";
// everything else (names, prices, stock, delivery, VAT) is decided here from freshly read catalog
// rows, so nothing a visitor edits can change what they are charged.

export const MAX_LINE_QUANTITY = 10;
export const MAX_CART_LINES = 40;

// Stripe refuses a payment smaller than this in pounds (30p). Other currencies would differ.
export const MIN_ORDER_TOTAL_MINOR = 30;

export type CheckoutLine = {
  variantId: string;
  quantity: number;
};

// A variant as read from the database at checkout time.
export type PurchasableVariant = {
  variantId: string;
  sku: string;
  productTitle: string;
  variantTitle: string;
  currency: string;
  priceMinor: number;
  isAvailable: boolean;
  imagePath: string | null;
};

// One line of the order as it will be recorded: a snapshot, so later catalog edits never rewrite
// what a customer was charged.
export type OrderItemDraft = {
  variantId: string;
  sku: string;
  title: string;
  variantTitle: string;
  unitPriceMinor: number;
  quantity: number;
  lineTotalMinor: number;
  imagePath: string | null;
};

export type OrderDraft = {
  currency: string;
  items: OrderItemDraft[];
  subtotalMinor: number;
  shippingMinor: number;
  // the VAT already included in the total; zero unless the business is registered for VAT
  taxMinor: number;
  totalMinor: number;
};

export type CheckoutProblemReason =
  | "empty_cart"
  | "too_many_lines"
  | "invalid_quantity"
  | "not_found"
  | "unavailable"
  | "currency_mismatch"
  | "below_minimum";

export type CheckoutProblem = {
  reason: CheckoutProblemReason;
  variantId?: string;
};

export type PricingResult =
  { ok: true; order: OrderDraft } | { ok: false; problems: CheckoutProblem[] };

export type PricingContext = {
  currency: string;
  shipping: ShippingRules;
  vat: VatSettings;
};

const isWholeQuantity = (quantity: number): boolean => Number.isInteger(quantity) && quantity >= 1;

// The same variant listed twice becomes one line.
const mergeLines = (lines: readonly CheckoutLine[]): CheckoutLine[] => {
  const merged = new Map<string, number>();
  for (const line of lines) {
    const quantity = isWholeQuantity(line.quantity) ? line.quantity : Number.NaN;
    merged.set(line.variantId, (merged.get(line.variantId) ?? 0) + quantity);
  }
  return [...merged].map(([variantId, quantity]) => ({ variantId, quantity }));
};

const toItem = (variant: PurchasableVariant, quantity: number): OrderItemDraft => ({
  variantId: variant.variantId,
  sku: variant.sku,
  title: variant.productTitle,
  variantTitle: variant.variantTitle,
  unitPriceMinor: variant.priceMinor,
  quantity,
  lineTotalMinor: variant.priceMinor * quantity,
  imagePath: variant.imagePath,
});

export const priceCheckout = (
  requested: readonly CheckoutLine[],
  variants: readonly PurchasableVariant[],
  context: PricingContext,
): PricingResult => {
  if (requested.length === 0) {
    return { ok: false, problems: [{ reason: "empty_cart" }] };
  }

  const lines = mergeLines(requested);
  if (lines.length > MAX_CART_LINES) {
    return { ok: false, problems: [{ reason: "too_many_lines" }] };
  }

  const byId = new Map(variants.map((variant) => [variant.variantId, variant]));
  const problems: CheckoutProblem[] = [];
  const items: OrderItemDraft[] = [];

  for (const line of lines) {
    const variant = byId.get(line.variantId);
    if (!variant) {
      problems.push({ reason: "not_found", variantId: line.variantId });
    } else if (!(line.quantity >= 1 && line.quantity <= MAX_LINE_QUANTITY)) {
      problems.push({ reason: "invalid_quantity", variantId: line.variantId });
    } else if (!variant.isAvailable || !Number.isInteger(variant.priceMinor)) {
      problems.push({ reason: "unavailable", variantId: line.variantId });
    } else if (variant.currency !== context.currency) {
      problems.push({ reason: "currency_mismatch", variantId: line.variantId });
    } else {
      items.push(toItem(variant, line.quantity));
    }
  }

  if (problems.length > 0) {
    return { ok: false, problems };
  }

  const subtotalMinor = items.reduce((sum, item) => sum + item.lineTotalMinor, 0);
  const shippingMinor = shippingChargeMinor(subtotalMinor, context.shipping);
  const totalMinor = subtotalMinor + shippingMinor;

  if (totalMinor < MIN_ORDER_TOTAL_MINOR) {
    return { ok: false, problems: [{ reason: "below_minimum" }] };
  }

  return {
    ok: true,
    order: {
      currency: context.currency,
      items,
      subtotalMinor,
      shippingMinor,
      taxMinor: orderVatMinor(totalMinor, context.vat),
      totalMinor,
    },
  };
};
