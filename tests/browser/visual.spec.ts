import { expect, test } from "@playwright/test";

for (const route of ["/handoff", "/workshop"] as const) {
  for (const viewport of [{ name: "mobile", width: 320, height: 700 }, { name: "desktop", width: 1280, height: 900 }]) {
    test(`${route} has no horizontal overflow on ${viewport.name}`, async ({ page }, testInfo) => {
      await page.setViewportSize(viewport);
      await page.goto(route);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`${route.slice(1)}-${viewport.name}.png`), fullPage: true });
    });
  }
}
