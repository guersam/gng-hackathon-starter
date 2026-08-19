import { describe, expect, it } from "vitest";
import { applyGameCommand } from "@experiential/cloudflare-host";
import { handoffDefinition } from "@experiential/game-handoff-lab";

describe("generic game host", () => {
  it("folds a game definition once for an idempotency key", () => {
    const stored = { version: 0, events: [], state: handoffDefinition.create({}, { now: 0, sessionId: "s1" }), commandIds: [] as string[] };
    const context = { now: 1, sessionId: "s1", participantId: "p1", commandId: "c1" };
    const first = applyGameCommand(handoffDefinition, stored, { type: "tile.set", group: "a", target: "original", index: 0, tile: "ink" }, context, "c1");
    const retry = applyGameCommand(handoffDefinition, first.stored, { type: "tile.set", group: "a", target: "original", index: 0, tile: "ink" }, context, "c1");
    expect(first.stored.version).toBe(1);
    expect(retry.stored).toBe(first.stored);
  });
});
