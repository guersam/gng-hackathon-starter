# GNG Experiential Game Hackathon Starter

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/guersam/gng-hackathon-starter)

> 게임을 먼저 실행해 보려면 위 Deploy 버튼을 사용한다. 해커톤에서 코드를 수정할 참가자는 이 공개 template으로 새 저장소를 만들거나 fork한 뒤, 아래 Wrangler 절차로 자기 Cloudflare 계정에 배포한다.

서로 전혀 다른 체험형 게임을 90분 안에 플레이→수정→재플레이하기 위한 pnpm 워크스페이스다. `요일 천재`는 서버 권위 실시간 게임의 완성 예제, `Handoff Lab`은 만들기→문서→인수인계→재구성의 턴제 예제, `우리 팀의 실험`은 한 상황→선택→공개로 항상 실행되는 시작점이다.

```text
games/yoil-genius         완성형 실시간 예제의 domain·UI·manifest
games/handoff-lab         턴제 pass-and-play 예제
games/workshop-game       수정용 최소 선택→공개 게임 팩
packages/simulation-kit   게임 정의·manifest·검증 계약 (플랫폼 비의존)
packages/cloudflare-host  멱등 사건 접기의 검증된 추출물 (아직 Worker 미통합)
packages/ui-foundation    게임 의미를 모르는 CSS base·semantic token·두 preset
src/worker                Yoil용 Cloudflare Worker·SQLite DO 어댑터
src/main.tsx              세 예제의 얇은 경로 조립
tests                     공통 architecture·Worker·브라우저 인수 검사
```

`pnpm check:boundaries`는 게임 팩이 Worker 구현을 참조하거나 범용 커널이 특정 게임을 참조하는 일을 막는다. 외부 갤러리, 팀 배정과 투표는 이 런타임의 책임이 아니다.

## 사전 준비와 배포

Node.js 22+, pnpm 11+, Git, 무료 Cloudflare 계정이 필요하다. Corepack을 쓸 수 있으면 `corepack enable`로 저장소가 고정한 pnpm 버전을 사용한다.

```bash
# 먼저 GitHub에서 fork한 뒤 본인 저장소를 복제한다.
git clone https://github.com/<내-계정>/gng-hackathon-starter.git
cd gng-hackathon-starter
pnpm install --frozen-lockfile
pnpm check
pnpm exec wrangler login
pnpm deploy
pnpm smoke -- https://내-배포-주소.workers.dev
```

배포 뒤 `/`에서 요일 천재 혼자 연습, `/handoff`에서 Handoff Lab, `/workshop`에서 수정용 최소 게임을 바로 플레이한다. 행사 전 진행자는 `pnpm load -- <주소>`로 30명 리허설을 별도로 실행한다.

사전 준비는 `pnpm check` → `pnpm deploy` → `pnpm smoke -- <배포 주소>`와 혼자 연습 완료까지다. 계정·권한·실시간 연결 문제는 [사전 배포 확인과 문제 해결](./docs/workshop/prerequisite.md)에서 확인한다.

## 개발

```bash
pnpm install --frozen-lockfile
pnpm dev
pnpm check
pnpm test:browser
```

테마는 [`index.html`](./index.html)의 `data-theme="paper"`를 `high-contrast`로 바꾸면 개발 서버에서 즉시 갱신된다. 새 preset 작성법과 중립 token 계약은 [테마 가이드](./docs/themes.md)에 있다.

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
- [새 게임 팩 추가](./docs/games/new-game.md)
- [요일 천재 디자인 계약](./docs/games/yoil-genius-design.md)
- [공통 테마 바꾸기](./docs/themes.md)

코드는 [MIT License](./LICENSE)로 제공한다. Game concept courtesy of [김창준 (June Kim)](https://x.com/cjunekim).
