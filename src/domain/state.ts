import { GameEvent, GameState, SessionConfig, TeamState } from "./types";
import { validateSessionConfig } from "./config";

export function createInitialState(config: SessionConfig): GameState {
  const errors = validateSessionConfig(config);
  if (errors.length) throw new Error(errors.map(e => e.message).join("; "));
  const teams: Record<string, TeamState> = {};
  for (const team of config.teams) teams[team.id] = { id: team.id, phase: "lobby", members: {}, pausedTotalMs: 0, scoreUnits: 0, settledWindowId: -1, presses: {}, challenges: {} };
  return { config, teams, appliedCommandIds: [], eventCount: 0 };
}

export function foldEvent(state: GameState, event: GameEvent): GameState {
  const next: GameState = { ...state, teams: { ...state.teams }, appliedCommandIds: event.commandId && !state.appliedCommandIds.includes(event.commandId) ? [...state.appliedCommandIds, event.commandId] : state.appliedCommandIds, eventCount: state.eventCount + 1 };
  const teamId = "teamId" in event ? event.teamId : undefined;
  if (!teamId) return next;
  const team: TeamState = { ...state.teams[teamId], members: { ...state.teams[teamId].members }, presses: { ...state.teams[teamId].presses }, challenges: { ...state.teams[teamId].challenges } };
  next.teams[teamId] = team;
  switch (event.type) {
    case "member.joined": team.members[event.member.id] = event.member; break;
    case "team.ready_declared": team.phase = "ready"; team.readyAtMs = event.atMs; team.rosterSize = event.rosterSize; break;
    case "team.countdown_started": team.phase = "countdown"; team.readyAtMs = event.atMs; team.countdownEndsAtMs = event.endsAtMs; team.rosterSize = event.rosterSize; break;
    case "team.started": team.phase = "running"; team.startedAtMs = event.startedAtMs; break;
    case "duty.pressed": team.presses[event.windowId] = [...(team.presses[event.windowId] ?? []), event.memberId]; break;
    case "duty.window_settled": team.settledWindowId = event.windowId; team.scoreUnits += event.deltaUnits; break;
    case "challenge.started": team.challenges[event.challenge.memberId] = event.challenge; break;
    case "challenge.resolved": delete team.challenges[event.memberId]; team.scoreUnits += event.deltaUnits; break;
    case "team.paused": team.phase = "paused"; team.pausedAtMs = event.atMs; break;
    case "team.resumed": team.phase = "running"; team.pausedTotalMs += event.pausedForMs; team.pausedAtMs = undefined; break;
    case "team.finished": team.phase = "finished"; team.finishedAtMs = event.atMs; break;
  }
  return next;
}
export function foldEvents(state: GameState, events: readonly GameEvent[]): GameState { return events.reduce(foldEvent, state); }
export function replay(config: SessionConfig, events: readonly GameEvent[]): GameState { return foldEvents(createInitialState(config), events); }

export function activeElapsedMs(team: TeamState, atMs: number): number {
  if (team.startedAtMs === undefined) return 0;
  const end = team.phase === "paused" ? team.pausedAtMs! : team.finishedAtMs ?? atMs;
  return Math.max(0, end - team.startedAtMs - team.pausedTotalMs);
}
