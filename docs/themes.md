# 테마 바꾸기

모든 예제는 `@experiential/ui-foundation`의 중립 semantic token을 사용한다. React provider나 게임별 색상 설정은 없다. 개발 서버를 켠 상태에서 [`index.html`](../index.html)의 한 줄만 바꾸면 HMR로 선택 화면과 두 게임 경로가 함께 갱신된다.

```html
<html lang="ko" data-theme="high-contrast">
```

기본값은 `paper`, 제공되는 대안은 `high-contrast`다.

## 새 preset 만들기

1. `packages/ui-foundation/src/theme.css`에서 `:root[data-theme="high-contrast"]` 블록을 복사한다.
2. selector를 `:root[data-theme="우리-slug"]`로 바꾼다.
3. 블록 안의 값만 바꾼다. token 이름을 바꾸거나 게임 이름을 새 token에 넣지 않는다.
4. `index.html`의 `data-theme`을 같은 slug로 설정한다.
5. `pnpm check && pnpm test:browser:visual`을 실행한다.

## Token 계약

- 표면: `--ui-canvas`
- 글자: `--ui-text`, `--ui-text-muted`
- 선: `--ui-border-subtle`, `--ui-border-strong`
- 행동: `--ui-action-primary|secondary|accent|danger|disabled`와 각각의 `--ui-on-*`
- 상태와 계기: `--ui-focus`, `--ui-data-track`
- 공통 형태: `--ui-font`, `--ui-control-min-size`, `--ui-focus-width`, `--ui-focus-offset`, `--ui-radius`

토큰은 “요일 의무”, “잉크 타일”, “정답” 같은 게임 의미를 표현하지 않는다. 게임 CSS가 현재 행동을 `accent`에 연결할지는 게임이 결정하고, preset은 `accent`가 어떤 색인지 결정한다. `theme.css` 밖의 CSS나 inline style에 색을 직접 쓰면 `pnpm check:theme`이 실패한다.
