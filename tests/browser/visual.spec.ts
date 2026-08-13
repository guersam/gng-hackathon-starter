import { expect, test } from "@playwright/test";

const themes = {
  paper: { canvas: "#f8f7f2", text: "#171816" },
  "high-contrast": { canvas: "#ffffff", text: "#000000" },
} as const;

for (const [theme, expected] of Object.entries(themes)) {
  for (const route of ["/", "/handoff", "/workshop"] as const) {
    for (const viewport of [{ name: "mobile", width: 320, height: 700 }, { name: "desktop", width: 1280, height: 900 }]) {
      test(`${route} renders ${theme} without overflow on ${viewport.name}`, async ({ page }, testInfo) => {
        await page.setViewportSize(viewport);
        await page.goto(route);
        await page.evaluate((selectedTheme) => document.documentElement.dataset.theme = selectedTheme, theme);
        const result = await page.evaluate(() => {
          const root = getComputedStyle(document.documentElement);
          const button = document.querySelector("button");
          return {
            fits: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
            canvas: root.getPropertyValue("--ui-canvas").trim(),
            text: root.getPropertyValue("--ui-text").trim(),
            buttonHeight: button?.getBoundingClientRect().height ?? 0,
          };
        });
        expect(result).toMatchObject({ fits: true, canvas: expected.canvas, text: expected.text });
        expect(result.buttonHeight).toBeGreaterThanOrEqual(48);
        await page.screenshot({ path: testInfo.outputPath(`${route === "/" ? "yoil" : route.slice(1)}-${theme}-${viewport.name}.png`), fullPage: true });
      });
    }
  }
}
