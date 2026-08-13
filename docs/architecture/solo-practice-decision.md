# 혼자 연습 경계 결정

결정일: 2026-08-13
결정 ID: `decision:solo-practice-boundary`
시나리오: `scenario:prerequisite-solo-rehearsal`
스레드: `thread:solo-prerequisite-rehearsal`

## 질문과 운영 범위

혼자서 실제 배포 경로를 검증하게 하면서도 한 사람을 팀으로 취급하거나 팀 순위를 오염시키지 않는 방법은 무엇인가? 현재 위치는 prototype, 계약은 provisional, 증거는 local witness, 변경은 공개 전이라 reversible이다.

## 결정

`team_simulation`과 `solo_practice`를 명시적으로 구분한다. 솔로는 정확히 한 명·120초·비경쟁이며, 9초 의무와 문제 점수, 서버 시간, 재연결, 추가 전용 사건은 팀 모드와 같은 좁은 엔진을 사용한다. 생성·시작 권한, 리더보드와 성찰 문구는 넓은 orchestrator와 projection에서 분리한다.

## 후보 판별

| 후보 | 힘의 disposition | 판단 |
|---|---|---|
| 팀 정원을 1–5명으로 완화 | 구현량은 줄지만 팀 의미와 비교 가능성을 훼손 | 기각 |
| 솔로 전용 엔진 복제 | 표현은 분명하지만 시간·점수 법칙이 갈라짐 | 기각 |
| 별도 세션 프로필 + 공통 엔진 | 팀 계약 보존, 실제 배포 경로 검증, 비교 오염 방지 | 선택 |

## CLEAR 기록

- Concepts: 세션 종류가 모집단을 보존하며 정원 숫자만으로 의미를 추론하지 않는다.
- Laws: 팀은 3–5명, 솔로는 정확히 1명·1개 실행 단위·120초·개별 시작이다. 다른 조합은 서버가 거부한다.
- Evidence: 도메인 조합 테스트, Worker 권한 테스트, 320px Playwright 흐름과 저장 사건을 서로 다른 증거로 남긴다.
- Authority: 솔로 참가자는 시작만 요청한다. 시각, 점수, 종료와 기록은 Durable Object가 결정한다.
- Realization: `SessionConfig`의 판별 union, 원자적 `/api/practice-sessions`, mode-aware projection과 UI facade로 구현한다.

## 재개방 조건

솔로 경쟁 순위, 팀과 혼합된 세션, 진행자가 신뢰할 수 있는 수료 증명, 장기 개인 기록, 30명 초과 공개 서비스, 또는 팀과 다른 솔로 규칙이 요구되면 결정을 다시 연다. 현재 완료 목록은 참가자 소유 배포의 자기 점검이며 인증서가 아니다.
