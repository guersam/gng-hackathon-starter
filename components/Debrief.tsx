'use client'

// 「관제탑」 디브리핑 화면.
// 승패는 곁다리다. 본편은 소통 지도다.
// 외부 라이브러리 없음. 인라인 SVG + 인라인 스타일 객체만 쓴다.

import type { CSSProperties, JSX, ReactNode } from 'react'
import { useMemo, useState } from 'react'
import type { GameEvent, GameState } from '@/lib/types'
import { METAPHORS } from '@/lib/metaphors'
import {
  analyze,
  circleLayout,
  edgePath,
  strokeWidthFor,
  MAP_SIZE,
  MAP_H,
  NODE_R,
  type DebriefData,
  type Edge,
  type FactorEstimate,
  type Grade,
  type NodePos,
  type PlayerStat,
} from '@/lib/debrief'

// ---------------------------------------------------------------- 토큰

const C = {
  bg: 'var(--bg, #0B0E14)',
  panel: 'var(--panel, #141924)',
  panel2: 'var(--panel2, #1C2230)',
  line: 'var(--line, #2A3346)',
  ink: 'var(--ink, #E8ECF4)',
  ink2: 'var(--ink2, #9AA6BF)',
  ink3: 'var(--ink3, #5D6B87)',
  accent: 'var(--accent, #6FE3C4)',
  warn: 'var(--warn, #F2B872)',
  bad: 'var(--bad, #F2727A)',
  r: 'var(--r, 14px)',
}

// SVG stroke는 CSS 변수를 currentColor 없이도 받지만, 안전하게 리터럴을 쓴다.
const HEX = {
  accent: '#6FE3C4',
  warn: '#F2B872',
  bad: '#F2727A',
  line: '#2A3346',
  ink: '#E8ECF4',
  ink2: '#9AA6BF',
  ink3: '#5D6B87',
  panel2: '#1C2230',
  panel: '#141924',
}

const S: Record<string, CSSProperties> = {
  page: {
    background: C.bg,
    color: C.ink,
    minHeight: '100dvh',
    padding: '20px 14px 72px',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Pretendard", "Segoe UI", Roboto, sans-serif',
    WebkitTextSizeAdjust: '100%',
    lineHeight: 1.6,
  },
  section: {
    background: C.panel,
    border: `1px solid ${C.line}`,
    borderRadius: C.r,
    padding: '18px 16px',
    marginBottom: 28,
  },
  h2: {
    fontSize: 17,
    fontWeight: 700,
    margin: '0 0 4px',
    letterSpacing: '-0.01em',
  },
  sub: { fontSize: 12.5, color: C.ink2, margin: '0 0 16px' },
  small: { fontSize: 12, color: C.ink3 },
  chipRow: { display: 'flex', flexWrap: 'wrap', gap: 8 },
}

// ---------------------------------------------------------------- 작은 조각

function Section(p: { title: string; kicker?: string; lead?: string; children: ReactNode }) {
  return (
    <section style={S.section}>
      {p.kicker ? (
        <div
          style={{
            fontSize: 11,
            letterSpacing: '0.14em',
            color: C.ink3,
            marginBottom: 6,
            fontWeight: 700,
          }}
        >
          {p.kicker}
        </div>
      ) : null}
      <h2 style={S.h2}>{p.title}</h2>
      {p.lead ? <p style={S.sub}>{p.lead}</p> : <div style={{ height: 12 }} />}
      {p.children}
    </section>
  )
}

function Bar(p: { value: number; max: number; color: string; muted?: boolean }) {
  const w = p.max > 0 ? Math.max(p.value > 0 ? 3 : 0, (p.value / p.max) * 100) : 0
  return (
    <div
      style={{
        height: 10,
        background: C.panel2,
        borderRadius: 6,
        overflow: 'hidden',
        border: `1px solid ${C.line}`,
      }}
    >
      <div
        style={{
          width: `${w}%`,
          height: '100%',
          background: p.color,
          opacity: p.muted ? 0.35 : 1,
          borderRadius: 6,
          transition: 'width .4s ease',
        }}
      />
    </div>
  )
}

