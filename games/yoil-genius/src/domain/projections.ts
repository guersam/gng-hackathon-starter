import { GameEvent, GameState, SCORE_UNITS_PER_CREDIT } from "./types";

export interface LeaderboardRow { teamId: string; label: string; rawUnits: number; rawCredits: number; rosterSize: number; unitsPerMember: number; rank: number }
export function projectLeaderboard(state: GameState): LeaderboardRow[] {
  if (state.config.kind === "solo_practice") return [];
  const rows = Object.values(state.teams).map(team => {
    const rosterSize = team.rosterSize ?? Object.keys(team.members).length;
    return { teamId: team.id, label: state.config.teams.find(t => t.id === team.id)!.label, rawUnits: team.scoreUnits, rawCredits: team.scoreUnits / SCORE_UNITS_PER_CREDIT, rosterSize, unitsPerMember: rosterSize ? team.scoreUnits / rosterSize : Number.NEGATIVE_INFINITY, rank: 0 };
  }).sort((a, b) => b.unitsPerMember - a.unitsPerMember || b.rawUnits - a.rawUnits || a.teamId.localeCompare(b.teamId));
  let prior: number | undefined;
  let rank = 0;
  return rows.map((row, index) => { if (row.unitsPerMember !== prior) rank = index + 1; prior = row.unitsPerMember; return { ...row, rank }; });
}

export interface DebriefEvidence {
  teamId: string; challengeMissOverlaps: number; nearDeadlineRecoveries: number;
  challengeAttemptsByMember: Record<string, number>; dutyMissesByMember: Record<string, number>;
  prompts: string[];
}
export function projectDebrief(events: readonly GameEvent[], teamId: string, kind: GameState["config"]["kind"] = "team_simulation"): DebriefEvidence {
  const relevant = events.filter(e => "teamId" in e && e.teamId === teamId);
  const attempts: Record<string, number> = {}; const misses: Record<string, number> = {};
  const active = new Map<string, { memberId: string; deadline: number; startedAt: number }>();
  let overlaps = 0; let recoveries = 0;
  for (const event of relevant) {
    if (event.type === "challenge.started") { attempts[event.challenge.memberId] = (attempts[event.challenge.memberId] ?? 0) + 1; active.set(event.challenge.id, { memberId: event.challenge.memberId, deadline: event.challenge.deadlineActiveMs, startedAt: event.challenge.startedAtActiveMs }); }
    if (event.type === "duty.window_settled") {
      for (const id of event.missedMemberIds) misses[id] = (misses[id] ?? 0) + 1;
      if (event.missedMemberIds.some(id => [...active.values()].some(c => c.memberId === id))) overlaps++;
    }
    if (event.type === "challenge.resolved") {
      const challenge = active.get(event.challengeId);
      if (challenge && event.outcome === "correct" && event.resolvedAtActiveMs >= challenge.deadline - 1000) recoveries++;
      active.delete(event.challengeId);
    }
  }
  const prompts = kind === "solo_practice" ? [
    "날짜 문제를 푸는 동안 9초 버튼을 놓쳤다면, 무엇에 신경을 쓰고 있었나요?",
    "날짜 범위와 제한 시간을 고르는 방식이 언제 달라졌나요?",
    "팀 게임을 하기 전에 어떤 신호를 정해 두면 좋을까요?",
  ] : [
    overlaps ? "날짜 문제를 풀다가 9초 버튼을 놓친 때가 " + overlaps + "번 있었습니다. 그때 팀은 어떻게 대응했나요?" : "날짜 문제와 9초 버튼이 겹쳤을 때 서로 어떻게 알렸나요?",
    recoveries ? "제한 시간이 1초도 남지 않았을 때 맞힌 문제가 " + recoveries + "번 있었습니다. 무엇이 도움이 됐나요?" : "시간이 부족해졌을 때 문제를 고르는 방식이 어떻게 달라졌나요?",
    "누가 문제를 많이 풀었고 누가 9초 버튼을 자주 놓쳤나요? 다음 판에는 일을 어떻게 나눌까요?",
  ];
  return { teamId, challengeMissOverlaps: overlaps, nearDeadlineRecoveries: recoveries, challengeAttemptsByMember: attempts, dutyMissesByMember: misses, prompts };
}
