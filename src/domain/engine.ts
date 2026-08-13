import { weekdayOf } from "./date";
import { sampleDate } from "./random";
import { failureUnits, rewardUnits } from "./scoring";
import { activeElapsedMs, foldEvents } from "./state";
import { Decision, GameCommand, GameEvent, GameState, TeamState, WEEKDAYS, SCORE_UNITS_PER_CREDIT } from "./types";

const err = (code: string, message: string): Decision => ({ ok: false, error: { code, message } });
const base = (atMs: number, commandId?: string) => ({ schemaVersion: 1 as const, atMs, ...(commandId ? { commandId } : {}) });

function reconcileTeam(state: GameState, team: TeamState, atMs: number, commandId?: string): GameEvent[] {
  const events: GameEvent[] = [];
  let current = team;
  if (current.phase === "countdown" && current.countdownEndsAtMs! <= atMs) {
    const event: GameEvent = { ...base(atMs, commandId), type: "team.started", teamId: team.id, startedAtMs: current.countdownEndsAtMs! };
    events.push(event); current = foldEvents(state, events).teams[team.id];
  }
  if (current.phase !== "running") return events;
  const active = activeElapsedMs(current, atMs);
  const capped = Math.min(active, state.config.durationSeconds * 1000);
  const lastComplete = Math.floor(capped / 9000) - 1;
  for (let windowId = current.settledWindowId + 1; windowId <= lastComplete; windowId++) {
    const pressed = new Set(current.presses[windowId] ?? []);
    const missed = Object.keys(current.members).filter(id => !pressed.has(id));
    events.push({ ...base(atMs, commandId), type: "duty.window_settled", teamId: team.id, windowId, missedMemberIds: missed, deltaUnits: -missed.length * SCORE_UNITS_PER_CREDIT });
  }
  for (const challenge of Object.values(current.challenges)) {
    if (challenge.deadlineActiveMs <= active) events.push({ ...base(atMs, commandId), type: "challenge.resolved", teamId: team.id, challengeId: challenge.id, memberId: challenge.memberId, outcome: "expired", deltaUnits: failureUnits(challenge.rangeId, challenge.timeLimit), resolvedAtActiveMs: challenge.deadlineActiveMs });
  }
  if (active >= state.config.durationSeconds * 1000) events.push({ ...base(atMs, commandId), type: "team.finished", teamId: team.id });
  return events;
}

export function reconcileDeadlines(state: GameState, atMs: number, commandId?: string): GameEvent[] {
  const events: GameEvent[] = [];
  let current = state;
  for (const team of Object.values(state.teams)) {
    const next = reconcileTeam(current, current.teams[team.id], atMs, commandId);
    events.push(...next); current = foldEvents(current, next);
  }
  return events;
}

