'use client'

import { use, useCallback, useEffect, useRef, useState } from 'react'
import Console from '@/components/Console'
import Onboarding from '@/components/Onboarding'
import { AskSheet, LoopCard } from '@/components/QuestionPanel'
import Debrief from '@/components/Debrief'
import { getMetaphor, METAPHORS } from '@/lib/metaphors'
import { goalText } from '@/lib/goaltext'
import type { Action } from '@/lib/engine'
import {
  MAX_ROUNDS,
  ROUND_MS,
  SHARED_METAPHOR_FROM_ROUND,
  type ApiResponse,
  type AxisId,
  type CleanQ,
  type GameEvent,
  type GameState,
  type PublicGameState,
  type PlayerView,
} from '@/lib/types'

function usePlayerId(code: string) {
  const [id, setId] = useState<string | null>(null)
  useEffect(() => {
    const k = `gwanjetap:${code}:pid`
    let v = localStorage.getItem(k)
    if (!v) {
      v = Math.random().toString(36).slice(2, 10)
      localStorage.setItem(k, v)
    }
    setId(v)
  }, [code])
  return id
}

export default function Room({ params }: { params: Promise<{ code: string }> }) {
  const { code: raw } = use(params)
  const code = raw.toUpperCase()
  const playerId = usePlayerId(code)

  const [state, setState] = useState<PublicGameState | null>(null)
  const [view, setView] = useState<PlayerView | null>(null)
  const [events, setEvents] = useState<GameEvent[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [asking, setAsking] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const busy = useRef(false)

  const apply = useCallback((d: ApiResponse) => {
    if (d.state) setState(d.state)
    if (d.view) setView(d.view)
    if (d.events) setEvents(d.events)
  }, [])

  const poll = useCallback(async () => {
    if (!playerId) return
    try {
      const r = await fetch(
        `/api/game?code=${code}&playerId=${playerId}`,
        { cache: 'no-store' },
      )
      apply((await r.json()) as ApiResponse)
    } catch {
      /* 네트워크가 잠깐 끊겨도 다음 폴링에서 회복된다 */
    }
  }, [code, playerId, apply])

  const send = useCallback(
    async (action: Action) => {
      if (!playerId || busy.current) return
      busy.current = true
      try {
        const r = await fetch('/api/game', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, playerId, action }),
        })
        const d = (await r.json()) as ApiResponse
        if (!d.ok) {
          setErr(d.error ?? '오류')
          setTimeout(() => setErr(null), 2600)
        } else {
          apply(d)
        }
      } catch {
        setErr('연결이 불안정합니다')
        setTimeout(() => setErr(null), 2600)
      } finally {
        busy.current = false
      }
    },
    [code, playerId, apply],
  )

  useEffect(() => {
    void poll()
    const t = setInterval(() => void poll(), 1000)
    return () => clearInterval(t)
  }, [poll])

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(t)
  }, [])

  // 라운드 시간이 끝나면 누구의 기기든 마감을 요청한다. 서버가 중복을 흡수한다.
  useEffect(() => {
    if (!state || state.phase !== 'round' || state.roundEndsAt === null) return
    if (now < state.roundEndsAt) return
    void send({ type: 'timeUp' })
  }, [now, state, send])

  if (!playerId || !state) {
    return (
      <main className="wrap center" style={{ paddingTop: 80 }}>
        <div className="dim">불러오는 중…</div>
      </main>
    )
  }

  const me = view?.me ?? null
  const joined = state.players.some((p) => p.id === playerId)
  const activeMetaphorId =
    state.sharedMetaphorId ?? (me ? me.metaphorId : METAPHORS[0].id)
  const metaphor = getMetaphor(activeMetaphorId)

  const toast = err ? <div className="toast">{err}</div> : null

  // ------------------------------------------------------------ 로비

  if (state.phase === 'lobby') {
    return (
      <main className="wrap">
        {toast}
        <div className="tiny dim" style={{ letterSpacing: '0.2em' }}>
          방 코드
        </div>
        <h1 style={{ fontSize: 42, letterSpacing: '0.18em' }}>{code}</h1>
        <p className="small muted">
          같은 방에 있는 사람들에게 이 코드를 보여주세요. 3~6명이면 시작할 수 있습니다.
        </p>

        {!joined ? (
          <div className="card mt2">
            <div className="tiny dim">이름 (최대 8자)</div>
            <input
              style={{ marginTop: 8 }}
              value={name}
              maxLength={8}
              placeholder="예: 창준"
              onChange={(e) => setName(e.target.value)}
            />
            <button
              className="primary block"
              style={{ marginTop: 10 }}
              disabled={!name.trim()}
              onClick={() => void send({ type: 'join', name })}
            >
              참가하기
            </button>
          </div>
        ) : (
          <div className="card accent mt2 center small">
            참가했습니다. 다른 사람을 기다리는 중…
          </div>
        )}

        <div className="mt2">
          <div className="tiny muted">참가자 {state.players.length}/6</div>
          <div className="col" style={{ marginTop: 8 }}>
            {state.players.map((p) => (
              <div key={p.id} className="card tight row between">
                <b>{p.name}</b>
                {p.id === playerId && <span className="chip tiny on">나</span>}
              </div>
            ))}
            {state.players.length === 0 && (
              <div className="dim small">아직 아무도 없습니다</div>
            )}
          </div>
        </div>

        {joined && (
          <div className="dock">
            <button
              className="primary block"
              disabled={state.players.length < 3}
              onClick={() => void send({ type: 'start' })}
            >
              {state.players.length < 3
                ? `${3 - state.players.length}명 더 필요합니다`
                : '시작하기'}
            </button>
            <p className="tiny dim center" style={{ marginTop: 8, marginBottom: 0 }}>
              아무나 눌러도 됩니다
            </p>
          </div>
        )}
      </main>
    )
  }

  if (!me) {
    return (
      <main className="wrap center" style={{ paddingTop: 80 }}>
        {toast}
        <p className="muted">이미 시작된 방입니다.</p>
        <p className="small dim">
          이 기기는 참가자로 등록되어 있지 않습니다. 다음 판에 합류해 주세요.
        </p>
      </main>
    )
  }

  // ------------------------------------------------------------ 온보딩

  if (state.phase === 'onboarding') {
    return (
      <>
        {toast}
        <Onboarding
          me={me}
          metaphor={metaphor}
          goals={view?.myGoals ?? []}
          done={state.onboarded.includes(playerId)}
          waitingFor={state.players
            .filter((p) => !state.onboarded.includes(p.id))
            .map((p) => p.name)}
          onDone={() => void send({ type: 'onboardDone' })}
        />
      </>
    )
  }

  // ------------------------------------------------------------ 디브리핑

  if (state.phase === 'debrief') {
    return (
      <>
        {toast}
        <Debrief state={state as GameState} events={events} meId={playerId} />
      </>
    )
  }

  // ------------------------------------------------------------ 라운드 사이

  if (state.phase === 'interstitial') {
    const isFirst = state.round === 0
    return (
      <main className="wrap">
        {toast}
        <div style={{ height: 40 }} />
        {isFirst ? (
          <>
            <h1>연습 끝</h1>
            <p className="muted">
              토큰이 어떻게 생기는지 보셨을 겁니다. 이제 4개 축 전부가 살아납니다.
            </p>
          </>
        ) : (
          <>
            <div className="tiny dim">라운드 {state.round} 종료</div>
            <div className="big-num mt" style={{ color: 'var(--accent)' }}>
              {state.lastMatched} <span style={{ fontSize: 20, color: 'var(--ink3)' }}>/ 4</span>
            </div>
            <p className="muted mt">
              4개 축 중 <b style={{ color: 'var(--ink)' }}>{state.lastMatched}개</b>가 목표와
              일치합니다.
              <br />
              <span className="dim small">어느 축인지는 알려주지 않습니다.</span>
            </p>
            <div className="card mt2 small muted">
              손대지 않은 축은 <b style={{ color: 'var(--warn)' }}>스스로 움직였습니다</b>.
              남은 토큰은 모두 사라졌습니다.
            </div>
          </>
        )}

        <div className="dock">
          <button
            className="primary block"
            onClick={() => void send({ type: 'nextRound' })}
          >
            라운드 {state.round + 1} 시작 · 90초
            {state.round + 1 >= MAX_ROUNDS ? ' (마지막)' : ''}
          </button>
        </div>
      </main>
    )
  }

  // ------------------------------------------------------------ 플레이

  const practice = state.phase === 'practice'
  const remain = state.roundEndsAt ? Math.max(0, state.roundEndsAt - now) : 0
  const pct = state.roundEndsAt ? (remain / ROUND_MS) * 100 : 100
  const tokens = view?.myTokens ?? 0
  const myLoop = view?.myLoop ?? null
  const incoming = view?.incomingLoop ?? null
  // 한 사람이 동시에 '질문한 사람'이자 '답할 사람'일 수 있다.
  // 둘 중 하나만 보여주면 나머지 한 쪽은 영영 기다리게 된다.
  const activeLoops = [incoming, myLoop].filter(
    (l): l is NonNullable<typeof l> => l != null,
  )
  const goals = view?.myGoals ?? []
  const canPropose =
    !practice &&
    !state.sharedMetaphorId &&
    state.round >= SHARED_METAPHOR_FROM_ROUND &&
    !state.proposal

  return (
    <main className="wrap">
      {toast}

      <div className="row between">
        <div className="row" style={{ gap: 6 }}>
          <span className="chip">{metaphor.emoji} {metaphor.name}</span>
          {state.sharedMetaphorId && <span className="chip on">공용어</span>}
        </div>
        <span className="chip on">
          토큰 {'●'.repeat(tokens)}
          {'○'.repeat(Math.max(0, 3 - tokens))}
        </span>
      </div>

      {practice ? (
        <div className="card warn mt">
          <b className="small">연습 라운드 · 시간 제한 없음</b>
          <p className="tiny muted" style={{ marginTop: 5, marginBottom: 0 }}>
            누군가에게 질문해서 <b>토큰 1개</b>를 만들고, 그걸로 다이얼을 한 칸 돌려 보세요.
            여기서 돌린 것은 <b>본 게임에 반영되지 않습니다.</b> 준비되면 아무나 아래 버튼을
            누르면 됩니다.
          </p>
        </div>
      ) : (
        <div className="mt">
          <div className="row between tiny muted" style={{ marginBottom: 5 }}>
            <span>라운드 {state.round} / {MAX_ROUNDS}</span>
            <span>{Math.ceil(remain / 1000)}초</span>
          </div>
          <div className={'timerbar' + (remain < 20_000 ? ' low' : '')}>
            <i style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {/* 목표 카드 */}
      <div className="mt2">
        <div className="tiny muted">당신만 아는 목표</div>
        {goals.map((g, k) => (
          <div key={k} className="card tight warn" style={{ marginTop: 7 }}>
            <div className="small">{goalText(g, metaphor)}</div>
            <div className="tiny dim" style={{ marginTop: 4 }}>
              이 축은 당신이 못 바꿉니다 · 지금 값도 보이지 않습니다
            </div>
          </div>
        ))}
      </div>

      {/* 진행 중인 루프 */}
      {activeLoops.length > 0 && (
        <div className="mt2 col">
          {activeLoops.map((l) => (
            <LoopCard
              key={l.id}
              loop={l}
              meId={playerId}
              players={state.players}
              onAnswer={() => void send({ type: 'answer', loopId: l.id })}
              onPlayback={() => void send({ type: 'playback', loopId: l.id })}
              onConfirm={(ok) => void send({ type: 'confirm', loopId: l.id, ok })}
              onCancel={() => void send({ type: 'cancelLoop', loopId: l.id })}
            />
          ))}
        </div>
      )}

      {/* 시스템 은유 */}
      {state.proposal && (
        <div className="card mt2">
          <b className="small">
            {state.players.find((p) => p.id === state.proposal!.by)?.name} 님의 제안:{' '}
            {getMetaphor(state.proposal.metaphorId).name}
          </b>
          <p className="tiny muted" style={{ marginTop: 5 }}>
            전원이 동의하면 모두의 계기판이 이 은유로 통일됩니다. 대신{' '}
            <b style={{ color: 'var(--warn)' }}>모두의 토큰이 사라집니다.</b>
          </p>
          <div className="row tiny dim" style={{ marginBottom: 8 }}>
            동의 {state.proposal.agreed.length} / {state.players.length}
          </div>
          <button
            className="primary block sm"
            disabled={state.proposal.agreed.includes(playerId)}
            onClick={() => void send({ type: 'agreeMetaphor' })}
          >
            {state.proposal.agreed.includes(playerId) ? '동의함' : '동의합니다'}
          </button>
        </div>
      )}

      {/* 계기판 */}
      <div className="mt2">
        <div className="tiny muted" style={{ marginBottom: 7 }}>
          계기판
        </div>
        <Console
          me={me}
          metaphor={metaphor}
          visible={view?.visible ?? {}}
          tokens={tokens}
          canTurn={tokens > 0}
          onTurn={(axis: AxisId, dir) => void send({ type: 'turn', axis, dir })}
        />
      </div>

      {canPropose && (
        <div className="card mt2">
          <b className="small">공용 언어를 살까요?</b>
          <p className="tiny muted" style={{ marginTop: 5 }}>
            은유 하나를 골라 전원이 동의하면, 그때부터 모두가 같은 단어를 씁니다. 값은{' '}
            <b>지금 가진 토큰 전부</b>입니다.
          </p>
          <div className="pill-grid" style={{ marginTop: 8 }}>
            {state.players.map((p) => {
              const m = getMetaphor(p.metaphorId)
              return (
                <button
                  key={p.id}
                  className="sm"
                  onClick={() =>
                    void send({ type: 'proposeMetaphor', metaphorId: p.metaphorId })
                  }
                >
                  {m.emoji} {m.name}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="dock">
        {practice ? (
          <div className="col">
            <button
              className="primary block"
              disabled={!!myLoop}
              onClick={() => setAsking(true)}
            >
              질문 열기
            </button>
            <button
              className="ghost block sm"
              onClick={() => void send({ type: 'practiceDone' })}
            >
              연습 끝 · 본 게임 시작
            </button>
          </div>
        ) : (
          <button
            className="primary block"
            disabled={!!myLoop}
            onClick={() => setAsking(true)}
          >
            {myLoop ? '진행 중인 질문을 끝내세요' : '질문 열기 (토큰 얻기)'}
          </button>
        )}
      </div>

      {asking && (
        <AskSheet
          me={me}
          metaphor={metaphor}
          players={state.players}
          askableIds={view?.askableIds ?? []}
          onClose={() => setAsking(false)}
          onAsk={(responderId, q: CleanQ, subject, subject2) => {
            setAsking(false)
            void send({ type: 'ask', responderId, q, subject, subject2 })
          }}
        />
      )}
    </main>
  )
}
