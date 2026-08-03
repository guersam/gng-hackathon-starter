'use client'

import { AXES, type AxisId, type Level, type Metaphor, type Player } from '@/lib/types'

export function StepBar({ level, ghost }: { level: Level | null; ghost?: boolean }) {
  return (
    <div className="steps">
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className={
            'step' + (level !== null && i <= level ? (ghost ? ' ghost' : ' fill') : '')
          }
        />
      ))}
    </div>
  )
}

export default function Console({
  me,
  metaphor,
  visible,
  tokens,
  canTurn,
  onTurn,
}: {
  me: Player
  metaphor: Metaphor
  visible: Partial<Record<AxisId, Level>>
  tokens: number
  canTurn: boolean
  onTurn: (axis: AxisId, dir: 1 | -1) => void
}) {
  return (
    <div>
      {AXES.map((ax) => {
        const info = metaphor.axes[ax]
        const iRead = me.reads.includes(ax)
        const iWrite = me.writes.includes(ax)
        const lvl = visible[ax]

        return (
          <div
            key={ax}
            className={'dial' + (iWrite ? ' write' : '') + (iWrite ? ' blind' : '')}
          >
            <div className="row between">
              <span className="dial-label">{info.label}</span>
              <span className="chip tiny">{iRead ? '👁 보임' : '🔧 조작'}</span>
            </div>

            {iRead && lvl !== undefined ? (
              <>
                <div className="dial-value">{info.steps[lvl]}</div>
                <StepBar level={lvl} />
                <div className="tiny dim" style={{ marginTop: 7 }}>
                  당신은 이 값을 볼 수 있지만 <b>바꿀 수 없습니다</b>
                </div>
              </>
            ) : (
              <>
                <div className="dial-value dim">— 보이지 않음 —</div>
                <StepBar level={null} />
                <div className="tiny dim" style={{ marginTop: 7 }}>
                  당신은 이 값을 바꿀 수 있지만 <b>결과를 볼 수 없습니다</b>
                </div>
              </>
            )}

            {iWrite && (
              <div className="turnbar">
                <button
                  className="sm"
                  disabled={!canTurn || tokens < 1}
                  onClick={() => onTurn(ax, -1)}
                >
                  ◀ 낮추기
                </button>
                <button
                  className="sm"
                  disabled={!canTurn || tokens < 1}
                  onClick={() => onTurn(ax, +1)}
                >
                  높이기 ▶
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
