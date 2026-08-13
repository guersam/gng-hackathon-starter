---
name: "요일 천재"
description: "종이와 먹, 거대한 요일 글자로 9초의 공동 리듬을 운용하는 밝은 게임 인터페이스"
colors:
  canvas: "var(--ui-canvas)"
  text: "var(--ui-text)"
  text-muted: "var(--ui-text-muted)"
  border-subtle: "var(--ui-border-subtle)"
  action-primary: "var(--ui-action-primary)"
  on-primary: "var(--ui-on-primary)"
  action-secondary: "var(--ui-action-secondary)"
  on-secondary: "var(--ui-on-secondary)"
  action-accent: "var(--ui-action-accent)"
  on-accent: "var(--ui-on-accent)"
  action-danger: "var(--ui-action-danger)"
  on-danger: "var(--ui-on-danger)"
typography:
  micro:
    fontFamily: '"Gothic A1", sans-serif'
    fontSize: "0.8rem"
    fontWeight: 400
  supporting:
    fontFamily: '"Gothic A1", sans-serif'
    fontSize: "1.1rem"
    fontWeight: 400
  input:
    fontFamily: '"Gothic A1", sans-serif'
    fontSize: "1.15rem"
    fontWeight: 400
  lead:
    fontFamily: '"Gothic A1", sans-serif'
    fontSize: "1.2rem"
    fontWeight: 400
  action:
    fontFamily: '"Gothic A1", sans-serif'
    fontSize: "1.25rem"
    fontWeight: 700
  roster:
    fontFamily: '"Gothic A1", sans-serif'
    fontSize: "1.4rem"
    fontWeight: 400
  metric:
    fontFamily: '"Gothic A1", sans-serif'
    fontSize: "1.5rem"
    fontWeight: 900
  pulseTimer:
    fontFamily: '"Gothic A1", sans-serif'
    fontSize: "2.4rem"
    fontWeight: 900
  compactDisplay:
    fontFamily: '"Gothic A1", sans-serif'
    fontSize: "6rem"
    fontWeight: 900
  pulseWide:
    fontFamily: '"Gothic A1", sans-serif'
    fontSize: "12rem"
    fontWeight: 900
  display:
    fontFamily: '"Gothic A1", sans-serif'
    fontSize: "clamp(5.8rem, 27vw, 9rem)"
    fontWeight: 900
    lineHeight: 0.72
    letterSpacing: "-0.04em"
  pulse:
    fontFamily: '"Gothic A1", sans-serif'
    fontSize: "10rem"
    fontWeight: 900
    lineHeight: 0.9
    letterSpacing: "-0.04em"
  title:
    fontFamily: '"Gothic A1", sans-serif'
    fontSize: "2rem"
    fontWeight: 900
  body:
    fontFamily: '"Gothic A1", sans-serif'
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: '"Gothic A1", sans-serif'
    fontSize: "1rem"
    fontWeight: 700
spacing:
  tight: "8px"
  control: "14px 18px"
  section: "18px"
  field: "22px"
  panel: "24px"
  page-mobile: "16px 18px 44px"
components:
  button-primary:
    backgroundColor: "{colors.action-primary}"
    textColor: "{colors.on-primary}"
    padding: "{spacing.control}"
  button-duty:
    backgroundColor: "{colors.action-accent}"
    textColor: "{colors.on-accent}"
    padding: "{spacing.control}"
  button-secondary:
    backgroundColor: "{colors.action-secondary}"
    textColor: "{colors.on-secondary}"
    padding: "{spacing.control}"
  button-danger:
    backgroundColor: "{colors.action-danger}"
    textColor: "{colors.on-danger}"
    padding: "{spacing.control}"
  input-underline:
    backgroundColor: "transparent"
    textColor: "{colors.text}"
    padding: "12px 2px"
---

# Design System: 요일 천재

이 문서는 starter 전체가 아니라 `games/yoil-genius` 예제 화면의 시각 계약이다. 세 게임은 `ui-foundation/base.css`와 semantic token만 공유하며, 구조와 화면 규칙은 각 game package의 stylesheet가 소유한다.

## Overview

**Creative North Star: "움직이는 요일 활자보"**

