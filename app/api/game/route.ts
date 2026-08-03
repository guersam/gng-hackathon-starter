import { NextResponse } from 'next/server'
import { appendEvents, hasRedis, readEvents } from '@/lib/store'
import { decide, foldEvents, redactState, viewFor, type Action } from '@/lib/engine'
import { METAPHORS } from '@/lib/metaphors'
import type { ApiResponse } from '@/lib/types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const POOL = METAPHORS.map((m) => m.id)

function bad(error: string, status = 400) {
  return NextResponse.json<ApiResponse>({ ok: false, error }, { status })
}

function normalize(code: string) {
  return code.trim().toUpperCase().slice(0, 6)
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const code = normalize(url.searchParams.get('code') ?? '')
  const playerId = url.searchParams.get('playerId') ?? ''
  if (!code) return bad('방 코드가 없습니다')

  const events = await readEvents(code)
  const state = foldEvents(code, events, POOL)
  return NextResponse.json<ApiResponse>({
    ok: true,
    state: redactState(state, playerId),
    view: viewFor(state, playerId),
    events: state.phase === 'debrief' ? events : undefined,
  })
}

export async function POST(req: Request) {
  let body: { code?: string; playerId?: string; action?: Action }
  try {
    body = await req.json()
  } catch {
    return bad('잘못된 요청입니다')
  }

  const code = normalize(body.code ?? '')
  const playerId = body.playerId ?? ''
  const action = body.action
  if (!code || !playerId || !action) return bad('잘못된 요청입니다')

  // 낙관적 동시성: 접고 → 판정하고 → 기대 길이로 CAS append. 밀리면 다시 읽는다.
  for (let attempt = 0; attempt < 5; attempt++) {
    const events = await readEvents(code)
    const state = foldEvents(code, events, POOL)
    const now = Date.now()

    const outcome = decide(state, playerId, action, now)
    if (!Array.isArray(outcome)) return bad(outcome.error)

    if (outcome.length === 0) {
      return NextResponse.json<ApiResponse>({
        ok: true,
        state: redactState(state, playerId),
        view: viewFor(state, playerId),
      })
    }

    const won = await appendEvents(code, events.length, outcome)
    if (!won) continue

    const next = foldEvents(code, [...events, ...outcome], POOL)
    return NextResponse.json<ApiResponse>({
      ok: true,
      state: redactState(next, playerId),
      view: viewFor(next, playerId),
      events: next.phase === 'debrief' ? [...events, ...outcome] : undefined,
    })
  }

  return bad('동시에 여러 요청이 몰렸습니다. 다시 시도해 주세요', 409)
}

export async function HEAD() {
  return new Response(null, {
    status: 200,
    headers: { 'x-store': hasRedis ? 'redis' : 'memory' },
  })
}
