// Money is stored as whole minor units (pence) with a currency code, never as floats. These turn
// that into text for people, and back into the decimal strings search engines expect.

const formatters = new Map<string, Intl.NumberFormat>();

const formatterFor = (currency: string, locale: string): Intl.NumberFormat => {
  const key = `${locale}|${currency}`;
  const existing = formatters.get(key);
  if (existing) {
    return existing;
  }
  const created = new Intl.NumberFormat(locale, { style: "currency", currency });
  formatters.set(key, created);
  return created;
};

// How many minor units make one major unit: 100 for GBP, 1 for JPY.
export const minorUnitsPerMajor = (currency: string, locale: string): number => {
  const digits = formatterFor(currency, locale).resolvedOptions().maximumFractionDigits ?? 2;
  return 10 ** digits;
};

// 2999 -> "£29.99"
export const formatMoney = (minor: number, currency: string, locale: string): string => {
  const major = minor / minorUnitsPerMajor(currency, locale);
  return formatterFor(currency, locale).format(major);
};

// 2999 -> "29.99", for structured data. Always a plain decimal with a full stop.
export const decimalString = (minor: number, currency: string, locale: string): string => {
  const perMajor = minorUnitsPerMajor(currency, locale);
  const digits = Math.log10(perMajor);
  return (minor / perMajor).toFixed(digits);
};

// Whole percentage knocked off a "was" price, rounded down so a sale never over-claims.
export const percentOff = (priceMinor: number, compareAtMinor: number): number => {
  if (compareAtMinor <= priceMinor) {
    return 0;
  }
  return Math.floor(((compareAtMinor - priceMinor) / compareAtMinor) * 100);
};
