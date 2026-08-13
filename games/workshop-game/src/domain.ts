import type { GameManifest, ServerGameDefinition } from "../../../packages/simulation-kit/src/index";
import { workshopManifest } from "./manifest";

export type Choice = "left" | "right";
export interface WorkshopState { prompt: string; choices: Record<string, Choice>; revealed: boolean }
export type WorkshopAction = { type: "choice.submit"; participantId: string; choice: Choice } | { type: "result.reveal" };
export type WorkshopEvent = WorkshopAction & { sequence: number };

export function createWorkshopState(prompt = "새 기능을 빨리 내놓을까요, 실패 조건을 먼저 합의할까요?"): WorkshopState {
  return { prompt, choices: {}, revealed: false };
}

export function decideWorkshop(state: WorkshopState, action: WorkshopAction) {
  if (state.revealed) return { ok: false as const, code: "already_revealed", message: "이미 공개했습니다. 새 라운드를 시작하세요." };
  if (action.type === "choice.submit" && state.choices[action.participantId]) return { ok: false as const, code: "already_chosen", message: "한 라운드에는 한 번만 선택할 수 있습니다." };
  return { ok: true as const, events: [{ ...action, sequence: Object.keys(state.choices).length + 1 }] };
}

export function foldWorkshop(state: WorkshopState, event: WorkshopEvent): WorkshopState {
  if (event.type === "result.reveal") return { ...state, revealed: true };
  return { ...state, choices: { ...state.choices, [event.participantId]: event.choice } };
}

export const workshopDefinition: ServerGameDefinition<{ prompt?: string }, WorkshopState, WorkshopAction, WorkshopEvent, WorkshopState> = {
  manifest: workshopManifest as GameManifest,
  validateConfig: (value) => ({ prompt: typeof (value as { prompt?: unknown })?.prompt === "string" ? (value as { prompt: string }).prompt : undefined }),
  create: (config) => createWorkshopState(config.prompt),
  validateJoin: () => undefined,
  onParticipantJoined: () => [],
  decide: (state, action) => decideWorkshop(state, action),
  fold: foldWorkshop,
  project: (state) => state,
  lifecycle: (state) => ({ acceptingParticipants: !state.revealed, complete: state.revealed }),
};
