import { DurableObject } from "cloudflare:workers";
import { hashCapability, newCapability } from "./crypto";
import type { CapabilityRecord, ClientMessage, Env, ServerMessage, SessionCreateConfig, SessionSnapshot, SocketAttachment, StoredEvent } from "./types";
import { cleanDisplayName } from "./validation";
import { applyGameCommand, commandForActor, foldGame, initialGame, joinGame, nextDeadline, reconcileGame } from "./game-adapter";
import type { GameEvent, GameState } from "@experiential/game-yoil-genius/domain";

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };
const RETENTION_MS = 24 * 60 * 60 * 1000;

export class YoilSession extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => this.createSchema());
  }

  private createSchema(): void {
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS capabilities (
        capability_hash TEXT PRIMARY KEY, role TEXT NOT NULL, participant_id TEXT NOT NULL,
        team_id TEXT, display_name TEXT, created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS events (
        sequence INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL, at INTEGER NOT NULL,
        actor_id TEXT, payload TEXT NOT NULL, command_id TEXT
      );
      CREATE INDEX IF NOT EXISTS events_at ON events(at);
      CREATE INDEX IF NOT EXISTS events_command ON events(command_id);
    `);
  }

  async fetch(request: Request): Promise<Response> {
    const action = request.headers.get("x-session-action") || new URL(request.url).pathname.slice(1);
    try {
      if (action === "health") {
        const row = [...this.ctx.storage.sql.exec<{ ok: number }>("SELECT 1 AS ok")][0];
        return this.json({ ok: row?.ok === 1, store: "sqlite" });
      }
      if (action === "init" && request.method === "POST") return await this.initialize(await request.json());
      if (!this.getSnapshot()) return this.json({ error: "not_found", message: "세션을 찾을 수 없습니다." }, 404);
      if (action === "join" && request.method === "POST") return await this.join(await request.json());
      if (action === "resume" && request.method === "POST") return await this.resume(await request.json());
      if (action === "export" && request.method === "GET") return await this.exportEvents(request);
      if (action === "ws" && request.headers.get("upgrade")?.toLowerCase() === "websocket") return this.upgrade();
      return this.json({ error: "method_not_allowed", message: "지원하지 않는 요청입니다." }, 405);
    } catch (error) {
      return this.json({ error: "invalid_request", message: error instanceof Error ? error.message : "잘못된 요청입니다." }, 400);
    }
  }

  private async initialize(body: unknown): Promise<Response> {
    if (this.getSnapshot()) return this.json({ error: "already_initialized" }, 409);
    const { sessionId, hostCapability, config, practiceParticipant } = body as { sessionId: string; hostCapability?: string; config: SessionCreateConfig; practiceParticipant?: { participantId: string; capability: string; displayName: string } };
    const now = Date.now();
    const storedConfig = config.kind === "solo_practice"
      ? { ...config, timezone: config.timezone || "Asia/Seoul", durationSeconds: 120 as const }
      : { ...config, timezone: config.timezone || "Asia/Seoul", durationSeconds: config.durationSeconds || 480 };
    let practiceEvents: GameEvent[] = [];
    const snapshot: SessionSnapshot = {
      schemaVersion: "yoil-genius:v2", sessionId, createdAt: now, expiresAt: 0,
      config: storedConfig,
      status: "lobby", participants: [], readyTeamIds: [], revision: 0,
      game: initialGame(config, now),
    };
    if (config.kind === "solo_practice") {
      if (!practiceParticipant) throw new Error("연습 참가자 정보가 필요합니다.");
      const decision = joinGame(snapshot.game, `join:${practiceParticipant.participantId}`, now, "solo", practiceParticipant.participantId, practiceParticipant.displayName);
      if (!decision.ok) throw new Error(decision.error.message);
      practiceEvents = decision.events;
      snapshot.game = foldGame(snapshot.game, decision.events);
      snapshot.participants.push({ id: practiceParticipant.participantId, teamId: "solo", displayName: practiceParticipant.displayName, joinedAt: now });
      snapshot.revision = 1;
    }
    this.setSnapshot(snapshot);
    this.appendEvent("session.created", now, null, { config: snapshot.config }, null);
    if (config.kind === "team_simulation") {
      if (!hostCapability) throw new Error("세션 관리 권한이 필요합니다.");
      await this.putCapability({ capabilityHash: await hashCapability(hostCapability), role: "host", participantId: `host:${sessionId}`, teamId: null, displayName: null, createdAt: now });
    } else if (practiceParticipant) {
      await this.putCapability({ capabilityHash: await hashCapability(practiceParticipant.capability), role: "player", participantId: practiceParticipant.participantId, teamId: "solo", displayName: practiceParticipant.displayName, createdAt: now });
      for (const event of practiceEvents) this.appendDomainEvent(event);
    }
    return this.json({ ok: true }, 201);
  }

  private async join(body: unknown): Promise<Response> {
    const { teamId, displayName: rawName } = body as { teamId?: string; displayName?: unknown };
    const displayName = cleanDisplayName(rawName);
    const snapshot = this.requireSnapshot();
    if (snapshot.config.kind !== "team_simulation") throw new Error("혼자 연습에는 참가 링크가 없습니다.");
    const team = snapshot.config.teams.find((item) => item.id === teamId);
    if (!team) throw new Error("팀을 찾을 수 없습니다.");
    const teamState = snapshot.game.teams[team.id];
    if (!teamState || teamState.phase !== "lobby") throw new Error("이미 시작한 팀에는 참가할 수 없습니다.");
    const members = snapshot.participants.filter((participant) => participant.teamId === team.id);
    if (members.length >= team.capacity) throw new Error("팀 정원이 찼습니다.");
    const participantId = crypto.randomUUID();
    const capability = newCapability();
    const now = Date.now();
    const decision = joinGame(snapshot.game, `join:${participantId}`, now, team.id, participantId, displayName);
    if (!decision.ok) throw new Error(decision.error.message);
    snapshot.game = foldGame(snapshot.game, decision.events);
    snapshot.participants.push({ id: participantId, teamId: team.id, displayName, joinedAt: now });
    snapshot.revision += 1;
    this.setSnapshot(snapshot);
    await this.putCapability({ capabilityHash: await hashCapability(capability), role: "player", participantId, teamId: team.id, displayName, createdAt: now });
    const events = decision.events.map((event) => this.appendDomainEvent(event));
    await this.schedule(snapshot);
    this.broadcast(events, snapshot.revision);
    return this.json({ sessionId: snapshot.sessionId, participantId, teamId: team.id, capability }, 201);
  }

  private async resume(body: unknown): Promise<Response> {
    const capability = typeof (body as { capability?: unknown })?.capability === "string" ? (body as { capability: string }).capability : "";
    const record = await this.findCapability(capability);
    if (!record) return this.json({ error: "unauthorized", message: "참가 권한을 확인할 수 없습니다." }, 401);
    return this.json({ role: record.role, participantId: record.participantId, teamId: record.teamId, displayName: record.displayName, snapshot: publicSnapshot(this.requireSnapshot()), events: publicEvents(this.eventsSince(0)) });
  }

  private async exportEvents(request: Request): Promise<Response> {
    const capability = bearer(request);
    const record = capability ? await this.findCapability(capability) : null;
    if (record?.role !== "host") return this.json({ error: "forbidden", message: "세션 관리 권한이 필요합니다." }, 403);
    return this.json({ snapshot: this.requireSnapshot(), events: this.eventsSince(0) });
  }

  private upgrade(): Response {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    server.serializeAttachment({ authenticated: false } satisfies SocketAttachment);
    this.ctx.acceptWebSocket(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    let message: ClientMessage;
    try { message = JSON.parse(typeof raw === "string" ? raw : new TextDecoder().decode(raw)) as ClientMessage; }
    catch { return this.send(ws, { type: "rejection", code: "invalid_json", message: "메시지를 읽을 수 없습니다." }); }
    const attachment = (ws.deserializeAttachment() || { authenticated: false }) as SocketAttachment;
    if (!attachment.authenticated) {
      if (message.type !== "authenticate") return this.send(ws, { type: "rejection", code: "authentication_required", message: "먼저 인증해야 합니다." });
      const record = await this.findCapability(message.capability);
      if (!record) { this.send(ws, { type: "rejection", code: "unauthorized", message: "권한을 확인할 수 없습니다." }); ws.close(1008, "Unauthorized"); return; }
      const next: SocketAttachment = { authenticated: true, role: record.role, participantId: record.participantId, teamId: record.teamId };
      ws.serializeAttachment(next);
      this.send(ws, { type: "authenticated", role: record.role, participantId: record.participantId, teamId: record.teamId });
      this.send(ws, { type: "snapshot", serverTime: Date.now(), snapshot: publicSnapshot(this.requireSnapshot()), events: publicEvents(this.eventsSince(message.since || 0)) });
      return;
    }
    if (message.type !== "command") return this.send(ws, { type: "rejection", code: "invalid_message", message: "명령 형식이 올바르지 않습니다." });
    await this.applyCommand(ws, attachment, message.id, message.command);
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean): Promise<void> { ws.close(code, reason || (wasClean ? "Closed" : "Disconnected")); }
  async webSocketError(ws: WebSocket): Promise<void> { ws.close(1011, "WebSocket error"); }

  private async applyCommand(ws: WebSocket, actor: SocketAttachment, commandId: string, command: { type: string; [key: string]: unknown }): Promise<void> {
    if (!commandId || commandId.length > 100) return this.send(ws, { type: "rejection", code: "invalid_command_id", message: "명령 ID가 필요합니다." });
    const existing = [...this.ctx.storage.sql.exec<{ sequence: number }>("SELECT sequence FROM events WHERE command_id = ?", commandId)][0];
    if (existing) return;
    const snapshot = this.requireSnapshot();
    if (snapshot.config.kind === "solo_practice" && command.type !== "practice.start" && command.type.startsWith("host.")) return this.send(ws, { type: "rejection", code: "forbidden", message: "혼자 연습에서는 세션 관리 기능을 쓸 수 없습니다.", commandId });
    const domainCommand = commandForActor(command, commandId, Date.now(), actor);
    if (!domainCommand) return this.send(ws, { type: "rejection", code: "forbidden", message: "이 명령을 실행할 권한이 없습니다.", commandId });
    const decision = applyGameCommand(snapshot.game, domainCommand);
    if (!decision.ok) return this.send(ws, { type: "rejection", code: decision.error.code, message: decision.error.message, commandId });
    snapshot.game = foldGame(snapshot.game, decision.events);
    snapshot.revision += 1;
    snapshot.status = overallStatus(snapshot.game);
    if (snapshot.status === "finished" && snapshot.expiresAt === 0) snapshot.expiresAt = Date.now() + RETENTION_MS;
    if (command.type === "team.ready" && actor.teamId && !snapshot.readyTeamIds.includes(actor.teamId)) snapshot.readyTeamIds.push(actor.teamId);
    this.setSnapshot(snapshot);
    const events = decision.events.map((event) => this.appendDomainEvent(event));
    await this.schedule(snapshot);
    this.broadcast(events, snapshot.revision);
  }

  async alarm(): Promise<void> {
    const snapshot = this.getSnapshot();
    if (!snapshot) return;
    const now = Date.now();
    if (snapshot.expiresAt > 0 && now >= snapshot.expiresAt) {
      for (const socket of this.ctx.getWebSockets()) socket.close(1001, "Session expired");
      await this.ctx.storage.deleteAll();
      return;
    }
    const domainEvents = reconcileGame(snapshot.game, now);
    if (domainEvents.length) {
      snapshot.game = foldGame(snapshot.game, domainEvents);
      snapshot.status = overallStatus(snapshot.game);
      if (snapshot.status === "finished" && snapshot.expiresAt === 0) snapshot.expiresAt = now + RETENTION_MS;
      snapshot.revision += 1;
      this.setSnapshot(snapshot);
      this.broadcast(domainEvents.map((event) => this.appendDomainEvent(event)), snapshot.revision);
    }
    await this.schedule(snapshot);
  }

  private broadcast(events: StoredEvent[], revision: number): void {
    const message: ServerMessage = { type: "events", events: publicEvents(events), revision };
    for (const socket of this.ctx.getWebSockets()) {
      const attachment = socket.deserializeAttachment() as SocketAttachment | null;
      if (attachment?.authenticated) this.send(socket, message);
    }
  }

  private send(ws: WebSocket, message: ServerMessage): void { ws.send(JSON.stringify(message)); }
  private json(body: unknown, status = 200): Response { return Response.json(body, { status, headers: JSON_HEADERS }); }
  private getSnapshot(): SessionSnapshot | null { const row = [...this.ctx.storage.sql.exec<{ value: string }>("SELECT value FROM metadata WHERE key = 'snapshot'")][0]; return row ? JSON.parse(row.value) as SessionSnapshot : null; }
  private requireSnapshot(): SessionSnapshot { const value = this.getSnapshot(); if (!value) throw new Error("세션을 찾을 수 없습니다."); return value; }
  private setSnapshot(snapshot: SessionSnapshot): void { this.ctx.storage.sql.exec("INSERT INTO metadata(key, value) VALUES ('snapshot', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", JSON.stringify(snapshot)); }
  private async putCapability(record: CapabilityRecord): Promise<void> { this.ctx.storage.sql.exec("INSERT INTO capabilities(capability_hash, role, participant_id, team_id, display_name, created_at) VALUES (?, ?, ?, ?, ?, ?)", record.capabilityHash, record.role, record.participantId, record.teamId, record.displayName, record.createdAt); }
  private async findCapability(raw: string): Promise<CapabilityRecord | null> {
    if (!raw) return null;
    const hash = await hashCapability(raw);
    const row = [...this.ctx.storage.sql.exec<{ capability_hash: string; role: "host" | "player"; participant_id: string; team_id: string | null; display_name: string | null; created_at: number }>("SELECT * FROM capabilities WHERE capability_hash = ?", hash)][0];
    return row ? { capabilityHash: row.capability_hash, role: row.role, participantId: row.participant_id, teamId: row.team_id, displayName: row.display_name, createdAt: row.created_at } : null;
  }
  private appendEvent(type: string, at: number, actorId: string | null, payload: unknown, commandId: string | null): StoredEvent {
    this.ctx.storage.sql.exec("INSERT INTO events(type, at, actor_id, payload, command_id) VALUES (?, ?, ?, ?, ?)", type, at, actorId, JSON.stringify(payload), commandId);
    const row = [...this.ctx.storage.sql.exec<{ sequence: number }>("SELECT last_insert_rowid() AS sequence")][0];
    return { sequence: Number(row.sequence), type, at, actorId, payload };
  }
  private appendDomainEvent(event: GameEvent): StoredEvent { return this.appendEvent(event.type, event.atMs, "memberId" in event ? event.memberId : null, event, event.commandId || null); }
  private async schedule(snapshot: SessionSnapshot): Promise<void> {
    const deadline = nextDeadline(snapshot.game, Date.now(), snapshot.expiresAt);
    if (deadline === null) await this.ctx.storage.deleteAlarm();
    else await this.ctx.storage.setAlarm(deadline);
  }
  private eventsSince(sequence: number): StoredEvent[] { return [...this.ctx.storage.sql.exec<{ sequence: number; type: string; at: number; actor_id: string | null; payload: string }>("SELECT sequence, type, at, actor_id, payload FROM events WHERE sequence > ? ORDER BY sequence", sequence)].map((row) => ({ sequence: row.sequence, type: row.type, at: row.at, actorId: row.actor_id, payload: JSON.parse(row.payload) })); }
}

function overallStatus(game: GameState): SessionSnapshot["status"] {
  const phases = Object.values(game.teams).map((team) => team.phase);
  if (phases.every((phase) => phase === "finished")) return "finished";
  if (phases.some((phase) => phase === "running")) return "running";
  if (phases.some((phase) => phase === "paused")) return "paused";
  if (phases.some((phase) => phase === "countdown")) return "countdown";
  return "lobby";
}

function bearer(request: Request): string | null {
  const value = request.headers.get("authorization");
  return value?.startsWith("Bearer ") ? value.slice(7) : null;
}

function publicSnapshot(snapshot: SessionSnapshot): unknown {
  const copy = structuredClone(snapshot) as SessionSnapshot;
  for (const team of Object.values(copy.game.teams)) {
    for (const challenge of Object.values(team.challenges)) delete (challenge as Partial<typeof challenge>).expected;
  }
  return copy;
}

function publicEvents(events: StoredEvent[]): StoredEvent[] {
  return events.map((event) => {
    if (event.type !== "challenge.started") return event;
    const payload = structuredClone(event.payload) as { challenge?: { expected?: unknown } };
    if (payload.challenge) delete payload.challenge.expected;
    return { ...event, payload };
  });
}
