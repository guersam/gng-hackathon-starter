import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.[cm]?[jt]sx?$/.test(entry.name) ? [path] : [];
  }));
  return nested.flat();
}

const violations = [];
for (const file of await sourceFiles("packages/simulation-kit/src")) {
  const source = await readFile(file, "utf8");
  if (/src\/worker|games\/|@experiential\/game-/.test(source)) {
    violations.push(`${file}: simulation-kit이 게임 또는 플랫폼 구현을 참조합니다.`);
  }
}
for (const file of await sourceFiles("packages/ui-foundation/src")) {
  const source = await readFile(file, "utf8");
  if (/src\/worker|games\/|@experiential\/(?:game-|cloudflare-host|simulation-kit)/.test(source)) {
    violations.push(`${file}: ui-foundation이 게임, 도메인 또는 플랫폼 구현을 참조합니다.`);
  }
}
for (const file of await sourceFiles("games")) {
  const source = await readFile(file, "utf8");
  if (/src\/worker|@experiential\/cloudflare-host/.test(source)) {
    violations.push(`${file}: 게임 팩이 Cloudflare 호스트 구현을 참조합니다.`);
  }
  if (/\.\.\/\.\.\/\.\.\/packages\//.test(source)) {
    violations.push(`${file}: workspace package를 상대경로로 우회합니다.`);
  }
}
for (const file of await sourceFiles("src")) {
  const source = await readFile(file, "utf8");
  if (/\.\.\/games\/|\.\.\/packages\//.test(source)) {
    violations.push(`${file}: workspace export 대신 소스 상대경로를 사용합니다.`);
  }
}
if (violations.length) {
  console.error(violations.join("\n"));
  process.exit(1);
}
console.log("architecture boundaries: ok");
