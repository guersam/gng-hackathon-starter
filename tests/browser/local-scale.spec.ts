import { expect, test } from "@playwright/test";

test.skip(!process.env.YOIL_LOCAL_SCALE, "30-browser local rehearsal runs only at the local scale gate");

test("30 browser contexts join and authenticate real WebSockets", async ({ browser, request }) => {
  test.setTimeout(90_000);
  const teams = Array.from({ length: 6 }, (_, index) => ({ id: `team-${index + 1}`, label: `${index + 1}팀`, capacity: 5 }));
  const response = await request.post("/api/sessions", { data: { kind: "team_simulation", runMode: "cohort", durationSeconds: 60, teams } });
  expect(response.ok()).toBe(true);
  const created = await response.json() as { teams: Array<{ joinPath: string }> };
  const contexts = await Promise.all(Array.from({ length: 30 }, () => browser.newContext({ viewport: { width: 320, height: 700 } })));
  try {
    const results = await Promise.all(contexts.map(async (context, index) => {
      const page = await context.newPage();
      const authenticated = new Promise<void>((resolve) => page.on("websocket", (socket) => socket.on("framereceived", ({ payload }) => {
        if (String(payload).includes('"type":"authenticated"')) resolve();
      })));
      const teamIndex = Math.floor(index / 5);
      await page.goto(created.teams[teamIndex].joinPath);
      await page.getByLabel("이름").fill(`참가자-${index + 1}`);
      await page.getByRole("button", { name: "팀에 들어가기" }).click();
      await authenticated;
      return page;
    }));
    for (let teamIndex = 0; teamIndex < 6; teamIndex += 1) await expect(results[teamIndex * 5].getByText("5/5")).toBeVisible();
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
  }
});
