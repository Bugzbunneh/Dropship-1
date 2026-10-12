// WCAG 2.x contrast ratios, used by tests to keep every store's palette readable.

const channel = (value: number): number => {
  const scaled = value / 255;
  return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
};

export const relativeLuminance = (hex: string): number => {
  const parsed = Number.parseInt(hex.replace("#", ""), 16);
  const red = (parsed >> 16) & 255;
  const green = (parsed >> 8) & 255;
  const blue = parsed & 255;
  return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue);
};

// 1 (identical) to 21 (black on white).
export const contrastRatio = (colourA: string, colourB: string): number => {
  const luminances = [relativeLuminance(colourA), relativeLuminance(colourB)];
  const lighter = Math.max(...luminances);
  const darker = Math.min(...luminances);
  return (lighter + 0.05) / (darker + 0.05);
};

// Minimum ratios from WCAG 2.2 AA.
export const WCAG_AA_TEXT = 4.5;
export const WCAG_AA_NON_TEXT = 3;
