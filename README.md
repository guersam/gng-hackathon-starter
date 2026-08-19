# GNG Experiential Game Hackathon Starter

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/guersam/gng-hackathon-starter)

> 게임을 먼저 실행해 보려면 위 Deploy 버튼을 사용한다. 해커톤에서 코드를 수정할 참가자는 이 공개 template으로 새 저장소를 만들거나 fork한 뒤, 아래 Wrangler 절차로 자기 Cloudflare 계정에 배포한다.

서로 전혀 다른 체험형 게임을 90분 안에 플레이→수정→재플레이하기 위한 pnpm 워크스페이스다. `요일 천재`는 서버 권위 실시간 게임의 완성 예제, `Handoff Lab`은 만들기→문서→인수인계→재구성의 턴제 예제, `우리 팀의 실험`은 한 상황→선택→공개로 항상 실행되는 시작점이다.

```text
games/                    바로 실행하거나 복사할 세 게임 팩
packages/simulation-kit   플랫폼과 무관한 게임 계약
packages/ui-foundation    공통 CSS base와 중립 테마 토큰
src/worker                요일 천재용 Cloudflare Worker·SQLite DO
tests/                    도메인·Worker·브라우저 검사
```

처음 수정할 때는 `/workshop`을 플레이한 뒤 `games/workshop-game`에서 상황과 두 선택을 바꾼다. 파일을 복사해 새 게임으로 등록하는 순서는 [새 게임 팩 추가](./docs/games/new-game.md)를 따른다.

## 사전 준비와 배포

Node.js 22+, pnpm 11+, Git, 무료 Cloudflare 계정이 필요하다. Corepack을 쓸 수 있으면 `corepack enable`로 저장소가 고정한 pnpm 버전을 사용한다.

```bash
# GitHub template으로 만든 저장소 또는 fork를 복제한다.
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
pnpm exec playwright install chromium
pnpm test:browser
```

테마는 [`index.html`](./index.html)의 `data-theme="paper"`를 `high-contrast`로 바꾸면 개발 서버에서 즉시 갱신된다. 새 preset 작성법과 중립 token 계약은 [테마 가이드](./docs/themes.md)에 있다.

## 다음 단계

참가자:

- [최소 게임을 복사해 새 팩 만들기](./docs/games/new-game.md)
- [공통 테마 바꾸기](./docs/themes.md)

진행자:

- [90분 해커톤 운영](./docs/workshop/README.md)
- [사전 배포 확인과 문제 해결](./docs/workshop/prerequisite.md)

설계 근거가 필요할 때만 읽는 참고자료:

- [제품·플랫폼 계약](./PRODUCT.md)
- [아키텍처 결정과 검증](./docs/architecture/README.md)

코드는 [MIT License](./LICENSE)로 제공한다. Game concept courtesy of [김창준 (June Kim)](https://x.com/cjunekim).
