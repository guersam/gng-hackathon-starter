import { decide, reconcileDeadlines, createInitialState, foldEvents, RANGE_IDS, TIME_LIMITS, WEEKDAYS } from "@experiential/game-yoil-genius/domain";
import type { CivilDate, GameCommand, GameEvent, GameState, RangeId, SessionConfig, TimeLimit, Weekday } from "@experiential/game-yoil-genius/domain";
import type { SessionCreateConfig, SocketAttachment } from "./types";

export function domainConfig(input: SessionCreateConfig, now: number): SessionConfig {
  const common = {
    kind: input.kind,
    runMode: input.runMode,
    timezone: input.timezone || "Asia/Seoul",
    durationSeconds: input.durationSeconds || 480,
    countdownSeconds: 5,
    referenceDate: civilDateAt(now, input.timezone || "Asia/Seoul"),
    teams: input.teams.map((team) => ({ ...team })),
  };
  return input.kind === "solo_practice"
    ? { ...common, kind: "solo_practice", runMode: "team", durationSeconds: 120, teams: [{ id: "solo", label: "나", capacity: 1 }] }
    : { ...common, kind: "team_simulation", teams: common.teams as Array<{ id: string; label: string; capacity: 3 | 4 | 5 }> };
}

export function initialGame(input: SessionCreateConfig, now: number): GameState {
  return createInitialState(domainConfig(input, now));
}

export function joinGame(state: GameState, commandId: string, atMs: number, teamId: string, memberId: string, name: string) {
  return decide(state, { type: "member.join", commandId, atMs, teamId, memberId, name });
}

export function commandForActor(raw: { type: string; [key: string]: unknown }, id: string, atMs: number, actor: SocketAttachment): GameCommand | null {
  const teamId = actor.teamId;
  const memberId = actor.participantId;
  switch (raw.type) {
    case "team.ready": return actor.role === "player" && teamId ? { type: raw.type, commandId: id, atMs, teamId } : null;
    case "practice.start": return actor.role === "player" && teamId ? { type: raw.type, commandId: id, atMs, teamId } : null;
    case "duty.press": return actor.role === "player" && teamId && memberId && isWeekday(raw.weekday) ? { type: raw.type, commandId: id, atMs, teamId, memberId, weekday: raw.weekday } : null;
    case "challenge.start": return actor.role === "player" && teamId && memberId && isRange(raw.rangeId) && isLimit(raw.timeLimit) ? { type: raw.type, commandId: id, atMs, teamId, memberId, challengeId: crypto.randomUUID(), rangeId: raw.rangeId, timeLimit: raw.timeLimit, seed: crypto.getRandomValues(new Uint32Array(1))[0] } : null;
    case "challenge.answer": return actor.role === "player" && teamId && memberId && isWeekday(raw.weekday) ? { type: raw.type, commandId: id, atMs, teamId, memberId, challengeId: String(raw.challengeId || ""), weekday: raw.weekday } : null;
    case "host.pause": case "host.resume": case "host.end": return actor.role === "host" ? { type: raw.type, commandId: id, atMs } : null;
    default: return null;
  }
}

const isWeekday = (value: unknown): value is Weekday => WEEKDAYS.includes(value as Weekday);
const isRange = (value: unknown): value is RangeId => RANGE_IDS.includes(value as RangeId);
const isLimit = (value: unknown): value is TimeLimit => TIME_LIMITS.includes(value as TimeLimit);

export function applyGameCommand(state: GameState, command: GameCommand) { return decide(state, command); }
export function reconcileGame(state: GameState, now: number): GameEvent[] { return reconcileDeadlines(state, now, `alarm:${now}`); }
export function foldGame(state: GameState, events: readonly GameEvent[]): GameState { return foldEvents(state, events); }

export function nextDeadline(state: GameState, now: number, expiresAt: number): number | null {
  let next = expiresAt > 0 ? expiresAt : Number.POSITIVE_INFINITY;
  for (const team of Object.values(state.teams)) {
    if (team.phase === "countdown" && Number.isFinite(team.countdownEndsAtMs)) next = Math.min(next, team.countdownEndsAtMs!);
    if (team.phase === "running" && team.startedAtMs !== undefined) {
      const offset = team.pausedTotalMs;
      next = Math.min(next, team.startedAtMs + offset + (team.settledWindowId + 2) * 9000);
      for (const challenge of Object.values(team.challenges)) next = Math.min(next, team.startedAtMs + offset + challenge.deadlineActiveMs);
      next = Math.min(next, team.startedAtMs + offset + state.config.durationSeconds * 1000);
    }
  }
  return Number.isFinite(next) ? Math.max(now + 1, next) : null;
}

function civilDateAt(at: number, timezone: string): CivilDate {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "numeric", day: "numeric" }).formatToParts(new Date(at));
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return { year: value("year"), month: value("month"), day: value("day") };
}
