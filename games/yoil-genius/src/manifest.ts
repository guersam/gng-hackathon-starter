import type { GameManifest } from "@experiential/simulation-kit";

export const yoilManifest = {
  id: "yoil-genius",
  schemaVersion: 2,
  title: "요일 천재",
  summary: "9초마다 요일 버튼을 누르면서 날짜 문제도 푸는 실시간 팀 게임",
  experientialIntent: "반복 작업과 날짜 문제가 겹칠 때 팀이 어떻게 일을 나누고 서로 돕는지 살펴본다.",
  participantRange: { min: 1, max: 30 },
  expectedMinutes: 8,
  selfGuidedInstructions: ["팀 링크로 입장합니다.", "9초마다 화면에 나온 요일을 누르면서 날짜 문제를 풉니다.", "게임이 끝나면 팀 기록을 함께 읽습니다."],
  finalePlan: { participantCount: 30, roomCount: 2, topology: "한 게임에서 팀마다 참가 링크를 만들어 두 방에 나눠 줌", participantRoles: ["팀마다 참가자 5명"], setupInstructions: ["5명씩 6팀을 만든다.", "각 방에서 3개 팀 링크를 나눠 쓴다.", "전체 동시 시작을 사용한다."], contingency: "실시간 연결이 불안하면 방마다 다른 통신망을 쓰고 기존 참가 권한으로 다시 연결한다." },
} satisfies GameManifest;
