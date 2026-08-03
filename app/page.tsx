'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

function randomCode() {
  const alpha = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < 4; i++) s += alpha[Math.floor(Math.random() * alpha.length)]
  return s
}

export default function Home() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [storeOk, setStoreOk] = useState(true)

  // 저장소가 인메모리면 기기마다 다른 서버 인스턴스에 붙어 같은 방에 못 들어간다.
  // 조용히 실패하면 워크숍 한가운데서 무너지므로 미리 말한다.
  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((d: { multiDeviceSafe: boolean }) => setStoreOk(d.multiDeviceSafe))
      .catch(() => {})
  }, [])

  return (
    <main className="wrap">
      <div style={{ height: 28 }} />
      <div className="tiny dim" style={{ letterSpacing: '0.22em' }}>
        WALK &amp; TALK · 체험학습
      </div>
      <h1 style={{ fontSize: 30, marginTop: 8 }}>관제탑</h1>
      <p className="muted" style={{ marginTop: 6 }}>
        같은 시스템을 <b style={{ color: 'var(--ink)' }}>서로 다른 은유</b>로 보는 4~6명.
        <br />
        번역하지 못하면 아무것도 돌릴 수 없습니다.
      </p>

      {!storeOk && (
        <div className="card warn mt2">
          <b className="small">저장소가 연결되지 않았습니다</b>
          <p className="tiny muted" style={{ marginTop: 5, marginBottom: 0 }}>
            지금은 임시 메모리로 동작 중이라 <b>여러 기기가 같은 방에 들어갈 수 없습니다.</b>{' '}
            Vercel 프로젝트에 Upstash Redis를 연결한 뒤 다시 배포해 주세요. (한 기기에서 규칙을
            둘러보는 것은 가능합니다.)
          </p>
        </div>
      )}

      <div className="card mt2">
        <div className="tiny dim">한 방에 모여 각자 폰으로 접속하세요</div>
        <button
          className="primary block"
          style={{ marginTop: 10 }}
          onClick={() => router.push(`/room/${randomCode()}`)}
        >
          새 방 만들기
        </button>
      </div>

      <div className="card mt">
        <div className="tiny dim">방 코드가 있다면</div>
        <input
          className="code"
          style={{ marginTop: 10 }}
          value={code}
          maxLength={4}
          inputMode="text"
          autoCapitalize="characters"
          placeholder="····"
          onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
        />
        <button
          className="block"
          style={{ marginTop: 10 }}
          disabled={code.length < 4}
          onClick={() => router.push(`/room/${code}`)}
        >
          입장
        </button>
      </div>

      <div className="card mt2">
        <h2 style={{ fontSize: 15 }}>한 줄 규칙</h2>
        <p className="small muted" style={{ marginTop: 8, marginBottom: 0 }}>
          내 계기판을 목표대로 만드세요. 단,
          <b style={{ color: 'var(--ink)' }}> 내가 보는 축과 내가 만지는 축은 다르고</b>,
          조작하려면 남에게 물어 <b style={{ color: 'var(--accent)' }}>번역 토큰</b>을 얻어야
          합니다.
        </p>
      </div>

      <p className="tiny dim mt2 center" style={{ lineHeight: 1.7 }}>
        Gerald Weinberg의 체험학습에서 영감을 받아,
        <br />
        Walk&amp;Talk 「메타포와 클린 랭귀지」 · 「Team Big Five」를 도구로 씁니다.
      </p>
    </main>
  )
}
