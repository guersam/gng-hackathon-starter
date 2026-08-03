// 목표를 '그 사람의 은유 어휘로만' 문장화한다. 숫자는 절대 나오지 않는다.

import type { Goal, Metaphor } from './types'

export function goalText(g: Goal, m: Metaphor): string {
  if (g.kind === 'level') {
    const ax = m.axes[g.axis]
    return `「${ax.label}」이(가) ${ax.steps[g.target]} 상태여야 합니다`
  }
  const a = m.axes[g.a]
  const b = m.axes[g.b]
  const rel =
    g.cmp === 'gt'
      ? '보다 높아야'
      : g.cmp === 'lt'
        ? '보다 낮아야'
        : '와 같은 높이여야'
  return `「${a.label}」이(가) 「${b.label}」${rel} 합니다`
}
