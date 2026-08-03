'use client'

import { useState } from 'react'
import {
  AXES,
  CLEAN_QUESTIONS,
  type CleanQ,
  type Loop,
  type Metaphor,
  type Player,
} from '@/lib/types'

export function fillTemplate(t: string, x: string, y?: string) {
  return t.replaceAll('{X}', x).replaceAll('{Y}', y ?? '…')
}

/** 내가 질문을 여는 시트 */
export function AskSheet({
  me,
  metaphor,
  players,
  askableIds,
  onClose,
  onAsk,
}: {
  me: Player
  metaphor: Metaphor
  players: Player[]
  askableIds: string[]
  onClose: () => void
  onAsk: (responderId: string, q: CleanQ, subject: string, subject2?: string) => void
}) {
  const [who, setWho] = useState<string | null>(null)
  const [q, setQ] = useState<CleanQ | null>(null)
  const [sub, setSub] = useState<string | null>(null)
  const [sub2, setSub2] = useState<string | null>(null)

  const def = CLEAN_QUESTIONS.find((c) => c.id === q)
  // 주제어는 '내 세계의 단어'다. 상대는 이 단어를 모른다 — 그래서 번역이 필요하다.
  const terms = AXES.map((a) => metaphor.axes[a].label)
  const ready = who && q && (q === 'outcome' || sub) && (!def?.needsSecond || sub2)

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="row between">
          <h2>질문 열기</h2>
          <button className="sm ghost" onClick={onClose}>
            닫기
          </button>
        </div>

        <p className="tiny dim" style={{ marginTop: 6 }}>
          폰은 허가증입니다. 고른 뒤 <b>실제 질문은 소리 내어</b> 하세요.
        </p>

        <div className="mt">
          <div className="tiny muted">누구에게</div>
          <div className="pill-grid" style={{ marginTop: 7 }}>
            {players
              .filter((p) => p.id !== me.id)
              .map((p) => {
                const free = askableIds.includes(p.id)
                return (
                  <button
                    key={p.id}
                    className={who === p.id ? 'on q-opt' : ''}
                    style={
                      who === p.id
                        ? { borderColor: 'var(--accent)', color: 'var(--accent)' }
                        : undefined
                    }
                    disabled={!free}
                    onClick={() => setWho(p.id)}
                  >
                    {p.name}
                    {!free && ' · 응답 중'}
                  </button>
                )
              })}
          </div>
        </div>

        <div className="mt">
          <div className="tiny muted">어떤 클린 질문으로</div>
          <div className="col" style={{ marginTop: 7 }}>
            {CLEAN_QUESTIONS.map((c) => (
              <button
                key={c.id}
                className={'q-opt' + (q === c.id ? ' on' : '')}
                onClick={() => {
                  setQ(c.id)
                  if (c.id === 'outcome') setSub(null)
                }}
              >
                <span className="tiny dim">{c.category}</span>
                <br />
                {fillTemplate(c.template, sub ?? 'OO', sub2 ?? undefined)}
              </button>
            ))}
          </div>
        </div>

        {q && q !== 'outcome' && (
          <div className="mt">
            <div className="tiny muted">무엇에 대해 ({'{X}'})</div>
            <div className="pill-grid" style={{ marginTop: 7 }}>
              {terms.map((t) => (
                <button
                  key={t}
                  className={sub === t ? 'on' : ''}
                  style={
                    sub === t
                      ? { borderColor: 'var(--accent)', color: 'var(--accent)' }
                      : undefined
                  }
                  onClick={() => setSub(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}

        {def?.needsSecond && (
          <div className="mt">
            <div className="tiny muted">그리고 ({'{Y}'})</div>
            <div className="pill-grid" style={{ marginTop: 7 }}>
              {terms
                .filter((t) => t !== sub)
                .map((t) => (
                  <button
                    key={t}
                    className={sub2 === t ? 'on' : ''}
                    style={
                      sub2 === t
                        ? { borderColor: 'var(--accent)', color: 'var(--accent)' }
                        : undefined
                    }
                    onClick={() => setSub2(t)}
                  >
                    {t}
                  </button>
                ))}
            </div>
          </div>
        )}

        <button
          className="primary block mt2"
          disabled={!ready}
          onClick={() => onAsk(who!, q!, sub ?? '지금 상황', sub2 ?? undefined)}
        >
          이 질문을 소리 내어 했습니다
        </button>
      </div>
    </div>
  )
}

/** 진행 중인 루프 카드 — 4박자 중 지금 내가 할 일만 보여준다 */
export function LoopCard({
  loop,
  meId,
  players,
  onAnswer,
  onPlayback,
  onConfirm,
  onCancel,
}: {
  loop: Loop
  meId: string
  players: Player[]
  onAnswer: () => void
  onPlayback: () => void
  onConfirm: (ok: boolean) => void
  onCancel: () => void
}) {
  const asker = players.find((p) => p.id === loop.askerId)
  const responder = players.find((p) => p.id === loop.responderId)
  const def = CLEAN_QUESTIONS.find((c) => c.id === loop.q)!
  const text = fillTemplate(def.template, loop.subject, loop.subject2)
  const iAsk = loop.askerId === meId

  const step = (n: number, label: string, on: boolean, done: boolean) => (
    <span
      className={'chip tiny' + (on ? ' on' : '')}
      style={done ? { opacity: 0.45 } : undefined}
    >
      {done ? '✓' : n} {label}
    </span>
  )

  return (
    <div className="card accent">
      <div className="row between">
        <b className="small">
          {asker?.name} → {responder?.name}
        </b>
        {loop.attempts > 1 && (
          <span className="chip tiny" style={{ color: 'var(--warn)' }}>
            {loop.attempts}번째 시도
          </span>
        )}
      </div>

      <div style={{ marginTop: 8, fontSize: 15, lineHeight: 1.45 }}>「{text}」</div>

      <div className="row" style={{ marginTop: 10, flexWrap: 'wrap', gap: 5 }}>
        {step(1, '묻기', false, true)}
        {step(2, '답하기', loop.stage === 'asked', loop.stage !== 'asked')}
        {step(3, '되돌려 말하기', loop.stage === 'answered', loop.stage === 'playedback')}
        {step(4, '확인', loop.stage === 'playedback', false)}
      </div>

      <div className="mt">
        {loop.stage === 'asked' &&
          (iAsk ? (
            <div className="small dim">{responder?.name} 님의 답을 기다리는 중…</div>
          ) : (
            <>
              <div className="small" style={{ marginBottom: 8 }}>
                <b>소리 내어 답하세요.</b> 당신의 계기판 단어로 설명하면 됩니다.
              </div>
              <button className="primary block" onClick={onAnswer}>
                답했습니다
              </button>
            </>
          ))}

        {loop.stage === 'answered' &&
          (iAsk ? (
            <>
              <div className="small" style={{ marginBottom: 8 }}>
                <b>「제가 이해한 건 ___ 입니다」</b>
                <br />
                <span className="dim">들은 것을 당신의 말로 되돌려 말하세요.</span>
              </div>
              <button className="primary block" onClick={onPlayback}>
                되돌려 말했습니다
              </button>
            </>
          ) : (
            <div className="small dim">
              {asker?.name} 님이 이해한 것을 되돌려 말할 차례입니다…
            </div>
          ))}

        {loop.stage === 'playedback' &&
          (iAsk ? (
            <div className="small dim">{responder?.name} 님의 확인을 기다리는 중…</div>
          ) : (
            <>
              <div className="small" style={{ marginBottom: 8 }}>
                <b>{asker?.name} 님의 이해가 맞나요?</b>
              </div>
              <div className="row">
                <button className="primary grow" onClick={() => onConfirm(true)}>
                  맞습니다
                </button>
                <button className="bad grow" onClick={() => onConfirm(false)}>
                  아닙니다
                </button>
              </div>
              <div className="tiny dim" style={{ marginTop: 7 }}>
                맞다고 확인하면 <b>두 사람 모두</b> 번역 토큰을 1개씩 얻습니다.
              </div>
            </>
          ))}
      </div>

      <button className="ghost sm block" style={{ marginTop: 10 }} onClick={onCancel}>
        이 질문 접기
      </button>
    </div>
  )
}
