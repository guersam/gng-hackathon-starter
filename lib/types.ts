// 「관제탑」 공유 타입 — 정본. 설계 문서: docs/PLAN.md.

export type AxisId = 'A' | 'B' | 'C' | 'D'
export const AXES: AxisId[] = ['A', 'B', 'C', 'D']

export type Level = 0 | 1 | 2 | 3 | 4

export type Phase =
  | 'lobby'
  | 'onboarding'
  | 'practice'
  | 'round'
  | 'interstitial'
  | 'debrief'

export type CleanQ = 'kind' | 'else' | 'like' | 'relation' | 'outcome'

export interface CleanQuestionDef {
  id: CleanQ
  category: string
  /** {X}, {Y} 치환용 템플릿 */
  template: string
  needsSecond: boolean
  short: string
}

export const CLEAN_QUESTIONS: CleanQuestionDef[] = [
  {
    id: 'kind',
    category: '속성',
    template: '그 「{X}」는 어떤 종류의 「{X}」인가요?',
    needsSecond: false,
    short: '어떤 종류의',
  },
  {
    id: 'else',
    category: '속성',
    template: '그 「{X}」에 대해 그 밖에 또 다른 게 있나요?',
    needsSecond: false,
    short: '그 밖에 또',
  },
  {
    id: 'like',
    category: '은유',
    template: '그 「{X}」는 마치 무엇 같나요?',
    needsSecond: false,
    short: '마치 무엇 같나요',
  },
  {
    id: 'relation',
    category: '관계',
    template: '「{X}」와 「{Y}」 사이에 어떤 관계가 있나요?',
    needsSecond: true,
    short: '어떤 관계가',
  },
  {
    id: 'outcome',
    category: 'PRO',
    template: '그러면 어떤 일이 일어나면 좋으시겠어요?',
    needsSecond: false,
    short: '어떤 일이 일어나면',
  },
]

export interface MetaphorAxis {
  label: string
  steps: [string, string, string, string, string]
}

export interface Metaphor {
  id: string
  name: string
  emoji: string
  blurb: string
  axes: Record<AxisId, MetaphorAxis>
}

export interface Player {
  id: string
  name: string
  metaphorId: string
  reads: AxisId[]
  writes: AxisId[]
  joinedAt: number
}

export type Goal =
  | { kind: 'level'; axis: AxisId; target: Level }
  | { kind: 'relation'; a: AxisId; b: AxisId; cmp: 'gt' | 'lt' | 'eq' }

export type LoopStage = 'asked' | 'answered' | 'playedback'

export interface Loop {
  id: string
  askerId: string
  responderId: string
  q: CleanQ
  subject: string
  subject2?: string
  stage: LoopStage
  attempts: number
  startedAt: number
}

// ---------------------------------------------------------------- events

interface Base {
  t: number
  by?: string
}

export type GameEvent =
  | (Base & { type: 'join'; playerId: string; name: string })
  | (Base & { type: 'start'; seed: number; order: string[] })
  | (Base & { type: 'onboardDone'; playerId: string })
  | (Base & { type: 'practiceDone' })
  | (Base & { type: 'roundStart'; round: number; endsAt: number })
  | (Base & {
      type: 'ask'
      loopId: string
      askerId: string
      responderId: string
      q: CleanQ
      subject: string
      subject2?: string
    })
  | (Base & { type: 'answer'; loopId: string })
  | (Base & { type: 'playback'; loopId: string })
  | (Base & { type: 'confirm'; loopId: string; ok: boolean })
  | (Base & { type: 'cancelLoop'; loopId: string; reason: string })
  | (Base & { type: 'turn'; playerId: string; axis: AxisId; dir: 1 | -1; to: Level })
  | (Base & { type: 'proposeMetaphor'; playerId: string; metaphorId: string })
  | (Base & { type: 'agreeMetaphor'; playerId: string })
  | (Base & { type: 'declareMetaphor'; metaphorId: string })
  | (Base & { type: 'roundEnd'; round: number; matched: number })
  | (Base & { type: 'drift'; axis: AxisId; from: Level; to: Level })
  | (Base & { type: 'finish'; won: boolean })

export type EventType = GameEvent['type']

// ---------------------------------------------------------------- state

export interface GameState {
  code: string
  phase: Phase
  seed: number
  players: Player[]
  /** playerId -> 목표 조각 */
  goals: Record<string, Goal[]>
  dials: Record<AxisId, Level>
  /** 본 게임 1라운드가 시작될 때 되돌릴 값. 연습 중의 조작이 본 게임에 새지 않게 한다. */
  startDials: Record<AxisId, Level>
  target: Record<AxisId, Level>
  tokens: Record<string, number>
  loops: Loop[]
  round: number
  roundEndsAt: number | null
  /** 이번 라운드에 조작된 축 */
  touchedThisRound: AxisId[]
  onboarded: string[]
  /** 시스템 은유가 선언되었으면 그 id */
  sharedMetaphorId: string | null
  proposal: { metaphorId: string; by: string; agreed: string[] } | null
  lastMatched: number | null
  won: boolean
  finished: boolean
  practiceAxis: AxisId | null
}

/**
 * 실제로 클라이언트에 나가는 상태. GameState에서 정보 비대칭에 해당하는 부분이
 * 지워져 있다. 게임이 끝나면 GameState 전체가 그대로 내려온다.
 */
export type PublicGameState = Omit<GameState, 'dials' | 'target' | 'startDials'> & {
  dials: Partial<Record<AxisId, Level>>
  target?: Record<AxisId, Level>
  startDials?: Record<AxisId, Level>
}

/** 플레이어별로 서버가 걸러서 내려주는 뷰 */
export interface PlayerView {
  me: Player | null
  myGoals: Goal[]
  myTokens: number
  /** 내가 읽을 수 있는 축의 현재 값만 */
  visible: Partial<Record<AxisId, Level>>
  /** 내가 참여 중인 열린 루프 */
  myLoop: Loop | null
  /** 나에게 응답을 요구하는 루프 */
  incomingLoop: Loop | null
  /** 지금 질문 대상으로 고를 수 있는 사람 */
  askableIds: string[]
}

export interface ApiResponse {
  ok: boolean
  error?: string
  state?: PublicGameState
  view?: PlayerView
  events?: GameEvent[]
}

/** 라운드 길이(ms). 진행 상황에 맞춰 NEXT_PUBLIC_ROUND_MS로 조정할 수 있다. */
export const ROUND_MS = Number(process.env.NEXT_PUBLIC_ROUND_MS) || 90_000
export const MAX_ROUNDS = 5
export const TOKEN_CAP = 3
export const SHARED_METAPHOR_FROM_ROUND = 3
