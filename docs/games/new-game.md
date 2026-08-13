# 새 게임 팩 추가

목표는 범용 프레임워크를 확장하는 것이 아니라, 팀이 15분 안에 다시 플레이할 수 있는 작은 전체를 만드는 것이다. 가장 빠른 시작점은 `games/workshop-game`이다.

## 첫 플레이까지

1. `games/workshop-game`을 `games/<slug>`로 복사하고 `package.json`의 package name을 바꾼다.
2. `manifest.ts`에서 의도, 참가 인원, 자기 안내 문장과 30명·두 방 `finalePlan`을 먼저 바꾼다. 이 항목은 선택 사항이 아니며 `assertManifest`가 검사한다.
3. `domain.ts`의 상태·행동·사건을 한 종류씩만 바꾸고 해당 domain test를 추가한다.
4. UI는 domain의 공개 행동만 호출한다. 저장·WebSocket·Cloudflare 코드를 game package 안으로 가져오지 않는다.
   색상은 `--ui-*` semantic token만 사용하고 새 색상 값은 `packages/ui-foundation`의 preset에 둔다.
5. 새 package를 root `package.json` dependencies와 `src/game-registry.ts`에 추가한다.
6. 화면이 필요하면 package export를 만들고 `src/main.tsx`에 한 경로를 연결한다.
7. `pnpm install --lockfile-only && pnpm check`를 통과한 뒤 휴대전화에서 전원이 한 번 행동한다.

## 언제 원격 호스트를 붙이는가

pass-and-play 또는 외부 폼으로 의도한 경험을 검증할 수 있으면 그대로 둔다. 두 번째 게임이 실제로 참가·복구·방송을 요구하고 Yoil Worker 코드를 복사하려는 순간에만 `packages/cloudflare-host` 통합을 재개방한다. 그 전에는 production 공통 호스트라고 부르지 않는다.

## 완료 증거

- 게임 package가 `@experiential/simulation-kit`만으로 domain 계약을 표현한다.
- `finalePlan`이 30명, 두 방, 실패 시 대안을 모두 설명한다.
- 새 domain test와 최소 브라우저 흐름이 있다.
- `pnpm check:boundaries`가 상대경로 우회와 game→host 역의존을 거부한다.
- 팀원 네 명 이상이 결과 공개까지 실제로 플레이했다.
