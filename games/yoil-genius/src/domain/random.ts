import { CivilDate, RangeId } from "./types";
import { fromOrdinal, rangeBounds, toOrdinal } from "./date";

export function nextRandom(seed: number): { value: number; seed: number } {
  let x = seed >>> 0;
  x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
  const next = x >>> 0;
  return { value: next / 0x100000000, seed: next };
}
export function sampleDate(rangeId: RangeId, reference: CivilDate, seed: number): CivilDate {
  const [start, end] = rangeBounds(rangeId, reference);
  const first = toOrdinal(start); const size = toOrdinal(end) - first + 1;
  return fromOrdinal(first + Math.floor(nextRandom(seed).value * size));
}
