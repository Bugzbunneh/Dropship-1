// Small styling helpers shared by components.

type ClassPart = string | false | null | undefined;

export const cn = (...parts: ClassPart[]): string => parts.filter(Boolean).join(" ");

type ButtonVariant = "primary" | "secondary" | "ghost" | "dark";
type ButtonSize = "sm" | "md" | "lg";

// Every button has a 2px border (transparent unless a variant colours it) so filled and outlined
// buttons are exactly the same height side by side.
const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-full border-2 border-transparent font-bold transition " +
  "disabled:cursor-not-allowed disabled:opacity-55 active:translate-y-px";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-foreground shadow-sm hover:brightness-95 hover:shadow-md",
  dark: "bg-foreground text-background hover:opacity-90",
  secondary:
    "border-foreground/15 bg-background text-foreground hover:border-emphasis hover:bg-surface",
  ghost: "text-emphasis hover:bg-surface",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "px-4 py-2 text-sm",
  md: "px-6 py-3 text-base",
  lg: "px-8 py-4 text-lg",
};

export const buttonClasses = (
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  extra?: string,
): string => cn(buttonBase, buttonVariants[variant], buttonSizes[size], extra);

// Cards lift slightly when hovered, unless the visitor prefers reduced motion.
export const cardClasses =
  "rounded-2xl border border-muted bg-background shadow-card transition " +
  "motion-safe:hover:-translate-y-0.5 hover:shadow-lift";
