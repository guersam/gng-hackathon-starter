import { describe, expect, it } from "vitest";
import { assertManifest } from "@experiential/simulation-kit";
import { GAME_MANIFESTS } from "../../src/game-registry";

describe("game manifests", () => {
  it("keeps every registered pack valid and uniquely identified", () => {
    for (const manifest of GAME_MANIFESTS) expect(() => assertManifest(manifest)).not.toThrow();
    expect(new Set(GAME_MANIFESTS.map((manifest) => manifest.id)).size).toBe(GAME_MANIFESTS.length);
  });
});
