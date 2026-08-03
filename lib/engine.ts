// 이벤트 로그 → 상태. 서버와 클라이언트가 같은 함수를 쓴다.

import {
  AXES,
  MAX_ROUNDS,
  ROUND_MS,
  SHARED_METAPHOR_FROM_ROUND,
  TOKEN_CAP,
  type AxisId,
  type CleanQ,
  type GameEvent,
  type GameState,
  type Goal,
  type Level,
  type Loop,
  type Player,
  type PlayerView,
  type PublicGameState,
} from './types'
import { assign, buildPlayer, driftFor } from './setup'

export function emptyState(code: string): GameState {
  return {
    code,
    phase: 'lobby',
    seed: 0,
    players: [],
    goals: {},
    dials: { A: 2, B: 2, C: 2, D: 2 },
    startDials: { A: 2, B: 2, C: 2, D: 2 },
    target: { A: 2, B: 2, C: 2, D: 2 },
    tokens: {},
    loops: [],
    round: 0,
    roundEndsAt: null,
    touchedThisRound: [],
    onboarded: [],
    sharedMetaphorId: null,
    proposal: null,
    lastMatched: null,
    won: false,
    finished: false,
    practiceAxis: null,
  }
}

export function foldEvents(
  code: string,
  events: GameEvent[],
  metaphorPool: string[],
): GameState {
  const s = emptyState(code)
  const joins: { id: string; name: string; t: number }[] = []

  for (const e of events) {
    switch (e.type) {
      case 'join': {
        if (joins.some((j) => j.id === e.playerId)) break
        joins.push({ id: e.playerId, name: e.name, t: e.t })
        s.tokens[e.playerId] = 0
        break
      }

      case 'start': {
        s.seed = e.seed
        const ids = e.order.filter((id) => joins.some((j) => j.id === id))
        const a = assign(ids, e.seed, metaphorPool)
        s.players = ids.map((id) => {
          const j = joins.find((x) => x.id === id)!
          return buildPlayer(id, j.name, j.t, a)
        })
        s.goals = a.goals
        s.target = a.target
        s.dials = { ...a.start }
        s.startDials = { ...a.start }
        s.practiceAxis = a.practiceAxis
        s.phase = 'onboarding'
        break
      }

      case 'onboardDone': {
        if (!s.onboarded.includes(e.playerId)) s.onboarded.push(e.playerId)
        if (
          s.phase === 'onboarding' &&
          s.players.length > 0 &&
          s.players.every((p) => s.onboarded.includes(p.id))
        ) {
          s.phase = 'practice'
        }
        break
      }

      case 'practiceDone': {
        s.phase = 'interstitial'
        s.loops = []
        for (const id of Object.keys(s.tokens)) s.tokens[id] = 0
        break
      }

      case 'roundStart': {
        // 연습에서 돌려본 것은 본 게임에 반영되지 않는다. 연습은 진짜 연습이어야 한다.
        if (e.round === 1) s.dials = { ...s.startDials }
        s.round = e.round
        s.roundEndsAt = e.endsAt
        s.phase = 'round'
        s.touchedThisRound = []
        s.loops = []
        break
      }

      case 'ask': {
        s.loops.push({
          id: e.loopId,
          askerId: e.askerId,
          responderId: e.responderId,
          q: e.q,
          subject: e.subject,
          subject2: e.subject2,
          stage: 'asked',
          attempts: 1,
          startedAt: e.t,
        })
        break
      }

      case 'answer': {
        const l = s.loops.find((x) => x.id === e.loopId)
        if (l) l.stage = 'answered'
        break
      }

      case 'playback': {
        const l = s.loops.find((x) => x.id === e.loopId)
        if (l) l.stage = 'playedback'
        break
      }

      case 'confirm': {
        const i = s.loops.findIndex((x) => x.id === e.loopId)
        if (i < 0) break
        const l = s.loops[i]
        if (e.ok) {
          // 닫힌 루프 완주 — 양쪽 모두 토큰을 얻는다. 답해주는 것도 팀 행동이다.
          for (const id of [l.askerId, l.responderId]) {
            s.tokens[id] = Math.min(TOKEN_CAP, (s.tokens[id] ?? 0) + 1)
          }
          s.loops.splice(i, 1)
        } else {
          // 아직 안 맞았다. 루프는 열린 채 되돌려 말하기로 되돌아간다.
          l.stage = 'answered'
          l.attempts += 1
        }
        break
      }

      case 'cancelLoop': {
        s.loops = s.loops.filter((x) => x.id !== e.loopId)
        break
      }

      case 'turn': {
        const cur = s.dials[e.axis]
        const next = Math.max(0, Math.min(4, cur + e.dir)) as Level
        s.dials[e.axis] = next
        s.tokens[e.playerId] = Math.max(0, (s.tokens[e.playerId] ?? 0) - 1)
        if (!s.touchedThisRound.includes(e.axis)) s.touchedThisRound.push(e.axis)
        break
      }

      case 'proposeMetaphor': {
        s.proposal = { metaphorId: e.metaphorId, by: e.playerId, agreed: [e.playerId] }
        break
      }

      case 'agreeMetaphor': {
        if (s.proposal && !s.proposal.agreed.includes(e.playerId)) {
          s.proposal.agreed.push(e.playerId)
        }
        break
      }

      case 'declareMetaphor': {
        s.sharedMetaphorId = e.metaphorId
        s.proposal = null
        // 공용 언어의 값: 그 순간 모두의 토큰이 사라진다.
        for (const id of Object.keys(s.tokens)) s.tokens[id] = 0
        break
      }

      case 'drift': {
        s.dials[e.axis] = e.to
        break
      }

      case 'roundEnd': {
        s.lastMatched = e.matched
        s.phase = 'interstitial'
        s.roundEndsAt = null
        s.loops = []
        for (const id of Object.keys(s.tokens)) s.tokens[id] = 0
        break
      }

      case 'finish': {
        s.finished = true
        s.won = e.won
        s.phase = 'debrief'
        s.roundEndsAt = null
        break
      }
    }
  }

  // 아직 시작 전이면 로비 명단을 보여준다
  if (s.phase === 'lobby') {
    s.players = joins.map((j) => ({
      id: j.id,
      name: j.name,
      metaphorId: '',
      reads: [],
      writes: [],
      joinedAt: j.t,
    }))
  }

  return s
}

