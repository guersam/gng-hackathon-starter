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
    "문제를 풀며 9초 리듬을 놓친 순간에 무엇이 주의를 가져갔나요?",
    "어떤 범위와 시간 선택 뒤에 위험 선택이 달라졌나요?",
    "실제 팀에 들어가기 전 어떤 신호나 도움 요청을 정하고 싶나요?",
  ] : [
    overlaps ? `도전 중 의무 누락이 겹친 장면이 ${overlaps}번 있었습니다. 그 순간 팀은 무엇을 알아차리고 조정했나요?` : "도전과 의무가 겹칠 때 팀은 어떤 신호로 서로의 상태를 확인했나요?",
    recoveries ? `마감 직전 정답이 ${recoveries}번 있었습니다. 그 회복을 가능하게 한 상호작용은 무엇이었나요?` : "시간 압박이 커졌을 때 팀의 선택은 어떻게 달라졌나요?",
    "도전 시도와 의무 누락의 분포를 보고, 다음 판에는 일을 어떻게 나누거나 다시 합치고 싶나요?",
  ];
  return { teamId, challengeMissOverlaps: overlaps, nearDeadlineRecoveries: recoveries, challengeAttemptsByMember: attempts, dutyMissesByMember: misses, prompts };
}
