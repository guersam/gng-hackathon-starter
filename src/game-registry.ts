import { assertManifest, type GameManifest } from "@experiential/simulation-kit";
import { yoilManifest } from "@experiential/game-yoil-genius";
import { handoffManifest } from "@experiential/game-handoff-lab";

export const GAME_MANIFESTS = [yoilManifest, handoffManifest] satisfies GameManifest[];
for (const manifest of GAME_MANIFESTS) assertManifest(manifest);
export const GAME_MANIFEST_BY_ID = new Map(GAME_MANIFESTS.map((manifest) => [manifest.id, manifest]));