요일 글자 자체가 팀의 움직이는 시간표다. 화면은 종이 같은 밝은 바탕 위에 먹색 활자를 세우고, 은색 전환과 단 하나의 산성 연두 행동으로 9초 리듬의 현재 상태를 드러낸다. 카드형 게임 대시보드나 장식적 게임 크롬보다 거대한 한글, 수평 규칙선, 조밀한 운용 정보가 앞선다.

참가 화면은 표현적이되 과업 중심이다. 가장 급한 의무는 첫 시야와 엄지 영역을 차지하고, 문제 풀이와 순위는 같은 평면 위에서 굵은 선과 간격으로 분리된다. 정적인 종이 표면과 급박하게 변하는 숫자·요일의 대비가 시스템의 긴장을 만든다.

**Key Characteristics:**

- 종이 흰색과 먹색이 지배하는 밝고 평평한 운용 화면
- 화면의 시계 역할을 하는 초대형·초중량 한글
- 산성 연두는 현재 의무 행동에만 쓰는 희소한 신호
- 카드 대신 수평선, 간격, 활자 무게로 나누는 정보 구조
- 은색과 빗빛 보조 잉크로 완료·보조·비활성 상태를 표현

## Colors

팔레트는 따뜻한 종이, 거의 검은 먹, 차가운 은색을 기반으로 하며 산성 연두와 위험 적색이 필요한 순간에만 개입한다. 각 값의 정본은 frontmatter의 `colors` 토큰이다.

### Primary

- **먹색:** 본문, 핵심 숫자, 규칙선, 기본 버튼과 완료 상태를 한 목소리로 묶는다.

### Secondary

- **산성 신호:** 진행 중인 9초 의무의 주 행동에만 사용한다. 장식이나 일반 강조색으로 확장하지 않는다.

### Tertiary

- **위험 적색:** 오류 메시지와 세션 종료처럼 실제 위험 또는 파괴적 행동을 구분한다.

### Neutral

- **종이 흰색:** 모든 주요 화면의 바탕이다.
- **전환 은색:** 보조 버튼, 구분선, 누른 뒤의 요일 상태에 쓰인다.
- **빗빛 잉크:** 설명, 순위 번호, 카운트다운 보조 숫자처럼 두 번째 위계의 정보에 쓰인다.
- **비활성 회색:** 사용할 수 없는 조작의 표면과 글자를 명시적으로 낮춘다.
- **얇은 선색과 기록 바탕:** 순위 행과 회고 추적선처럼 먹색보다 조용한 구조에 쓰인다.
- **초점 파랑:** 키보드 초점을 다른 상태와 혼동하지 않도록 모든 폼 조작에 일관되게 사용한다.

**The One Acid Signal Rule.** 산성 연두는 지금 수행해야 하는 공동 의무 버튼에만 쓴다. 희소성이 곧 우선순위다.

## Typography

**Display Font:** Gothic A1 (sans-serif fallback), self-hosted through Fontsource Korean and Latin subsets at weights 400, 700, and 900

**Body Font:** Gothic A1 (sans-serif fallback), using the same self-hosted subsets

**Character:** 하나의 한글 산세리프 패밀리가 400부터 900까지 무게를 바꾸며 설명과 명령을 모두 담당한다. 브랜드와 현재 요일은 극단적으로 크고 조밀하며, 본문은 담백하고 읽기 좋은 비례를 유지한다.

### Hierarchy

