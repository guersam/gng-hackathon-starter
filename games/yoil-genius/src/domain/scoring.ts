import { RangeId, ScoreUnits, TimeLimit, SCORE_UNITS_PER_CREDIT } from "./types";

export const BASE_CREDITS: Record<RangeId, number> = { this_week: 1, this_month: 2, this_year: 5, recent_3_years: 10, recent_10_years: 20, recent_100_years: 50, recent_1000_years: 100 };
export function rewardUnits(rangeId: RangeId, limit: TimeLimit): ScoreUnits { return BASE_CREDITS[rangeId] * SCORE_UNITS_PER_CREDIT / (limit / 3); }
export function failureUnits(rangeId: RangeId, limit: TimeLimit): ScoreUnits {
  const credits = Math.max(10, Math.floor(BASE_CREDITS[rangeId] / (limit / 3) / 6) + 1);
  return -credits * SCORE_UNITS_PER_CREDIT;
}
export function formatCredits(units: ScoreUnits): string {
  const value = units / SCORE_UNITS_PER_CREDIT;
  return Number.isInteger(value) ? String(value) : value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}
