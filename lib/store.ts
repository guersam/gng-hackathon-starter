// 방마다 append-only 이벤트 로그 하나. 서버에 가변 상태를 두지 않는다.
// Upstash Redis가 붙어 있으면 그걸 쓰고, 없으면 인메모리로 떨어진다(로컬 개발용).

import type { GameEvent } from './types'

const URL_ = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN

export const hasRedis = Boolean(URL_ && TOKEN)

const TTL_SECONDS = 60 * 60 * 12
const key = (code: string) => `gwanjetap:${code}:events`

// ---------------------------------------------------------------- upstash

async function redis(cmd: (string | number)[]): Promise<unknown> {
  const res = await fetch(URL_!, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(cmd),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`redis ${res.status}: ${await res.text()}`)
  const json = (await res.json()) as { result?: unknown; error?: string }
  if (json.error) throw new Error(`redis: ${json.error}`)
  return json.result
}

// LLEN이 기대값과 같을 때만, 넘긴 이벤트 전부를 한 번에 RPUSH 한다.
// 한 액션이 여러 이벤트를 낳는 경우(예: 라운드 종료 = drift + roundEnd + finish)
// 중간에 다른 요청이 끼어들어 로그가 찢어지면 안 되므로 전체가 한 스크립트 안에서 끝난다.
// ARGV[1]=expectedLen, ARGV[2]=ttl, ARGV[3..]=payloads
const CAS_SCRIPT =
  "if redis.call('LLEN', KEYS[1]) ~= tonumber(ARGV[1]) then return -1 end " +
  "for i = 3, #ARGV do redis.call('RPUSH', KEYS[1], ARGV[i]) end " +
  "redis.call('EXPIRE', KEYS[1], ARGV[2]) " +
  "return redis.call('LLEN', KEYS[1])"

// ---------------------------------------------------------------- memory

const mem = new Map<string, string[]>()

// ---------------------------------------------------------------- api

export async function readEvents(code: string): Promise<GameEvent[]> {
  const raw = hasRedis
    ? ((await redis(['LRANGE', key(code), 0, -1])) as string[] | null) ?? []
    : mem.get(key(code)) ?? []
  return raw.map((s) => JSON.parse(s) as GameEvent)
}

/**
 * 낙관적 append. expectedLen이 현재 길이와 다르면 false를 돌려주고,
 * 호출자는 다시 읽어서 재검증한다.
 */
export async function appendEvents(
  code: string,
  expectedLen: number,
  events: GameEvent[],
): Promise<boolean> {
  if (events.length === 0) return true
  const k = key(code)

  if (!hasRedis) {
    const cur = mem.get(k) ?? []
    if (cur.length !== expectedLen) return false
    mem.set(k, [...cur, ...events.map((e) => JSON.stringify(e))])
    return true
  }

  const n = (await redis([
    'EVAL',
    CAS_SCRIPT,
    1,
    k,
    expectedLen,
    TTL_SECONDS,
    ...events.map((e) => JSON.stringify(e)),
  ])) as number
  return n !== -1
}

export async function roomExists(code: string): Promise<boolean> {
  if (!hasRedis) return mem.has(key(code))
  const n = (await redis(['EXISTS', key(code)])) as number
  return n === 1
}
