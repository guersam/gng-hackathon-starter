import { describe, expect, it } from "vitest";
import { createWorkshopState, decideWorkshop, foldWorkshop } from "@experiential/game-workshop";

describe("workshop game pack", () => {
  it("keeps choices private until an explicit reveal", () => {
    const state = createWorkshopState();
    const decision = decideWorkshop(state, { type: "choice.submit", participantId: "p1", choice: "left" });
    expect(decision.ok).toBe(true);
    if (!decision.ok) return;
    const chosen = decision.events.reduce(foldWorkshop, state);
    expect(chosen.revealed).toBe(false);
    const reveal = decideWorkshop(chosen, { type: "result.reveal" });
    if (!reveal.ok) throw new Error(reveal.message);
    expect(reveal.events.reduce(foldWorkshop, chosen).revealed).toBe(true);
  });
});
