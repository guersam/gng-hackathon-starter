import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

async function cssFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? cssFiles(path) : entry.name.endsWith(".css") ? [path] : [];
  }))).flat();
}

const deprecated = /--(?:ink|paper|silver|rain|acid|danger|hairline)\b/;
const rawColor = /#[0-9a-f]{3,8}\b|\b(?:rgb|hsl)a?\(/i;
const violations = [];
for (const directory of ["games", "src"]) {
  for (const file of await cssFiles(directory)) {
    const source = await readFile(file, "utf8");
    if (deprecated.test(source)) violations.push(`${file}: 게임 고유 색상 토큰을 사용합니다.`);
    if (rawColor.test(source)) violations.push(`${file}: 색상 값은 ui-foundation에서만 선언합니다.`);
  }
}
if (violations.length) {
  console.error(violations.join("\n"));
  process.exit(1);
}
console.log("theme boundaries: ok");
