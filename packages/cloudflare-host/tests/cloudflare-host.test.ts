import { describe, expect, it } from "vitest";
import { applyGameCommand } from "@experiential/cloudflare-host";
import { workshopDefinition } from "@experiential/game-workshop";

describe("generic game host", () => {
  it("folds a game definition once for an idempotency key", () => {
    const stored = { version: 0, events: [], state: workshopDefinition.create({}, { now: 0, sessionId: "s1" }), commandIds: [] as string[] };
    const context = { now: 1, sessionId: "s1", participantId: "p1", commandId: "c1" };
    const first = applyGameCommand(workshopDefinition, stored, { type: "choice.submit", participantId: "p1", choice: "left" }, context, "c1");
    const retry = applyGameCommand(workshopDefinition, first.stored, { type: "choice.submit", participantId: "p1", choice: "left" }, context, "c1");
    expect(first.stored.version).toBe(1);
    expect(retry.stored).toBe(first.stored);
  });
});
