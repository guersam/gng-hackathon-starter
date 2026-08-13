import { assertManifest, type GameManifest } from "../packages/simulation-kit/src/index";
import { yoilManifest } from "../games/yoil-genius/src/manifest";
import { workshopManifest } from "../games/workshop-game/src/manifest";
import { handoffManifest } from "../games/handoff-lab/src/domain";

export const GAME_MANIFESTS = [yoilManifest, handoffManifest, workshopManifest] satisfies GameManifest[];
for (const manifest of GAME_MANIFESTS) assertManifest(manifest);
export const GAME_MANIFEST_BY_ID = new Map(GAME_MANIFESTS.map((manifest) => [manifest.id, manifest]));
