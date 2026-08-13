import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

async function files(dir) {
  return (await readdir(dir, { withFileTypes: true })).flatMap((entry) => entry.isDirectory() ? [] : [join(dir, entry.name)]);
}
const violations = [];
for (const file of await files("packages/simulation-kit/src")) {
  const source = await readFile(file, "utf8");
  if (/src\/worker|games\//.test(source)) violations.push(`${file}: simulation-kit이 구현을 참조합니다.`);
}
for (const game of await readdir("games", { withFileTypes: true })) {
  if (!game.isDirectory()) continue;
  for (const file of await files(join("games", game.name, "src"))) {
    const source = await readFile(file, "utf8");
    if (/src\/worker|cloudflare-host/.test(source)) violations.push(`${file}: 게임 팩이 호스트 구현을 참조합니다.`);
  }
}
if (violations.length) { console.error(violations.join("\n")); process.exit(1); }
console.log("architecture boundaries: ok");
