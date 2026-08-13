import { describe, expect, it } from "vitest";
import { createInitialState, decide, foldEvents, projectLeaderboard, reconcileDeadlines, replay, type SessionConfig, WEEKDAYS } from "@experiential/game-yoil-genius/domain";

const config: SessionConfig = { kind: "team_simulation", runMode: "team", timezone: "Asia/Seoul", durationSeconds: 60, countdownSeconds: 5, referenceDate: { year: 2026, month: 8, day: 13 }, teams: [{ id: "a", label: "A", capacity: 3 }, { id: "b", label: "B", capacity: 4 }] };
function running() {
  let state = createInitialState(config); let at = 0;
  for (const id of ["u1", "u2", "u3"]) { const d = decide(state, { type: "member.join", commandId: `j${id}`, atMs: at++, teamId: "a", memberId: id, name: id }); if (!d.ok) throw Error(); state = foldEvents(state, d.events); }
  const ready = decide(state, { type: "team.ready", commandId: "ready", atMs: 10, teamId: "a" }); if (!ready.ok) throw Error(); state = foldEvents(state, ready.events);
  state = foldEvents(state, reconcileDeadlines(state, 5010)); return state;
}
describe("game engine", () => {
  it("settles every completed 9-second window once and permits negative credit", () => {
    const state = running(); const events = reconcileDeadlines(state, 23_010); // two complete windows
    expect(events.filter(e => e.type === "duty.window_settled")).toHaveLength(2);
    const after = foldEvents(state, events); expect(after.teams.a.scoreUnits).toBe(-6 * 420); expect(reconcileDeadlines(after, 23_010)).toHaveLength(0);
  });
  it("cycles Monday through Sunday and allows a 500ms arrival grace", () => {
    let state = running();
    for (let w = 0; w < 7; w++) { const d = decide(state, { type: "duty.press", commandId: `p${w}`, atMs: 5610 + w * 9000, teamId: "a", memberId: "u1", weekday: WEEKDAYS[w] }); if (!d.ok) throw Error(d.error.code); state = foldEvents(state, d.events); }
    expect(Object.keys(state.teams.a.presses)).toHaveLength(7);
  });
  it("is command-idempotent and replay deterministic", () => {
    const state = running(); const command = { type: "duty.press", commandId: "same", atMs: 6000, teamId: "a", memberId: "u1", weekday: "monday" } as const;
    const first = decide(state, command); if (!first.ok) throw Error(); const next = foldEvents(state, first.events);
    expect(decide(next, command)).toEqual({ ok: true, events: [] });
    expect(replay(config, [...first.events]).eventCount).toBe(first.events.length);
  });
  it("expires an answer at the exact deadline and charges failure", () => {
    let state = running(); const start = decide(state, { type: "challenge.start", commandId: "c1", atMs: 6000, teamId: "a", memberId: "u1", challengeId: "q", rangeId: "this_week", timeLimit: 3, seed: 7 }); if (!start.ok) throw Error(); state = foldEvents(state, start.events);
    const answer = decide(state, { type: "challenge.answer", commandId: "a1", atMs: 9000, teamId: "a", memberId: "u1", challengeId: "q", weekday: "monday" });
    expect(answer.ok && answer.events.some(e => e.type === "challenge.resolved" && e.outcome === "expired")).toBe(true);
  });
  it("shares ranks on normalized score", () => {
    const state = running(); state.teams.a.scoreUnits = 1260; state.teams.a.rosterSize = 3; state.teams.b.scoreUnits = 1680; state.teams.b.rosterSize = 4;
    expect(projectLeaderboard(state).map(r => r.rank)).toEqual([1, 1]);
  });
  it("holds cohort-ready teams without non-finite deadlines", () => {
    const cohort: SessionConfig = { ...config, runMode: "cohort", teams: [{ id: "a", label: "A", capacity: 3 }, { id: "b", label: "B", capacity: 3 }] };
    let state = createInitialState(cohort);
    for (const teamId of ["a", "b"]) for (let n = 1; n <= 3; n++) { const d = decide(state, { type: "member.join", commandId: `j${teamId}${n}`, atMs: n, teamId, memberId: `${teamId}${n}`, name: `${teamId}${n}` }); if (!d.ok) throw Error(); state = foldEvents(state, d.events); }
    const first = decide(state, { type: "team.ready", commandId: "ra", atMs: 10, teamId: "a" }); if (!first.ok) throw Error(); state = foldEvents(state, first.events);
    expect(state.teams.a.phase).toBe("ready"); expect(state.teams.a.countdownEndsAtMs).toBeUndefined();
    const final = decide(state, { type: "team.ready", commandId: "rb", atMs: 20, teamId: "b" }); if (!final.ok) throw Error(); state = foldEvents(state, final.events);
    expect(Object.values(state.teams).every(t => t.phase === "countdown" && t.countdownEndsAtMs === 5020)).toBe(true);
  });
  it("keeps solo practice isolated, fixed to one player and unranked", () => {
    const solo: SessionConfig = { kind: "solo_practice", runMode: "team", timezone: "Asia/Seoul", durationSeconds: 120, countdownSeconds: 5, referenceDate: { year: 2026, month: 8, day: 13 }, teams: [{ id: "solo", label: "나", capacity: 1 }] };
    let state = createInitialState(solo);
    const joined = decide(state, { type: "member.join", commandId: "solo-join", atMs: 0, teamId: "solo", memberId: "me", name: "나" });
    if (!joined.ok) throw Error(joined.error.code);
    state = foldEvents(state, joined.events);
    const started = decide(state, { type: "practice.start", commandId: "solo-start", atMs: 1, teamId: "solo" });
    expect(started.ok).toBe(true);
    expect(projectLeaderboard(state)).toEqual([]);
    expect(decide(state, { type: "team.ready", commandId: "wrong-start", atMs: 1, teamId: "solo" })).toMatchObject({ ok: false, error: { code: "command_not_allowed" } });
  });
});