- **Display:** 900 무게의 반응형 초대형 활자. 진입 브랜드에 쓰며 줄높이를 강하게 압축하고 자간을 좁힌다.
- **Pulse:** 900 무게의 현재 요일 한 글자. 모바일에서 10rem, 넓은 화면에서 12rem으로 커지며 화면의 시간축이 된다.
- **Title:** 900 무게의 2rem 활자. 날짜 문제와 카운트다운처럼 즉시 읽어야 하는 값에 쓴다.
- **Metric:** 900 무게의 1.5rem 활자. 문제 남은 시간과 회고 증거 값에 쓴다.
- **Roster:** 1.4rem 활자. 로비의 참가자 이름에 쓴다.
- **Action:** 1.25rem 활자. 현재 의무 버튼처럼 우선순위가 높은 조작에 쓴다.
- **Lead:** 1.2rem 활자. 진입 설명과 최종 점수 요약에 쓴다.
- **Input:** 1.15rem 활자. 입력과 선택 필드의 값을 읽기 쉽게 유지한다.
- **Supporting:** 1.1rem 활자. 회고 질문과 보조 서술에 쓴다.
- **Body:** 400 무게를 기본으로 하고 설명 문장은 1.55 줄높이를 사용한다.
- **Label:** 700 무게를 기본으로 하며 버튼은 800, 중요 수치와 긴급 상태는 900까지 올린다.
- **Micro:** 0.8rem 활자. 보조 링크, 사건 시각, 증거 이름처럼 문맥을 보존하되 전면에 나서지 않는 정보에 쓴다.
- **Pulse Timer:** 900 무게의 2.4rem 활자. 거대한 요일 옆에서 남은 초를 표시한다.
- **Compact Display:** 900 무게의 6rem 활자. 로비 인원과 종료 표식에 쓴다.
- **Pulse Wide:** 900 무게의 12rem 활자. 700px 이상 화면에서 현재 요일을 확장한다.

**The One-Glyph Clock Rule.** 현재 요일 한 글자는 장식 제목이 아니라 가장 큰 실시간 계기판이다. 주변 요소가 이 글자와 크기 경쟁을 해서는 안 된다.

## Layout

모든 화면은 모바일 우선 단일 열이다. 게임 화면은 최대 560px, 진입·호스트·회고 화면은 최대 620px로 중앙 정렬한다. 게임은 작은 모바일 인셋과 44px 하단 여유를 쓰고, 문서형 화면은 뷰포트에 따라 24px에서 54px까지 커지는 패딩을 사용한다.

게임 내부는 헤더, 의무 구간, 문제 구간, 순위표를 수직으로 쌓는다. 문제 선택기는 2열, 요일 답은 320px에서도 44×48px 이상을 지키는 4열이며 팀원 상태는 가로 스크롤 한 줄로 유지한다. 700px 이상에서는 구조를 바꾸지 않고 게임 상단 여백과 현재 요일의 크기만 키운다.

**The First-Viewport Duty Rule.** 모바일 첫 화면에서 현재 요일, 남은 시간, 의무 버튼이 함께 보여야 한다. 새 요소가 이 세 항목을 아래로 밀어내서는 안 된다.

## Elevation & Depth

그림자를 사용하지 않는 완전한 평면 시스템이다. 깊이는 배경을 겹치거나 떠 보이게 만들어 표현하지 않고, 선 굵기, 활자 무게, 색 대비, 수직 간격으로만 만든다. 5px 먹색 규칙선은 주요 작업 전환을, 1px 은색 선은 목록과 순위의 내부 구획을 나타낸다.

**The Flat Paper Rule.** 표면을 카드로 띄우지 않는다. 구획이 필요하면 먼저 간격과 수평선을 사용한다.

## Shapes

기본 형상은 모서리가 둥글지 않은 직사각형이다. 버튼, 입력, 목록, 진행 막대 모두 원형 장식 없이 종이 위에 찍힌 활자와 규칙선처럼 보인다. 입력은 상자 대신 2px 먹색 밑줄을 사용하고, 완료된 팀원은 3px 하단선으로 상태를 표시한다.

**The No Card Silhouette Rule.** 둥근 컨테이너, pill, 카드 테두리를 기본 구성 단위로 만들지 않는다.

## Components

### Buttons

- **Shape:** 반경 없는 직사각형이며 최소 높이는 48px이다.
- **Primary:** 먹색 바탕과 흰 글자, 강한 800 무게, 14px × 18px 내부 여백을 사용한다.
- **Duty:** 너비 전체를 차지하는 산성 신호 바탕과 먹색 글자로 현재 공동 의무를 표시한다.
- **Secondary:** 전환 은색 바탕과 먹색 글자로 문제 받기 같은 보조 행동을 나타낸다.
- **Danger:** 위험 적색 바탕으로 세션 종료 같은 파괴적 행동을 격리한다.
- **Disabled / Focus:** 비활성은 별도의 회색 표면과 글자로 낮추며, 키보드 초점은 3px 초점 파랑 외곽선과 3px 간격으로 표시한다.

