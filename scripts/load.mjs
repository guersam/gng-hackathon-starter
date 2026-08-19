const base = process.argv.slice(2).find((argument) => argument !== "--");
if (!base) {
  console.error("사용법: pnpm load -- https://배포주소");
  process.exit(2);
}
const teams = Array.from({ length: 6 }, (_, i) => ({
  id: `team-${i + 1}`,
  label: `${i + 1}팀`,
  capacity: 5,
}));
const started = performance.now();
const latencies = [];
const createdResponse = await fetch(new URL("/api/sessions", base), {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ kind: "team_simulation", runMode: "team", teams, durationSeconds: 60 }),
});
if (!createdResponse.ok)
  throw new Error(`세션 생성 실패: ${createdResponse.status}`);
const created = await createdResponse.json();
console.error("[load] 세션 생성 완료");
const joins = teams.flatMap((team) =>
  Array.from({ length: 5 }, (_, i) => ({
    teamId: team.id,
    displayName: `부하-${team.id}-${i + 1}`,
  })),
);
const participants = await Promise.all(
  joins.map(async (join) => {
    const at = performance.now();
    const response = await fetch(
      new URL(`/api/sessions/${created.sessionId}/join`, base),
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(join),
      },
    );
    latencies.push(performance.now() - at);
    if (!response.ok) throw new Error(`참가 실패: ${response.status}`);
    return response.json();
  }),
);
console.error("[load] 30명 참가 완료");
const wsUrl = new URL(`/api/sessions/${created.sessionId}/ws`, base);
wsUrl.protocol = wsUrl.protocol === "https:" ? "wss:" : "ws:";
const connect = (participant) =>
  new Promise((resolve, reject) => {
        const ws = new WebSocket(wsUrl);
        const timer = setTimeout(
          () => reject(new Error("WebSocket 인증 시간 초과")),
          5000,
        );
        ws.onopen = () =>
          ws.send(
            JSON.stringify({
              type: "authenticate",
              capability: participant.capability,
            }),
          );
        ws.onmessage = (event) => {
          const message = JSON.parse(event.data);
          if (message.type === "authenticated") {
            clearTimeout(timer);
            resolve({ ws, participant });
          }
        };
        ws.onerror = () => reject(new Error("WebSocket 연결 실패"));
      });
let sockets = await Promise.all(participants.map(connect));
console.error("[load] 30 WebSocket 인증 완료");
for (const team of teams) {
  const actor = sockets.find((item) => item.participant.teamId === team.id);
  actor.ws.send(
    JSON.stringify({
      type: "command",
      id: crypto.randomUUID(),
      command: { type: "team.ready" },
    }),
  );
}
console.error("[load] 팀 준비 명령 전송 완료");
await delay(5500);
const pressAll = (weekday) => {
  for (const { ws } of sockets) ws.send(
    JSON.stringify({
      type: "command",
      id: crypto.randomUUID(),
      command: { type: "duty.press", weekday },
    }),
  );
};
pressAll("monday");
const duplicateId = crypto.randomUUID();
sockets[0].ws.send(JSON.stringify({ type: "command", id: duplicateId, command: { type: "duty.press", weekday: "monday" } }));
sockets[0].ws.send(JSON.stringify({ type: "command", id: duplicateId, command: { type: "duty.press", weekday: "monday" } }));
await delay(9000);
pressAll("tuesday");
for (const { ws } of sockets) {
  ws.send(JSON.stringify({ type: "command", id: crypto.randomUUID(), command: { type: "challenge.start", rangeId: "this_week", timeLimit: 3 } }));
}
await delay(250);
for (const item of sockets.slice(0, 3)) item.ws.close();
const replacements = await Promise.all(sockets.slice(0, 3).map((item) => connect(item.participant)));
sockets = [...replacements, ...sockets.slice(3)];
await delay(8750);
pressAll("wednesday");
await delay(9000);
console.error("[load] 의무·문제·재연결 시나리오 완료");
const exported = await fetch(
  new URL(`/api/sessions/${created.sessionId}/export`, base),
  { headers: { authorization: `Bearer ${created.hostCapability}` } },
);
if (!exported.ok) throw new Error(`사건 내보내기 실패: ${exported.status}`);
const trace = await exported.json();
console.error("[load] 사건 export 완료");
for (const { ws } of sockets) ws.close();
const domain = trace.events.map((event) => event.payload);
const presses = domain.filter((event) => event.type === "duty.pressed");
const settled = domain.filter(
  (event) => event.type === "duty.window_settled" && event.windowId <= 2,
);
const challenges = domain.filter((event) => event.type === "challenge.resolved");
if (presses.length !== 90)
  throw new Error(`의무 입력 유실 또는 중복: ${presses.length}/90`);
if (
  settled.length !== 18 ||
  settled.some((event) => event.missedMemberIds.length)
)
  throw new Error("마감 정산이 중복되었거나 누락되었습니다.");
if (challenges.length !== 30) throw new Error(`문제 결과 유실: ${challenges.length}/30`);
console.error("[load] 사건 수 검증 완료");
const resumed = await Promise.all(participants.map((participant) => fetch(new URL(`/api/sessions/${created.sessionId}/resume`, base), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ capability: participant.capability }) }).then((response) => response.json())));
if (resumed.some((item) => item.snapshot.revision !== trace.snapshot.revision || item.snapshot.game.eventCount !== trace.snapshot.game.eventCount)) throw new Error("재연결 스냅샷과 내보내기 기록이 일치하지 않습니다.");
console.error("[load] 30명 resume 검증 완료");
latencies.sort((a, b) => a - b);
const p95 = latencies[Math.ceil(latencies.length * 0.95) - 1];
console.log(
  JSON.stringify({
    clients: sockets.length,
    webSockets: sockets.length,
    dutyEvents: presses.length,
    settlements: settled.length,
    challengeResults: challenges.length,
    reconnected: 3,
    p95JoinMs: Math.round(p95),
    elapsedMs: Math.round(performance.now() - started),
  }),
);
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
