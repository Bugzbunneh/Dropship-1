import type { StoreConfig } from "@dropship/config";
import { fontStackFor } from "./font-stacks";

type Theme = StoreConfig["theme"];
type Department = StoreConfig["departments"][number];

const radiusByToken: Record<Theme["radius"], string> = {
  none: "0",
  sm: "0.375rem",
  md: "0.625rem",
  lg: "1rem",
};

// CSS custom properties for a store's neutral theme. Tailwind reads them through the @theme block
// in globals.css, so components use ordinary utilities such as bg-primary or text-emphasis.
export const themeToCssVariables = (theme: Theme): Record<string, string> => {
  const { colours, fonts, radius } = theme;

  return {
    "--store-background": colours.background,
    "--store-foreground": colours.foreground,
    "--store-primary": colours.primary,
    "--store-primary-foreground": colours.primaryForeground,
    "--store-accent": colours.accent,
    "--store-muted": colours.muted,
    "--store-surface": colours.surface,
    "--store-emphasis": colours.emphasis,
    "--store-sale": colours.sale,
    "--store-font-heading": fontStackFor(fonts.heading),
    "--store-font-body": fontStackFor(fonts.body),
    "--store-radius": radiusByToken[radius],
  };
};

// A department wraps its pages in these, which override only the colours that give a section its
// character. Nested custom properties win over the page-level ones, so no component needs to know
// which department it is in.
export const departmentToCssVariables = (department: Department): Record<string, string> => {
  const { colours } = department;

  return {
    "--store-primary": colours.primary,
    "--store-primary-foreground": colours.primaryForeground,
    "--store-accent": colours.accent,
    "--store-surface": colours.surface,
    "--store-emphasis": colours.emphasis,
  };
};

export const findDepartment = (
  departments: StoreConfig["departments"],
  slug: string | null | undefined,
): Department | undefined => departments.find((department) => department.slug === slug);
