# 기준 게임에서 내 게임 시작하기

사전 과제의 목표는 게임을 만드는 것이 아니라 자기 계정에서 설치→검사→배포→실제 URL 확인까지 한 번 끝내는 것이다. 세션에서는 이미 실행되는 두 기준 게임 중 하나를 골라 직접 개조하거나, 복사해 새 게임 팩으로 추가한다.

## 먼저 기준 게임 고르기

- 실시간 팀 플레이, 서버 시간, 점수나 사건 기록이 필요하면 `games/yoil-genius`를 고른다.
- 한 기기에서 차례로 행동하고 상태·행동·결과를 빠르게 바꾸려면 `games/handoff-lab`을 고른다.

둘 다 `/`에서 먼저 플레이한다. 첫 재플레이가 빠른 쪽을 선택한다.

## 경로 A: 기존 게임 직접 개조

이름과 라우팅을 그대로 두고 선택한 폴더의 규칙·화면·테스트를 바꾼다. 시간이 짧거나 Yoil의 실시간 서버를 유지하고 싶을 때 가장 안전하다.

1. 팀 전원이 원본을 한 번 끝까지 플레이한다.
2. domain 파일에서 상태 하나, 행동 하나, 결과 하나만 바꾼다.
3. 같은 폴더의 테스트와 UI 문구를 새 규칙에 맞춘다.
4. 같은 URL에서 바로 재플레이한다.

## 경로 B: 복사해 새 게임 팩 추가

원본 예제를 보존하거나 여러 아이디어를 나란히 비교하려면 새 팩을 추가한다. 짧은 세션에서는 로컬 턴제 전체가 들어 있는 `games/handoff-lab`을 복사하는 것이 가장 가볍다.

1. `games/handoff-lab`을 `games/<slug>`로 복사하고 새 폴더의 `package.json` name과 export를 바꾼다.
2. 루트 `package.json`에 새 workspace dependency를 추가하고 `pnpm install`로 lockfile을 갱신한다.
3. `src/main.tsx`에서 새 UI와 CSS를 import하고 새 URL 경로를 연결한다.
4. 원격 manifest 목록에도 보여야 하면 `src/game-registry.ts`에 새 manifest를 등록한다.
5. 게임 폴더의 규칙·화면·테스트를 바꾸고 `pnpm check`를 통과시킨다.

새 실시간 게임 팩을 별도로 추가하는 것은 Worker 라우팅과 저장 모델까지 분리해야 하므로 첫 15분 목표로 삼지 않는다. 그 경우에는 `games/yoil-genius`를 직접 개조해 기존 배포 파이프라인을 유지한다.

## 어디를 바꾸나

| 원하는 변경 | 시작 파일 |
|---|---|
| 규칙과 사건 | `games/<게임>/src/domain*` |
| 화면 흐름과 문구 | `games/<게임>/src/*tsx` 또는 `src/ui/*` |
| 게임별 표현 | `games/<게임>/src/styles.css` |
| 규칙 검사 | `games/<게임>/tests/*` |
| 공통 색·간격 | `packages/ui-foundation/src/theme.css` |

`packages/simulation-kit`과 `packages/cloudflare-host`는 두 게임에서 반복되는 계약과 서버 유틸리티다. 첫 플레이 가능한 버전을 위해 수정할 필요는 없다.

## 완료 확인

```bash
pnpm check:game
pnpm check
pnpm dev
```

휴대전화에서 새 규칙으로 한 판을 마치고 다른 팀원이 관찰한 행동 한 가지를 말할 수 있으면 첫 버전은 충분하다.
