# 관제탑 (Control Tower)

[![Deployed on Vercel](https://img.shields.io/badge/Vercel-live-000?logo=vercel&logoColor=white)](https://gwanjetap-wt.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-15-000?logo=nextdotjs&logoColor=white)](https://nextjs.org)

> 같은 시스템을 **서로 다른 은유**로 보는 4~6명.
> 번역하지 못하면 아무것도 돌릴 수 없습니다.

같은 공간에 모인 4~6명이 각자 폰으로 접속해 12~15분 플레이하는 **모바일 웹 체험학습 게임**.
Gerald Weinberg의 experiential learning에서 영감을 받았고, 도구로 **클린 랭귀지**(David Grove)와
**Team Big Five**(Salas et al.)를 씁니다.

**Live:** https://gwanjetap-wt.vercel.app
**설계 문서:** [`docs/PLAN.md`](docs/PLAN.md) — 게임 구조, 루브릭 대조, 진행 안내

---

## 한 줄 규칙

내 계기판을 목표대로 만드세요. 단, **내가 보는 축과 내가 만지는 축은 다르고**,
조작하려면 남에게 물어 **번역 토큰**을 얻어야 합니다.

폰은 채팅 도구가 아니라 **허가증**입니다. 모든 대화는 육성으로 방 안에서 일어납니다.

---

## 로컬 실행

```bash
npm install
npm run dev          # http://localhost:3000
```

라운드 길이를 줄여 빠르게 시험할 때:

```bash
NEXT_PUBLIC_ROUND_MS=15000 npm run dev   # 기본 90000 (90초)
```

기타 스크립트:

```bash
npm run typecheck    # tsc --noEmit
npm run build        # 프로덕션 빌드
```

> 로컬에서는 저장소가 없어도 **인메모리**로 동작합니다. 한 기기에서 규칙을 둘러보기엔 충분하지만,
> 여러 기기가 같은 방에 들어가려면 아래 Redis 설정이 필요합니다.

---

## 배포

### 1. Vercel에 올리기

```bash
npx vercel login
npx vercel link --yes --project gwanjetap-wt
npx vercel --prod
```

Next.js는 자동 감지됩니다. 별도 빌드 설정이 필요 없습니다.

### 2. Redis 연결 (여러 기기로 플레이하려면 필수)

서버리스 인스턴스마다 메모리가 따로라, Redis 없이는 **여러 기기가 같은 방에 못 들어갑니다.**

```bash
npx vercel integration add upstash/upstash-kv   # 무료 티어, 대화형
npx vercel --prod                                # 환경변수 주입 후 재배포
```

또는 Vercel 대시보드에서 **Storage → Upstash for Redis** 를 프로젝트에 연결해도 됩니다.

서버는 아래 두 쌍 중 **아무거나** 있으면 인식합니다 (Upstash·Vercel KV 양쪽 호환):

```
UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN
KV_REST_API_URL       / KV_REST_API_TOKEN
```

### 3. 확인

```bash
curl https://<배포주소>/api/health
# {"store":"redis","multiDeviceSafe":true}   ← 이게 나와야 정상
# {"store":"memory","multiDeviceSafe":false} ← Redis 미연결
```

`memory` 상태에서는 첫 화면에 **경고 배너**가 뜹니다. 조용히 실패하면 워크숍 도중에 무너지므로
일부러 크게 알립니다.

---

## 진행 방법

1. 4~6명이 한 방에 모인다 (같은 물리 공간)
2. 한 명이 **새 방 만들기** → 4글자 코드 공유
3. 각자 폰에서 코드 입력 → 이름 → 참가 → 아무나 **시작하기**
4. 온보딩 3장 + 무제한 연습 라운드 → 본 게임 90초 × 최대 5라운드
5. 종료 화면(**소통 지도**)을 함께 보며 회고 — 여기가 본편입니다

진행요원 없이 굴러가도록 설계했습니다. 자세한 안내는 [`docs/PLAN.md`](docs/PLAN.md) 참고.

---

## 구조

```
lib/types.ts      공유 타입 · 클린 질문 5종 문구
lib/metaphors.ts  은유 스킨 6종 × 4축 × 5단계 = 120개 단어, 전부 서로 다름
lib/setup.ts      역할 배분 — reads ∩ writes = ∅ 를 구조적으로 보장
lib/engine.ts     이벤트 폴딩 · 액션 검증 · 서버측 정보 리댁션
lib/store.ts      Upstash REST + Lua CAS 원자적 append (없으면 인메모리)
lib/debrief.ts    이벤트 로그 → 소통 지표 · Team Big Five 8요소 병목 추정
components/       계기판 · 클린 질문 4박자 · 온보딩 · 디브리핑(인라인 SVG)
```

**상태는 append-only 이벤트 로그 하나입니다.** 서버에 가변 상태가 없고,
같은 로그가 게임 진행과 회고 데이터를 동시에 만듭니다.

**정보 비대칭은 서버가 강제합니다.** 남의 목표, 내가 못 읽는 축의 값, 정답 상태는
응답에서 아예 지워져 나갑니다(`redactState`). 개발자 도구를 열어도 답이 보이지 않습니다.
게임이 끝나면 전부 공개됩니다 — 회고하려면 답을 봐야 하니까.

스택: Next.js 15 App Router · React 19 · TypeScript · 순수 CSS.
**외부 UI·차트 라이브러리 0개** (차트도 손으로 그린 인라인 SVG).

---

## 알려진 한계

- 한 기기에 한 명 (브라우저 localStorage로 플레이어를 식별)
- 시작 후 중간 합류 불가 — 다음 판에 참여
- 방 데이터는 12시간 뒤 만료. 회고를 남기려면 화면 캡처
- 3인도 되지만 병목이 약함. **4~6인** 권장
