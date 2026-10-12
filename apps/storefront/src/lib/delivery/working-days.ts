import { BANK_HOLIDAYS_COVERED_UNTIL, ENGLAND_AND_WALES_BANK_HOLIDAYS } from "./uk-bank-holidays";

// Working-day arithmetic for delivery promises. Dates here are calendar days written "YYYY-MM-DD"
// and handled in UTC, so daylight saving and the viewer's time zone can never shift a result.

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const toUtcDate = (isoDate: string): Date => new Date(`${isoDate}T00:00:00Z`);
const toIsoDate = (date: Date): string => date.toISOString().slice(0, 10);

const addDays = (isoDate: string, days: number): string =>
  toIsoDate(new Date(toUtcDate(isoDate).getTime() + days * ONE_DAY_MS));

const isWeekend = (isoDate: string): boolean => {
  const weekday = toUtcDate(isoDate).getUTCDay();
  return weekday === 0 || weekday === 6;
};

export const isWorkingDay = (
  isoDate: string,
  holidays: readonly string[] = ENGLAND_AND_WALES_BANK_HOLIDAYS,
): boolean => !isWeekend(isoDate) && !holidays.includes(isoDate);

// Today's date in the UK, whatever time zone the server or browser is in.
export const ukCalendarDate = (now: Date): string => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: string): string => parts.find((p) => p.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
};

// The date `workingDays` working days after `from` (which is day zero, working day or not).
export const addWorkingDays = (
  from: string,
  workingDays: number,
  holidays: readonly string[] = ENGLAND_AND_WALES_BANK_HOLIDAYS,
): string => {
  let current = from;
  let remaining = workingDays;
  while (remaining > 0) {
    current = addDays(current, 1);
    if (isWorkingDay(current, holidays)) {
      remaining -= 1;
    }
  }
  return current;
};

export type DeliveryEstimate =
  // a date we can stand behind
  | { kind: "date"; latest: string }
  // too far ahead for the bank holiday table to be reliable
  | { kind: "within"; workingDays: number };

export const estimateDelivery = (
  now: Date,
  maxWorkingDays: number,
  holidays: readonly string[] = ENGLAND_AND_WALES_BANK_HOLIDAYS,
  coveredUntil: string = BANK_HOLIDAYS_COVERED_UNTIL,
): DeliveryEstimate => {
  const today = ukCalendarDate(now);
  const latest = addWorkingDays(today, maxWorkingDays, holidays);

  return latest <= coveredUntil
    ? { kind: "date", latest }
    : { kind: "within", workingDays: maxWorkingDays };
};

// "Fri 17 Oct", for use in a sentence.
export const formatShortDate = (isoDate: string, locale = "en-GB"): string =>
  new Intl.DateTimeFormat(locale, {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(toUtcDate(isoDate));
