import { expect, test } from "@playwright/test";

test("three players fill a simulation team and start together", async ({ browser, request }) => {
  const createdResponse = await request.post("/api/sessions", {
    data: {
      kind: "team_simulation",
      runMode: "team",
      durationSeconds: 60,
      teams: [{ id: "alpha", label: "알파", capacity: 3 }],
    },
  });
  expect(createdResponse.ok()).toBe(true);
  const created = await createdResponse.json() as { teams: Array<{ joinPath: string }> };
  const pages = await Promise.all(["가", "나", "다"].map(async (name) => {
    const context = await browser.newContext({ viewport: { width: 320, height: 700 } });
    const page = await context.newPage();
    await page.goto(created.teams[0].joinPath);
    await page.getByLabel("이름").fill(name);
    await page.getByRole("button", { name: "팀에 들어가기" }).click();
    return page;
  }));
  await expect(pages[0].getByText("3/3")).toBeVisible();
  await pages[0].getByRole("button", { name: "우리 팀 준비 완료" }).click();
  await expect(pages[1].getByText("지금 눌러야 할 요일")).toBeVisible({ timeout: 8_000 });
  await expect(pages[1].getByText("모든 팀 · 1인당")).toBeVisible();
  for (const page of pages) await page.context().close();
});
