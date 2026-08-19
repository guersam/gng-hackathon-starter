import { expect, test } from "@playwright/test";

test("starter offers only the two reference games", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: /요일 천재/ })).toHaveAttribute("href", "/yoil");
  await expect(page.getByRole("link", { name: /Handoff Lab/ })).toHaveAttribute("href", "/handoff");
  await expect(page.getByText("수정용 최소 게임")).toHaveCount(0);
});

test("handoff lab reaches document phase", async ({ page }) => {
  await page.goto("/handoff");
  await page.getByLabel("1번 칸 empty").click();
  await page.getByRole("button", { name: "이 단계 준비 완료" }).click();
  await page.getByRole("button", { name: "B 그룹" }).click();
  await page.getByRole("button", { name: "이 단계 준비 완료" }).click();
  await expect(page.getByRole("heading", { name: "문서 남기기" })).toBeVisible();
});
