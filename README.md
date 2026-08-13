# GNG Experiential Game Hackathon Starter

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/guersam/gng-hackathon-starter)

서로 전혀 다른 체험형 게임을 90분 안에 플레이→수정→재플레이하기 위한 pnpm 워크스페이스다. `요일 천재`는 서버 권위 실시간 게임의 완성 예제, `Handoff Lab`은 만들기→문서→인수인계→재구성의 턴제 예제, `우리 팀의 실험`은 한 상황→선택→공개로 항상 실행되는 시작점이다.

```text
packages/simulation-kit   게임 정의·manifest·검증 계약 (플랫폼 비의존)
packages/cloudflare-host  사건 접기·멱등 명령의 호스트 유틸리티
games/*                   서로 다른 게임의 규칙·화면·테스트
src/worker                Cloudflare Worker + SQLite Durable Object 어댑터
src/ui                    요일 천재 운영 화면
```

`pnpm check:boundaries`는 게임 팩이 Worker 구현을 참조하거나 범용 커널이 특정 게임을 참조하는 일을 막는다. 외부 갤러리, 팀 배정과 투표는 이 런타임의 책임이 아니다.

## 사전 준비와 배포

Node.js 22+, pnpm 11+, Git, 무료 Cloudflare 계정이 필요하다. Corepack을 쓸 수 있으면 `corepack enable`로 저장소가 고정한 pnpm 버전을 사용한다.

```bash
git clone https://github.com/<내-계정>/gng-hackathon-starter.git
cd gng-hackathon-starter
pnpm install --frozen-lockfile
pnpm check
pnpm exec wrangler login
pnpm deploy
pnpm smoke -- https://내-배포-주소.workers.dev
```

배포 뒤 `/`에서 요일 천재 혼자 연습, `/handoff`에서 Handoff Lab, `/workshop`에서 수정용 최소 게임을 바로 플레이한다. 행사 전 진행자는 `pnpm load -- <주소>`로 30명 리허설을 별도로 실행한다.

## 개발

```bash
pnpm install --frozen-lockfile
pnpm dev
pnpm check
pnpm test:browser
```

로컬 릴리스 증거는 다음 관문으로 나눈다.

```bash
pnpm test:browser:visual  # 320px/1280px 스크린샷과 수평 오버플로
pnpm test:browser:scale   # 30개 독립 컨텍스트의 실제 WebSocket 인증
pnpm test:browser:full    # 120초 서버 권위 종료와 사건 증거
```

HTML 보고서는 `playwright-report/`, 스크린샷·trace는 `test-results/`에 생성되며 커밋하지 않는다. 로컬 30브라우저 통과는 무료 계정 할당량과 행사장 네트워크를 보증하지 않으므로 배포 후 `pnpm load`와 현장 리허설을 별도로 수행한다.

- [제품·플랫폼 계약](./PRODUCT.md)
- [CLEAR 아키텍처 기준선](./docs/architecture/README.md)
- [90분 해커톤 운영](./docs/workshop/README.md)
- [사전 배포 확인](./docs/workshop/prerequisite.md)

코드는 [MIT License](./LICENSE)로 제공한다. Game concept courtesy of [김창준 (June Kim)](https://x.com/cjunekim).
