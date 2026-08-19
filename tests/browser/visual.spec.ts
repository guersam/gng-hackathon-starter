import { expect, test } from "@playwright/test";

const themes = {
  paper: { canvas: "#f8f7f2", text: "#171816" },
  "high-contrast": { canvas: "#ffffff", text: "#000000" },
} as const;

test("yoil entry keeps its title legible and gameplay-only", async ({ page }) => {
  await page.goto("/yoil");
  await expect(page.getByRole("navigation", { name: "다른 기준 게임" })).toHaveCount(0);
  const title = page.locator(".brand-title");
  await expect(title.locator("span")).toHaveCount(2);
  const ratio = await title.evaluate((element) => {
    const style = getComputedStyle(element);
    return Number.parseFloat(style.lineHeight) / Number.parseFloat(style.fontSize);
  });
  expect(ratio).toBeGreaterThanOrEqual(0.95);
});

for (const [theme, expected] of Object.entries(themes)) {
  for (const route of ["/", "/yoil", "/handoff"] as const) {
    for (const viewport of [{ name: "mobile", width: 320, height: 700 }, { name: "desktop", width: 1280, height: 900 }]) {
      test(`${route} renders ${theme} without overflow on ${viewport.name}`, async ({ page }, testInfo) => {
        await page.setViewportSize(viewport);
        await page.goto(route);
        await page.evaluate((selectedTheme) => document.documentElement.dataset.theme = selectedTheme, theme);
        const result = await page.evaluate(() => {
          const root = getComputedStyle(document.documentElement);
          const primaryControl = document.querySelector("button, .starter-game");
          return {
            fits: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
            canvas: root.getPropertyValue("--ui-canvas").trim(),
            text: root.getPropertyValue("--ui-text").trim(),
            controlHeight: primaryControl?.getBoundingClientRect().height ?? 0,
          };
        });
        expect(result).toMatchObject({ fits: true, canvas: expected.canvas, text: expected.text });
        expect(result.controlHeight).toBeGreaterThanOrEqual(48);
        await page.screenshot({ path: testInfo.outputPath(`${route === "/" ? "starter" : route.slice(1)}-${theme}-${viewport.name}.png`), fullPage: true });
      });
    }
  }
}
