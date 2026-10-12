import { describe, expect, it } from "vitest";
import {
  addWorkingDays,
  estimateDelivery,
  formatShortDate,
  isWorkingDay,
  ukCalendarDate,
} from "./working-days";
import { BANK_HOLIDAYS_COVERED_UNTIL, ENGLAND_AND_WALES_BANK_HOLIDAYS } from "./uk-bank-holidays";

describe("addWorkingDays", () => {
  it("counts weekdays after the start day", () => {
    // Monday 12 Oct 2026 + 5 working days = Monday 19 Oct
    expect(addWorkingDays("2026-10-12", 5)).toBe("2026-10-19");
    expect(addWorkingDays("2026-10-12", 1)).toBe("2026-10-13");
  });

  it("skips the weekend", () => {
    expect(addWorkingDays("2026-10-16", 1)).toBe("2026-10-19");
  });

  it("starts counting from the next working day when ordered at a weekend", () => {
    // Saturday 17 Oct: Mon 19 is day 1, Fri 23 is day 5
    expect(addWorkingDays("2026-10-17", 5)).toBe("2026-10-23");
  });

  it("skips bank holidays", () => {
    // Wed 23 Dec 2026: Thu 24 (1), Christmas Day and the weekend and Boxing Day skipped,
    // Tue 29 (2), Wed 30 (3)
    expect(addWorkingDays("2026-12-23", 3)).toBe("2026-12-30");
    // Easter 2027: Good Friday 26 Mar and Easter Monday 29 Mar skipped
    expect(addWorkingDays("2027-03-25", 2)).toBe("2027-03-31");
  });

  it("returns the start day for zero working days", () => {
    expect(addWorkingDays("2026-10-12", 0)).toBe("2026-10-12");
  });
});

describe("isWorkingDay", () => {
  it("is false for weekends and bank holidays only", () => {
    expect(isWorkingDay("2026-10-12")).toBe(true);
    expect(isWorkingDay("2026-10-17")).toBe(false);
    expect(isWorkingDay("2026-12-25")).toBe(false);
    expect(isWorkingDay("2026-12-24")).toBe(true);
  });
});

describe("ukCalendarDate", () => {
  it("gives the date in the UK, not in UTC", () => {
    // 23:30 UTC on 1 July is 00:30 on 2 July in British Summer Time
    expect(ukCalendarDate(new Date("2026-07-01T23:30:00Z"))).toBe("2026-07-02");
    // in winter the UK is on UTC
    expect(ukCalendarDate(new Date("2026-12-01T23:30:00Z"))).toBe("2026-12-01");
  });
});

describe("estimateDelivery", () => {
  it("gives the latest delivery date", () => {
    const estimate = estimateDelivery(new Date("2026-10-12T10:00:00Z"), 5);

    expect(estimate).toEqual({ kind: "date", latest: "2026-10-19" });
  });

  it("falls back to plain wording once the bank holiday table runs out", () => {
    const estimate = estimateDelivery(new Date("2027-12-29T10:00:00Z"), 5);

    expect(estimate).toEqual({ kind: "within", workingDays: 5 });
  });
});

describe("formatShortDate", () => {
  it("writes a short UK date", () => {
    expect(formatShortDate("2026-10-19")).toBe("Mon 19 Oct");
  });
});

describe("the bank holiday table", () => {
  it("lists only weekdays, in order, with no repeats", () => {
    const sorted = [...ENGLAND_AND_WALES_BANK_HOLIDAYS].sort();

    expect(ENGLAND_AND_WALES_BANK_HOLIDAYS).toEqual(sorted);
    expect(new Set(sorted).size).toBe(sorted.length);
    for (const holiday of sorted) {
      const weekday = new Date(`${holiday}T00:00:00Z`).getUTCDay();
      expect([0, 6], `${holiday} should not be a weekend`).not.toContain(weekday);
    }
  });

  it("has an entry for every year it claims to cover", () => {
    const years = new Set(ENGLAND_AND_WALES_BANK_HOLIDAYS.map((date) => date.slice(0, 4)));

    expect(years.has(BANK_HOLIDAYS_COVERED_UNTIL.slice(0, 4))).toBe(true);
  });

  it("reminds us to extend it at least three months before it runs out", () => {
    const threeMonthsAway = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    expect(
      BANK_HOLIDAYS_COVERED_UNTIL >= threeMonthsAway,
      "extend ENGLAND_AND_WALES_BANK_HOLIDAYS from https://www.gov.uk/bank-holidays.json",
    ).toBe(true);
  });
});
