import { DomainError, SessionConfig, RANGE_IDS, TIME_LIMITS } from "./types";
import { isCivilDate } from "./date";

export function validateSessionConfig(config: SessionConfig): DomainError[] {
  const errors: DomainError[] = [];
  if (!config.timezone.trim()) errors.push({ code: "timezone_required", message: "Timezone is required" });
  if (!Number.isInteger(config.durationSeconds) || config.durationSeconds < 60) errors.push({ code: "duration_invalid", message: "Duration must be at least 60 seconds" });
  if (!Number.isInteger(config.countdownSeconds) || config.countdownSeconds < 0) errors.push({ code: "countdown_invalid", message: "Countdown cannot be negative" });
  if (!isCivilDate(config.referenceDate)) errors.push({ code: "reference_date_invalid", message: "Reference date is invalid" });
  if (!config.teams.length) errors.push({ code: "teams_required", message: "At least one team is required" });
  if (config.teams.reduce((n, t) => n + t.capacity, 0) > 30) errors.push({ code: "capacity_exceeded", message: "Total capacity cannot exceed 30" });
  const ids = new Set<string>();
  for (const team of config.teams) {
    if (ids.has(team.id)) errors.push({ code: "team_id_duplicate", message: `Duplicate team id: ${team.id}` });
    ids.add(team.id);
    const validCapacity = config.kind === "solo_practice" ? team.capacity === 1 : [3, 4, 5].includes(team.capacity);
    if (!validCapacity) errors.push({ code: "capacity_invalid", message: config.kind === "solo_practice" ? "Solo practice must have one seat" : `Team ${team.id} capacity must be 3–5` });
    if (!team.label.trim()) errors.push({ code: "team_label_required", message: `Team ${team.id} label is required` });
  }
  if (config.kind === "solo_practice") {
    if (config.teams.length !== 1) errors.push({ code: "solo_team_count_invalid", message: "Solo practice must have exactly one team" });
    if (config.runMode !== "team") errors.push({ code: "solo_run_mode_invalid", message: "Solo practice cannot use cohort start" });
    if (config.durationSeconds !== 120) errors.push({ code: "solo_duration_invalid", message: "Solo practice lasts 120 seconds" });
  }
  return errors;
}
export function isRangeId(x: unknown): x is (typeof RANGE_IDS)[number] { return RANGE_IDS.includes(x as never); }
export function isTimeLimit(x: unknown): x is (typeof TIME_LIMITS)[number] { return TIME_LIMITS.includes(x as never); }
