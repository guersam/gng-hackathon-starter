export const SCORE_UNITS_PER_CREDIT = 420 as const;
export const WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export const RANGE_IDS = ["this_week", "this_month", "this_year", "recent_3_years", "recent_10_years", "recent_100_years", "recent_1000_years"] as const;
export type RangeId = (typeof RANGE_IDS)[number];
export const TIME_LIMITS = [3, 6, 9, 12, 15, 18, 21] as const;
export type TimeLimit = (typeof TIME_LIMITS)[number];

export interface CivilDate { year: number; month: number; day: number }
export type ScoreUnits = number;
export type RunMode = "team" | "cohort";
export type SessionKind = "team_simulation" | "solo_practice";
export type TeamPhase = "lobby" | "ready" | "countdown" | "running" | "paused" | "finished";

export interface TeamConfig { id: string; label: string; capacity: 1 | 3 | 4 | 5 }
interface SessionConfigBase {
  timezone: string;
  countdownSeconds: number;
  referenceDate: CivilDate;
  teams: TeamConfig[];
}
export type SessionConfig =
  | (SessionConfigBase & { kind: "team_simulation"; runMode: RunMode; durationSeconds: number })
  | (SessionConfigBase & { kind: "solo_practice"; runMode: "team"; durationSeconds: 120; teams: [TeamConfig] });

export interface MemberState { id: string; name: string; joinedAtMs: number }
export interface ChallengeState {
  id: string; memberId: string; rangeId: RangeId; timeLimit: TimeLimit;
  date: CivilDate; expected: Weekday; startedAtActiveMs: number; deadlineActiveMs: number;
}
export interface TeamState {
  id: string; phase: TeamPhase; members: Record<string, MemberState>; rosterSize?: number;
  readyAtMs?: number; countdownEndsAtMs?: number; startedAtMs?: number; finishedAtMs?: number;
  pausedAtMs?: number; pausedTotalMs: number; scoreUnits: ScoreUnits;
  settledWindowId: number; presses: Record<number, string[]>; challenges: Record<string, ChallengeState>;
}
export interface GameState { config: SessionConfig; teams: Record<string, TeamState>; appliedCommandIds: string[]; eventCount: number }

export type GameCommand =
  | { type: "member.join"; commandId: string; atMs: number; teamId: string; memberId: string; name: string }
  | { type: "team.ready"; commandId: string; atMs: number; teamId: string }
  | { type: "practice.start"; commandId: string; atMs: number; teamId: string }
  | { type: "duty.press"; commandId: string; atMs: number; teamId: string; memberId: string; weekday: Weekday }
  | { type: "challenge.start"; commandId: string; atMs: number; teamId: string; memberId: string; challengeId: string; rangeId: RangeId; timeLimit: TimeLimit; seed: number }
  | { type: "challenge.answer"; commandId: string; atMs: number; teamId: string; memberId: string; challengeId: string; weekday: Weekday }
  | { type: "host.pause"; commandId: string; atMs: number }
  | { type: "host.resume"; commandId: string; atMs: number }
  | { type: "host.end"; commandId: string; atMs: number };

interface EventBase { schemaVersion: 1; atMs: number; commandId?: string }
export type GameEvent = EventBase & (
  | { type: "member.joined"; teamId: string; member: MemberState }
  | { type: "team.ready_declared"; teamId: string; rosterSize: number }
  | { type: "team.countdown_started"; teamId: string; endsAtMs: number; rosterSize: number }
  | { type: "team.started"; teamId: string; startedAtMs: number }
  | { type: "duty.pressed"; teamId: string; memberId: string; windowId: number; weekday: Weekday }
  | { type: "duty.window_settled"; teamId: string; windowId: number; missedMemberIds: string[]; deltaUnits: number }
  | { type: "challenge.started"; teamId: string; challenge: ChallengeState }
  | { type: "challenge.resolved"; teamId: string; challengeId: string; memberId: string; outcome: "correct" | "wrong" | "expired"; deltaUnits: number; resolvedAtActiveMs: number; answered?: Weekday }
  | { type: "team.paused"; teamId: string }
  | { type: "team.resumed"; teamId: string; pausedForMs: number }
  | { type: "team.finished"; teamId: string }
);

export interface DomainError { code: string; message: string }
export type Decision = { ok: true; events: GameEvent[] } | { ok: false; error: DomainError };
