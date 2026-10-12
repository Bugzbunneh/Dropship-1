import type { SupportedFont } from "@dropship/config";

// How each supported font is referenced in CSS. The --font-* variables are set by next/font in
// ./fonts.ts; the generic families after them are the fallback while a font loads.
// Typed as a Record so adding a font to the config without adding it here fails to compile.
const stacks: Record<SupportedFont, { variable: string; fallback: string }> = {
  Fraunces: { variable: "--font-fraunces", fallback: "Georgia, 'Times New Roman', serif" },
  "Nunito Sans": { variable: "--font-nunito-sans", fallback: "system-ui, sans-serif" },
};

export const fontStackFor = (font: SupportedFont): string => {
  const { variable, fallback } = stacks[font];
  return `var(${variable}), ${fallback}`;
};
