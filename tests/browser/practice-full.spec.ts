import { expect, test } from "@playwright/test";

test.skip(!process.env.YOIL_FULL_E2E, "120-second authoritative completion runs only at the release gate");

test("solo practice reaches the server-finished evidence screen", async ({ page }) => {
  test.setTimeout(140_000);
  await page.goto("/");
  await page.getByLabel("이름").fill("완주자");
  await page.getByRole("button", { name: "비공개 연습 만들기" }).click();
  await page.getByRole("button", { name: "5초 뒤 연습 시작" }).click();
  await expect(page.getByText("지금 눌러야 할 요일")).toBeVisible({ timeout: 8_000 });
  await page.getByRole("button", { name: "문제 받기" }).click();
  await expect(page.getByRole("heading", { name: "내가 지나온 2분" })).toBeVisible({ timeout: 125_000 });
  await expect(page.getByText("서버 권위로 2분 종료")).toHaveAttribute("data-ok", "true");
  await expect(page.getByText("9초 의무 기록 저장")).toHaveAttribute("data-ok", "true");
  await expect(page.getByText("요일 문제 결과 저장")).toHaveAttribute("data-ok", "true");
});
