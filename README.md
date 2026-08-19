# GNG Experiential Game Hackathon Starter

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/guersam/gng-hackathon-starter)

> 게임을 먼저 실행해 보려면 위 Deploy 버튼을 사용한다. 코드를 수정할 참가자는 GitHub의 **Use this template**으로 자기 저장소를 만든 뒤, 아래 Wrangler 절차로 자기 Cloudflare 계정에 배포한다.

서로 전혀 다른 체험형 게임을 90분 안에 플레이→수정→재플레이하기 위한 pnpm 워크스페이스다. `요일 천재`는 서버 권위 실시간 게임 예제이고, `Handoff Lab`은 만들기→문서→인수인계→재구성의 턴제 예제다.

```text
games/                    직접 플레이하고 바꿀 두 기준 게임
packages/simulation-kit   플랫폼과 무관한 게임 계약
packages/ui-foundation    공통 CSS base와 중립 테마 토큰
src/worker                요일 천재용 Cloudflare Worker·SQLite DO
tests/                    도메인·Worker·브라우저 검사
```

사전 과제에서는 코드를 바꾸지 않아도 된다. `/`에서 두 게임을 열고 자기 Cloudflare 계정의 설치→검사→배포→smoke 전체 경로를 확인한다. 세션에서는 더 가까운 게임을 직접 개조하거나 복사해 새 게임으로 추가할 수 있다. 두 경로는 [기준 게임에서 내 게임 시작하기](./docs/games/modify-a-game.md)에 있다.

## 내 저장소 만들기

1. GitHub 저장소 상단의 **Use this template → Create a new repository**를 누른다.
2. 저장소 이름과 공개 범위를 선택해 생성한다.
3. 새로 만든 자기 저장소를 clone한다.

starter 자체에 변경을 제안하려는 경우에만 fork한다.

## 사전 준비와 배포

Node.js 22+, pnpm 11+, Git, 무료 Cloudflare 계정이 필요하다. Corepack을 쓸 수 있으면 `corepack enable`로 저장소가 고정한 pnpm 버전을 사용한다.

```bash
# 위에서 만든 자기 저장소를 복제한다.
git clone https://github.com/<내-계정>/<내-저장소>.git
cd <내-저장소>
pnpm install --frozen-lockfile
pnpm check
pnpm exec wrangler login
pnpm deploy
pnpm smoke -- https://내-배포-주소.workers.dev
```

배포 뒤 `/`는 두 기준 게임의 선택 화면이다. `/yoil`에서 요일 천재를 혼자 연습하거나 팀 세션을 만들고, `/handoff`에서 Handoff Lab을 바로 플레이한다. 30명 연결은 필요할 때 `pnpm load -- <주소>`로 확인한다.

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

- [기준 게임을 개조하거나 새 게임으로 추가하기](./docs/games/modify-a-game.md)
- [공통 테마 바꾸기](./docs/themes.md)
- [사전 배포 확인과 문제 해결](./docs/workshop/prerequisite.md)

설계 근거가 필요할 때만 읽는 참고자료:

- [제품·플랫폼 계약](./PRODUCT.md)
- [아키텍처 결정과 검증](./docs/architecture/README.md)

코드는 [MIT License](./LICENSE)로 제공한다. Game concept courtesy of [김창준 (June Kim)](https://x.com/cjunekim).
