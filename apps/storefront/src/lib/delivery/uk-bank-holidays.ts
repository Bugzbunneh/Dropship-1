// Bank holidays in England and Wales, from https://www.gov.uk/bank-holidays.json (fetched
// 2026-10-12). Delivery estimates skip these.
//
// This table has to be extended every year. Past the last year listed, estimates fall back to plain
// wording ("within 5 working days") instead of showing a date that might be a day out. The test in
// ./working-days.test.ts fails once the table runs out within the next three months, as a reminder.

export const ENGLAND_AND_WALES_BANK_HOLIDAYS: readonly string[] = [
  // 2026
  "2026-01-01", // New Year's Day
  "2026-04-03", // Good Friday
  "2026-04-06", // Easter Monday
  "2026-05-04", // Early May bank holiday
  "2026-05-25", // Spring bank holiday
  "2026-08-31", // Summer bank holiday
  "2026-12-25", // Christmas Day
  "2026-12-28", // Boxing Day (substitute day)
  // 2027
  "2027-01-01", // New Year's Day
  "2027-03-26", // Good Friday
  "2027-03-29", // Easter Monday
  "2027-05-03", // Early May bank holiday
  "2027-05-31", // Spring bank holiday
  "2027-08-30", // Summer bank holiday
  "2027-12-27", // Christmas Day (substitute day)
  "2027-12-28", // Boxing Day (substitute day)
];

// The last day the table above can be trusted for.
export const BANK_HOLIDAYS_COVERED_UNTIL = "2027-12-31";
