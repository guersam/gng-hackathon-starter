// 역할 배분과 목표 생성. seed만 있으면 모든 클라이언트가 같은 결과를 얻는 결정적 함수.
//
// 불변 제약 (docs/PLAN.md):
//   reads ∩ writes = ∅        내 행동의 결과를 나는 볼 수 없다
//   goalAxes ∩ writes = ∅     내가 아는 목표는 내가 못 바꾼다
//   모든 축에 writer/reader/goal-holder가 최소 1명씩
// → 축 하나를 맞추려면 최소 3명이 사슬을 이룬다.

import { AXES, type AxisId, type Goal, type Level, type Player } from './types'

/** mulberry32 — 작고 결정적인 PRNG */
export function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a += 0x6d2b79f5
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export interface Assignment {
  reads: Record<string, AxisId[]>
  writes: Record<string, AxisId[]>
  goals: Record<string, Goal[]>
  target: Record<AxisId, Level>
  start: Record<AxisId, Level>
  metaphorIds: Record<string, string>
  practiceAxis: AxisId
}

/**
 * writes를 먼저 깔고(모든 축이 최소 1명의 writer를 갖도록), 그 보수집합에서 reads를 뽑는다.
 * 그 다음 goal은 writes와 겹치지 않는 축에서만 배분한다.
 */
export function assign(
  playerIds: string[],
  seed: number,
  metaphorPool: string[],
): Assignment {
  const rand = rng(seed)
  const n = playerIds.length

  // --- writes: 플레이어마다 서로 다른 축 2개. 4축을 2개씩 짝지은 3가지 분할 중 하나를 준다.
  //     (AB|CD, AC|BD, AD|BC) — 어떤 분할을 쓰든 writes는 항상 크기 2의 서로소 집합이고,
  //     reads는 그 여집합이므로 reads ∩ writes = ∅ 과 |reads| = 2 가 구조적으로 보장된다.
  const SPLITS: [AxisId, AxisId][][] = [
    [['A', 'B'], ['C', 'D']],
    [['A', 'C'], ['B', 'D']],
    [['A', 'D'], ['B', 'C']],
  ]
  const writes: Record<string, AxisId[]> = {}
  const halves = shuffle(SPLITS, rand).flat()
  for (let i = 0; i < n; i++) {
    writes[playerIds[i]] = [...halves[i % halves.length]]
  }

  // 커버리지 보정: writer가 없는 축이 있으면, 여유 있는 사람의 write 한 칸을 바꿔 심는다.
  // 짝을 통째로 갈아끼워 두 축이 겹치지 않게 유지한다.
  for (const ax of AXES) {
    if (playerIds.some((p) => writes[p].includes(ax))) continue
    const victim = playerIds[Math.floor(rand() * n)]
    const keep = writes[victim].find((a) => a !== ax) ?? AXES.find((a) => a !== ax)!
    writes[victim] = [keep, ax]
  }

  // --- reads: 정확히 writes의 여집합. 내 행동의 결과는 절대 내가 못 본다.
  const reads: Record<string, AxisId[]> = {}
  for (const pid of playerIds) {
    reads[pid] = AXES.filter((a) => !writes[pid].includes(a))
  }

  // --- 목표 상태 / 시작 상태
  const target = {} as Record<AxisId, Level>
  const start = {} as Record<AxisId, Level>
  for (const ax of AXES) {
    target[ax] = Math.floor(rand() * 5) as Level
    // 시작값은 목표에서 2~3칸 떨어뜨린다. 우연히 맞아 있으면 재미가 없다.
    const away = rand() < 0.5 ? -1 : 1
    let s = target[ax] + away * (2 + Math.floor(rand() * 2))
    if (s < 0) s = target[ax] + 2
    if (s > 4) s = target[ax] - 2
    start[ax] = Math.max(0, Math.min(4, s)) as Level
  }

  // --- goals: 축마다 goal-holder를 1명 이상. writes와 겹치지 않게.
  const goals: Record<string, Goal[]> = {}
  for (const pid of playerIds) goals[pid] = []

  for (const ax of AXES) {
    const cands = playerIds.filter((p) => !writes[p].includes(ax))
    const pool = cands.length ? cands : playerIds
    // 목표를 적게 가진 사람부터
    const sorted = [...pool].sort((x, y) => goals[x].length - goals[y].length)
    const holder = sorted[0]
    goals[holder].push({ kind: 'level', axis: ax, target: target[ax] })
  }

  // 인원이 많으면 남는 사람에게 관계형 목표를 준다 — 두 축을 동시에 말하게 만든다
  for (const pid of playerIds) {
    if (goals[pid].length > 0) continue
    const free = AXES.filter((a) => !writes[pid].includes(a))
    const [a, b] = shuffle(free, rand).slice(0, 2)
    if (!a || !b) {
      goals[pid].push({ kind: 'level', axis: AXES[0], target: target[AXES[0]] })
      continue
    }
    const cmp =
      target[a] > target[b] ? 'gt' : target[a] < target[b] ? 'lt' : 'eq'
    goals[pid].push({ kind: 'relation', a, b, cmp })
  }

  // --- 은유: 전원 서로 다르게
  const pool = shuffle(metaphorPool, rand)
  const metaphorIds: Record<string, string> = {}
  playerIds.forEach((pid, i) => {
    metaphorIds[pid] = pool[i % pool.length]
  })

  return {
    reads,
    writes,
    goals,
    target,
    start,
    metaphorIds,
    practiceAxis: AXES[Math.floor(rand() * 4)],
  }
}

/** 라운드 종료 시 손대지 않은 축의 드리프트. 결정적. */
export function driftFor(
  seed: number,
  round: number,
  axis: AxisId,
  from: Level,
): Level {
  const rand = rng(seed + round * 7919 + AXES.indexOf(axis) * 104729)
  const dir = rand() < 0.5 ? -1 : 1
  let to = from + dir
  if (to < 0) to = 1
  if (to > 4) to = 3
  return to as Level
}

export function buildPlayer(
  id: string,
  name: string,
  joinedAt: number,
  a: Assignment,
): Player {
  return {
    id,
    name,
    metaphorId: a.metaphorIds[id],
    reads: a.reads[id],
    writes: a.writes[id],
    joinedAt,
  }
}