export function decide(input: GameState, command: GameCommand): Decision {
  if (input.appliedCommandIds.includes(command.commandId)) return { ok: true, events: [] };
  // Duty presses receive a narrow transport grace; all other commands reconcile at server arrival.
  const reconcileAt = command.type === "duty.press" ? Math.max(0, command.atMs - 500) : command.atMs;
  const due = reconcileDeadlines(input, reconcileAt, command.commandId);
  const state = foldEvents(input, due);
  const team = "teamId" in command ? state.teams[command.teamId] : undefined;
  if ("teamId" in command && !team) return err("team_not_found", "Team does not exist");
  const done = (event?: GameEvent): Decision => ({ ok: true, events: event ? [...due, event] : due });

  switch (command.type) {
    case "member.join": {
      if (team!.phase !== "lobby") return err("join_closed", "The roster is locked");
      if (team!.members[command.memberId]) return done();
      const config = state.config.teams.find(t => t.id === command.teamId)!;
      if (Object.keys(team!.members).length >= config.capacity) return err("team_full", "The team is full");
      if (!command.name.trim()) return err("name_required", "Name is required");
      return done({ ...base(command.atMs, command.commandId), type: "member.joined", teamId: command.teamId, member: { id: command.memberId, name: command.name.trim(), joinedAtMs: command.atMs } });
    }
    case "team.ready":
    case "practice.start": {
      if (command.type === "team.ready" && state.config.kind !== "team_simulation") return err("command_not_allowed", "Team readiness is only available in simulations");
      if (command.type === "practice.start" && state.config.kind !== "solo_practice") return err("command_not_allowed", "Practice start is only available in solo practice");
      if (team!.phase !== "lobby") return err("already_ready", "The team already left the lobby");
      const capacity = state.config.teams.find(t => t.id === command.teamId)!.capacity;
      if (Object.keys(team!.members).length !== capacity) return err("roster_incomplete", "Every seat must be filled");
      if (state.config.runMode === "cohort" && !Object.values(state.teams).every(t => t.id === command.teamId || t.phase === "ready")) {
        return done({ ...base(command.atMs, command.commandId), type: "team.ready_declared", teamId: command.teamId, rosterSize: capacity });
      }
      const targets = state.config.runMode === "team" ? [team!] : Object.values(state.teams);
      const events = targets.map(t => ({ ...base(command.atMs, command.commandId), type: "team.countdown_started" as const, teamId: t.id, endsAtMs: command.atMs + state.config.countdownSeconds * 1000, rosterSize: Object.keys(t.members).length }));
      return { ok: true, events: [...due, ...events] };
    }
    case "duty.press": {
      if (team!.phase !== "running") return err("not_running", "Team is not running");
      if (!team!.members[command.memberId]) return err("member_not_found", "Member is not on this team");
      const windowId = Math.floor(activeElapsedMs(team!, reconcileAt) / 9000);
      const expected = WEEKDAYS[windowId % 7];
      if (command.weekday !== expected) return err("wrong_weekday", "That is not the current weekday");
      if ((team!.presses[windowId] ?? []).includes(command.memberId)) return err("duplicate_press", "Duty already completed for this window");
      return done({ ...base(command.atMs, command.commandId), type: "duty.pressed", teamId: command.teamId, memberId: command.memberId, windowId, weekday: command.weekday });
    }
    case "challenge.start": {
      if (team!.phase !== "running") return err("not_running", "Team is not running");
      if (!team!.members[command.memberId]) return err("member_not_found", "Member is not on this team");
      if (team!.challenges[command.memberId]) return err("challenge_active", "Member already has a challenge");
      const active = activeElapsedMs(team!, command.atMs);
      const deadline = active + command.timeLimit * 1000;
      if (deadline > state.config.durationSeconds * 1000) return err("insufficient_time", "Not enough game time remains");
      const date = sampleDate(command.rangeId, state.config.referenceDate, command.seed);
      const challenge = { id: command.challengeId, memberId: command.memberId, rangeId: command.rangeId, timeLimit: command.timeLimit, date, expected: weekdayOf(date), startedAtActiveMs: active, deadlineActiveMs: deadline };
      return done({ ...base(command.atMs, command.commandId), type: "challenge.started", teamId: command.teamId, challenge });
    }
    case "challenge.answer": {
      const challenge = team!.challenges[command.memberId];
      if (!challenge || challenge.id !== command.challengeId) {
        const wasExpiredNow = input.teams[command.teamId]?.challenges[command.memberId]?.id === command.challengeId && due.some(event => event.type === "challenge.resolved" && event.challengeId === command.challengeId);
        return wasExpiredNow ? done() : err("challenge_not_found", "Challenge is not active");
      }
      const correct = challenge.expected === command.weekday;
      return done({ ...base(command.atMs, command.commandId), type: "challenge.resolved", teamId: command.teamId, challengeId: challenge.id, memberId: command.memberId, outcome: correct ? "correct" : "wrong", answered: command.weekday, deltaUnits: correct ? rewardUnits(challenge.rangeId, challenge.timeLimit) : failureUnits(challenge.rangeId, challenge.timeLimit), resolvedAtActiveMs: activeElapsedMs(team!, command.atMs) });
    }
    case "host.pause": {
      const events = Object.values(state.teams).filter(t => t.phase === "running").map(t => ({ ...base(command.atMs, command.commandId), type: "team.paused" as const, teamId: t.id }));
      return { ok: true, events: [...due, ...events] };
    }
    case "host.resume": {
      const events = Object.values(state.teams).filter(t => t.phase === "paused").map(t => ({ ...base(command.atMs, command.commandId), type: "team.resumed" as const, teamId: t.id, pausedForMs: command.atMs - t.pausedAtMs! }));
      return { ok: true, events: [...due, ...events] };
    }
    case "host.end": {
      const events = Object.values(state.teams).filter(t => t.phase !== "finished").map(t => ({ ...base(command.atMs, command.commandId), type: "team.finished" as const, teamId: t.id }));
      return { ok: true, events: [...due, ...events] };
    }
  }
}
