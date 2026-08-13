import { expect, test } from "@playwright/test";

test("a participant rehearses the authoritative solo path on a 320px viewport", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("혼자 2분 연습", { exact: true })).toBeVisible();
  await page.getByLabel("이름").fill("민지");
  await page.getByRole("button", { name: "비공개 연습 만들기" }).click();
  await expect(page.getByRole("heading", { name: "혼자 연습 준비" })).toBeVisible();
  await page.getByRole("button", { name: "5초 뒤 연습 시작" }).click();
  await expect(page.getByText("곧 시작합니다")).toBeVisible();
  await expect(page.getByText("지금 눌러야 할 요일")).toBeVisible({ timeout: 8_000 });
  const duty = page.getByRole("button", { name: "내 몫 누르기" });
  await expect(duty).toBeVisible();
  const box = await duty.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(48);
  await duty.click();
  await expect(page.getByRole("button", { name: "완료" })).toBeDisabled();
  await expect(page.getByText("모든 팀 · 1인당")).toHaveCount(0);
  await page.reload();
  await expect(page.getByText("혼자 연습")).toBeVisible();
  await page.getByRole("button", { name: "문제 받기" }).click();
  await expect(page.locator(".date")).toBeVisible();
});
