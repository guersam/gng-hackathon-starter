import type { YoilSession } from "./session";

export interface Env {
  SESSIONS: DurableObjectNamespace<YoilSession>;
  ASSETS?: Fetcher;
}

export type CapabilityRole = "host" | "player";

export interface TeamConfig {
  id: string;
  label: string;
  capacity: number;
}

export interface CreateSessionInput {
  kind: "team_simulation";
  runMode: "team" | "cohort";
  timezone?: string;
  durationSeconds?: number;
  teams: TeamConfig[];
}

export interface CreatePracticeInput {
  kind: "solo_practice";
  runMode: "team";
  timezone?: string;
  durationSeconds: 120;
  teams: [{ id: "solo"; label: "나"; capacity: 1 }];
}

export type SessionCreateConfig = CreateSessionInput | CreatePracticeInput;
export type StoredSessionConfig =
  | (CreateSessionInput & { timezone: string; durationSeconds: number })
  | (CreatePracticeInput & { timezone: string; durationSeconds: 120 });

export interface CapabilityRecord {
  capabilityHash: string;
  role: CapabilityRole;
  participantId: string;
  teamId: string | null;
  displayName: string | null;
  createdAt: number;
}

export interface StoredEvent {
  sequence: number;
  type: string;
  at: number;
  actorId: string | null;
  payload: unknown;
}

export interface SessionSnapshot {
  schemaVersion: "yoil-genius:v2";
  sessionId: string;
  createdAt: number;
  expiresAt: number;
  config: StoredSessionConfig;
  status: "lobby" | "countdown" | "running" | "paused" | "finished";
  participants: Array<{
    id: string;
    teamId: string;
    displayName: string;
    joinedAt: number;
  }>;
  readyTeamIds: string[];
  revision: number;
  game: import("@experiential/game-yoil-genius/domain").GameState;
}

export type ClientMessage =
  | { type: "authenticate"; capability: string; since?: number }
  | { type: "command"; id: string; command: { type: string; [key: string]: unknown } };

export type ServerMessage =
  | { type: "authenticated"; role: CapabilityRole; participantId: string; teamId: string | null }
  | { type: "snapshot"; serverTime: number; snapshot: unknown; events: StoredEvent[] }
  | { type: "events"; events: StoredEvent[]; revision: number }
  | { type: "rejection"; code: string; message: string; commandId?: string };

export interface SocketAttachment {
  authenticated: boolean;
  role?: CapabilityRole;
  participantId?: string;
  teamId?: string | null;
}
