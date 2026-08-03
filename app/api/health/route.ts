import { NextResponse } from 'next/server'
import { hasRedis } from '@/lib/store'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    store: hasRedis ? 'redis' : 'memory',
    // 인메모리는 서버 인스턴스마다 따로 산다. 여러 사람이 같은 방에 못 들어간다.
    multiDeviceSafe: hasRedis,
  })
}
