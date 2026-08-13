import { describe, expect, it } from "vitest";
import { createHandoffState, decideHandoff, foldHandoff, projectHandoff } from "@experiential/game-handoff-lab";

describe("Handoff Lab", () => {
  it("moves through build, documentation, reconstruction and comparison", () => {
    let state = createHandoffState();
    for (const group of ["a", "b"] as const) {
      const tile = decideHandoff(state, { type: "tile.set", group, target: "original", index: 0, tile: group === "a" ? "ink" : "acid" });
      if (tile.ok) state = tile.events.reduce(foldHandoff, state);
      const ready = decideHandoff(state, { type: "group.ready", group }); if (ready.ok) state = ready.events.reduce(foldHandoff, state);
    }
    expect(state.phase).toBe("document");
    for (const group of ["a", "b"] as const) {
      const doc = decideHandoff(state, { type: "document.set", group, text: `${group}의 설명` }); if (doc.ok) state = doc.events.reduce(foldHandoff, state);
      const ready = decideHandoff(state, { type: "group.ready", group }); if (ready.ok) state = ready.events.reduce(foldHandoff, state);
    }
    expect(projectHandoff(state, "a").receivedDocument).toBe("b의 설명");
    expect(projectHandoff(state, "a").revealedOriginal).toBeUndefined();
    for (const group of ["a", "b"] as const) { const ready = decideHandoff(state, { type: "group.ready", group }); if (ready.ok) state = ready.events.reduce(foldHandoff, state); }
    expect(state.phase).toBe("compare");
    expect(projectHandoff(state, "a").revealedOriginal?.[0]).toBe("acid");
  });
  it("rejects edits in the wrong phase and overlong documentation", () => {
    const state = createHandoffState();
    expect(decideHandoff(state, { type: "document.set", group: "a", text: "x" })).toMatchObject({ ok: false });
  });
});
