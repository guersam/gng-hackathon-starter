import type { GameManifest, ServerGameDefinition } from "@experiential/simulation-kit";

export type Tile = "empty" | "ink" | "acid";
export type GroupId = "a" | "b";
export type Phase = "build" | "document" | "reconstruct" | "compare";
export interface HandoffState {
  phase: Phase;
  originals: Record<GroupId, Tile[]>;
  reconstructions: Record<GroupId, Tile[]>;
  documents: Record<GroupId, string>;
  ready: GroupId[];
}
export type HandoffAction =
  | { type: "tile.set"; group: GroupId; target: "original" | "reconstruction"; index: number; tile: Tile }
  | { type: "document.set"; group: GroupId; text: string }
  | { type: "group.ready"; group: GroupId };
export type HandoffEvent = HandoffAction & { sequence: number };

export const handoffManifest = {
  id: "handoff-lab",
  schemaVersion: 1,
  title: "Handoff Lab",
  summary: "한쪽이 만든 모양을 글로 설명하고, 다른 쪽이 설명만 보고 다시 만드는 게임",
  experientialIntent: "같은 설명을 서로 다르게 이해하는 순간과 말로 옮기기 어려운 기준을 찾아본다.",
  participantRange: { min: 4, max: 10 },
  expectedMinutes: 8,
  selfGuidedInstructions: ["두 그룹이 서로 보지 않고 모양을 만듭니다.", "만든 모양을 120자 안으로 설명합니다.", "상대 그룹의 설명만 보고 같은 모양을 만듭니다.", "원본과 다시 만든 모양을 나란히 보고 차이를 이야기합니다."],
  finalePlan: { participantCount: 30, roomCount: 2, topology: "두 방에서 세 조씩, 조마다 기기 한 대를 번갈아 사용", participantRoles: ["조마다 참가자 4~5명"], setupInstructions: ["각 조를 A와 B 두 그룹으로 나눈다.", "조마다 한 기기에서 /handoff를 연다.", "비교가 끝나면 눈에 띈 차이 하나를 같은 방에 공유한다."], contingency: "기기가 부족하면 종이로 모양을 만들고 한 기기에서 설명을 번갈아 쓴다." },
} satisfies GameManifest;

export function createHandoffState(): HandoffState {
  const blank = () => Array<Tile>(9).fill("empty");
  return { phase: "build", originals: { a: blank(), b: blank() }, reconstructions: { a: blank(), b: blank() }, documents: { a: "", b: "" }, ready: [] };
}

export function decideHandoff(state: HandoffState, action: HandoffAction): { ok: true; events: HandoffEvent[] } | { ok: false; code: string; message: string } {
  if (state.ready.includes(action.group)) return { ok: false, code: "group_locked", message: "이 단계에서 이미 준비를 마쳤습니다." };
  if (action.type === "tile.set") {
    const expected = state.phase === "build" ? "original" : state.phase === "reconstruct" ? "reconstruction" : null;
    if (action.target !== expected || action.index < 0 || action.index > 8) return { ok: false, code: "tile_not_allowed", message: "지금은 이 모양을 바꿀 수 없습니다." };
  }
  if (action.type === "document.set" && (state.phase !== "document" || action.text.length > 120)) return { ok: false, code: "document_not_allowed", message: "문서는 기록 단계에서 120자까지 쓸 수 있습니다." };
  return { ok: true, events: [{ ...action, sequence: 1 }] };
}

export function foldHandoff(state: HandoffState, event: HandoffEvent): HandoffState {
  const next: HandoffState = structuredClone(state);
  if (event.type === "tile.set") {
    const target = event.target === "original" ? next.originals : next.reconstructions;
    target[event.group][event.index] = event.tile;
  } else if (event.type === "document.set") next.documents[event.group] = event.text;
  else if (!next.ready.includes(event.group)) next.ready.push(event.group);
  if (next.ready.length === 2) {
    next.ready = [];
    next.phase = next.phase === "build" ? "document" : next.phase === "document" ? "reconstruct" : next.phase === "reconstruct" ? "compare" : "compare";
  }
  return next;
}

export function projectHandoff(state: HandoffState, group: GroupId) {
  const opponent: GroupId = group === "a" ? "b" : "a";
  return {
    phase: state.phase,
    ownOriginal: state.phase === "compare" || state.phase === "build" || state.phase === "document" ? state.originals[group] : undefined,
    receivedDocument: state.phase === "reconstruct" || state.phase === "compare" ? state.documents[opponent] : undefined,
    ownReconstruction: state.phase === "reconstruct" || state.phase === "compare" ? state.reconstructions[group] : undefined,
    revealedOriginal: state.phase === "compare" ? state.originals[opponent] : undefined,
  };
}

export const handoffDefinition: ServerGameDefinition<{}, HandoffState, HandoffAction, HandoffEvent, ReturnType<typeof projectHandoff>> = {
  manifest: handoffManifest,
  validateConfig: () => ({}),
  create: () => createHandoffState(),
  validateJoin: () => undefined,
  onParticipantJoined: () => [],
  decide: (state, action) => decideHandoff(state, action),
  fold: foldHandoff,
  project: (state, viewer) => projectHandoff(state, viewer.participantId.endsWith(":b") ? "b" : "a"),
  lifecycle: (state) => ({ acceptingParticipants: state.phase === "build", complete: state.phase === "compare" }),
};
