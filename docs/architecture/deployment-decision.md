# 배포 플랫폼 결정

결정일: 2026-08-13

## 결정

기준 배포는 정적 자산을 제공하는 Cloudflare Worker와 세션별 SQLite Durable Object 한 개를 사용한다. Durable Object가 트랜잭션 상태, 알람, WebSocket 방송과 영속화를 한 경계에서 담당하고 브라우저는 로컬 카운트다운만 그린다. 이는 30명이라는 작은 상한에서 공급자 하나와 배포 한 번으로 사전 준비를 끝내기 위한 선택이다.

무료 요금제가 존재한다는 사실은 무비용 또는 수용량 보장이 아니다. 실제 적합 판정은 깨끗한 무료 계정 배포와 30클라이언트 리허설 결과로 내린다.

## 비교

| 후보 | 판단 | 결과 |
|---|---|---|
| Cloudflare Worker + SQLite Durable Object | 한 공급자 안에서 정적 자산, 세션 권위, 트랜잭션 저장, 알람, 최대 절전 WebSocket을 구성할 수 있다 | 기준안 |
| Convex + 정적 React 호스트 | 관리형 실시간 트랜잭션은 적합하지만 두 배포 표면과 구독 호출량을 함께 설명해야 한다 | 문서상 대안 |
| Supabase + 정적 호스트 | 연결 기능은 가능하지만 인증·방송·프로젝트 수명과 별도 호스트를 함께 운영해야 한다 | 기준안에서 제외 |
| Vercel + Upstash | 두 공급자의 실행 수명, 연결과 공유 상태를 조정해야 한다 | 기준안에서 제외 |

## 근거 자료

- [Durable Objects 개요](https://developers.cloudflare.com/durable-objects/)
- [SQLite 저장소](https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/)
- [WebSocket 최대 절전 API](https://developers.cloudflare.com/durable-objects/best-practices/websockets/)
- [Durable Object 알람](https://developers.cloudflare.com/durable-objects/api/alarms/)
- [Workers 요금과 무료 제공량](https://developers.cloudflare.com/workers/platform/pricing/)
- [Durable Objects 제한](https://developers.cloudflare.com/durable-objects/platform/limits/)
- [Cloudflare 배포 버튼](https://developers.cloudflare.com/workers/platform/deploy-buttons/)
- [Workers Vitest 통합](https://developers.cloudflare.com/workers/testing/vitest-integration/)
- [Convex 실시간 동작](https://docs.convex.dev/realtime), [Convex 제한](https://docs.convex.dev/production/state/limits)
- [Supabase Realtime 제한](https://supabase.com/docs/guides/realtime/limits), [Supabase Auth 제한](https://supabase.com/docs/guides/auth/rate-limits)
- [Vercel WebSocket 안내](https://vercel.com/kb/guide/do-vercel-serverless-functions-support-websocket-connections), [Upstash Redis 요금](https://upstash.com/pricing/redis)

## 행사 직전 재검증

- 위 공식 문서의 무료 요청량, CPU, Durable Object 저장·알람·WebSocket 제한과 과금 조건을 다시 읽는다.
- 저장소에 고정된 Node.js, Wrangler, Vite, Vitest와 Workers 테스트 통합 버전으로 깨끗한 설치를 수행한다.
- 새 무료 계정에서 로그인, 배포, SQLite Durable Object 마이그레이션과 `workers.dev` 접근이 추가 수동 설정 없이 되는지 확인한다.
- 행사장 네트워크와 휴대전화 통신망에서 `workers.dev` 및 WebSocket 연결이 허용되는지 확인한다.
- 최대 절전 뒤 재연결, 알람 재시도와 마감 중복 방지가 실제 배포에서도 같은지 확인한다.
- 30개 클라이언트 리허설의 요청 수, 저장량, 지연, 오류와 무료 제공량 여유를 날짜와 함께 기록한다.
- 어느 항목이라도 실패하면 Convex 대안을 재평가하거나 참가자에게 유료 전환이 아닌 로컬 진행 방식을 먼저 제시한다.