const GRADE_COLOR: Record<Grade, string> = {
  상: HEX.accent,
  중: HEX.warn,
  하: HEX.bad,
  '?': HEX.ink3,
}

function GradeChip(p: { grade: Grade }) {
  const col = GRADE_COLOR[p.grade]
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 30,
        height: 24,
        padding: '0 8px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        color: col,
        border: `1px solid ${col}`,
        background: 'transparent',
        flexShrink: 0,
      }}
    >
      {p.grade === '?' ? '자료부족' : p.grade}
    </span>
  )
}

function Stat(p: { label: string; value: string; hint?: string; color?: string }) {
  return (
    <div
      style={{
        flex: '1 1 128px',
        background: C.panel2,
        border: `1px solid ${C.line}`,
        borderRadius: 10,
        padding: '12px 12px 10px',
        minWidth: 128,
      }}
    >
      <div style={{ fontSize: 11, color: C.ink3, marginBottom: 4 }}>{p.label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: p.color ?? C.ink, lineHeight: 1.2 }}>
        {p.value}
      </div>
      {p.hint ? <div style={{ fontSize: 11, color: C.ink2, marginTop: 3 }}>{p.hint}</div> : null}
    </div>
  )
}

// ---------------------------------------------------------------- 1. 소통 지도

const TONE_COLOR: Record<Edge['tone'], string> = {
  ok: HEX.accent,
  mixed: HEX.warn,
  broken: HEX.bad,
}

