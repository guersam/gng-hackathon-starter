import { CivilDate, RangeId, Weekday, WEEKDAYS } from "./types";

export function isLeapYear(year: number): boolean { return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0); }
export function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}
export function isCivilDate(value: CivilDate): boolean {
  return Number.isInteger(value.year) && value.year >= 1 && value.year <= 9999 && Number.isInteger(value.month) && value.month >= 1 && value.month <= 12 && Number.isInteger(value.day) && value.day >= 1 && value.day <= daysInMonth(value.year, value.month);
}
export function assertCivilDate(value: CivilDate): void { if (!isCivilDate(value)) throw new RangeError("Invalid civil date"); }

// Howard Hinnant's civil calendar algorithms, shifted so 0001-01-01 is ordinal 0.
export function toOrdinal(date: CivilDate): number {
  assertCivilDate(date);
  let y = date.year;
  const m = date.month;
  y -= m <= 2 ? 1 : 0;
  const era = Math.floor(y / 400);
  const yoe = y - era * 400;
  const mp = m + (m > 2 ? -3 : 9);
  const doy = Math.floor((153 * mp + 2) / 5) + date.day - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 306;
}
export function fromOrdinal(ordinal: number): CivilDate {
  if (!Number.isInteger(ordinal) || ordinal < 0) throw new RangeError("Invalid civil ordinal");
  const z = ordinal + 306;
  const era = Math.floor(z / 146097);
  const doe = z - era * 146097;
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
  let y = yoe + era * 400;
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const day = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const month = mp + (mp < 10 ? 3 : -9);
  y += month <= 2 ? 1 : 0;
  const result = { year: y, month, day };
  assertCivilDate(result);
  return result;
}
export function addDays(date: CivilDate, days: number): CivilDate { return fromOrdinal(toOrdinal(date) + days); }
export function weekdayOf(date: CivilDate): Weekday { return WEEKDAYS[toOrdinal(date) % 7]; }

export function rangeBounds(rangeId: RangeId, reference: CivilDate): [CivilDate, CivilDate] {
  assertCivilDate(reference);
  const refOrdinal = toOrdinal(reference);
  if (rangeId === "this_week") {
    const monday = refOrdinal - (refOrdinal % 7);
    return [fromOrdinal(monday), fromOrdinal(monday + 6)];
  }
  if (rangeId === "this_month") return [{ year: reference.year, month: reference.month, day: 1 }, { year: reference.year, month: reference.month, day: daysInMonth(reference.year, reference.month) }];
  if (rangeId === "this_year") return [{ year: reference.year, month: 1, day: 1 }, { year: reference.year, month: 12, day: 31 }];
  const years = ({ recent_3_years: 3, recent_10_years: 10, recent_100_years: 100, recent_1000_years: 1000 } as const)[rangeId];
  const targetYear = Math.max(1, reference.year - years);
  const startDay = Math.min(reference.day, daysInMonth(targetYear, reference.month));
  return [{ year: targetYear, month: reference.month, day: startDay }, reference];
}
