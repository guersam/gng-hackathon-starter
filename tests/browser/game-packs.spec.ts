import { expect, test } from "@playwright/test";

test("handoff lab reaches document phase", async ({ page }) => {
  await page.goto("/handoff");
  await page.getByLabel("1번 칸 empty").click();
  await page.getByRole("button", { name: "이 단계 준비 완료" }).click();
  await page.getByRole("button", { name: "B 그룹" }).click();
  await page.getByRole("button", { name: "이 단계 준비 완료" }).click();
  await expect(page.getByRole("heading", { name: "문서 남기기" })).toBeVisible();
});

test("workshop pack accepts everyone and reveals", async ({ page }) => {
  await page.goto("/workshop");
  const choices = page.getByRole("button", { name: "빨리 내놓기" });
  for (let index = 0; index < await choices.count(); index += 1) await choices.nth(index).click();
  await page.getByRole("button", { name: "선택 공개" }).click();
  await expect(page.getByRole("status")).toContainText("4");
});