### Inputs / Fields

- **Style:** 투명 바탕, 상자 없는 2px 먹색 밑줄, 12px × 2px 내부 여백, 1.15rem 글자를 사용한다.
- **Layout:** 레이블은 위에 놓고 8px 간격을 두며, 두 선택 항목은 같은 폭의 2열로 배치한다.
- **Focus:** 버튼과 동일한 3px 파랑 외곽선으로 키보드 위치를 분명히 한다.

### Entry Mode Choice

진입 화면은 `혼자 2분 연습`과 `팀 세션 만들기`를 같은 높이의 2열 조작으로 보여준다. 선택된 경로만 먹색으로 채우며 산성 신호는 쓰지 않는다. 혼자 연습 설명은 비경쟁 사전 점검임을 먼저 말하고 이름 외 설정을 요구하지 않는다.

### Readiness Evidence

혼자 연습 종료 화면은 배포 상태, 실시간 인증, 서버 종료, 의무와 문제 사건을 선으로 나눈 목록으로 보여준다. 체크는 관찰된 사건만 나타내며 수료 인증처럼 표현하지 않는다.

### Current Duty

작은 빗빛 레이블 아래 초대형 요일과 남은 초를 한 줄에 양끝 정렬한다. 누르기 전에는 먹색, 완료 후에는 요일이 은색으로 바뀌고 자간이 미세하게 열린다. 모션 축소 설정에서는 이 전환 애니메이션을 제거한다.

### Weekday Answer Row

요일 답 일곱 개를 동일 폭의 4열로 흘리고 3px 간격만 둔다. 각 버튼은 최소 44×48px를 유지하며 한 글자 한글 레이블로 빠르게 훑고 누를 수 있어야 한다.

### Scoreboard

각 행은 순위 28px, 팀 정보 1fr, 1인당 점수 auto의 3열 구조다. 얇은 선으로만 행을 나누고, 순위는 빗빛 잉크, 최종 점수는 강한 무게로 위계를 만든다.

### Paused Banner

게임이 멈추면 화면 상단 8px 위치에 붙는 먹색 띠를 표시한다. 종이색 700 무게 글자를 중앙 정렬하고 10px 내부 여백을 두며, `role="status"`와 화면의 busy 상태를 함께 사용한다. 카드나 경고색 대신 먹과 종이의 역상으로 전체 흐름의 중단을 알린다.

### Evidence Grid

회고의 관찰 가능한 증거는 2열 정의 목록으로 보여준다. 1px 은색 간격이 종이색 셀을 나누며, 각 셀은 14px 내부 여백을 쓴다. 이름은 빗빛 0.8rem, 값은 먹색 1.5rem·900 무게로 대비시킨다.

### Event Timeline

최근 사건은 시각 64px과 설명 1fr의 2열 행으로 쌓는다. 각 행은 10px 수직 여백과 얇은 선으로만 구분하고, 시각은 빗빛 0.8rem으로 낮춘다. 이는 평가나 진단이 아니라 실제 사건의 순서를 읽게 하는 기록 구성이다.

## Do's and Don'ts

### Do:

- **Do** 현재 상태를 거대한 한글, 숫자, 활자 무게로 먼저 표현한다.
- **Do** 주요 조작을 최소 48px 높이로 유지하고 모든 폼 조작에 같은 초점 외곽선을 제공한다.
- **Do** 구획에는 카드보다 수평선과 간격을 사용한다.
- **Do** 모션 축소 설정에서 상태 전환 애니메이션을 제거한다.

### Don't:

- **Don't** 산성 연두를 일반 브랜드 강조나 장식에 반복 사용한다.
- **Don't** 둥근 카드, pill, 그림자, 유리 효과로 화면을 대시보드처럼 만든다.
- **Don't** 현재 요일보다 큰 장식 제목이나 그래픽을 게임 화면에 추가한다.
- **Don't** 모바일 첫 시야에서 의무 정보와 의무 버튼을 분리한다.