function CommunicationMap(p: { d: DebriefData; meId: string }) {
  const { d, meId } = p
  const ids = d.players.map((x) => x.id)
  const pos = useMemo(
    () => circleLayout(ids, (id) => d.players.find((x) => x.id === id)?.name ?? id),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ids.join(','), d.players],
  )
  const byId = new Map<string, NodePos>(pos.map((n) => [n.id, n]))
  const maxAsks = d.edges.reduce((m, e) => Math.max(m, e.asks), 0)
  const [sel, setSel] = useState<string | null>(null)

  const statOf = (id: string): PlayerStat | undefined => d.players.find((x) => x.id === id)

  return (
    <>
      <svg
        viewBox={`0 0 ${MAP_SIZE} ${MAP_H}`}
        style={{ width: '100%', height: 'auto', display: 'block', touchAction: 'manipulation' }}
        role="img"
        aria-label="누가 누구에게 질문했는지 보여주는 방향 그래프"
      >
        <defs>
          {(['ok', 'mixed', 'broken'] as const).map((k) => (
            <marker
              key={k}
              id={`arw-${k}`}
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="5.5"
              markerHeight="5.5"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill={TONE_COLOR[k]} />
            </marker>
          ))}
        </defs>

        {/* 간선 */}
        {d.edges.map((e) => {
          const a = byId.get(e.from)
          const b = byId.get(e.to)
          if (!a || !b) return null
          const col = TONE_COLOR[e.tone]
          const dim = sel !== null && sel !== e.from && sel !== e.to
          return (
            <g key={`${e.from}-${e.to}`} opacity={dim ? 0.15 : 1}>
              <path
                d={edgePath(a, b)}
                fill="none"
                stroke={col}
                strokeWidth={strokeWidthFor(e.asks, maxAsks)}
                strokeLinecap="round"
                strokeDasharray={e.tone === 'broken' ? '5 4' : undefined}
                markerEnd={`url(#arw-${e.tone})`}
                opacity={0.9}
              />
            </g>
          )
        })}

        {/* 노드 */}
        {pos.map((n) => {
          const s = statOf(n.id)
          if (!s) return null
          const isMe = n.id === meId
          const stroke = s.neverReceived ? HEX.bad : s.neverAsked ? HEX.warn : HEX.line
          const dim = sel !== null && sel !== n.id
          return (
            <g
              key={n.id}
              opacity={dim ? 0.3 : 1}
              onClick={() => setSel(sel === n.id ? null : n.id)}
              style={{ cursor: 'pointer' }}
            >
              {/* 44px 이상 터치 타겟 */}
              <circle cx={n.x} cy={n.y} r={26} fill="transparent" />
              {isMe ? (
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={NODE_R + 4}
                  fill="none"
                  stroke={HEX.accent}
                  strokeWidth={1}
                  opacity={0.5}
                />
              ) : null}
              <circle
                cx={n.x}
                cy={n.y}
                r={NODE_R}
                fill={s.neverReceived ? '#221319' : HEX.panel2}
                stroke={stroke}
                strokeWidth={s.neverReceived || s.neverAsked ? 2 : 1.2}
                strokeDasharray={s.neverAsked && !s.neverReceived ? '4 3' : undefined}
              />
              <text
                x={n.x}
                y={n.y + 1}
                textAnchor="middle"
                fontSize="11"
                fontWeight="700"
                fill={s.neverReceived ? HEX.bad : HEX.ink}
              >
                {n.name.length > 4 ? n.name.slice(0, 4) : n.name}
              </text>
              <text x={n.x} y={n.y + 13} textAnchor="middle" fontSize="9" fill={HEX.ink3}>
                {`↑${s.asked} ↓${s.received}`}
              </text>
              {isMe ? (
                <text x={n.x} y={n.y - NODE_R - 6} textAnchor="middle" fontSize="9.5" fill={HEX.accent}>
                  나
                </text>
              ) : null}
            </g>
          )
        })}
      </svg>

      <div style={{ fontSize: 11, color: C.ink3, textAlign: 'center', marginTop: -4 }}>
        ↑ 내가 던진 질문 &nbsp;·&nbsp; ↓ 내가 받은 질문 &nbsp;·&nbsp; 노드를 누르면 그 사람만 봅니다
      </div>

      {/* 범례 */}
      <div style={{ ...S.chipRow, marginTop: 14 }}>
        <Legend color={HEX.accent} label="닫힌 루프 — 승인까지 갔다" />
        <Legend color={HEX.warn} label="어긋난 적 있음 — 되돌려 말했는데 「아님」" />
        <Legend color={HEX.bad} label="한 번도 닫히지 않은 관계" dashed />
      </div>
      <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
        {d.unheard.length > 0 ? (
          <Callout tone="bad">
            <b>{d.unheard.map((x) => x.name).join(', ')}</b> — 게임 내내{' '}
            <b>아무도 이 사람에게 묻지 않았습니다.</b> 지도에서 붉은 실선 테두리로 표시된 노드입니다.
            시스템의 어떤 축은 이 사람만 볼 수 있었을지도 모릅니다.
          </Callout>
        ) : null}
        {d.silent.filter((x) => !x.neverReceived).length > 0 ? (
          <Callout tone="warn">
            <b>{d.silent.filter((x) => !x.neverReceived).map((x) => x.name).join(', ')}</b> — 한 번도
            질문하지 않았습니다(점선 테두리). 답만 하는 자리에 있었다는 뜻입니다.
          </Callout>
        ) : null}
        {d.unheard.length === 0 && d.silent.length === 0 ? (
          <Callout tone="ok">
            모든 사람이 최소 한 번은 묻고, 최소 한 번은 질문받았습니다. 드문 일입니다.
          </Callout>
        ) : null}
      </div>

      {/* 표 — 지도는 형태를, 표는 숫자를 보여준다 */}
      <div style={{ marginTop: 16, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, minWidth: 280 }}>
          <thead>
            <tr style={{ color: C.ink3, textAlign: 'left' }}>
              <th style={th}>사람</th>
              <th style={thR}>질문함</th>
              <th style={thR}>질문받음</th>
              <th style={thR}>말 건 상대</th>
              <th style={thR}>번 토큰</th>
            </tr>
          </thead>
          <tbody>
            {d.players.map((s) => (
              <tr
                key={s.id}
                style={{
                  borderTop: `1px solid ${C.line}`,
                  background: s.id === meId ? 'rgba(111,227,196,0.06)' : undefined,
                }}
              >
                <td style={{ ...td, fontWeight: s.id === meId ? 700 : 400 }}>
                  {s.name}
                  {s.id === meId ? <span style={{ color: C.accent, fontSize: 11 }}> (나)</span> : null}
                </td>
                <td style={{ ...tdR, color: s.asked === 0 ? C.warn : C.ink }}>{s.asked}</td>
                <td style={{ ...tdR, color: s.received === 0 ? C.bad : C.ink }}>{s.received}</td>
                <td style={tdR}>{s.partnersAsked}</td>
                <td style={tdR}>{s.earned}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ ...S.small, marginTop: 6 }}>
          「번 토큰」은 게임 전체 누적입니다. 라운드가 끝날 때마다 소멸했으므로 손에 남은 수와 다릅니다.
        </div>
      </div>
    </>
  )
}

