import { describe, expect, it } from "vitest";
import { BASE_CREDITS, failureUnits, RANGE_IDS, rewardUnits, SCORE_UNITS_PER_CREDIT, TIME_LIMITS } from "@experiential/game-yoil-genius/domain";

describe("integer scoring", () => {
  it("represents every reward cell exactly", () => { for (const range of RANGE_IDS) for (const limit of TIME_LIMITS) expect(Number.isInteger(rewardUnits(range, limit))).toBe(true); });
  it("uses the range and time multipliers", () => { expect(rewardUnits("recent_1000_years", 3)).toBe(100 * 420); expect(rewardUnits("recent_1000_years", 21)).toBe(6000); });
  it("makes only the hardest fastest failure exceed ten credits", () => {
    for (const range of RANGE_IDS) for (const limit of TIME_LIMITS) expect(failureUnits(range, limit) / SCORE_UNITS_PER_CREDIT).toBe(range === "recent_1000_years" && limit === 3 ? -17 : -10);
  });
});