// ---------------------------------------------------------------- 판정

export function matchedCount(
  dials: Record<AxisId, Level>,
  target: Record<AxisId, Level>,
): number {
  return AXES.filter((a) => dials[a] === target[a]).length
}

export function goalSatisfied(g: Goal, dials: Record<AxisId, Level>): boolean {
  if (g.kind === 'level') return dials[g.axis] === g.target
  const a = dials[g.a]
  const b = dials[g.b]
  return g.cmp === 'gt' ? a > b : g.cmp === 'lt' ? a < b : a === b
}

// ---------------------------------------------------------------- 뷰

export function viewFor(s: GameState, playerId: string): PlayerView {
  const me = s.players.find((p) => p.id === playerId) ?? null
  const visible: Partial<Record<AxisId, Level>> = {}
  if (me) for (const ax of me.reads) visible[ax] = s.dials[ax]

  const myLoop = s.loops.find((l) => l.askerId === playerId) ?? null
  const incomingLoop = s.loops.find((l) => l.responderId === playerId) ?? null

  // 이미 열린 루프에 응답자로 묶여 있는 사람에겐 물을 수 없다. 여기서 줄이 선다.
  const busy = new Set(s.loops.map((l) => l.responderId))
  const askableIds = s.players
    .filter((p) => p.id !== playerId && !busy.has(p.id))
    .map((p) => p.id)

  return {
    me,
    myGoals: s.goals[playerId] ?? [],
    myTokens: s.tokens[playerId] ?? 0,
    visible,
    myLoop,
    incomingLoop,
    askableIds: myLoop ? [] : askableIds,
  }
}

/**
 * 클라이언트로 나가는 상태에서 그 사람이 알면 안 되는 것을 지운다.
 *
 * 이 게임 전체가 정보 비대칭 위에 서 있다. view.visible만 걸러서는 부족하다 —
 * 개발자 도구로 응답을 열어보면 전체 다이얼과 목표 상태가 그대로 보이기 때문이다.
 * 그래서 서버가 아예 내려보내지 않는다.
 *
 * 게임이 끝난 뒤(debrief)에는 전부 공개한다. 회고하려면 답을 봐야 한다.
 */
export function redactState(s: GameState, playerId: string): PublicGameState {
  if (s.phase === 'debrief') return s

  const me = s.players.find((p) => p.id === playerId)
  const dials: Partial<Record<AxisId, Level>> = {}
  if (me) for (const ax of me.reads) dials[ax] = s.dials[ax]

  return {
    ...s,
    dials,
    target: undefined,
    goals: me ? { [playerId]: s.goals[playerId] ?? [] } : {},
    startDials: undefined,
    // 어느 축이 이번 라운드에 조작됐는지도 단서가 된다
    touchedThisRound: [],
  }
}

