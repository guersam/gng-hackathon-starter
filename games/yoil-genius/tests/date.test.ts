import { describe, expect, it } from "vitest";
import { addDays, fromOrdinal, isLeapYear, rangeBounds, toOrdinal, weekdayOf } from "@experiential/game-yoil-genius/domain";

describe("civil Gregorian calendar", () => {
  it("handles leap and century rules", () => { expect(isLeapYear(2000)).toBe(true); expect(isLeapYear(1900)).toBe(false); expect(isLeapYear(2024)).toBe(true); });
  it.each([
    [{ year: 1, month: 1, day: 1 }, "monday"], [{ year: 1970, month: 1, day: 1 }, "thursday"],
    [{ year: 2000, month: 2, day: 29 }, "tuesday"], [{ year: 2026, month: 8, day: 13 }, "thursday"],
  ] as const)("knows weekday %#", (date, weekday) => expect(weekdayOf(date)).toBe(weekday));
  it("round-trips dates across broad ordinal samples", () => { for (let n = 0; n < 3_000_000; n += 7919) expect(toOrdinal(fromOrdinal(n))).toBe(n); });
  it("defines full Monday-Sunday week and future-inclusive named periods", () => {
    expect(rangeBounds("this_week", { year: 2026, month: 8, day: 13 })).toEqual([{ year: 2026, month: 8, day: 10 }, { year: 2026, month: 8, day: 16 }]);
    expect(rangeBounds("this_month", { year: 2024, month: 2, day: 2 })[1]).toEqual({ year: 2024, month: 2, day: 29 });
  });
  it("clamps Feb 29 for recent-year boundaries", () => expect(rangeBounds("recent_3_years", { year: 2024, month: 2, day: 29 })[0]).toEqual({ year: 2021, month: 2, day: 28 }));
  it("crosses year boundaries without Date", () => expect(addDays({ year: 1999, month: 12, day: 31 }, 1)).toEqual({ year: 2000, month: 1, day: 1 }));
});
