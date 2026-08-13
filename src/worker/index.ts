import type { Env } from "./types";
import { newCapability } from "./crypto";
import { parseCreateSession, parsePracticeInput } from "./validation";
import { GAME_MANIFESTS } from "../game-registry";
export { YoilSession } from "./session";

const API_HEADERS = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: API_HEADERS });
}

function sessionRoute(pathname: string): { sessionId: string; action: string } | null {
  const match = pathname.match(/^\/api\/sessions\/([A-Za-z0-9_-]{10,64})(?:\/(join|resume|export|ws))?$/);
  return match ? { sessionId: match[1], action: match[2] || "snapshot" } : null;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api/health") {
      const health = env.SESSIONS.get(env.SESSIONS.idFromName("__health__"));
      const storage = await health.fetch("https://session.internal/health");
      return json({ ok: storage.ok, service: "gng-hackathon-starter", schemaVersion: "yoil-genius:v2", durableObject: storage.ok ? "sqlite" : "unavailable", now: Date.now() }, storage.ok ? 200 : 503);
    }
    if (url.pathname === "/api/games" && request.method === "GET") return json({ games: GAME_MANIFESTS });
    if (url.pathname === "/api/practice-sessions" && request.method === "POST") {
      try {
        const { displayName, timezone } = parsePracticeInput(await request.json());
        const sessionId = crypto.randomUUID().replaceAll("-", "");
        const participantId = crypto.randomUUID();
        const capability = newCapability();
        const config = { kind: "solo_practice" as const, runMode: "team" as const, timezone, durationSeconds: 120 as const, teams: [{ id: "solo" as const, label: "나" as const, capacity: 1 as const }] as const };
        const stub = env.SESSIONS.get(env.SESSIONS.idFromName(sessionId));
        const initialized = await stub.fetch("https://session.internal/init", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ sessionId, config, practiceParticipant: { participantId, capability, displayName } }),
        });
        if (!initialized.ok) return initialized;
        return json({ sessionId, participantId, capability }, 201);
      } catch (error) {
        return json({ error: "invalid_request", message: error instanceof Error ? error.message : "잘못된 요청입니다." }, 400);
      }
    }
    if (url.pathname === "/api/sessions" && request.method === "POST") {
      try {
        const config = parseCreateSession(await request.json());
        const sessionId = crypto.randomUUID().replaceAll("-", "");
        const hostCapability = newCapability();
        const stub = env.SESSIONS.get(env.SESSIONS.idFromName(sessionId));
        const initialized = await stub.fetch("https://session.internal/init", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ sessionId, hostCapability, config }),
        });
        if (!initialized.ok) return initialized;
        return json({ sessionId, hostCapability, teams: config.teams.map(({ id, label, capacity }) => ({ id, label, capacity, joinPath: `/join/${sessionId}/${id}` })) }, 201);
      } catch (error) {
        return json({ error: "invalid_request", message: error instanceof Error ? error.message : "잘못된 요청입니다." }, 400);
      }
    }
    const route = sessionRoute(url.pathname);
    if (route) {
      const stub = env.SESSIONS.get(env.SESSIONS.idFromName(route.sessionId));
      const headers = new Headers(request.headers);
      headers.set("x-session-action", route.action);
      headers.set("x-session-id", route.sessionId);
      return stub.fetch(new Request("https://session.internal/dispatch", { method: request.method, headers, body: request.body, redirect: "manual" }));
    }
    if (url.pathname.startsWith("/api/")) return json({ error: "not_found", message: "API 경로를 찾을 수 없습니다." }, 404);
    return env.ASSETS ? env.ASSETS.fetch(request) : new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
