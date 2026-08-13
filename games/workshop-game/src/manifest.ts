import type { GameManifest } from "@experiential/simulation-kit";

export const workshopManifest = {
  id: "workshop-game",
  schemaVersion: 1,
  title: "우리 팀의 실험",
  summary: "한 상황, 한 선택, 한 결과로 시작하는 항상 실행 가능한 게임 팩",
  experientialIntent: "팀이 정의한 한 가지 경험을 플레이 가능한 가장 작은 규칙으로 시험한다.",
  participantRange: { min: 1, max: 30 },
  expectedMinutes: 5,
  selfGuidedInstructions: ["상황을 읽습니다.", "각자 한 가지 선택을 제출합니다.", "결과를 보고 실제로 일어난 행동을 한 문장으로 기록합니다."],
  finalePlan: { participantCount: 30, roomCount: 2, topology: "각 방에서 같은 URL을 열고 진행자가 이름 묶음을 입력하는 순차 선택", participantRoles: ["진행자 2명", "선택자 30명"], setupInstructions: ["두 방에 같은 URL을 공유한다.", "방별 이름을 쉼표로 입력한다.", "모두 선택한 뒤 동시에 공개한다."], contingency: "네트워크가 끊기면 방별 한 기기 pass-and-play로 계속한다." },
} satisfies GameManifest;
