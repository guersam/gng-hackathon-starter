import type { CreateSessionInput } from "./types";

export function parseCreateSession(value: unknown): CreateSessionInput {
  if (!value || typeof value !== "object") throw new Error("요청 본문이 필요합니다.");
  const input = value as Partial<CreateSessionInput>;
  if (input.runMode !== "team" && input.runMode !== "cohort") throw new Error("runMode가 올바르지 않습니다.");
  if (!Array.isArray(input.teams) || input.teams.length === 0) throw new Error("팀이 하나 이상 필요합니다.");
  const ids = new Set<string>();
  let seats = 0;
  const teams = input.teams.map((team, index) => {
    if (!team || typeof team !== "object") throw new Error("팀 설정이 올바르지 않습니다.");
    const id = String(team.id || `team-${index + 1}`).trim();
    const label = String(team.label || `팀 ${index + 1}`).trim();
    const capacity = Number(team.capacity);
    if (!id || ids.has(id)) throw new Error("팀 ID는 고유해야 합니다.");
    if (!Number.isInteger(capacity) || capacity < 3 || capacity > 5) throw new Error("팀 정원은 3명에서 5명이어야 합니다.");
    ids.add(id);
    seats += capacity;
    return { id, label, capacity };
  });
  if (seats > 30) throw new Error("전체 정원은 30명을 넘을 수 없습니다.");
  const durationSeconds = input.durationSeconds ?? 480;
  if (!Number.isInteger(durationSeconds) || durationSeconds < 60 || durationSeconds > 3600) throw new Error("게임 시간은 60초에서 3600초 사이여야 합니다.");
  return { kind: "team_simulation", runMode: input.runMode, timezone: input.timezone || "Asia/Seoul", durationSeconds, teams };
}

export function cleanDisplayName(value: unknown): string {
  if (typeof value !== "string") throw new Error("이름이 필요합니다.");
  const name = value.trim();
  if (name.length < 1 || name.length > 24) throw new Error("이름은 1자에서 24자 사이여야 합니다.");
  return name;
}

export function parsePracticeInput(value: unknown): { displayName: string; timezone: string } {
  if (!value || typeof value !== "object") throw new Error("요청 본문이 필요합니다.");
  const input = value as { displayName?: unknown; timezone?: unknown };
  const timezone = typeof input.timezone === "string" && input.timezone.trim() ? input.timezone.trim() : "Asia/Seoul";
  return { displayName: cleanDisplayName(input.displayName), timezone };
}
