import { env, SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";

const config = {
  kind: "team_simulation",
  runMode: "team",
  teams: [{ id: "alpha", label: "알파", capacity: 3 }],
};

describe("yoil-genius worker", () => {
  it("reports the active schema", async () => {
    const response = await SELF.fetch("https://example.test/api/health");
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, schemaVersion: "yoil-genius:v2", durableObject: "sqlite" });
  });

  it("creates, joins, resumes, and exports a session", async () => {
    const createdResponse = await SELF.fetch("https://example.test/api/sessions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(config) });
    expect(createdResponse.status).toBe(201);
    const created = await createdResponse.json() as { sessionId: string; hostCapability: string };
    const joinedResponse = await SELF.fetch(`https://example.test/api/sessions/${created.sessionId}/join`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ teamId: "alpha", displayName: "민지" }) });
    expect(joinedResponse.status).toBe(201);
    const joined = await joinedResponse.json() as { capability: string; participantId: string };
    const resumed = await SELF.fetch(`https://example.test/api/sessions/${created.sessionId}/resume`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ capability: joined.capability }) });
    expect(resumed.status).toBe(200);
    expect(await resumed.json()).toMatchObject({ participantId: joined.participantId, teamId: "alpha" });
    const exported = await SELF.fetch(`https://example.test/api/sessions/${created.sessionId}/export`, { headers: { authorization: `Bearer ${created.hostCapability}` } });
    expect(exported.status).toBe(200);
    const body = await exported.json() as { events: unknown[] };
    expect(body.events).toHaveLength(2);
  });

  it("rejects invalid capacities and host export without authority", async () => {
    const invalid = await SELF.fetch("https://example.test/api/sessions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...config, teams: [{ id: "a", label: "A", capacity: 2 }] }) });
    expect(invalid.status).toBe(400);
    const created = await (await SELF.fetch("https://example.test/api/sessions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(config) })).json() as { sessionId: string };
    expect((await SELF.fetch(`https://example.test/api/sessions/${created.sessionId}/export`)).status).toBe(403);
  });

  it("allows separate teams to fill independently", async () => {
    const created = await (await SELF.fetch("https://example.test/api/sessions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "team_simulation", runMode: "team", teams: [{ id: "a", label: "A", capacity: 3 }, { id: "b", label: "B", capacity: 3 }] }) })).json() as { sessionId: string };
    for (const name of ["가", "나", "다"]) {
      await SELF.fetch(`https://example.test/api/sessions/${created.sessionId}/join`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ teamId: "a", displayName: name }) });
    }
    const late = await SELF.fetch(`https://example.test/api/sessions/${created.sessionId}/join`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ teamId: "b", displayName: "라" }) });
    expect(late.status).toBe(201);
  });

  it("creates an isolated solo practice atomically and rejects team surfaces", async () => {
    const response = await SELF.fetch("https://example.test/api/practice-sessions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ displayName: "민지" }) });
    expect(response.status).toBe(201);
    const created = await response.json() as { sessionId: string; capability: string; participantId: string; hostCapability?: string };
    expect(created.hostCapability).toBeUndefined();
    const resumed = await SELF.fetch(`https://example.test/api/sessions/${created.sessionId}/resume`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ capability: created.capability }) });
    expect(await resumed.json()).toMatchObject({ role: "player", participantId: created.participantId, teamId: "solo", snapshot: { config: { kind: "solo_practice", durationSeconds: 120 } } });
    const join = await SELF.fetch(`https://example.test/api/sessions/${created.sessionId}/join`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ teamId: "solo", displayName: "침입" }) });
    expect(join.status).toBe(400);
    expect((await SELF.fetch(`https://example.test/api/sessions/${created.sessionId}/export`)).status).toBe(403);
  });
});
