import { expect, test } from "@playwright/test";

test("starter offers only the two reference games", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: /요일 천재/ })).toHaveAttribute("href", "/yoil");
  await expect(page.getByRole("link", { name: /Handoff Lab/ })).toHaveAttribute("href", "/handoff");
  await expect(page.getByText("수정용 최소 게임")).toHaveCount(0);
});

test("handoff lab reaches document phase", async ({ page }) => {
  await page.goto("/handoff");
  await page.getByLabel("1번 칸, 흰색, 누르면 색상 변경").click();
  await page.getByRole("button", { name: "A 그룹 구조 저장" }).click();
  await page.getByRole("button", { name: "B 그룹 구조 저장" }).click();
  await expect(page.getByRole("heading", { name: "원본을 글로 설명하기" })).toBeVisible();
  await expect(page.getByLabel("상대 그룹에게 넘길 설명")).toBeVisible();
  await expect(page.getByRole("heading", { name: "A 그룹의 원본" })).toBeVisible();
});
