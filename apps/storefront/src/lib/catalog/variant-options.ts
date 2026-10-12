// How a product with several choices (Size, Colour) lets someone pick a variant. Pure functions, so
// the awkward cases (a combination that doesn't exist, a sold-out size) are tested, not guessed.

export type PickableVariant = {
  id: string;
  title: string;
  priceMinor: number;
  compareAtMinor: number | null;
  options: Record<string, string>;
  isAvailable: boolean;
};

export type OptionGroup = {
  name: string;
  values: string[];
};

// Option names in the order the first variant lists them, each with its values in order of first
// appearance: [{ name: "Size", values: ["Small", "Medium"] }, { name: "Colour", values: [...] }].
export const optionGroupsOf = (variants: PickableVariant[]): OptionGroup[] => {
  const groups: OptionGroup[] = [];
  for (const variant of variants) {
    for (const [name, value] of Object.entries(variant.options)) {
      let group = groups.find((existing) => existing.name === name);
      if (!group) {
        group = { name, values: [] };
        groups.push(group);
      }
      if (!group.values.includes(value)) {
        group.values.push(value);
      }
    }
  }
  return groups;
};

// What to select when the page first loads: the cheapest variant that can be bought, or the first
// one if everything is sold out.
export const defaultVariantOf = (variants: PickableVariant[]): PickableVariant | undefined => {
  const buyable = variants.filter((variant) => variant.isAvailable);
  const pool = buyable.length > 0 ? buyable : variants;
  return [...pool].sort((a, b) => a.priceMinor - b.priceMinor)[0];
};

const matchCount = (variant: PickableVariant, wanted: Record<string, string>): number =>
  Object.entries(wanted).filter(([name, value]) => variant.options[name] === value).length;

// The customer clicked `value` for option `name`. Keep their other choices if that combination
// exists; otherwise pick the closest variant that has `value`, preferring ones in stock.
export const variantAfterChoosing = (
  variants: PickableVariant[],
  current: PickableVariant,
  name: string,
  value: string,
): PickableVariant | undefined => {
  const wanted = { ...current.options, [name]: value };
  const withValue = variants.filter((variant) => variant.options[name] === value);

  const ranked = [...withValue].sort(
    (a, b) =>
      matchCount(b, wanted) - matchCount(a, wanted) ||
      Number(b.isAvailable) - Number(a.isAvailable) ||
      a.priceMinor - b.priceMinor,
  );
  return ranked[0];
};

// How an option value should look in the picker, given what else is currently chosen.
export type ValueStatus = "available" | "sold-out";

export const valueStatus = (
  variants: PickableVariant[],
  current: PickableVariant,
  name: string,
  value: string,
): ValueStatus => {
  const others = Object.entries(current.options).filter(([otherName]) => otherName !== name);
  const compatible = variants.filter(
    (variant) =>
      variant.options[name] === value &&
      others.every(([otherName, otherValue]) => variant.options[otherName] === otherValue),
  );
  return compatible.some((variant) => variant.isAvailable) ? "available" : "sold-out";
};
