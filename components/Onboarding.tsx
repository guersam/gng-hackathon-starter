'use client'

import { useState } from 'react'
import type { Goal, Metaphor, Player } from '@/lib/types'
import { goalText } from '@/lib/goaltext'

export default function Onboarding({
  me,
  metaphor,
  goals,
  waitingFor,
  onDone,
  done,
}: {
  me: Player
  metaphor: Metaphor
  goals: Goal[]
  waitingFor: string[]
  onDone: () => void
  done: boolean
}) {
  const [i, setI] = useState(0)

  const cards = [
    {
      title: '당신은 관제탑의 한 자리입니다',
      body: (
        <>
          <p className="muted">
            팀 전체가 하나의 시스템을 맡았습니다. 시스템에는 다이얼이 4개 있습니다.
          </p>
          <div className="card tight mt" style={{ background: 'var(--panel2)' }}>
            <div className="row">
              <span style={{ fontSize: 26 }}>{metaphor.emoji}</span>
              <div>
                <b>{metaphor.name}</b>
                <div className="tiny dim">{metaphor.blurb}</div>
              </div>
            </div>
          </div>
          <p className="muted mt">
            당신의 계기판은 이 시스템을 <b style={{ color: 'var(--ink)' }}>{metaphor.name}</b>
            (으)로 보여줍니다.{' '}
            <b style={{ color: 'var(--warn)' }}>다른 사람의 계기판은 전혀 다른 세계입니다.</b>{' '}
            같은 다이얼인데 부르는 이름이 다릅니다.
          </p>
        </>
      ),
    },
    {
      title: '보는 축과 만지는 축이 다릅니다',
      body: (
        <>
          <div className="card tight" style={{ background: 'var(--panel2)' }}>
            <div className="tiny dim">👁 당신이 볼 수 있는 축</div>
            <b>{me.reads.map((a) => metaphor.axes[a].label).join(' · ')}</b>
            <div className="tiny dim" style={{ marginTop: 3 }}>
              값은 보이지만 바꿀 수 없습니다
            </div>
          </div>
          <div className="card tight mt" style={{ background: 'var(--panel2)' }}>
            <div className="tiny dim">🔧 당신이 바꿀 수 있는 축</div>
            <b>{me.writes.map((a) => metaphor.axes[a].label).join(' · ')}</b>
            <div className="tiny dim" style={{ marginTop: 3 }}>
              바꿀 수는 있지만 결과가 보이지 않습니다
            </div>
          </div>
          <p className="muted mt" style={{ marginBottom: 0 }}>
            내가 돌린 결과는 <b style={{ color: 'var(--ink)' }}>다른 사람만 볼 수 있습니다.</b>{' '}
            물어보지 않으면 아무도 자기가 뭘 했는지 모릅니다.
          </p>
        </>
      ),
    },
    {
      title: '당신만 아는 목표가 있습니다',
      body: (
        <>
          {goals.map((g, k) => (
            <div key={k} className="card tight warn" style={{ marginBottom: 8 }}>
              {goalText(g, metaphor)}
            </div>
          ))}
          <p className="muted mt">
            그런데 이 목표는 <b style={{ color: 'var(--ink)' }}>당신이 못 바꾸는 축</b>에 대한
            것입니다. 바꿀 수 있는 사람에게 말로 전해야 합니다.
          </p>
          <p className="muted" style={{ marginBottom: 0 }}>
            그리고 축을 한 칸 돌리려면{' '}
            <b style={{ color: 'var(--accent)' }}>번역 토큰 1개</b>가 듭니다. 토큰은{' '}
            <b>클린 질문 4박자</b>를 끝까지 완주해야만 생깁니다.
          </p>
          <ol className="rules small muted">
            <li>묻는다 (소리 내어)</li>
            <li>상대가 답한다</li>
            <li>「제가 이해한 건 ___ 입니다」라고 되돌려 말한다</li>
            <li>상대가 맞다고 확인하면 → 두 사람 모두 토큰 +1</li>
          </ol>
        </>
      ),
    },
  ]

  const c = cards[i]
  const last = i === cards.length - 1

  return (
    <div className="wrap">
      <div className="row" style={{ gap: 5 }}>
        {cards.map((_, k) => (
          <span
            key={k}
            className="step"
            style={{
              background: k <= i ? 'var(--accent)' : 'var(--panel2)',
              borderColor: k <= i ? 'var(--accent)' : 'var(--line)',
            }}
          />
        ))}
      </div>

      <h1 className="mt2" style={{ fontSize: 21 }}>
        {c.title}
      </h1>
      <div className="mt">{c.body}</div>

      <div className="dock">
        {done ? (
          <div className="card center">
            <div className="small muted">다른 참가자를 기다리는 중…</div>
            <div className="small" style={{ marginTop: 4 }}>
              {waitingFor.length > 0 ? waitingFor.join(', ') : '곧 시작합니다'}
            </div>
          </div>
        ) : last ? (
          <button className="primary block" onClick={onDone}>
            이해했습니다 · 연습 시작
          </button>
        ) : (
          <button className="primary block" onClick={() => setI(i + 1)}>
            다음
          </button>
        )}
        {!last && !done && (
          <button className="ghost block sm" style={{ marginTop: 8 }} onClick={onDone}>
            건너뛰기
          </button>
        )}
      </div>
    </div>
  )
}
