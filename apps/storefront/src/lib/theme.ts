import type { StoreConfig } from "@dropship/config";

type Theme = StoreConfig["theme"];

const radiusByToken: Record<Theme["radius"], string> = {
  none: "0",
  sm: "0.25rem",
  md: "0.5rem",
  lg: "1rem",
};

const fontStack = (family: string): string => `"${family}", system-ui, sans-serif`;

// CSS custom properties for one store's theme. Tailwind reads them through the @theme block in
// globals.css, so components use ordinary utilities such as bg-primary.
export const themeToCssVariables = (theme: Theme): Record<string, string> => {
  const { colours, fonts, radius } = theme;

  return {
    "--store-background": colours.background,
    "--store-foreground": colours.foreground,
    "--store-primary": colours.primary,
    "--store-primary-foreground": colours.primaryForeground,
    "--store-accent": colours.accent,
    "--store-muted": colours.muted,
    "--store-font-heading": fontStack(fonts.heading),
    "--store-font-body": fontStack(fonts.body),
    "--store-radius": radiusByToken[radius],
  };
};