const th: CSSProperties = { padding: '6px 4px', fontWeight: 600, fontSize: 11 }
const thR: CSSProperties = { ...th, textAlign: 'right' }
const td: CSSProperties = { padding: '9px 4px' }
const tdR: CSSProperties = { ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }

function Legend(p: { color: string; label: string; dashed?: boolean }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 11.5, color: C.ink2 }}>
      <span
        style={{
          width: 22,
          height: 0,
          borderTop: `3px ${p.dashed ? 'dashed' : 'solid'} ${p.color}`,
          display: 'inline-block',
        }}
      />
      {p.label}
    </span>
  )
}

function Callout(p: { tone: 'ok' | 'warn' | 'bad'; children: ReactNode }) {
  const col = p.tone === 'ok' ? HEX.accent : p.tone === 'warn' ? HEX.warn : HEX.bad
  return (
    <div
      style={{
        borderLeft: `3px solid ${col}`,
        background: C.panel2,
        borderRadius: '4px 10px 10px 4px',
        padding: '11px 13px',
        fontSize: 13,
        color: C.ink,
      }}
    >
      {p.children}
    </div>
  )
}

// ---------------------------------------------------------------- 본체

export default function Debrief(props: {
  state: GameState
  events: GameEvent[]
  meId: string
}): JSX.Element {
  const { state, events, meId } = props
  // 방 화면이 1초마다 폴링하므로 state/events는 매번 새 객체로 온다.
  // 이벤트 로그는 append-only이므로 길이가 그대로면 결과도 그대로다 → 길이로만 재계산한다.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const d = useMemo(() => analyze(state, events), [events.length, state.players.length, state.won])
  const me = d.players.find((p) => p.id === meId) ?? null

  const maxQ = d.questions.reduce((m, q) => Math.max(m, q.count), 0)
  const five = d.factors.filter((f) => f.group === '5요소')
  const mech = d.factors.filter((f) => f.group === '조정 메커니즘')
  const bottleneck = pickBottleneck(d.factors)

  return (
    <div style={S.page}>
      {/* 곁다리: 승패 */}
      <header style={{ marginBottom: 26 }}>
        <div style={{ fontSize: 11, letterSpacing: '0.16em', color: C.ink3, fontWeight: 700 }}>
          DEBRIEF · 관제탑
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: '6px 0 2px', letterSpacing: '-0.02em' }}>
          우리는 어떻게 말했는가
        </h1>
        <p style={{ fontSize: 13, color: C.ink2, margin: '0 0 14px' }}>
          {d.won ? '4개 축을 모두 맞췄습니다.' : `최고 기록은 4개 축 중 ${d.bestMatched}개 일치였습니다.`}{' '}
          하지만 이 화면의 본론은 그게 아닙니다.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Stat label="주고받은 질문" value={`${d.totalAsks}건`} />
          <Stat
            label="닫힌 루프"
            value={`${d.loop.ok}건`}
            hint={`승인률 ${Math.round(d.loop.okRate * 100)}%`}
            color={HEX.accent}
          />
          <Stat
            label="아무도 묻지 않은 사람"
            value={`${d.unheard.length}명`}
            color={d.unheard.length > 0 ? HEX.bad : HEX.ink}
          />
          <Stat label="플레이 시간" value={`${d.playMinutes}분`} />
        </div>
        {me ? (
          <div style={{ marginTop: 12, fontSize: 12.5, color: C.ink2 }}>
            <b style={{ color: C.ink }}>{me.name}</b> 님은 {me.asked}번 묻고 {me.received}번 질문받았습니다.
            {me.neverReceived ? ' 아무도 당신에게 묻지 않았습니다.' : ''}
            {me.neverAsked ? ' 당신은 한 번도 묻지 않았습니다.' : ''}
          </div>
        ) : null}
      </header>

      <Section
        kicker="본편"
        title="1. 소통 지도"
        lead="화살표는 「A가 B에게 물었다」입니다. 굵기는 횟수, 색은 그 루프가 닫혔는지입니다. 말이 오간 곳보다 오가지 않은 곳을 보세요."
      >
        <CommunicationMap d={d} meId={meId} />
      </Section>

      <Section
        kicker="도구"
        title="2. 어떤 질문을 썼는가"
        lead="클린 랭귀지는 5종입니다. 대부분의 팀은 「어떤 종류의」 하나만 씁니다. 안 쓴 질문은 안 물어본 세계입니다."
      >
        <div style={{ display: 'grid', gap: 12 }}>
          {d.questions.map((q) => (
            <div key={q.id}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  gap: 8,
                  marginBottom: 5,
                }}
              >
                <span style={{ fontSize: 13, color: q.count === 0 ? C.ink3 : C.ink }}>
                  <span style={{ color: C.ink3, fontSize: 11, marginRight: 6 }}>{q.category}</span>
                  「{q.short}」
                </span>
                <span
                  style={{
                    fontSize: 12,
                    color: q.count === 0 ? C.warn : C.ink2,
                    fontVariantNumeric: 'tabular-nums',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {q.count}회 · {Math.round(q.share * 100)}%
                </span>
              </div>
              <Bar value={q.count} max={maxQ} color={q.count === 0 ? HEX.line : HEX.accent} />
              {q.count === 0 ? (
                <div style={{ fontSize: 11.5, color: C.warn, marginTop: 5 }}>
                  이 질문은 한 번도 나오지 않았습니다 — {q.template}
                </div>
              ) : null}
            </div>
          ))}
        </div>
        {d.unusedQuestions.length >= 3 ? (
          <div style={{ marginTop: 14 }}>
            <Callout tone="warn">
              5종 중 {d.unusedQuestions.length}종을 손도 대지 않았습니다. 도구를 다 꺼내지 않은 채로 12분을
              보낸 겁니다.
            </Callout>
          </div>
        ) : null}
      </Section>

      <Section
        kicker="조정 메커니즘"
        title="3. 되돌려 말했을 때 한 번에 맞은 비율"
        lead="닫힌 루프는 네 박자입니다. 보냈다 → 받았다고 알린다 → 내가 이해한 걸 되돌려준다 → 맞다/틀리다 확인해준다. 세 번째와 네 번째 사이에서 팀은 자주 미끄러집니다."
      >
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          <Stat
            label="승인률"
            value={`${Math.round(d.loop.okRate * 100)}%`}
            hint={`${d.loop.ok} / ${d.loop.confirms} 확인`}
            color={HEX.accent}
          />
          <Stat
            label="한 번에 맞은 비율"
            value={`${Math.round(d.loop.firstTryRate * 100)}%`}
            hint={`${d.loop.firstTry} / ${d.loop.resolved} 루프`}
            color={d.loop.firstTryRate >= 0.6 ? HEX.accent : HEX.warn}
          />
          <Stat
            label="「아님」이 돌아옴"
            value={`${d.loop.failed}회`}
            hint={`취소된 루프 ${d.loop.canceled}건`}
            color={d.loop.failed > 0 ? HEX.bad : HEX.ink}
          />
        </div>
        <div style={{ display: 'grid', gap: 10 }}>
          <LabeledBar
            label="한 번에 맞음"
            value={d.loop.firstTry}
            max={Math.max(1, d.loop.resolved)}
            color={HEX.accent}
          />
          <LabeledBar
            label="두 번 이상 되돌려 말해야 했음"
            value={Math.max(0, d.loop.resolved - d.loop.firstTry)}
            max={Math.max(1, d.loop.resolved)}
            color={HEX.warn}
          />
        </div>
        <p style={{ ...S.small, marginTop: 12 }}>
          한 번에 맞았다고 깊이 이해한 건 아닙니다. 짧은 주제만 골랐을 수도 있습니다.
        </p>
      </Section>

      <Section
        kicker="공유 멘탈 모델"
        title="4. 공용 언어를 샀는가"
        lead="XP의 시스템 은유는 팀 전체가 시스템을 같은 이야기로 말하게 하는 장치입니다. 이 게임에서 그 값은 「전원의 토큰 소멸」이었습니다."
      >
        {d.metaphor.declared && d.metaphor.before && d.metaphor.after ? (
          <>
            <div style={{ fontSize: 13, marginBottom: 14 }}>
              {d.metaphor.proposerName ? (
                <>
                  <b>{d.metaphor.proposerName}</b> 님이 제안했고, 전원 동의까지{' '}
                  <b>{d.metaphor.agreeSeconds}초</b> 걸렸습니다.{' '}
                </>
              ) : null}
              {d.metaphor.round ? `R${d.metaphor.round}에 ` : ''}
              <b style={{ color: C.accent }}>{metaphorLabel(d.metaphor.metaphorId)}</b> 은유로 통일했습니다.
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              <RateRow
                label="선언 전"
                rate={d.metaphor.before.rate}
                ok={d.metaphor.before.ok}
                minutes={d.metaphor.before.minutes}
                max={Math.max(d.metaphor.before.rate, d.metaphor.after.rate, 0.1)}
                color={HEX.ink3}
              />
              <RateRow
                label="선언 후"
                rate={d.metaphor.after.rate}
                ok={d.metaphor.after.ok}
                minutes={d.metaphor.after.minutes}
                max={Math.max(d.metaphor.before.rate, d.metaphor.after.rate, 0.1)}
                color={HEX.accent}
              />
            </div>
            <div style={{ marginTop: 14 }}>
              <Callout tone={(d.metaphor.speedup ?? 0) > 1 ? 'ok' : 'warn'}>
                {d.metaphor.speedup !== null
                  ? `분당 토큰 획득 속도가 ${d.metaphor.speedup}배가 되었습니다.`
                  : '선언 전에는 토큰을 얻지 못했으므로 배수를 낼 수 없습니다.'}{' '}
                {(d.metaphor.speedup ?? 0) > 1
                  ? '치른 값보다 벌어들인 게 컸는지, 아니면 그냥 게임에 익숙해진 것인지는 여러분만 압니다.'
                  : '은유를 공유했다고 이해까지 공유되는 건 아닙니다. 무엇이 여전히 어긋나 있었나요?'}
              </Callout>
            </div>
          </>
        ) : (
          <Callout tone="warn">
            <b>이 팀은 공용 언어를 사지 않았습니다.</b>
            <div style={{ marginTop: 8, color: C.ink2, fontSize: 12.5 }}>
              {d.metaphor.proposerName
                ? `「${d.metaphor.proposerName}」 님의 제안은 있었지만 전원 동의에 이르지 못했습니다. `
                : '은유를 제안한 사람조차 없었습니다. '}
              XP에서 시스템 은유는 「모두가 같은 그림을 머릿속에 두게 하는 한 문장」입니다. 그것이 없으면
              팀은 매번 통역을 합니다. 통역은 공짜처럼 보이지만, 이 게임에서 여러분이 90초마다 치른 값이
              바로 그 통역비였습니다.
            </div>
          </Callout>
        )}
      </Section>

      <Section
        kicker="Team Big Five · Salas"
        title="5. 지금 우리 팀의 병목은 무엇인가"
        lead="아래는 데이터에서 읽은 「신호」와, 그 신호에 대한 「추정」입니다. 추정은 추정일 뿐입니다. 방 안에 있었던 사람은 여러분이고, 반박할 권리도 여러분에게 있습니다."
      >
        {bottleneck ? (
          <div style={{ marginBottom: 16 }}>
            <Callout tone="bad">
              가장 의심스러운 병목: <b>{bottleneck.name}</b>
              <div style={{ fontSize: 12, color: C.ink2, marginTop: 4 }}>
                8개 요소 중 어떤 게 안 되어서 병목인가 — 데이터는 여기를 가리킵니다. 동의하나요?
              </div>
            </Callout>
          </div>
        ) : null}

        <GroupTitle>5요소</GroupTitle>
        <div style={{ display: 'grid', gap: 10, marginBottom: 20 }}>
          {five.map((f) => (
            <FactorCard key={f.id} f={f} />
          ))}
        </div>
        <GroupTitle>3개 조정 메커니즘</GroupTitle>
        <div style={{ display: 'grid', gap: 10 }}>
          {mech.map((f) => (
            <FactorCard key={f.id} f={f} />
          ))}
        </div>

        <p style={{ ...S.small, marginTop: 16, lineHeight: 1.7 }}>
          「일단은 이건 내 일, 저건 니 일, 서로 터치하지 말자」 — 이러면 팀이 아니라 워크그룹입니다.
          데일리 스크럼을 잘한다는 건 규칙을 지키는 게 아니라, 상호 성과 모니터링·지원 행동·적응성이 실제로
          일어나는 것입니다.
        </p>
      </Section>

      <Section
        kicker="회고"
        title="6. 지금 서로에게 물어볼 것"
        lead="이 세 질문은 위 데이터에서 나왔습니다. 답을 내려고 묻는 게 아니라, 그때 무슨 일이 있었는지 꺼내려고 묻는 겁니다. 클린 질문은 게임 안에서만 쓰는 도구가 아닙니다."
      >
        <div style={{ display: 'grid', gap: 14 }}>
          {d.retro.map((q, i) => (
            <div
              key={i}
              style={{
                background: C.panel2,
                border: `1px solid ${C.line}`,
                borderRadius: 12,
                padding: '14px 14px 13px',
              }}
            >
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 999,
                    background: HEX.accent,
                    color: '#0B0E14',
                    fontSize: 12,
                    fontWeight: 800,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {i + 1}
                </span>
                <span style={{ fontSize: 11, color: C.ink3 }}>{q.aims}</span>
              </div>
              <div style={{ fontSize: 11.5, color: C.ink3, marginBottom: 8 }}>{q.fact}</div>
              <div style={{ fontSize: 15, lineHeight: 1.65, fontWeight: 500 }}>{q.question}</div>
            </div>
          ))}
        </div>
        <p style={{ ...S.small, marginTop: 16 }}>
          한 사람씩 소리 내어 답하세요. 답을 들은 사람은 「제가 이해한 건 ___ 입니다」라고 되돌려 말하세요.
          루프는 게임이 끝나도 계속 닫아야 합니다.
        </p>
      </Section>

      <div style={{ textAlign: 'center', ...S.small, paddingBottom: 20 }}>
        관제탑 · Team Big Five(Salas) + 클린 랭귀지(Grove) 기반 디브리핑
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- 보조