// ---------------------------------------------------------------- 액션

export type Action =
  | { type: 'join'; name: string }
  | { type: 'start' }
  | { type: 'onboardDone' }
  | { type: 'practiceDone' }
  | { type: 'nextRound' }
  | {
      type: 'ask'
      responderId: string
      q: CleanQ
      subject: string
      subject2?: string
    }
  | { type: 'answer'; loopId: string }
  | { type: 'playback'; loopId: string }
  | { type: 'confirm'; loopId: string; ok: boolean }
  | { type: 'cancelLoop'; loopId: string }
  | { type: 'turn'; axis: AxisId; dir: 1 | -1 }
  | { type: 'proposeMetaphor'; metaphorId: string }
  | { type: 'agreeMetaphor' }
  | { type: 'timeUp' }

export interface Reject {
  error: string
}

const id = (n: number) => Math.random().toString(36).slice(2, 8) + n.toString(36)

/**
 * 액션을 이벤트로 바꾼다. 불법이면 { error }.
 * 순수 함수 — 저장은 호출자가 한다.
 */
export function decide(
  s: GameState,
  playerId: string,
  action: Action,
  now: number,
): GameEvent[] | Reject {
  const p = s.players.find((x) => x.id === playerId)

  switch (action.type) {
    case 'join': {
      if (s.phase !== 'lobby') return { error: '이미 시작된 방입니다' }
      if (s.players.some((x) => x.id === playerId)) return []
      if (s.players.length >= 6) return { error: '정원(6명)이 찼습니다' }
      const name = action.name.trim().slice(0, 8)
      if (!name) return { error: '이름을 입력해 주세요' }
      return [{ type: 'join', t: now, playerId, name, by: playerId }]
    }

    case 'start': {
      // 여러 명이 동시에 눌렀을 때 늦은 쪽에 오류를 띄우지 않는다
      if (s.phase !== 'lobby') return []
      if (s.players.length < 3) return { error: '3명 이상이어야 시작할 수 있습니다' }
      return [
        {
          type: 'start',
          t: now,
          seed: Math.floor(Math.random() * 2 ** 31),
          order: s.players.map((x) => x.id),
          by: playerId,
        },
      ]
    }

    case 'onboardDone':
      return [{ type: 'onboardDone', t: now, playerId, by: playerId }]

    case 'practiceDone': {
      if (s.phase !== 'practice') return []
      return [{ type: 'practiceDone', t: now, by: playerId }]
    }

    case 'nextRound': {
      if (s.finished) return []
      if (s.phase === 'round') return []
      if (s.phase !== 'interstitial') return { error: '지금은 시작할 수 없습니다' }
      const next = s.round + 1
      if (next > MAX_ROUNDS) return { error: '마지막 라운드가 끝났습니다' }
      return [
        { type: 'roundStart', t: now, round: next, endsAt: now + ROUND_MS, by: playerId },
      ]
    }

    case 'ask': {
      if (s.phase !== 'round' && s.phase !== 'practice')
        return { error: '지금은 질문할 수 없습니다' }
      if (!p) return { error: '참가자가 아닙니다' }
      if (s.loops.some((l) => l.askerId === playerId))
        return { error: '이미 열린 질문이 있습니다. 그걸 먼저 끝내세요' }
      if (s.loops.some((l) => l.responderId === action.responderId))
        return { error: '그 사람은 지금 다른 질문에 답하는 중입니다' }
      if (action.responderId === playerId)
        return { error: '자기 자신에게는 물을 수 없습니다' }
      if (!s.players.some((x) => x.id === action.responderId))
        return { error: '없는 참가자입니다' }
      return [
        {
          type: 'ask',
          t: now,
          loopId: id(now),
          askerId: playerId,
          responderId: action.responderId,
          q: action.q,
          subject: action.subject,
          subject2: action.subject2,
          by: playerId,
        },
      ]
    }

    case 'answer': {
      const l = s.loops.find((x) => x.id === action.loopId)
      if (!l) return { error: '없는 질문입니다' }
      if (l.responderId !== playerId) return { error: '당신에게 온 질문이 아닙니다' }
      if (l.stage !== 'asked') return { error: '이미 답한 질문입니다' }
      return [{ type: 'answer', t: now, loopId: l.id, by: playerId }]
    }

    case 'playback': {
      const l = s.loops.find((x) => x.id === action.loopId)
      if (!l) return { error: '없는 질문입니다' }
      if (l.askerId !== playerId) return { error: '당신이 연 질문이 아닙니다' }
      if (l.stage !== 'answered') return { error: '아직 답을 듣지 못했습니다' }
      return [{ type: 'playback', t: now, loopId: l.id, by: playerId }]
    }

    case 'confirm': {
      const l = s.loops.find((x) => x.id === action.loopId)
      if (!l) return { error: '없는 질문입니다' }
      if (l.responderId !== playerId) return { error: '당신이 확인할 질문이 아닙니다' }
      if (l.stage !== 'playedback') return { error: '아직 되돌려 말하지 않았습니다' }
      return [{ type: 'confirm', t: now, loopId: l.id, ok: action.ok, by: playerId }]
    }

    case 'cancelLoop': {
      const l = s.loops.find((x) => x.id === action.loopId)
      if (!l) return []
      if (l.askerId !== playerId && l.responderId !== playerId)
        return { error: '당신의 질문이 아닙니다' }
      return [
        { type: 'cancelLoop', t: now, loopId: l.id, reason: 'manual', by: playerId },
      ]
    }

    case 'turn': {
      if (s.phase !== 'round' && s.phase !== 'practice')
        return { error: '지금은 조작할 수 없습니다' }
      if (!p) return { error: '참가자가 아닙니다' }
      if (!p.writes.includes(action.axis))
        return { error: '당신의 조작 권한이 아닙니다' }
      if ((s.tokens[playerId] ?? 0) < 1)
        return { error: '번역 토큰이 없습니다. 질문해서 얻으세요' }
      const cur = s.dials[action.axis]
      const to = Math.max(0, Math.min(4, cur + action.dir)) as Level
      if (to === cur) return { error: '더 돌릴 수 없습니다' }
      return [
        { type: 'turn', t: now, playerId, axis: action.axis, dir: action.dir, to, by: playerId },
      ]
    }

    case 'proposeMetaphor': {
      if (s.sharedMetaphorId) return { error: '이미 공유 은유가 있습니다' }
      if (s.round < SHARED_METAPHOR_FROM_ROUND)
        return { error: `${SHARED_METAPHOR_FROM_ROUND}라운드부터 제안할 수 있습니다` }
      return [
        { type: 'proposeMetaphor', t: now, playerId, metaphorId: action.metaphorId, by: playerId },
      ]
    }

    case 'agreeMetaphor': {
      if (!s.proposal) return { error: '제안이 없습니다' }
      if (s.proposal.agreed.includes(playerId)) return []
      const agreed = [...s.proposal.agreed, playerId]
      const out: GameEvent[] = [
        { type: 'agreeMetaphor', t: now, playerId, by: playerId },
      ]
      if (s.players.every((x) => agreed.includes(x.id))) {
        out.push({
          type: 'declareMetaphor',
          t: now,
          metaphorId: s.proposal.metaphorId,
          by: playerId,
        })
      }
      return out
    }

    case 'timeUp': {
      if (s.phase !== 'round') return []
      if (s.roundEndsAt === null || now < s.roundEndsAt) return []
      return endRound(s, now, playerId)
    }
  }
}

