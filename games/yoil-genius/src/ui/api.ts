import type { GameState, Weekday } from "../domain/types";

export interface SessionEnvelope {
  sessionId: string;
  hostCapability: string;
  teams: Array<{
    id: string;
    label: string;
    capacity: number;
    joinPath: string;
  }>;
}
export interface StoredEventView {
  sequence: number;
  type: string;
  at: number;
  actorId: string | null;
  payload: Record<string, unknown>;
}
export interface ResumeEnvelope {
  role: "host" | "player";
  participantId: string;
  teamId: string | null;
  displayName: string | null;
  snapshot: {
    sessionId: string;
    status: string;
    config: { kind: "team_simulation" | "solo_practice"; runMode: "team" | "cohort"; durationSeconds: number; teams: Array<{ id: string; label: string; capacity: number }> };
    game: GameState;
  };
  events: StoredEventView[];
}
export async function createPractice(displayName: string) {
  return request<{ sessionId: string; participantId: string; capability: string }>("/api/practice-sessions", {
    method: "POST",
    body: JSON.stringify({ displayName }),
  });
}

export async function createSession(
  teamCount: number,
  capacity: number,
  runMode: "team" | "cohort",
) {
  const teams = Array.from({ length: teamCount }, (_, i) => ({
    id: `team-${i + 1}`,
    label: `${i + 1}팀`,
    capacity,
  }));
  return request<SessionEnvelope>("/api/sessions", {
    method: "POST",
    body: JSON.stringify({ kind: "team_simulation", runMode, teams, durationSeconds: 480 }),
  });
}
export async function joinSession(
  sessionId: string,
  teamId: string,
  displayName: string,
) {
  return request<{
    sessionId: string;
    participantId: string;
    teamId: string;
    capability: string;
  }>(`/api/sessions/${sessionId}/join`, {
    method: "POST",
    body: JSON.stringify({ teamId, displayName }),
  });
}
export async function resumeSession(sessionId: string, capability: string) {
  return request<ResumeEnvelope>(`/api/sessions/${sessionId}/resume`, {
    method: "POST",
    body: JSON.stringify({ capability }),
  });
}
async function request<T>(url: string, init: RequestInit): Promise<T> {
  const r = await fetch(url, {
    ...init,
    headers: { "content-type": "application/json", ...init.headers },
  });
  const data = (await r.json()) as T & { message?: string };
  if (!r.ok) throw new Error(data.message || "요청을 처리하지 못했습니다.");
  return data;
}

export class GameSocket {
  private ws?: WebSocket;
  private stopped = false;
  private retry?: number;
  private queue: Array<{
    item: string;
    queuedAt: number;
    timeSensitive: boolean;
  }> = [];
  constructor(
    private sessionId: string,
    private capability: string,
    private onSnapshot: (data: unknown, events?: StoredEventView[]) => void,
    private onError: (message: string) => void,
    private onStatus: (status: "connecting" | "authenticated" | "reconnecting" | "failed") => void,
  ) {}
  connect() {
    if (this.stopped) return;
    this.onStatus(this.retry ? "reconnecting" : "connecting");
    const scheme = location.protocol === "https:" ? "wss" : "ws";
    this.ws = new WebSocket(
      `${scheme}://${location.host}/api/sessions/${this.sessionId}/ws`,
    );
    this.ws.onopen = () =>
      this.ws?.send(
        JSON.stringify({ type: "authenticate", capability: this.capability }),
      );
    this.ws.onmessage = (e) => {
      const m = JSON.parse(e.data);
      if (m.type === "authenticated") {
        this.onStatus("authenticated");
        for (const pending of this.queue) {
          if (!pending.timeSensitive || Date.now() - pending.queuedAt < 1000)
            this.ws?.send(pending.item);
          else
            this.onError(
              "연결이 끊긴 동안 입력 시간이 지났습니다. 현재 상태에서 다시 눌러 주세요.",
            );
        }
        this.queue = [];
      }
      if (m.type === "snapshot") this.onSnapshot(m.snapshot, m.events);
      if (m.type === "events")
        void resumeSession(this.sessionId, this.capability).then((x) =>
          this.onSnapshot(x.snapshot, x.events),
        );
      if (m.type === "rejection") this.onError(m.message);
    };
    this.ws.onclose = () => {
      if (!this.stopped) {
        this.onStatus("reconnecting");
        this.retry = window.setTimeout(() => this.connect(), 1500);
      }
    };
    this.ws.onerror = () => this.onStatus("failed");
  }
  command(command: {
    type: string;
    weekday?: Weekday;
    rangeId?: string;
    timeLimit?: number;
    challengeId?: string;
  }) {
    const item = JSON.stringify({
      type: "command",
      id: crypto.randomUUID(),
      command,
    });
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(item);
    else
      this.queue.push({
        item,
        queuedAt: Date.now(),
        timeSensitive:
          command.type === "duty.press" || command.type === "challenge.answer",
      });
  }
  close() {
    this.stopped = true;
    if (this.retry) clearTimeout(this.retry);
    this.ws?.close();
  }
}
