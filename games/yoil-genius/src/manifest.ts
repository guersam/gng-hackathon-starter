import type { GameManifest } from "@experiential/simulation-kit";

export const yoilManifest = {
  id: "yoil-genius",
  schemaVersion: 2,
  title: "요일 천재",
  summary: "9초의 공동 의무와 날짜 문제를 동시에 다루는 실시간 시뮬레이션",
  experientialIntent: "반복 의무와 전문 과업이 겹칠 때 주의, 분업과 회복이 어떻게 나타나는지 경험한다.",
  participantRange: { min: 1, max: 30 },
  expectedMinutes: 8,
  selfGuidedInstructions: ["팀 링크로 입장합니다.", "현재 요일 의무를 지키며 날짜 문제를 풉니다.", "종료 뒤 사건 기록을 함께 읽습니다."],
  finalePlan: { participantCount: 30, roomCount: 2, topology: "한 세션의 팀별 참가 링크를 두 방에 배포", participantRoles: ["호스트 1명", "방 안내자 2명", "플레이어 30명"], setupInstructions: ["호스트가 6팀×5명 세션을 만든다.", "각 방에 3개 팀 링크를 공유한다.", "전체 동시 시작을 사용한다."], contingency: "WebSocket 접속이 불안하면 방별 통신망을 바꾸고 기존 capability로 재접속한다." },
} satisfies GameManifest;