function GroupTitle(p: { children: ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        letterSpacing: '0.12em',
        color: C.ink3,
        fontWeight: 700,
        marginBottom: 8,
      }}
    >
      {p.children}
    </div>
  )
}

function FactorCard(p: { f: FactorEstimate }) {
  const { f } = p
  return (
    <div
      style={{
        background: C.panel2,
        border: `1px solid ${C.line}`,
        borderRadius: 12,
        padding: '13px 13px 12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span style={{ fontSize: 14, fontWeight: 700, flex: 1 }}>{f.name}</span>
        <GradeChip grade={f.grade} />
      </div>

      <div style={{ marginBottom: 9 }}>
        <Tag color={HEX.ink2}>신호</Tag>
        <div
          style={{
            fontSize: 12.5,
            color: C.ink,
            marginTop: 5,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {f.signal}
        </div>
      </div>

      <div
        style={{
          borderTop: `1px dashed ${C.line}`,
          paddingTop: 9,
        }}
      >
        <Tag color={HEX.warn}>해석 (추정)</Tag>
        <div style={{ fontSize: 12.5, color: C.ink2, marginTop: 5, lineHeight: 1.65 }}>{f.reading}</div>
      </div>
    </div>
  )
}

function Tag(p: { color: string; children: ReactNode }) {
  return (
    <span
      style={{
        fontSize: 10,
        letterSpacing: '0.1em',
        fontWeight: 700,
        color: p.color,
        border: `1px solid ${p.color}`,
        borderRadius: 4,
        padding: '1px 5px',
        opacity: 0.8,
      }}
    >
      {p.children}
    </span>
  )
}

function LabeledBar(p: { label: string; value: number; max: number; color: string }) {
  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 12,
          color: C.ink2,
          marginBottom: 5,
        }}
      >
        <span>{p.label}</span>
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{p.value}건</span>
      </div>
      <Bar value={p.value} max={p.max} color={p.color} />
    </div>
  )
}

function RateRow(p: {
  label: string
  rate: number
  ok: number
  minutes: number
  max: number
  color: string
}) {
  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          fontSize: 12.5,
          marginBottom: 5,
        }}
      >
        <span style={{ color: C.ink }}>{p.label}</span>
        <span style={{ color: C.ink2, fontVariantNumeric: 'tabular-nums' }}>
          분당 <b style={{ color: p.color === HEX.ink3 ? C.ink2 : C.accent }}>{p.rate}</b>건
          <span style={{ color: C.ink3 }}>
            {' '}
            ({p.ok}건 / {p.minutes}분)
          </span>
        </span>
      </div>
      <Bar value={p.rate} max={p.max} color={p.color} />
    </div>
  )
}

/** 은유 이름. 모르는 id면 id를 그대로 보여준다.
 *  (getMetaphor()는 없는 id를 첫 은유로 폴백하므로 여기서는 쓰지 않는다 — 틀린 이름을 보여주게 된다.) */
function metaphorLabel(id: string | null): string {
  if (!id) return '—'
  const m = METAPHORS.find((x) => x.id === id)
  return m ? `${m.emoji} ${m.name}` : id
}

/** 가장 낮은 등급 중 첫 번째를 병목 후보로 본다. 단정하지 않기 위해 '?'는 제외. */
function pickBottleneck(factors: FactorEstimate[]): FactorEstimate | null {
  const low = factors.filter((f) => f.grade === '하')
  if (low.length === 0) return null
  // 조정 메커니즘이 무너지면 5요소는 애초에 성립하지 않는다 — 메커니즘을 먼저 의심한다.
  return low.find((f) => f.group === '조정 메커니즘') ?? low[0]
}
