// The cart a visitor builds is just a list of (variant, quantity) pairs. Prices, names and stock
// are never stored with it: they are looked up fresh from the catalog every time (see actions.ts),
// so a stale or edited cart can never fix a price. These are the pure rules for changing the list.

export type CartLine = {
  variantId: string;
  quantity: number;
};

export const MAX_LINE_QUANTITY = 10;
export const MAX_CART_LINES = 40;

// Variant ids are UUIDs from the database, or slugs like "fx-var-PP-RDL" in the offline catalog.
const VARIANT_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export const isValidVariantId = (value: unknown): value is string =>
  typeof value === "string" && VARIANT_ID_PATTERN.test(value);

const clampQuantity = (quantity: number): number =>
  Math.min(MAX_LINE_QUANTITY, Math.max(0, Math.floor(quantity)));

export const addLine = (lines: CartLine[], variantId: string, quantity = 1): CartLine[] => {
  if (!isValidVariantId(variantId) || !Number.isFinite(quantity) || quantity < 1) {
    return lines;
  }
  const existing = lines.find((line) => line.variantId === variantId);
  if (existing) {
    return lines.map((line) =>
      line.variantId === variantId
        ? { ...line, quantity: clampQuantity(line.quantity + quantity) }
        : line,
    );
  }
  if (lines.length >= MAX_CART_LINES) {
    return lines;
  }
  return [...lines, { variantId, quantity: clampQuantity(quantity) }];
};

// Setting a quantity of zero (or less) removes the line.
export const setLineQuantity = (
  lines: CartLine[],
  variantId: string,
  quantity: number,
): CartLine[] => {
  const next = clampQuantity(Number.isFinite(quantity) ? quantity : 0);
  if (next === 0) {
    return removeLine(lines, variantId);
  }
  return lines.map((line) => (line.variantId === variantId ? { ...line, quantity: next } : line));
};

export const removeLine = (lines: CartLine[], variantId: string): CartLine[] =>
  lines.filter((line) => line.variantId !== variantId);

export const countItems = (lines: CartLine[]): number =>
  lines.reduce((total, line) => total + line.quantity, 0);

const asLine = (value: unknown): CartLine | undefined => {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }
  const { variantId, quantity } = value as Record<string, unknown>;
  if (!isValidVariantId(variantId) || typeof quantity !== "number") {
    return undefined;
  }
  const clamped = clampQuantity(quantity);
  return clamped > 0 ? { variantId, quantity: clamped } : undefined;
};

// Anything read back from localStorage may be old, edited or corrupt. Keep only what is valid.
export const sanitiseLines = (value: unknown): CartLine[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  const seen = new Set<string>();
  const lines: CartLine[] = [];
  for (const entry of value) {
    const line = asLine(entry);
    if (line && !seen.has(line.variantId) && lines.length < MAX_CART_LINES) {
      seen.add(line.variantId);
      lines.push(line);
    }
  }
  return lines;
};