/** 라운드 마감: 드리프트 → 판정 → 종료 여부. 하나의 원자적 묶음. */
export function endRound(s: GameState, now: number, by: string): GameEvent[] {
  const out: GameEvent[] = []
  const dials = { ...s.dials }

  // 손대지 않은 축은 스스로 움직인다 — 다만 한 라운드에 하나만.
  // 전부 흔들면 팀이 따라잡을 수 없어 학습이 아니라 좌절이 된다.
  // 하나만 흔들리면 "우리가 안 본 곳이 움직인다"는 감각은 남고 승산은 유지된다.
  const untouched = AXES.filter((ax) => !s.touchedThisRound.includes(ax))
  if (untouched.length > 0) {
    const pick = untouched[(s.seed + s.round * 31) % untouched.length]
    const to = driftFor(s.seed, s.round, pick, dials[pick])
    if (to !== dials[pick]) {
      out.push({ type: 'drift', t: now, axis: pick, from: dials[pick], to, by })
      dials[pick] = to
    }
  }

  const matched = matchedCount(dials, s.target)
  out.push({ type: 'roundEnd', t: now, round: s.round, matched, by })

  if (matched === AXES.length) out.push({ type: 'finish', t: now, won: true, by })
  else if (s.round >= MAX_ROUNDS)
    out.push({ type: 'finish', t: now, won: false, by })

  return out
}
