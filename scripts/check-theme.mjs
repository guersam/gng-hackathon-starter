import { readFile, readdir } from "node:fs/promises";
import { join, normalize } from "node:path";

const ignoredDirectories = new Set([".git", "dist", "node_modules", "playwright-report", "test-results", ".wrangler"]);
async function files(directory = ".") {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map((entry) => {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) return [];
    const path = join(directory, entry.name);
    return entry.isDirectory() ? files(path) : [normalize(path)];
  }))).flat();
}

const themeSource = normalize("packages/ui-foundation/src/theme.css");
const deprecated = /--(?:ink|paper|silver|rain|acid|danger|hairline)\b/;
const rawColor = /#[0-9a-f]{3,8}\b|\b(?:rgb|hsl)a?\(/i;
const inlineColor = /(?:style\s*=|style\s*:\s*\{)[^\n]*(?:#[0-9a-f]{3,8}\b|\b(?:rgb|hsl)a?\()/i;
const violations = [];
for (const file of await files()) {
  if (!/\.(?:css|tsx|jsx|html)$/.test(file)) continue;
  const source = await readFile(file, "utf8");
  if (file.endsWith(".css") && file !== themeSource && rawColor.test(source)) {
    violations.push(`${file}: 색상 값은 ui-foundation/theme.css에서만 선언합니다.`);
  }
  if (file.endsWith(".css") && deprecated.test(source)) {
    violations.push(`${file}: 게임 고유 색상 토큰을 사용합니다.`);
  }
  if (!file.endsWith(".css") && inlineColor.test(source)) {
    violations.push(`${file}: inline 색상 대신 semantic token을 사용합니다.`);
  }
}
if (violations.length) {
  console.error(violations.join("\n"));
  process.exit(1);
}
console.log("theme boundaries: ok");
