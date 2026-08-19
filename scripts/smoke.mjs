const base = process.argv.slice(2).find((argument) => argument !== "--");
if (!base) {
  console.error("사용법: pnpm smoke -- https://배포주소");
  process.exit(2);
}
const response = await fetch(new URL("/api/health", base));
const body = await response.json();
if (!response.ok || body.schemaVersion !== "yoil-genius:v2" || body.durableObject !== "sqlite") {
  throw new Error(`배포 확인 실패: ${response.status}`);
}
console.log(`정상: ${body.service} · ${body.schemaVersion} · ${body.durableObject}`);
