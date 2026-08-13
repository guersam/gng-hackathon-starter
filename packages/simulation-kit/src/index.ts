export interface FinalePlan {
  participantCount: 30;
  roomCount: 2;
  topology: string;
  participantRoles: string[];
  setupInstructions: string[];
  contingency: string;
}

export interface GameManifest {
  id: string;
  schemaVersion: number;
  title: string;
  summary: string;
  experientialIntent: string;
  participantRange: { min: number; max: number };
  expectedMinutes: number;
  selfGuidedInstructions: string[];
  finalePlan: FinalePlan;
}

export interface GameContext { now: number; sessionId: string }
export interface JoinContext extends GameContext { participantId: string; displayName: string; gameInput: unknown }
export interface ActionContext extends GameContext { participantId: string; commandId: string }
export interface ViewerContext { participantId: string; role: "host" | "player" }
export interface TimeContext extends GameContext {}
export type GameDecision<Event> = { ok: true; events: Event[] } | { ok: false; code: string; message: string };

export interface ServerGameDefinition<Config, State, Action, Event, View> {
  manifest: GameManifest;
  validateConfig(value: unknown): Config;
  create(config: Config, context: GameContext): State;
  validateJoin(input: unknown, context: JoinContext): void;
  onParticipantJoined(state: State, context: JoinContext): Event[];
  decide(state: State, action: Action, context: ActionContext): GameDecision<Event>;
  fold(state: State, event: Event): State;
  project(state: State, viewer: ViewerContext): View;
  reconcile?(state: State, context: TimeContext): Event[];
  nextWakeAt?(state: State): number | null;
  lifecycle(state: State): { acceptingParticipants: boolean; complete: boolean };
}

export function assertManifest(manifest: GameManifest): void {
  if (!/^[a-z0-9-]+$/.test(manifest.id)) throw new Error("Game id must be a lowercase slug");
  if (!Number.isInteger(manifest.schemaVersion) || manifest.schemaVersion < 1) throw new Error("Game schema version must be positive");
  if (manifest.participantRange.min < 1 || manifest.participantRange.max > 30 || manifest.participantRange.min > manifest.participantRange.max) throw new Error("Participant range must be within 1–30");
  if (!manifest.selfGuidedInstructions.length) throw new Error("Self-guided instructions are required");
  if (manifest.finalePlan.participantCount !== 30 || manifest.finalePlan.roomCount !== 2 || !manifest.finalePlan.contingency) throw new Error("Finale plan must cover 30 participants, two rooms, and a contingency");
}
